import { useCallback, useState } from 'react'

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp']

function ImageUploader({ onFilesSelect, isConverting, progress }) {
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
    const files = Array.from(e.dataTransfer.files).filter(file =>
      ACCEPTED_TYPES.includes(file.type)
    )
    if (files.length > 0) {
      onFilesSelect(files)
    }
  }, [onFilesSelect])

  const handleFileChange = useCallback((e) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      onFilesSelect(files)
    }
    // 重置 input 以便可以再次选择相同文件
    e.target.value = ''
  }, [onFilesSelect])

  if (isConverting) {
    return (
      <div className="text-center py-12">
        <div className="mb-4">
          <svg className="w-16 h-16 mx-auto text-white/80 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
        <p className="text-white text-lg mb-2">正在生成 PDF...</p>
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
        accept={ACCEPTED_TYPES.join(',')}
        multiple
        onChange={handleFileChange}
        className="hidden"
      />
      <svg className="w-16 h-16 mx-auto text-white/60 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
      <p className="text-white text-lg mb-2">拖放图片文件到这里</p>
      <p className="text-white/60 mb-2">或点击选择文件</p>
      <p className="text-white/40 text-sm">支持 JPG、PNG、WebP、GIF、BMP 格式，可多选</p>
    </label>
  )
}

export default ImageUploader
