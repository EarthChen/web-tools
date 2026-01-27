import { useCallback, useState } from 'react'

function PdfUploader({ onFileSelect, isConverting, progress }) {
  const [isDragging, setIsDragging] = useState(false)

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file && file.type === 'application/pdf') {
      onFileSelect(file)
    }
  }, [onFileSelect])

  const handleFileChange = useCallback((e) => {
    const file = e.target.files?.[0]
    if (file) {
      onFileSelect(file)
    }
  }, [onFileSelect])

  if (isConverting) {
    return (
      <div className="text-center py-12">
        <div className="mb-4">
          <svg className="w-16 h-16 mx-auto text-white/80 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
        <p className="text-white text-lg mb-2">正在转换...</p>
        <div className="w-64 mx-auto bg-white/20 rounded-full h-2 overflow-hidden">
          <div
            className="h-full bg-white transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-white/70 text-sm mt-2">{Math.round(progress)}%</p>
      </div>
    )
  }

  return (
    <label
      className={`block border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
        isDragging
          ? 'border-white bg-white/10'
          : 'border-white/30 hover:border-white/50 hover:bg-white/5'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        type="file"
        accept="application/pdf"
        onChange={handleFileChange}
        className="hidden"
      />
      <svg className="w-16 h-16 mx-auto text-white/60 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
      <p className="text-white text-lg mb-2">拖放 PDF 文件到这里</p>
      <p className="text-white/60">或点击选择文件</p>
    </label>
  )
}

export default PdfUploader
