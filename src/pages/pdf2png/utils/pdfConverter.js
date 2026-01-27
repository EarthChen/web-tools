import * as pdfjsLib from 'pdfjs-dist'

// 设置 PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`

/**
 * 将 PDF 文件转换为 PNG 图片
 * @param {File} file - PDF 文件
 * @param {number} dpi - 目标 DPI (默认 200)
 * @param {Function} onProgress - 进度回调
 * @returns {Promise<Array<{dataUrl: string, filename: string}>>}
 */
export async function convertPdfToImages(file, dpi = 200, onProgress = () => {}) {
  // 读取文件为 ArrayBuffer
  const arrayBuffer = await file.arrayBuffer()
  
  // 加载 PDF 文档
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const numPages = pdf.numPages
  const results = []
  
  // 计算缩放比例 (PDF 默认 72 DPI)
  const scale = dpi / 72
  
  // 获取文件名（不含扩展名）
  const baseName = file.name.replace(/\.pdf$/i, '')
  
  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    // 获取页面
    const page = await pdf.getPage(pageNum)
    
    // 获取页面尺寸
    const viewport = page.getViewport({ scale })
    
    // 创建 Canvas
    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height
    
    const context = canvas.getContext('2d')
    
    // 渲染页面到 Canvas
    await page.render({
      canvasContext: context,
      viewport: viewport,
    }).promise
    
    // 转换为 PNG Data URL
    const dataUrl = canvas.toDataURL('image/png')
    
    // 生成文件名
    const filename = numPages === 1
      ? `${baseName}.png`
      : `${baseName}_page_${String(pageNum).padStart(2, '0')}.png`
    
    results.push({ dataUrl, filename })
    
    // 更新进度
    onProgress((pageNum / numPages) * 100)
  }
  
  return results
}
