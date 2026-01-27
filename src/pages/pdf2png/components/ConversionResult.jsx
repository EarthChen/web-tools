import { useCallback } from 'react'
import JSZip from 'jszip'

function ConversionResult({ results, onReset }) {
  const handleDownloadAll = useCallback(async () => {
    if (results.length === 1) {
      // 单页直接下载
      const link = document.createElement('a')
      link.href = results[0].dataUrl
      link.download = results[0].filename
      link.click()
      return
    }

    // 多页打包成 ZIP
    const zip = new JSZip()
    for (const result of results) {
      const base64Data = result.dataUrl.split(',')[1]
      zip.file(result.filename, base64Data, { base64: true })
    }

    const blob = await zip.generateAsync({ type: 'blob' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'pdf_images.zip'
    link.click()
    URL.revokeObjectURL(link.href)
  }, [results])

  const handleDownloadSingle = useCallback((result) => {
    const link = document.createElement('a')
    link.href = result.dataUrl
    link.download = result.filename
    link.click()
  }, [])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">
          转换完成 ({results.length} 页)
        </h2>
        <div className="flex gap-3">
          <button
            onClick={handleDownloadAll}
            className="px-4 py-2 bg-white text-gray-800 rounded-lg font-medium hover:bg-white/90 transition-colors"
          >
            {results.length === 1 ? '下载图片' : '下载全部 (ZIP)'}
          </button>
          <button
            onClick={onReset}
            className="px-4 py-2 bg-white/10 text-white rounded-lg font-medium hover:bg-white/20 transition-colors"
          >
            转换其他
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {results.map((result, index) => (
          <div
            key={index}
            className="group relative bg-white/10 rounded-lg overflow-hidden cursor-pointer"
            onClick={() => handleDownloadSingle(result)}
          >
            <img
              src={result.dataUrl}
              alt={`Page ${index + 1}`}
              className="w-full h-auto"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <div className="text-center">
                <svg className="w-8 h-8 text-white mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span className="text-white text-sm">下载</span>
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-2 py-1">
              <p className="text-white text-xs truncate">{result.filename}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ConversionResult
