import * as pdfjsLib from 'pdfjs-dist'

// 设置 PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`

/**
 * Load a PDF document and return metadata + page count
 * @param {File} file - PDF file
 * @returns {Promise<{pdf: PDFDocumentProxy, numPages: number, filename: string}>}
 */
export async function loadPdf(file) {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const baseName = file.name.replace(/\.pdf$/i, '')
  return { pdf, numPages: pdf.numPages, filename: baseName }
}

/**
 * Generate low-res thumbnails for page selection
 * @param {PDFDocumentProxy} pdf
 * @returns {Promise<Array<{pageNum: number, dataUrl: string, width: number, height: number}>>}
 */
export async function generateThumbnails(pdf) {
  const thumbs = []
  const THUMB_SCALE = 0.3 // Low res for speed
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const viewport = page.getViewport({ scale: THUMB_SCALE })
    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height
    const ctx = canvas.getContext('2d')
    await page.render({ canvasContext: ctx, viewport }).promise
    thumbs.push({
      pageNum,
      dataUrl: canvas.toDataURL('image/jpeg', 0.6),
      width: viewport.width,
      height: viewport.height,
    })
  }
  return thumbs
}

/**
 * Convert selected PDF pages to images
 * @param {PDFDocumentProxy} pdf - Loaded PDF document
 * @param {Object} options
 * @param {number} options.dpi - Target DPI (default 200)
 * @param {string} options.format - Output format: 'png' | 'jpeg' | 'webp' (default 'png')
 * @param {number} options.quality - Image quality 0-1 for jpeg/webp (default 0.92)
 * @param {number[]} options.selectedPages - Array of 1-based page numbers (default: all)
 * @param {string} options.watermarkText - Optional watermark text
 * @param {number} options.rotation - Rotation in degrees (0/90/180/270, default 0)
 * @param {string} options.baseName - Base filename
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<Array<{dataUrl: string, filename: string, pageNum: number}>>}
 */
export async function convertPdfToImages(pdf, options = {}, onProgress = () => {}) {
  const {
    dpi = 200,
    format = 'png',
    quality = 0.92,
    selectedPages = null,
    watermarkText = '',
    rotation = 0,
    baseName = 'pdf',
  } = options

  const pages = selectedPages || Array.from({ length: pdf.numPages }, (_, i) => i + 1)
  const results = []
  const scale = dpi / 72

  const ext = format === 'jpeg' ? 'jpg' : format
  const mimeType = format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png'

  for (let i = 0; i < pages.length; i++) {
    const pageNum = pages[i]
    const page = await pdf.getPage(pageNum)

    // Apply rotation
    const totalRotation = (rotation + (page.rotate || 0)) % 360
    const viewport = page.getViewport({ scale, rotation: totalRotation })

    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height

    const context = canvas.getContext('2d')

    // White background for JPEG (no transparency)
    if (format === 'jpeg') {
      context.fillStyle = '#ffffff'
      context.fillRect(0, 0, canvas.width, canvas.height)
    }

    await page.render({ canvasContext: context, viewport }).promise

    // Apply watermark
    if (watermarkText) {
      applyWatermark(context, canvas.width, canvas.height, watermarkText)
    }

    const dataUrl = format === 'png'
      ? canvas.toDataURL(mimeType)
      : canvas.toDataURL(mimeType, quality)

    const filename = pages.length === 1
      ? `${baseName}.${ext}`
      : `${baseName}_page_${String(pageNum).padStart(2, '0')}.${ext}`

    results.push({ dataUrl, filename, pageNum })
    onProgress(((i + 1) / pages.length) * 100)
  }

  return results
}

/**
 * Apply text watermark to a canvas context
 */
function applyWatermark(ctx, width, height, text) {
  ctx.save()
  ctx.globalAlpha = 0.15
  ctx.fillStyle = '#888888'

  const fontSize = Math.max(16, Math.min(width, height) / 15)
  ctx.font = `${fontSize}px sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  // Diagonal repeating pattern
  ctx.translate(width / 2, height / 2)
  ctx.rotate(-Math.PI / 6)

  const gap = fontSize * 4
  for (let y = -height; y < height * 2; y += gap) {
    for (let x = -width; x < width * 2; x += gap) {
      ctx.fillText(text, x - width / 2, y - height / 2)
    }
  }
  ctx.restore()
}

/**
 * Merge multiple PDF files into one
 * Uses pdf-lib for actual merging
 * @param {File[]} files - Array of PDF files
 * @param {Function} onProgress
 * @returns {Promise<{blob: Blob, filename: string, pageCount: number}>}
 */
export async function mergePdfs(files, onProgress = () => {}) {
  // Dynamic import to code-split pdf-lib
  const { PDFDocument } = await import('pdf-lib')

  const mergedPdf = await PDFDocument.create()
  const totalFiles = files.length

  for (let i = 0; i < files.length; i++) {
    const arrayBuffer = await files[i].arrayBuffer()
    const pdf = await PDFDocument.load(arrayBuffer)
    const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices())
    pages.forEach(page => mergedPdf.addPage(page))
    onProgress(((i + 1) / totalFiles) * 100)
  }

  const mergedBytes = await mergedPdf.save()
  const blob = new Blob([mergedBytes], { type: 'application/pdf' })
  return {
    blob,
    filename: 'merged.pdf',
    pageCount: mergedPdf.getPageCount(),
  }
}

/**
 * Split a PDF into individual page PDFs or by range
 * @param {File} file - PDF file
 * @param {Array<{start: number, end: number}>} ranges - 1-based inclusive page ranges
 * @param {Function} onProgress
 * @returns {Promise<Array<{blob: Blob, filename: string, pageRange: string}>>}
 */
export async function splitPdf(file, ranges, onProgress = () => {}) {
  const { PDFDocument } = await import('pdf-lib')

  const arrayBuffer = await file.arrayBuffer()
  const sourcePdf = await PDFDocument.load(arrayBuffer)
  const baseName = file.name.replace(/\.pdf$/i, '')
  const results = []

  for (let i = 0; i < ranges.length; i++) {
    const { start, end } = ranges[i]
    const newPdf = await PDFDocument.create()
    const pageIndices = []
    for (let p = start; p <= end; p++) {
      pageIndices.push(p - 1) // Convert to 0-based
    }
    const pages = await newPdf.copyPages(sourcePdf, pageIndices)
    pages.forEach(page => newPdf.addPage(page))

    const pdfBytes = await newPdf.save()
    const blob = new Blob([pdfBytes], { type: 'application/pdf' })
    const pageRange = start === end ? `p${start}` : `p${start}-${end}`
    results.push({
      blob,
      filename: `${baseName}_${pageRange}.pdf`,
      pageRange: `${start}-${end}`,
    })

    onProgress(((i + 1) / ranges.length) * 100)
  }

  return results
}

// Re-export for backward compatibility
export { pdfjsLib }
