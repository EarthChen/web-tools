import { useCallback, useMemo } from 'react'

function PdfResult({ result, onReset }) {
  const { blob, filename } = result

  const blobUrl = useMemo(() => {
    return URL.createObjectURL(blob)
  }, [blob])

  const fileSize = useMemo(() => {
    const bytes = blob.size
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }, [blob])

  const handleDownload = useCallback(() => {
    const link = document.createElement('a')
    link.href = blobUrl
    link.download = filename
    link.click()
  }, [blobUrl, filename])

  return (
    <div className="text-center py-8">
      {/* 成功图标 */}
      <div className="mb-6">
        <svg className="w-20 h-20 mx-auto text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>

      <h2 className="text-2xl font-semibold text-white mb-2">
        PDF 生成成功
      </h2>
      
      <p className="text-white/70 mb-6">
        文件名: {filename} · 大小: {fileSize}
      </p>

      {/* PDF 预览 (使用 iframe) */}
      <div className="bg-white/10 rounded-xl p-4 mb-6 mx-auto max-w-2xl">
        <iframe
          src={blobUrl}
          className="w-full h-[400px] rounded-lg bg-white"
          title="PDF 预览"
        />
      </div>

      <div className="flex justify-center gap-4">
        <button
          onClick={handleDownload}
          className="px-6 py-3 bg-white text-gray-800 rounded-xl font-medium hover:bg-white/90 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          下载 PDF
        </button>
        <button
          onClick={onReset}
          className="px-6 py-3 bg-white/10 text-white rounded-xl font-medium hover:bg-white/20 transition-colors"
        >
          转换其他图片
        </button>
      </div>
    </div>
  )
}

export default PdfResult
