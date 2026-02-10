// ============================================================
// Image compression
// ============================================================

/**
 * Compress a single image file using canvas
 * @param {File} file
 * @param {Object} opts
 * @param {number} opts.quality - 0-1 (for jpeg/webp)
 * @param {number} opts.maxWidth - Max output width (0 = no limit)
 * @param {number} opts.maxHeight - Max output height (0 = no limit)
 * @param {string} opts.format - 'image/jpeg' | 'image/webp' | 'image/png'
 * @returns {Promise<{blob: Blob, dataUrl: string, width: number, height: number}>}
 */
export async function compressImage(file, opts = {}) {
  const {
    quality = 0.8,
    maxWidth = 0,
    maxHeight = 0,
    format = 'image/jpeg',
  } = opts

  const img = await loadImage(file)
  let { width, height } = img

  // Scale down if needed
  if (maxWidth > 0 && width > maxWidth) {
    height = Math.round(height * (maxWidth / width))
    width = maxWidth
  }
  if (maxHeight > 0 && height > maxHeight) {
    width = Math.round(width * (maxHeight / height))
    height = maxHeight
  }

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')

  // White background for JPEG
  if (format === 'image/jpeg') {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
  }

  ctx.drawImage(img, 0, 0, width, height)

  const blob = await new Promise(resolve => canvas.toBlob(resolve, format, quality))
  const dataUrl = canvas.toDataURL(format, quality)

  return { blob, dataUrl, width, height }
}

// ============================================================
// Format conversion
// ============================================================

/**
 * Convert image to a different format
 * @param {File} file
 * @param {string} targetFormat - 'png' | 'jpeg' | 'webp' | 'ico' | 'bmp'
 * @param {number} quality - 0-1
 * @returns {Promise<{blob: Blob, dataUrl: string, filename: string}>}
 */
export async function convertFormat(file, targetFormat, quality = 0.92) {
  const img = await loadImage(file)
  const baseName = file.name.replace(/\.[^.]+$/, '')

  if (targetFormat === 'ico') {
    return convertToIco(img, baseName)
  }

  const canvas = document.createElement('canvas')
  canvas.width = img.width
  canvas.height = img.height
  const ctx = canvas.getContext('2d')

  const mimeMap = {
    png: 'image/png',
    jpeg: 'image/jpeg',
    jpg: 'image/jpeg',
    webp: 'image/webp',
    bmp: 'image/bmp',
  }

  const mime = mimeMap[targetFormat] || 'image/png'
  const ext = targetFormat === 'jpg' ? 'jpg' : targetFormat

  // White background for non-transparent formats
  if (mime === 'image/jpeg' || mime === 'image/bmp') {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  ctx.drawImage(img, 0, 0)

  const blob = await new Promise(resolve => canvas.toBlob(resolve, mime, quality))
  const dataUrl = canvas.toDataURL(mime, quality)
  const filename = `${baseName}.${ext}`

  return { blob, dataUrl, filename }
}

// ICO conversion helper (creates a 32x32 and 16x16 icon)
async function convertToIco(img, baseName) {
  const sizes = [16, 32, 48]
  const images = []

  for (const size of sizes) {
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, 0, 0, size, size)
    const imageData = ctx.getImageData(0, 0, size, size)
    images.push({ size, data: imageData })
  }

  // Build ICO file binary
  const headerSize = 6
  const dirEntrySize = 16
  const numImages = images.length

  let totalSize = headerSize + dirEntrySize * numImages
  const bmpDataOffsets = []

  for (const image of images) {
    bmpDataOffsets.push(totalSize)
    // BMP header (40) + pixel data (RGBA) + AND mask
    const pixelDataSize = image.size * image.size * 4
    const andMaskRowSize = Math.ceil(image.size / 32) * 4
    const andMaskSize = andMaskRowSize * image.size
    totalSize += 40 + pixelDataSize + andMaskSize
  }

  const buffer = new ArrayBuffer(totalSize)
  const view = new DataView(buffer)

  // ICO header
  view.setUint16(0, 0, true) // Reserved
  view.setUint16(2, 1, true) // Type: ICO
  view.setUint16(4, numImages, true) // Number of images

  // Directory entries
  for (let i = 0; i < numImages; i++) {
    const offset = headerSize + i * dirEntrySize
    const image = images[i]
    const pixelDataSize = image.size * image.size * 4
    const andMaskRowSize = Math.ceil(image.size / 32) * 4
    const andMaskSize = andMaskRowSize * image.size
    const dataSize = 40 + pixelDataSize + andMaskSize

    view.setUint8(offset, image.size < 256 ? image.size : 0) // Width
    view.setUint8(offset + 1, image.size < 256 ? image.size : 0) // Height
    view.setUint8(offset + 2, 0) // Color palette
    view.setUint8(offset + 3, 0) // Reserved
    view.setUint16(offset + 4, 1, true) // Color planes
    view.setUint16(offset + 6, 32, true) // Bits per pixel
    view.setUint32(offset + 8, dataSize, true) // Data size
    view.setUint32(offset + 12, bmpDataOffsets[i], true) // Data offset
  }

  // BMP data for each image
  for (let i = 0; i < numImages; i++) {
    const image = images[i]
    let offset = bmpDataOffsets[i]

    // BITMAPINFOHEADER
    view.setUint32(offset, 40, true) // Header size
    view.setInt32(offset + 4, image.size, true) // Width
    view.setInt32(offset + 8, image.size * 2, true) // Height (doubled for ICO)
    view.setUint16(offset + 12, 1, true) // Planes
    view.setUint16(offset + 14, 32, true) // Bits per pixel
    view.setUint32(offset + 16, 0, true) // Compression
    offset += 40

    // Pixel data (bottom-up, BGRA)
    const { data } = image.data
    for (let y = image.size - 1; y >= 0; y--) {
      for (let x = 0; x < image.size; x++) {
        const srcIdx = (y * image.size + x) * 4
        view.setUint8(offset++, data[srcIdx + 2]) // B
        view.setUint8(offset++, data[srcIdx + 1]) // G
        view.setUint8(offset++, data[srcIdx])     // R
        view.setUint8(offset++, data[srcIdx + 3]) // A
      }
    }

    // AND mask (all zeros for fully opaque)
    const andMaskRowSize = Math.ceil(image.size / 32) * 4
    for (let y = 0; y < image.size; y++) {
      for (let b = 0; b < andMaskRowSize; b++) {
        view.setUint8(offset++, 0)
      }
    }
  }

  const blob = new Blob([buffer], { type: 'image/x-icon' })
  const dataUrl = URL.createObjectURL(blob)

  return { blob, dataUrl, filename: `${baseName}.ico` }
}

// ============================================================
// Image stitching / collage
// ============================================================

/**
 * Stitch multiple images together
 * @param {Array<{file: File, preview: string}>} items
 * @param {Object} opts
 * @param {string} opts.direction - 'horizontal' | 'vertical' | 'grid'
 * @param {number} opts.gap - Gap between images in pixels
 * @param {string} opts.bgColor - Background color
 * @param {number} opts.gridCols - Number of columns for grid layout
 * @param {string} opts.format - Output format: 'png' | 'jpeg' | 'webp'
 * @param {number} opts.quality - Output quality
 * @returns {Promise<{blob: Blob, dataUrl: string, width: number, height: number}>}
 */
export async function stitchImages(items, opts = {}) {
  const {
    direction = 'horizontal',
    gap = 0,
    bgColor = 'transparent',
    gridCols = 2,
    format = 'png',
    quality = 0.92,
  } = opts

  const images = await Promise.all(items.map(item => loadImage(item.file)))

  let canvasWidth, canvasHeight
  const positions = [] // {x, y, w, h} for each image

  if (direction === 'horizontal') {
    // All images same height (use max), placed side by side
    const maxHeight = Math.max(...images.map(img => img.height))
    let x = 0
    for (const img of images) {
      const scale = maxHeight / img.height
      const w = Math.round(img.width * scale)
      positions.push({ x, y: 0, w, h: maxHeight })
      x += w + gap
    }
    canvasWidth = x - (images.length > 0 ? gap : 0)
    canvasHeight = maxHeight
  } else if (direction === 'vertical') {
    // All images same width (use max), stacked vertically
    const maxWidth = Math.max(...images.map(img => img.width))
    let y = 0
    for (const img of images) {
      const scale = maxWidth / img.width
      const h = Math.round(img.height * scale)
      positions.push({ x: 0, y, w: maxWidth, h })
      y += h + gap
    }
    canvasWidth = maxWidth
    canvasHeight = y - (images.length > 0 ? gap : 0)
  } else {
    // Grid layout
    const cols = Math.min(gridCols, images.length)
    const rows = Math.ceil(images.length / cols)

    // Find max dimensions per cell
    const cellWidth = Math.max(...images.map(img => img.width))
    const cellHeight = Math.max(...images.map(img => img.height))

    canvasWidth = cols * cellWidth + (cols - 1) * gap
    canvasHeight = rows * cellHeight + (rows - 1) * gap

    for (let i = 0; i < images.length; i++) {
      const col = i % cols
      const row = Math.floor(i / cols)
      const img = images[i]
      // Fit image into cell, centered
      const scale = Math.min(cellWidth / img.width, cellHeight / img.height)
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const x = col * (cellWidth + gap) + Math.round((cellWidth - w) / 2)
      const y = row * (cellHeight + gap) + Math.round((cellHeight - h) / 2)
      positions.push({ x, y, w, h })
    }
  }

  const canvas = document.createElement('canvas')
  canvas.width = canvasWidth
  canvas.height = canvasHeight
  const ctx = canvas.getContext('2d')

  // Background
  if (bgColor !== 'transparent') {
    ctx.fillStyle = bgColor
    ctx.fillRect(0, 0, canvasWidth, canvasHeight)
  }

  // Draw images
  for (let i = 0; i < images.length; i++) {
    const pos = positions[i]
    ctx.drawImage(images[i], pos.x, pos.y, pos.w, pos.h)
  }

  const mimeMap = { png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp' }
  const mime = mimeMap[format] || 'image/png'

  const blob = await new Promise(resolve => canvas.toBlob(resolve, mime, quality))
  const dataUrl = canvas.toDataURL(mime, quality)

  return { blob, dataUrl, width: canvasWidth, height: canvasHeight }
}

// ============================================================
// Helper utilities
// ============================================================

function loadImage(fileOrBlob) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      // Revoke object URL after load
      if (img.src.startsWith('blob:')) URL.revokeObjectURL(img.src)
      resolve(img)
    }
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = URL.createObjectURL(fileOrBlob)
  })
}

export function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export function getImagePreview(file) {
  return URL.createObjectURL(file)
}
