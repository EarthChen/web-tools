import { useState, useCallback } from 'react'
import { convertFormat, formatFileSize, getImagePreview } from '../utils/imageUtils'

const FORMATS = [
  { value: 'png', label: 'PNG', desc: '无损，支持透明' },
  { value: 'jpeg', label: 'JPG', desc: '有损压缩，体积小' },
  { value: 'webp', label: 'WebP', desc: '现代格式，兼顾质量与体积' },
  { value: 'ico', label: 'ICO', desc: '图标格式 (16/32/48px)' },
]

function FormatConverter() {
  const [files, setFiles] = useState([]) // {file, preview, result, targetFormat, error}
  const [targetFormat, setTargetFormat] = useState('png')
  const [quality, setQuality] = useState(0.92)
  const [isProcessing, setIsProcessing] = useState(false)

  const handleFilesSelect = useCallback((e) => {
    const selected = Array.from(e.target.files || []).filter(f => f.type.startsWith('image/'))
    if (selected.length === 0) return
    setFiles(prev => [...prev, ...selected.map(file => ({
      file,
      preview: getImagePreview(file),
      result: null,
      error: null,
    }))])
    e.target.value = ''
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    const selected = Array.from(e.dataTransfer.files || []).filter(f => f.type.startsWith('image/'))
    if (selected.length === 0) return
    setFiles(prev => [...prev, ...selected.map(file => ({
      file,
      preview: getImagePreview(file),
      result: null,
      error: null,
    }))])
  }, [])

  const handleConvert = useCallback(async () => {
    setIsProcessing(true)
    const updated = [...files]
    for (let i = 0; i < updated.length; i++) {
      if (updated[i].result) continue
      try {
        const result = await convertFormat(updated[i].file, targetFormat, quality)
        updated[i] = { ...updated[i], result, targetFormat }
      } catch (err) {
        updated[i] = { ...updated[i], error: err.message }
      }
    }
    setFiles(updated)
    setIsProcessing(false)
  }, [files, targetFormat, quality])

  const handleDownload = useCallback((item) => {
    if (!item.result) return
    const link = document.createElement('a')
    link.href = item.result.dataUrl.startsWith('blob:') ? item.result.dataUrl : URL.createObjectURL(item.result.blob)
    link.download = item.result.filename
    link.click()
  }, [])

  const handleClear = useCallback(() => {
    files.forEach(f => { if (f.preview) URL.revokeObjectURL(f.preview) })
    setFiles([])
  }, [files])

  const hasResults = files.some(f => f.result)

  return (
    <div>
      {/* Format selector */}
      <div className="mb-6 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-white/80 text-xs mb-1">目标格式</label>
          <div className="flex gap-2 flex-wrap">
            {FORMATS.map(f => (
              <button key={f.value} onClick={() => setTargetFormat(f.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${targetFormat === f.value ? 'bg-white text-gray-800' : 'bg-white/10 text-white hover:bg-white/20'}`}
                title={f.desc}>
                {f.label}
              </button>
            ))}
          </div>
        </div>
        {(targetFormat === 'jpeg' || targetFormat === 'webp') && (
          <div>
            <label className="block text-white/80 text-xs mb-1">质量: {Math.round(quality * 100)}%</label>
            <input type="range" min="0.1" max="1" step="0.05" value={quality}
              onChange={(e) => setQuality(parseFloat(e.target.value))} className="w-32 accent-white" />
          </div>
        )}
      </div>

      {/* Upload */}
      {files.length === 0 ? (
        <label className="block border-2 border-dashed border-white/30 rounded-xl p-12 text-center cursor-pointer hover:border-white/50 hover:bg-white/5 transition-all"
          onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}>
          <input type="file" accept="image/*" multiple onChange={handleFilesSelect} className="hidden" />
          <svg className="w-12 h-12 mx-auto text-white/40 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-white/60 mb-1">拖放或点击选择图片</p>
          <p className="text-white/40 text-sm">支持 PNG, JPG, WebP, GIF, BMP</p>
        </label>
      ) : (
        <>
          <div className="flex items-center justify-between mb-4">
            <span className="text-white/80 text-sm">{files.length} 张图片 → {FORMATS.find(f => f.value === targetFormat)?.label}</span>
            <div className="flex gap-2">
              <label className="px-3 py-1.5 bg-white/10 text-white text-sm rounded-lg hover:bg-white/20 cursor-pointer transition-colors">
                <input type="file" accept="image/*" multiple onChange={handleFilesSelect} className="hidden" />
                添加更多
              </label>
              <button onClick={handleClear} className="px-3 py-1.5 bg-white/10 text-white text-sm rounded-lg hover:bg-white/20 transition-colors">
                清空
              </button>
            </div>
          </div>

          <div className="space-y-2 mb-4">
            {files.map((item, i) => (
              <div key={i} className="flex items-center gap-3 bg-white/5 rounded-lg px-3 py-2">
                <img src={item.preview} alt="" className="w-10 h-10 object-cover rounded" />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm truncate">{item.file.name}</p>
                  <p className="text-white/40 text-xs">{formatFileSize(item.file.size)} · {item.file.type.split('/')[1]?.toUpperCase()}</p>
                </div>
                {item.result && (
                  <>
                    <span className="text-white/40 text-sm">→</span>
                    <div className="text-right">
                      <p className="text-green-300 text-sm">{item.result.filename}</p>
                      <p className="text-white/40 text-xs">{formatFileSize(item.result.blob.size)}</p>
                    </div>
                    <button onClick={() => handleDownload(item)}
                      className="px-2 py-1 bg-white/10 text-white text-xs rounded hover:bg-white/20 flex-shrink-0">
                      下载
                    </button>
                  </>
                )}
                {item.error && <span className="text-red-300 text-xs">{item.error}</span>}
              </div>
            ))}
          </div>

          {!hasResults && (
            <div className="text-center">
              <button onClick={handleConvert} disabled={isProcessing}
                className="px-8 py-3 bg-white text-gray-800 rounded-xl font-medium hover:bg-white/90 transition-colors disabled:opacity-50">
                {isProcessing ? '转换中...' : `转换为 ${FORMATS.find(f => f.value === targetFormat)?.label}`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default FormatConverter
