import { useState, useCallback } from 'react'
import { compressImage, formatFileSize, getImagePreview } from '../utils/imageUtils'

function ImageCompressor() {
  const [files, setFiles] = useState([]) // {file, preview, result: {blob, dataUrl, width, height}, originalSize}
  const [quality, setQuality] = useState(0.8)
  const [maxWidth, setMaxWidth] = useState(0)
  const [format, setFormat] = useState('image/jpeg')
  const [isProcessing, setIsProcessing] = useState(false)

  const handleFilesSelect = useCallback((e) => {
    const selected = Array.from(e.target.files || []).filter(f => f.type.startsWith('image/'))
    if (selected.length === 0) return
    const items = selected.map(file => ({
      file,
      preview: getImagePreview(file),
      result: null,
      originalSize: file.size,
    }))
    setFiles(prev => [...prev, ...items])
    e.target.value = ''
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    const selected = Array.from(e.dataTransfer.files || []).filter(f => f.type.startsWith('image/'))
    if (selected.length === 0) return
    const items = selected.map(file => ({
      file,
      preview: getImagePreview(file),
      result: null,
      originalSize: file.size,
    }))
    setFiles(prev => [...prev, ...items])
  }, [])

  const handleCompress = useCallback(async () => {
    setIsProcessing(true)
    const updated = [...files]
    for (let i = 0; i < updated.length; i++) {
      if (updated[i].result) continue
      try {
        const result = await compressImage(updated[i].file, { quality, maxWidth, format })
        updated[i] = { ...updated[i], result }
      } catch (err) {
        updated[i] = { ...updated[i], error: err.message }
      }
    }
    setFiles(updated)
    setIsProcessing(false)
  }, [files, quality, maxWidth, format])

  const handleDownload = useCallback((item) => {
    if (!item.result) return
    const link = document.createElement('a')
    link.href = URL.createObjectURL(item.result.blob)
    const ext = format === 'image/jpeg' ? 'jpg' : format === 'image/webp' ? 'webp' : 'png'
    link.download = item.file.name.replace(/\.[^.]+$/, `_compressed.${ext}`)
    link.click()
    URL.revokeObjectURL(link.href)
  }, [format])

  const handleDownloadAll = useCallback(() => {
    files.filter(f => f.result).forEach(item => handleDownload(item))
  }, [files, handleDownload])

  const handleClear = useCallback(() => {
    files.forEach(f => { if (f.preview) URL.revokeObjectURL(f.preview) })
    setFiles([])
  }, [files])

  const handleRemove = useCallback((index) => {
    setFiles(prev => {
      if (prev[index]?.preview) URL.revokeObjectURL(prev[index].preview)
      return prev.filter((_, i) => i !== index)
    })
  }, [])

  const totalOriginal = files.reduce((sum, f) => sum + f.originalSize, 0)
  const totalCompressed = files.reduce((sum, f) => sum + (f.result?.blob.size || 0), 0)
  const hasResults = files.some(f => f.result)

  return (
    <div>
      {/* Settings */}
      <div className="mb-6 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-white/80 text-xs mb-1">输出格式</label>
          <div className="flex gap-2">
            {[{ v: 'image/jpeg', l: 'JPG' }, { v: 'image/webp', l: 'WebP' }, { v: 'image/png', l: 'PNG' }].map(f => (
              <button key={f.v} onClick={() => setFormat(f.v)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${format === f.v ? 'bg-white text-gray-800' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                {f.l}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-white/80 text-xs mb-1">质量: {Math.round(quality * 100)}%</label>
          <input type="range" min="0.1" max="1" step="0.05" value={quality}
            onChange={(e) => setQuality(parseFloat(e.target.value))} className="w-32 accent-white" />
        </div>
        <div>
          <label className="block text-white/80 text-xs mb-1">最大宽度 (0=不限)</label>
          <input type="number" value={maxWidth} onChange={(e) => setMaxWidth(parseInt(e.target.value) || 0)}
            className="px-2 py-1.5 bg-white/10 text-white text-sm rounded-lg border border-white/20 w-24 focus:outline-none" placeholder="0" />
        </div>
      </div>

      {/* Upload area */}
      {files.length === 0 ? (
        <label className="block border-2 border-dashed border-white/30 rounded-xl p-12 text-center cursor-pointer hover:border-white/50 hover:bg-white/5 transition-all"
          onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}>
          <input type="file" accept="image/*" multiple onChange={handleFilesSelect} className="hidden" />
          <svg className="w-12 h-12 mx-auto text-white/40 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-white/60 mb-1">拖放或点击选择图片</p>
          <p className="text-white/40 text-sm">支持 PNG, JPG, WebP, GIF</p>
        </label>
      ) : (
        <>
          {/* Action bar */}
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="text-white/80 text-sm">
              {files.length} 张图片
              {hasResults && (
                <span className="ml-2 text-green-300">
                  · 总计 {formatFileSize(totalOriginal)} → {formatFileSize(totalCompressed)}
                  ({totalOriginal > 0 ? Math.round((1 - totalCompressed / totalOriginal) * 100) : 0}% 压缩)
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <label className="px-3 py-1.5 bg-white/10 text-white text-sm rounded-lg hover:bg-white/20 cursor-pointer transition-colors">
                <input type="file" accept="image/*" multiple onChange={handleFilesSelect} className="hidden" />
                添加更多
              </label>
              {hasResults && (
                <button onClick={handleDownloadAll} className="px-3 py-1.5 bg-green-500/80 text-white text-sm rounded-lg hover:bg-green-500 transition-colors">
                  下载全部
                </button>
              )}
              <button onClick={handleClear} className="px-3 py-1.5 bg-white/10 text-white text-sm rounded-lg hover:bg-white/20 transition-colors">
                清空
              </button>
            </div>
          </div>

          {/* Image grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            {files.map((item, i) => (
              <div key={i} className="bg-white/5 rounded-xl p-3 relative group">
                <button onClick={() => handleRemove(i)}
                  className="absolute top-2 right-2 z-10 w-6 h-6 bg-red-500/80 rounded-full text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  ✕
                </button>
                <div className="flex gap-2 mb-2">
                  {/* Original */}
                  <div className="flex-1">
                    <img src={item.preview} alt="原图" className="w-full h-24 object-cover rounded" />
                    <p className="text-white/50 text-xs mt-1 text-center">原图 {formatFileSize(item.originalSize)}</p>
                  </div>
                  {/* Compressed */}
                  {item.result && (
                    <div className="flex-1">
                      <img src={item.result.dataUrl} alt="压缩后" className="w-full h-24 object-cover rounded" />
                      <p className="text-green-300 text-xs mt-1 text-center">
                        {formatFileSize(item.result.blob.size)}
                        <span className="text-white/40 ml-1">
                          (-{Math.round((1 - item.result.blob.size / item.originalSize) * 100)}%)
                        </span>
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-white/60 text-xs truncate flex-1 mr-2">{item.file.name}</p>
                  {item.result && (
                    <button onClick={() => handleDownload(item)}
                      className="text-xs px-2 py-0.5 bg-white/10 text-white rounded hover:bg-white/20 flex-shrink-0">
                      下载
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Compress button */}
          {!hasResults && (
            <div className="text-center">
              <button onClick={handleCompress} disabled={isProcessing}
                className="px-8 py-3 bg-white text-gray-800 rounded-xl font-medium hover:bg-white/90 transition-colors disabled:opacity-50">
                {isProcessing ? '压缩中...' : `压缩 ${files.length} 张图片`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default ImageCompressor
