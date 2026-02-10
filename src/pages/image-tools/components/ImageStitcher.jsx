import { useState, useCallback } from 'react'
import { stitchImages, formatFileSize, getImagePreview } from '../utils/imageUtils'

function ImageStitcher() {
  const [files, setFiles] = useState([]) // {file, preview}
  const [direction, setDirection] = useState('horizontal')
  const [gap, setGap] = useState(0)
  const [bgColor, setBgColor] = useState('#ffffff')
  const [bgTransparent, setBgTransparent] = useState(true)
  const [gridCols, setGridCols] = useState(2)
  const [outputFormat, setOutputFormat] = useState('png')
  const [quality, setQuality] = useState(0.92)
  const [result, setResult] = useState(null) // {blob, dataUrl, width, height}
  const [isProcessing, setIsProcessing] = useState(false)

  const handleFilesSelect = useCallback((e) => {
    const selected = Array.from(e.target.files || []).filter(f => f.type.startsWith('image/'))
    if (selected.length === 0) return
    setFiles(prev => [...prev, ...selected.map(file => ({ file, preview: getImagePreview(file) }))])
    setResult(null)
    e.target.value = ''
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    const selected = Array.from(e.dataTransfer.files || []).filter(f => f.type.startsWith('image/'))
    if (selected.length === 0) return
    setFiles(prev => [...prev, ...selected.map(file => ({ file, preview: getImagePreview(file) }))])
    setResult(null)
  }, [])

  const handleRemove = useCallback((index) => {
    setFiles(prev => {
      if (prev[index]?.preview) URL.revokeObjectURL(prev[index].preview)
      return prev.filter((_, i) => i !== index)
    })
    setResult(null)
  }, [])

  const handleMoveUp = useCallback((index) => {
    if (index <= 0) return
    setFiles(prev => {
      const next = [...prev]
      ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
      return next
    })
    setResult(null)
  }, [])

  const handleMoveDown = useCallback((index) => {
    setFiles(prev => {
      if (index >= prev.length - 1) return prev
      const next = [...prev]
      ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
      return next
    })
    setResult(null)
  }, [])

  const handleStitch = useCallback(async () => {
    if (files.length < 2) return
    setIsProcessing(true)
    try {
      const res = await stitchImages(files, {
        direction,
        gap,
        bgColor: bgTransparent ? 'transparent' : bgColor,
        gridCols,
        format: outputFormat,
        quality,
      })
      setResult(res)
    } catch (err) {
      console.error('Stitch error:', err)
    } finally {
      setIsProcessing(false)
    }
  }, [files, direction, gap, bgColor, bgTransparent, gridCols, outputFormat, quality])

  const handleDownload = useCallback(() => {
    if (!result) return
    const link = document.createElement('a')
    link.href = URL.createObjectURL(result.blob)
    link.download = `stitched.${outputFormat === 'jpeg' ? 'jpg' : outputFormat}`
    link.click()
    URL.revokeObjectURL(link.href)
  }, [result, outputFormat])

  const handleClear = useCallback(() => {
    files.forEach(f => { if (f.preview) URL.revokeObjectURL(f.preview) })
    setFiles([])
    setResult(null)
  }, [files])

  return (
    <div>
      {/* Settings */}
      <div className="mb-6 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-white/80 text-xs mb-1">拼接方式</label>
          <div className="flex gap-2">
            {[{ v: 'horizontal', l: '横向拼接' }, { v: 'vertical', l: '纵向拼接' }, { v: 'grid', l: '网格拼接' }].map(d => (
              <button key={d.v} onClick={() => { setDirection(d.v); setResult(null) }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${direction === d.v ? 'bg-white text-gray-800' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                {d.l}
              </button>
            ))}
          </div>
        </div>
        {direction === 'grid' && (
          <div>
            <label className="block text-white/80 text-xs mb-1">列数: {gridCols}</label>
            <input type="range" min="2" max="6" step="1" value={gridCols}
              onChange={(e) => { setGridCols(parseInt(e.target.value)); setResult(null) }} className="w-24 accent-white" />
          </div>
        )}
        <div>
          <label className="block text-white/80 text-xs mb-1">间距: {gap}px</label>
          <input type="range" min="0" max="50" step="1" value={gap}
            onChange={(e) => { setGap(parseInt(e.target.value)); setResult(null) }} className="w-24 accent-white" />
        </div>
        <div>
          <label className="block text-white/80 text-xs mb-1">背景</label>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1 text-white/70 text-sm cursor-pointer">
              <input type="checkbox" checked={bgTransparent} onChange={(e) => setBgTransparent(e.target.checked)} className="accent-white" />
              透明
            </label>
            {!bgTransparent && (
              <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)}
                className="w-8 h-8 rounded cursor-pointer" />
            )}
          </div>
        </div>
        <div>
          <label className="block text-white/80 text-xs mb-1">格式</label>
          <div className="flex gap-1">
            {[{ v: 'png', l: 'PNG' }, { v: 'jpeg', l: 'JPG' }, { v: 'webp', l: 'WebP' }].map(f => (
              <button key={f.v} onClick={() => setOutputFormat(f.v)}
                className={`px-2 py-1 rounded text-xs font-medium transition-all ${outputFormat === f.v ? 'bg-white text-gray-800' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                {f.l}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Upload */}
      {files.length === 0 ? (
        <label className="block border-2 border-dashed border-white/30 rounded-xl p-12 text-center cursor-pointer hover:border-white/50 hover:bg-white/5 transition-all"
          onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}>
          <input type="file" accept="image/*" multiple onChange={handleFilesSelect} className="hidden" />
          <svg className="w-12 h-12 mx-auto text-white/40 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
          </svg>
          <p className="text-white/60 mb-1">拖放或点击选择多张图片</p>
          <p className="text-white/40 text-sm">至少选择 2 张图片进行拼接</p>
        </label>
      ) : (
        <>
          <div className="flex items-center justify-between mb-4">
            <span className="text-white/80 text-sm">{files.length} 张图片</span>
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

          {/* Image list with reorder */}
          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2 mb-4">
            {files.map((item, i) => (
              <div key={i} className="group relative bg-white/10 rounded-lg overflow-hidden">
                <img src={item.preview} alt="" className="w-full h-16 object-cover" />
                <div className="absolute top-0.5 left-0.5 bg-black/60 text-white text-xs px-1 rounded">{i + 1}</div>
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-0.5">
                  <button onClick={() => handleMoveUp(i)} disabled={i === 0}
                    className="p-0.5 bg-white/20 rounded hover:bg-white/40 disabled:opacity-30 text-white text-xs">↑</button>
                  <button onClick={() => handleMoveDown(i)} disabled={i === files.length - 1}
                    className="p-0.5 bg-white/20 rounded hover:bg-white/40 disabled:opacity-30 text-white text-xs">↓</button>
                  <button onClick={() => handleRemove(i)}
                    className="p-0.5 bg-red-500/50 rounded hover:bg-red-500/80 text-white text-xs">✕</button>
                </div>
              </div>
            ))}
          </div>

          {/* Stitch button */}
          {!result && (
            <div className="text-center">
              <button onClick={handleStitch} disabled={isProcessing || files.length < 2}
                className="px-8 py-3 bg-white text-gray-800 rounded-xl font-medium hover:bg-white/90 transition-colors disabled:opacity-50">
                {isProcessing ? '拼接中...' : '开始拼接'}
              </button>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="mt-4">
              <div className="bg-white/5 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-white text-sm">
                    拼接完成 · {result.width} × {result.height}px · {formatFileSize(result.blob.size)}
                  </span>
                  <button onClick={handleDownload}
                    className="px-4 py-1.5 bg-white text-gray-800 text-sm rounded-lg font-medium hover:bg-white/90 transition-colors">
                    下载
                  </button>
                </div>
                <img src={result.dataUrl} alt="拼接结果" className="max-w-full h-auto rounded-lg mx-auto" style={{ maxHeight: '400px' }} />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default ImageStitcher
