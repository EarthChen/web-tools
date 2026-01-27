import { jsPDF } from 'jspdf'

/**
 * 加载图片并获取尺寸
 * @param {File} file - 图片文件
 * @returns {Promise<{img: HTMLImageElement, width: number, height: number}>}
 */
function loadImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      resolve({
        img,
        width: img.naturalWidth,
        height: img.naturalHeight,
      })
    }
    img.onerror = () => reject(new Error('图片加载失败'))
    img.src = URL.createObjectURL(file)
  })
}

/**
 * 获取图片的 base64 数据
 * @param {File} file - 图片文件
 * @returns {Promise<string>}
 */
function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * 将多张图片转换为 PDF
 * @param {File[]} files - 图片文件数组
 * @param {Object} options - 转换选项
 * @param {string} options.pageSize - 页面尺寸 ('a4' | 'letter' | 'fit')
 * @param {string} options.orientation - 页面方向 ('auto' | 'portrait' | 'landscape')
 * @param {number} options.margin - 页边距 (mm)
 * @param {number} options.quality - 图片质量 (0-1)
 * @param {Function} onProgress - 进度回调
 * @returns {Promise<{blob: Blob, filename: string}>}
 */
export async function convertImagesToPdf(
  files,
  options = {},
  onProgress = () => {}
) {
  const {
    pageSize = 'a4',
    orientation = 'auto',
    margin = 10,
    quality = 0.92,
  } = options

  // 预定义页面尺寸 (mm)
  const pageSizes = {
    a4: { width: 210, height: 297 },
    letter: { width: 215.9, height: 279.4 },
    a3: { width: 297, height: 420 },
    a5: { width: 148, height: 210 },
  }

  let pdf = null
  const totalFiles = files.length

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const { img, width, height } = await loadImage(file)
    const dataUrl = await fileToDataUrl(file)

    // 确定页面方向
    let pageOrientation = orientation
    if (orientation === 'auto') {
      pageOrientation = width > height ? 'landscape' : 'portrait'
    }

    // 计算页面尺寸
    let pageWidth, pageHeight
    if (pageSize === 'fit') {
      // 适应图片尺寸（将像素转换为 mm，假设 96 DPI）
      const pxToMm = 25.4 / 96
      pageWidth = width * pxToMm + margin * 2
      pageHeight = height * pxToMm + margin * 2
    } else {
      const size = pageSizes[pageSize] || pageSizes.a4
      if (pageOrientation === 'landscape') {
        pageWidth = size.height
        pageHeight = size.width
      } else {
        pageWidth = size.width
        pageHeight = size.height
      }
    }

    // 计算图片在页面中的位置和尺寸
    const availableWidth = pageWidth - margin * 2
    const availableHeight = pageHeight - margin * 2
    const imgAspect = width / height
    const pageAspect = availableWidth / availableHeight

    let imgWidth, imgHeight, imgX, imgY

    if (imgAspect > pageAspect) {
      // 图片更宽，以宽度为基准
      imgWidth = availableWidth
      imgHeight = availableWidth / imgAspect
    } else {
      // 图片更高，以高度为基准
      imgHeight = availableHeight
      imgWidth = availableHeight * imgAspect
    }

    // 居中放置
    imgX = margin + (availableWidth - imgWidth) / 2
    imgY = margin + (availableHeight - imgHeight) / 2

    // 创建或添加页面
    if (i === 0) {
      pdf = new jsPDF({
        orientation: pageOrientation,
        unit: 'mm',
        format: pageSize === 'fit' ? [pageWidth, pageHeight] : pageSize,
      })
    } else {
      pdf.addPage(
        pageSize === 'fit' ? [pageWidth, pageHeight] : pageSize,
        pageOrientation
      )
    }

    // 获取图片格式
    const format = file.type === 'image/png' ? 'PNG' : 'JPEG'

    // 添加图片到 PDF
    pdf.addImage(dataUrl, format, imgX, imgY, imgWidth, imgHeight, undefined, 'MEDIUM')

    // 释放图片资源
    URL.revokeObjectURL(img.src)

    // 更新进度
    onProgress(((i + 1) / totalFiles) * 100)
  }

  // 生成 PDF Blob
  const blob = pdf.output('blob')
  const filename = files.length === 1
    ? files[0].name.replace(/\.[^.]+$/, '.pdf')
    : 'images.pdf'

  return { blob, filename }
}

/**
 * 获取图片预览信息
 * @param {File[]} files - 图片文件数组
 * @returns {Promise<Array<{file: File, preview: string, width: number, height: number}>>}
 */
export async function getImagePreviews(files) {
  const previews = []
  
  for (const file of files) {
    const { width, height } = await loadImage(file)
    const preview = URL.createObjectURL(file)
    previews.push({ file, preview, width, height })
  }
  
  return previews
}

/**
 * 清理预览资源
 * @param {Array<{preview: string}>} previews 
 */
export function cleanupPreviews(previews) {
  for (const item of previews) {
    if (item.preview) {
      URL.revokeObjectURL(item.preview)
    }
  }
}
