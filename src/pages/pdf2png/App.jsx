import { useState, useCallback, useEffect, useMemo } from 'react'
import Header from './components/Header'
import Footer from './components/Footer'
import { InlineAd } from '@/components/AdBanner'
import PdfUploader from './components/PdfUploader'
import ConversionResult from './components/ConversionResult'
import ImageUploader from './components/ImageUploader'
import ImagePreviewPanel from './components/ImagePreviewPanel'
import PdfResult from './components/PdfResult'
import PageSelector from './components/PageSelector'
import { loadPdf, generateThumbnails, convertPdfToImages, mergePdfs, splitPdf } from './utils/pdfConverter'
import { convertImagesToPdf, getImagePreviews, cleanupPreviews } from './utils/imageConverter'

// Conversion history helpers
const HISTORY_KEY = 'pdf2png_history'
const MAX_HISTORY = 20

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')
  } catch { return [] }
}

function saveHistory(items) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, MAX_HISTORY)))
}

function addHistoryItem(item) {
  const items = loadHistory()
  items.unshift({ ...item, timestamp: Date.now() })
  saveHistory(items)
}

function App({ isDark: propsDark, onToggleTheme: propsToggle }) {
  // Sync dark mode with global theme (pdf10)
  const [localDark, setLocalDark] = useState(false)
  const isDark = propsDark !== undefined ? propsDark : localDark
  const toggleTheme = propsToggle || (() => {
    setLocalDark(prev => !prev)
    document.documentElement.classList.toggle('dark')
  })

  // Mode: 'pdf2img' | 'img2pdf' | 'merge' | 'split'
  const [mode, setMode] = useState('pdf2img')

  // === PDF → Image state ===
  const [isConverting, setIsConverting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [pdfResults, setPdfResults] = useState([])
  const [error, setError] = useState(null)
  // PDF2Img options
  const [dpi, setDpi] = useState(200)
  const [outputFormat, setOutputFormat] = useState('png') // 'png' | 'jpeg' | 'webp'
  const [imageQuality, setImageQuality] = useState(0.92) // 0-1
  const [watermarkText, setWatermarkText] = useState('')
  const [rotation, setRotation] = useState(0)
  // PDF preview + page selection (pdf1)
  const [pdfDoc, setPdfDoc] = useState(null) // loaded PDF document
  const [pdfFilename, setPdfFilename] = useState('')
  const [thumbnails, setThumbnails] = useState([])
  const [selectedPages, setSelectedPages] = useState([])
  const [showPageSelector, setShowPageSelector] = useState(false)

  // === Image → PDF state ===
  const [imageFiles, setImageFiles] = useState([])
  const [pdfResult, setPdfResult] = useState(null)
  const [pageSize, setPageSize] = useState('a4')
  const [orientation, setOrientation] = useState('auto')
  const [imgMargin, setImgMargin] = useState(10)
  const [imgWatermark, setImgWatermark] = useState('')
  const [imgRotations, setImgRotations] = useState([]) // per-image rotation

  // === PDF Merge state (pdf4) ===
  const [mergeFiles, setMergeFiles] = useState([]) // File[]
  const [mergeResult, setMergeResult] = useState(null)

  // === PDF Split state (pdf7) ===
  const [splitDoc, setSplitDoc] = useState(null)
  const [splitFile, setSplitFile] = useState(null)
  const [splitFilename, setSplitFilename] = useState('')
  const [splitPageCount, setSplitPageCount] = useState(0)
  const [splitRanges, setSplitRanges] = useState('') // e.g. "1-3, 4-5, 6"
  const [splitResults, setSplitResults] = useState([])

  // === Batch processing state (pdf9) ===
  const [batchFiles, setBatchFiles] = useState([]) // multiple PDF files
  const [batchResults, setBatchResults] = useState([])

  // === Conversion history (pdf11) ===
  const [historyItems, setHistoryItems] = useState(() => loadHistory())
  const [showHistory, setShowHistory] = useState(false)

  // Cleanup image previews
  useEffect(() => {
    return () => { cleanupPreviews(imageFiles) }
  }, [imageFiles])

  // ======================== PDF → Image ========================
  const handlePdfSelect = useCallback(async (file) => {
    setError(null)
    setIsConverting(true)
    setProgress(0)
    setPdfResults([])
    setShowPageSelector(false)

    try {
      const { pdf, numPages, filename } = await loadPdf(file)
      setPdfDoc(pdf)
      setPdfFilename(filename)

      // Generate thumbnails for page selection
      setProgress(10)
      const thumbs = await generateThumbnails(pdf)
      setThumbnails(thumbs)
      setSelectedPages(thumbs.map(t => t.pageNum)) // Select all by default
      setShowPageSelector(true)
    } catch (err) {
      setError(err.message || '加载 PDF 失败')
    } finally {
      setIsConverting(false)
    }
  }, [])

  const handleConvertSelectedPages = useCallback(async () => {
    if (!pdfDoc || selectedPages.length === 0) return
    setIsConverting(true)
    setProgress(0)
    setError(null)

    try {
      const results = await convertPdfToImages(pdfDoc, {
        dpi,
        format: outputFormat,
        quality: imageQuality,
        selectedPages,
        watermarkText,
        rotation,
        baseName: pdfFilename,
      }, (p) => setProgress(p))

      setPdfResults(results)
      setShowPageSelector(false)

      // Save to history
      addHistoryItem({
        type: 'pdf2img',
        filename: pdfFilename + '.pdf',
        pages: results.length,
        format: outputFormat,
        dpi,
      })
      setHistoryItems(loadHistory())
    } catch (err) {
      setError(err.message || '转换失败')
    } finally {
      setIsConverting(false)
    }
  }, [pdfDoc, selectedPages, dpi, outputFormat, imageQuality, watermarkText, rotation, pdfFilename])

  // ======================== Image → PDF ========================
  const handleImagesSelect = useCallback(async (files) => {
    try {
      const previews = await getImagePreviews(files)
      setImageFiles(prev => [...prev, ...previews])
      setImgRotations(prev => [...prev, ...previews.map(() => 0)])
    } catch (err) {
      setError(err.message || '图片加载失败')
    }
  }, [])

  const handleConvertToPdf = useCallback(async () => {
    if (imageFiles.length === 0) return
    setIsConverting(true)
    setProgress(0)
    setError(null)

    try {
      const files = imageFiles.map(item => item.file)
      const result = await convertImagesToPdf(files, {
        pageSize,
        orientation,
        margin: imgMargin,
        watermarkText: imgWatermark,
        rotations: imgRotations,
      }, (p) => setProgress(p))

      setPdfResult(result)
      addHistoryItem({
        type: 'img2pdf',
        filename: result.filename,
        images: files.length,
        pageSize,
      })
      setHistoryItems(loadHistory())
    } catch (err) {
      setError(err.message || '转换失败')
    } finally {
      setIsConverting(false)
    }
  }, [imageFiles, pageSize, orientation, imgMargin, imgWatermark, imgRotations])

  const handleRemoveImage = useCallback((index) => {
    setImageFiles(prev => {
      const item = prev[index]
      if (item?.preview) URL.revokeObjectURL(item.preview)
      return prev.filter((_, i) => i !== index)
    })
    setImgRotations(prev => prev.filter((_, i) => i !== index))
  }, [])

  const handleRotateImage = useCallback((index) => {
    setImgRotations(prev => {
      const next = [...prev]
      next[index] = ((next[index] || 0) + 90) % 360
      return next
    })
  }, [])

  const handleReorderImages = useCallback((newOrder) => {
    // Also reorder rotations to match
    const oldIndices = newOrder.map(item => imageFiles.indexOf(item))
    setImgRotations(prev => oldIndices.map(i => prev[i] || 0))
    setImageFiles(newOrder)
  }, [imageFiles])

  const handleResetPdf2Img = () => {
    setPdfResults([])
    setPdfDoc(null)
    setThumbnails([])
    setSelectedPages([])
    setShowPageSelector(false)
    setError(null)
    setProgress(0)
  }

  const handleResetImg2Pdf = useCallback(() => {
    cleanupPreviews(imageFiles)
    setImageFiles([])
    setImgRotations([])
    setPdfResult(null)
    setError(null)
    setProgress(0)
  }, [imageFiles])

  // ======================== PDF Merge ========================
  const handleMergeFilesSelect = useCallback((e) => {
    const files = Array.from(e.target.files || []).filter(f => f.type === 'application/pdf')
    if (files.length > 0) setMergeFiles(prev => [...prev, ...files])
    e.target.value = ''
  }, [])

  const handleRemoveMergeFile = useCallback((index) => {
    setMergeFiles(prev => prev.filter((_, i) => i !== index))
  }, [])

  const handleReorderMergeFile = useCallback((from, to) => {
    setMergeFiles(prev => {
      const next = [...prev]
      const [item] = next.splice(from, 1)
      next.splice(to, 0, item)
      return next
    })
  }, [])

  const handleMerge = useCallback(async () => {
    if (mergeFiles.length < 2) return
    setIsConverting(true)
    setProgress(0)
    setError(null)

    try {
      const result = await mergePdfs(mergeFiles, (p) => setProgress(p))
      setMergeResult(result)
      addHistoryItem({
        type: 'merge',
        filename: result.filename,
        files: mergeFiles.length,
        pages: result.pageCount,
      })
      setHistoryItems(loadHistory())
    } catch (err) {
      setError(err.message || '合并失败')
    } finally {
      setIsConverting(false)
    }
  }, [mergeFiles])

  // ======================== PDF Split ========================
  const handleSplitFileSelect = useCallback(async (file) => {
    setError(null)
    try {
      const { pdf, numPages, filename } = await loadPdf(file)
      setSplitDoc(pdf)
      setSplitFile(file)
      setSplitFilename(filename)
      setSplitPageCount(numPages)
      // Default: split each page individually
      setSplitRanges(Array.from({ length: numPages }, (_, i) => String(i + 1)).join(', '))
    } catch (err) {
      setError(err.message || '加载 PDF 失败')
    }
  }, [])

  const handleSplit = useCallback(async () => {
    if (!splitFile || !splitRanges.trim()) return
    setIsConverting(true)
    setProgress(0)
    setError(null)

    try {
      // Parse ranges
      const ranges = splitRanges.split(',').map(s => s.trim()).filter(Boolean).map(part => {
        const match = part.match(/^(\d+)\s*-\s*(\d+)$/)
        if (match) return { start: parseInt(match[1]), end: parseInt(match[2]) }
        const num = parseInt(part)
        return { start: num, end: num }
      }).filter(r => r.start >= 1 && r.end <= splitPageCount && r.start <= r.end)

      const results = await splitPdf(splitFile, ranges, (p) => setProgress(p))
      setSplitResults(results)
      addHistoryItem({
        type: 'split',
        filename: splitFilename + '.pdf',
        parts: results.length,
      })
      setHistoryItems(loadHistory())
    } catch (err) {
      setError(err.message || '拆分失败')
    } finally {
      setIsConverting(false)
    }
  }, [splitFile, splitRanges, splitPageCount, splitFilename])

  // ======================== Batch Processing ========================
  const handleBatchFilesSelect = useCallback((e) => {
    const files = Array.from(e.target.files || []).filter(f => f.type === 'application/pdf')
    if (files.length > 0) setBatchFiles(prev => [...prev, ...files])
    e.target.value = ''
  }, [])

  const handleBatchConvert = useCallback(async () => {
    if (batchFiles.length === 0) return
    setIsConverting(true)
    setProgress(0)
    setError(null)
    setBatchResults([])

    try {
      const allResults = []
      for (let i = 0; i < batchFiles.length; i++) {
        const file = batchFiles[i]
        const { pdf, filename } = await loadPdf(file)
        const results = await convertPdfToImages(pdf, {
          dpi,
          format: outputFormat,
          quality: imageQuality,
          watermarkText,
          rotation,
          baseName: filename,
        }, () => {})
        allResults.push({ filename: file.name, results })
        setProgress(((i + 1) / batchFiles.length) * 100)
      }
      setBatchResults(allResults)
      addHistoryItem({
        type: 'batch',
        files: batchFiles.length,
        format: outputFormat,
        dpi,
      })
      setHistoryItems(loadHistory())
    } catch (err) {
      setError(err.message || '批量转换失败')
    } finally {
      setIsConverting(false)
    }
  }, [batchFiles, dpi, outputFormat, imageQuality, watermarkText, rotation])

  // ======================== Mode Switch ========================
  const handleModeChange = useCallback((newMode) => {
    setMode(newMode)
    setError(null)
    setProgress(0)
    setIsConverting(false)
  }, [])

  // ======================== History ========================
  const handleClearHistory = useCallback(() => {
    localStorage.removeItem(HISTORY_KEY)
    setHistoryItems([])
  }, [])

  // ======================== Download helpers ========================
  const downloadBlob = useCallback((blob, filename) => {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  }, [])

  // Render mode tabs
  const modes = [
    { value: 'pdf2img', label: 'PDF → 图片' },
    { value: 'img2pdf', label: '图片 → PDF' },
    { value: 'merge', label: 'PDF 合并' },
    { value: 'split', label: 'PDF 拆分' },
    { value: 'batch', label: '批量转换' },
  ]

  return (
    <div className={`min-h-screen gradient-bg animate-gradient ${isDark ? 'dark' : ''}`}>
      <div className="min-h-screen flex flex-col">
        <Header isDark={isDark} onToggleTheme={toggleTheme} />

        <main className="flex-1 max-w-5xl mx-auto px-4 py-8 w-full">
          {/* Title */}
          <section className="text-center mb-6">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">PDF 与图片工具箱</h1>
            <p className="text-white/80">PDF 转图片、图片转 PDF、PDF 合并、拆分、批量转换</p>
          </section>

          {/* Mode tabs */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex bg-white/10 rounded-xl p-1 flex-wrap gap-1">
              {modes.map(m => (
                <button
                  key={m.value}
                  onClick={() => handleModeChange(m.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    mode === m.value
                      ? 'bg-white text-gray-800'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* History toggle */}
          <div className="flex justify-end mb-3">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="text-sm text-white/60 hover:text-white/90 transition-colors flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              转换历史 ({historyItems.length})
            </button>
          </div>

          {/* History panel */}
          {showHistory && (
            <div className="glass rounded-xl p-4 mb-4 max-h-60 overflow-y-auto">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-white text-sm font-medium">最近转换记录</h3>
                {historyItems.length > 0 && (
                  <button onClick={handleClearHistory} className="text-xs text-red-300 hover:text-red-200">清空</button>
                )}
              </div>
              {historyItems.length === 0 ? (
                <p className="text-white/40 text-sm text-center py-4">暂无记录</p>
              ) : (
                <div className="space-y-1">
                  {historyItems.map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-xs text-white/70 py-1 border-b border-white/5 last:border-0">
                      <span>
                        {item.type === 'pdf2img' && `PDF→图片: ${item.filename} (${item.pages}页, ${item.format?.toUpperCase()}, ${item.dpi}DPI)`}
                        {item.type === 'img2pdf' && `图片→PDF: ${item.images}张图片, ${item.pageSize?.toUpperCase()}`}
                        {item.type === 'merge' && `PDF合并: ${item.files}个文件 → ${item.pages}页`}
                        {item.type === 'split' && `PDF拆分: ${item.filename} → ${item.parts}个文件`}
                        {item.type === 'batch' && `批量转换: ${item.files}个PDF, ${item.format?.toUpperCase()}`}
                      </span>
                      <span className="text-white/40">{new Date(item.timestamp).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Main content area */}
          <div className="glass rounded-2xl p-6 md:p-8">
            {/* ==================== PDF → Image ==================== */}
            {mode === 'pdf2img' && (
              pdfResults.length > 0 ? (
                <ConversionResult results={pdfResults} onReset={handleResetPdf2Img} />
              ) : showPageSelector && thumbnails.length > 0 ? (
                <>
                  {/* Conversion options */}
                  <div className="mb-6 space-y-4">
                    {/* DPI */}
                    <div className="flex flex-wrap gap-4">
                      <div>
                        <label className="block text-white/80 text-xs mb-1">图片质量 (DPI)</label>
                        <div className="flex gap-2">
                          {[72, 150, 200, 300].map(d => (
                            <button key={d} onClick={() => setDpi(d)}
                              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${dpi === d ? 'bg-white text-gray-800' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                              {d}
                            </button>
                          ))}
                        </div>
                      </div>
                      {/* Format (pdf2) */}
                      <div>
                        <label className="block text-white/80 text-xs mb-1">输出格式</label>
                        <div className="flex gap-2">
                          {[{ v: 'png', l: 'PNG' }, { v: 'jpeg', l: 'JPG' }, { v: 'webp', l: 'WebP' }].map(f => (
                            <button key={f.v} onClick={() => setOutputFormat(f.v)}
                              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${outputFormat === f.v ? 'bg-white text-gray-800' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                              {f.l}
                            </button>
                          ))}
                        </div>
                      </div>
                      {/* Quality slider (pdf5) */}
                      {outputFormat !== 'png' && (
                        <div>
                          <label className="block text-white/80 text-xs mb-1">压缩质量: {Math.round(imageQuality * 100)}%</label>
                          <input type="range" min="0.1" max="1" step="0.05" value={imageQuality}
                            onChange={(e) => setImageQuality(parseFloat(e.target.value))}
                            className="w-32 accent-white" />
                        </div>
                      )}
                      {/* Rotation */}
                      <div>
                        <label className="block text-white/80 text-xs mb-1">旋转</label>
                        <div className="flex gap-2">
                          {[0, 90, 180, 270].map(r => (
                            <button key={r} onClick={() => setRotation(r)}
                              className={`px-2 py-1.5 rounded-lg text-sm transition-all ${rotation === r ? 'bg-white text-gray-800' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                              {r}°
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    {/* Watermark (pdf6) */}
                    <div>
                      <label className="block text-white/80 text-xs mb-1">水印文字 (可选)</label>
                      <input type="text" value={watermarkText}
                        onChange={(e) => setWatermarkText(e.target.value)}
                        placeholder="输入水印文字..."
                        className="px-3 py-1.5 bg-white/10 text-white text-sm rounded-lg border border-white/20 w-64 placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-white/40" />
                    </div>
                  </div>

                  {/* Page selector */}
                  <PageSelector
                    thumbnails={thumbnails}
                    selectedPages={selectedPages}
                    onSelectedPagesChange={setSelectedPages}
                    onConvert={handleConvertSelectedPages}
                    isConverting={isConverting}
                  />

                  {/* Progress */}
                  {isConverting && (
                    <div className="mt-4 text-center">
                      <div className="w-64 mx-auto bg-white/20 rounded-full h-2 overflow-hidden">
                        <div className="h-full bg-white transition-all duration-300" style={{ width: `${progress}%` }} />
                      </div>
                      <p className="text-white/70 text-sm mt-1">{Math.round(progress)}%</p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <PdfUploader onFileSelect={handlePdfSelect} isConverting={isConverting} progress={progress} />
                  {error && <div className="mt-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200">{error}</div>}
                </>
              )
            )}

            {/* ==================== Image → PDF ==================== */}
            {mode === 'img2pdf' && (
              pdfResult ? (
                <PdfResult result={pdfResult} onReset={handleResetImg2Pdf} />
              ) : imageFiles.length === 0 ? (
                <>
                  <SettingsPanel
                    pageSize={pageSize} setPageSize={setPageSize}
                    orientation={orientation} setOrientation={setOrientation}
                    margin={imgMargin} setMargin={setImgMargin}
                    watermarkText={imgWatermark} setWatermarkText={setImgWatermark}
                  />
                  <ImageUploader onFilesSelect={handleImagesSelect} isConverting={isConverting} progress={progress} />
                  {error && <div className="mt-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200">{error}</div>}
                </>
              ) : (
                <>
                  <SettingsPanel
                    pageSize={pageSize} setPageSize={setPageSize}
                    orientation={orientation} setOrientation={setOrientation}
                    margin={imgMargin} setMargin={setImgMargin}
                    watermarkText={imgWatermark} setWatermarkText={setImgWatermark}
                  />
                  {isConverting ? (
                    <ProgressBar progress={progress} label="正在生成 PDF..." />
                  ) : (
                    <ImagePreviewPanel
                      images={imageFiles}
                      rotations={imgRotations}
                      onRemove={handleRemoveImage}
                      onRotate={handleRotateImage}
                      onReorder={handleReorderImages}
                      onClear={handleResetImg2Pdf}
                      onAddMore={handleImagesSelect}
                      onConvert={handleConvertToPdf}
                      isConverting={isConverting}
                    />
                  )}
                  {error && <div className="mt-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200">{error}</div>}
                </>
              )
            )}

            {/* ==================== PDF Merge ==================== */}
            {mode === 'merge' && (
              mergeResult ? (
                <div className="text-center py-8">
                  <svg className="w-16 h-16 mx-auto text-green-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h2 className="text-xl font-semibold text-white mb-2">合并完成</h2>
                  <p className="text-white/70 mb-4">{mergeResult.pageCount} 页</p>
                  <div className="flex justify-center gap-3">
                    <button onClick={() => downloadBlob(mergeResult.blob, mergeResult.filename)}
                      className="px-6 py-2 bg-white text-gray-800 rounded-lg font-medium hover:bg-white/90 transition-colors">
                      下载 PDF
                    </button>
                    <button onClick={() => { setMergeResult(null); setMergeFiles([]) }}
                      className="px-6 py-2 bg-white/10 text-white rounded-lg font-medium hover:bg-white/20 transition-colors">
                      继续合并
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-white font-medium">选择要合并的 PDF 文件</h3>
                      <label className="px-3 py-1.5 bg-white/10 text-white text-sm rounded-lg hover:bg-white/20 cursor-pointer transition-colors">
                        <input type="file" accept="application/pdf" multiple onChange={handleMergeFilesSelect} className="hidden" />
                        添加文件
                      </label>
                    </div>
                    {mergeFiles.length === 0 ? (
                      <label className="block border-2 border-dashed border-white/30 rounded-xl p-12 text-center cursor-pointer hover:border-white/50 hover:bg-white/5 transition-all">
                        <input type="file" accept="application/pdf" multiple onChange={handleMergeFilesSelect} className="hidden" />
                        <svg className="w-12 h-12 mx-auto text-white/40 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        <p className="text-white/60">拖放或点击选择多个 PDF 文件</p>
                      </label>
                    ) : (
                      <div className="space-y-2">
                        {mergeFiles.map((file, i) => (
                          <div key={i} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                            <div className="flex items-center gap-2 text-white text-sm">
                              <span className="text-white/40 text-xs w-6">{i + 1}.</span>
                              <span className="truncate max-w-[200px]">{file.name}</span>
                              <span className="text-white/40 text-xs">({(file.size / 1024).toFixed(0)} KB)</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <button onClick={() => handleReorderMergeFile(i, Math.max(0, i - 1))} disabled={i === 0}
                                className="p-1 text-white/40 hover:text-white disabled:opacity-30" title="上移">↑</button>
                              <button onClick={() => handleReorderMergeFile(i, Math.min(mergeFiles.length - 1, i + 1))} disabled={i === mergeFiles.length - 1}
                                className="p-1 text-white/40 hover:text-white disabled:opacity-30" title="下移">↓</button>
                              <button onClick={() => handleRemoveMergeFile(i)}
                                className="p-1 text-red-400 hover:text-red-300" title="移除">✕</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {mergeFiles.length >= 2 && (
                    <div className="text-center mt-4">
                      {isConverting ? <ProgressBar progress={progress} label="正在合并..." /> : (
                        <button onClick={handleMerge}
                          className="px-6 py-2 bg-white text-gray-800 rounded-lg font-medium hover:bg-white/90 transition-colors">
                          合并 {mergeFiles.length} 个文件
                        </button>
                      )}
                    </div>
                  )}
                  {error && <div className="mt-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200">{error}</div>}
                </>
              )
            )}

            {/* ==================== PDF Split ==================== */}
            {mode === 'split' && (
              splitResults.length > 0 ? (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-white">拆分完成 ({splitResults.length} 个文件)</h2>
                    <button onClick={() => { setSplitResults([]); setSplitDoc(null); setSplitFile(null) }}
                      className="px-4 py-2 bg-white/10 text-white rounded-lg text-sm hover:bg-white/20 transition-colors">
                      拆分其他
                    </button>
                  </div>
                  <div className="space-y-2">
                    {splitResults.map((r, i) => (
                      <div key={i} className="flex items-center justify-between bg-white/5 rounded-lg px-4 py-3">
                        <span className="text-white text-sm">{r.filename} (页 {r.pageRange})</span>
                        <button onClick={() => downloadBlob(r.blob, r.filename)}
                          className="px-3 py-1 bg-white/10 text-white text-sm rounded hover:bg-white/20 transition-colors">
                          下载
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : splitDoc ? (
                <div>
                  <h3 className="text-white font-medium mb-2">文件: {splitFilename}.pdf ({splitPageCount} 页)</h3>
                  <div className="mb-4">
                    <label className="block text-white/80 text-xs mb-1">拆分范围 (用逗号分隔，如: 1-3, 4, 5-8)</label>
                    <input type="text" value={splitRanges} onChange={(e) => setSplitRanges(e.target.value)}
                      className="px-3 py-2 bg-white/10 text-white text-sm rounded-lg border border-white/20 w-full placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-white/40" />
                  </div>
                  <div className="flex gap-2 mb-2">
                    <button onClick={() => setSplitRanges(Array.from({ length: splitPageCount }, (_, i) => String(i + 1)).join(', '))}
                      className="text-xs px-2 py-1 bg-white/10 text-white rounded hover:bg-white/20">每页单独拆分</button>
                    <button onClick={() => {
                      const half = Math.ceil(splitPageCount / 2)
                      setSplitRanges(`1-${half}, ${half + 1}-${splitPageCount}`)
                    }}
                      className="text-xs px-2 py-1 bg-white/10 text-white rounded hover:bg-white/20">对半拆分</button>
                  </div>
                  <div className="text-center mt-4">
                    {isConverting ? <ProgressBar progress={progress} label="正在拆分..." /> : (
                      <button onClick={handleSplit} className="px-6 py-2 bg-white text-gray-800 rounded-lg font-medium hover:bg-white/90 transition-colors">
                        开始拆分
                      </button>
                    )}
                  </div>
                  {error && <div className="mt-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200">{error}</div>}
                </div>
              ) : (
                <>
                  <PdfUploader onFileSelect={handleSplitFileSelect} isConverting={false} progress={0} />
                  {error && <div className="mt-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200">{error}</div>}
                </>
              )
            )}

            {/* ==================== Batch Processing ==================== */}
            {mode === 'batch' && (
              batchResults.length > 0 ? (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-white">批量转换完成</h2>
                    <button onClick={() => { setBatchResults([]); setBatchFiles([]) }}
                      className="px-4 py-2 bg-white/10 text-white rounded-lg text-sm hover:bg-white/20 transition-colors">
                      转换其他
                    </button>
                  </div>
                  <div className="space-y-4">
                    {batchResults.map((batch, bi) => (
                      <div key={bi} className="bg-white/5 rounded-xl p-4">
                        <h3 className="text-white text-sm font-medium mb-2">{batch.filename} ({batch.results.length} 页)</h3>
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                          {batch.results.map((r, ri) => (
                            <div key={ri} className="relative group cursor-pointer" onClick={() => {
                              const link = document.createElement('a')
                              link.href = r.dataUrl
                              link.download = r.filename
                              link.click()
                            }}>
                              <img src={r.dataUrl} alt={r.filename} className="w-full h-auto rounded" />
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center">
                                <span className="text-white text-xs">下载</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {/* Batch options */}
                  <div className="mb-6 flex flex-wrap gap-4">
                    <div>
                      <label className="block text-white/80 text-xs mb-1">DPI</label>
                      <div className="flex gap-2">
                        {[72, 150, 200, 300].map(d => (
                          <button key={d} onClick={() => setDpi(d)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${dpi === d ? 'bg-white text-gray-800' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                            {d}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-white/80 text-xs mb-1">格式</label>
                      <div className="flex gap-2">
                        {[{ v: 'png', l: 'PNG' }, { v: 'jpeg', l: 'JPG' }, { v: 'webp', l: 'WebP' }].map(f => (
                          <button key={f.v} onClick={() => setOutputFormat(f.v)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${outputFormat === f.v ? 'bg-white text-gray-800' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                            {f.l}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-white font-medium">选择 PDF 文件</h3>
                      <label className="px-3 py-1.5 bg-white/10 text-white text-sm rounded-lg hover:bg-white/20 cursor-pointer transition-colors">
                        <input type="file" accept="application/pdf" multiple onChange={handleBatchFilesSelect} className="hidden" />
                        添加文件
                      </label>
                    </div>
                    {batchFiles.length === 0 ? (
                      <label className="block border-2 border-dashed border-white/30 rounded-xl p-12 text-center cursor-pointer hover:border-white/50 hover:bg-white/5 transition-all">
                        <input type="file" accept="application/pdf" multiple onChange={handleBatchFilesSelect} className="hidden" />
                        <svg className="w-12 h-12 mx-auto text-white/40 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        <p className="text-white/60">选择多个 PDF 文件进行批量转换</p>
                      </label>
                    ) : (
                      <div className="space-y-1">
                        {batchFiles.map((file, i) => (
                          <div key={i} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                            <span className="text-white text-sm truncate">{file.name}</span>
                            <button onClick={() => setBatchFiles(prev => prev.filter((_, j) => j !== i))}
                              className="text-red-400 hover:text-red-300 text-sm">✕</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {batchFiles.length > 0 && (
                    <div className="text-center mt-4">
                      {isConverting ? <ProgressBar progress={progress} label="正在批量转换..." /> : (
                        <button onClick={handleBatchConvert}
                          className="px-6 py-2 bg-white text-gray-800 rounded-lg font-medium hover:bg-white/90 transition-colors">
                          转换 {batchFiles.length} 个文件
                        </button>
                      )}
                    </div>
                  )}
                  {error && <div className="mt-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200">{error}</div>}
                </>
              )
            )}
          </div>

          {/* Feature cards */}
          <section className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon: '🔒', title: '隐私安全', desc: '所有文件仅在浏览器本地处理，不会上传到服务器' },
              { icon: '⚡', title: '功能丰富', desc: '支持格式转换、合并、拆分、水印、旋转等操作' },
              { icon: '📦', title: '批量处理', desc: '支持多文件批量转换，自动打包下载' },
            ].map((item) => (
              <div key={item.title} className="glass rounded-xl p-4 text-center">
                <div className="text-3xl mb-2">{item.icon}</div>
                <h3 className="text-white font-semibold mb-1">{item.title}</h3>
                <p className="text-white/70 text-sm">{item.desc}</p>
              </div>
            ))}
          </section>

          <div className="mt-8"><InlineAd /></div>
        </main>

        <Footer />
      </div>
    </div>
  )
}

// ========== Helper Components ==========

function SettingsPanel({ pageSize, setPageSize, orientation, setOrientation, margin, setMargin, watermarkText, setWatermarkText }) {
  return (
    <div className="mb-6 flex flex-wrap gap-6">
      <div>
        <label className="block text-white/80 text-xs mb-1">页面尺寸</label>
        <div className="flex gap-2">
          {[{ value: 'a4', label: 'A4' }, { value: 'letter', label: 'Letter' }, { value: 'a3', label: 'A3' }, { value: 'fit', label: '适应图片' }].map(s => (
            <button key={s.value} onClick={() => setPageSize(s.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${pageSize === s.value ? 'bg-white text-gray-800' : 'bg-white/10 text-white hover:bg-white/20'}`}>
              {s.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-white/80 text-xs mb-1">页面方向</label>
        <div className="flex gap-2">
          {[{ value: 'auto', label: '自动' }, { value: 'portrait', label: '纵向' }, { value: 'landscape', label: '横向' }].map(o => (
            <button key={o.value} onClick={() => setOrientation(o.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${orientation === o.value ? 'bg-white text-gray-800' : 'bg-white/10 text-white hover:bg-white/20'}`}>
              {o.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-white/80 text-xs mb-1">页边距: {margin}mm</label>
        <input type="range" min="0" max="30" step="1" value={margin}
          onChange={(e) => setMargin(parseInt(e.target.value))}
          className="w-28 accent-white" />
      </div>
      <div>
        <label className="block text-white/80 text-xs mb-1">水印 (可选)</label>
        <input type="text" value={watermarkText} onChange={(e) => setWatermarkText(e.target.value)}
          placeholder="输入水印文字..."
          className="px-3 py-1.5 bg-white/10 text-white text-sm rounded-lg border border-white/20 w-40 placeholder-white/40 focus:outline-none" />
      </div>
    </div>
  )
}

function ProgressBar({ progress, label }) {
  return (
    <div className="text-center py-8">
      <svg className="w-12 h-12 mx-auto text-white/60 animate-spin mb-3" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>
      <p className="text-white mb-2">{label}</p>
      <div className="w-64 mx-auto bg-white/20 rounded-full h-2 overflow-hidden">
        <div className="h-full bg-white transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>
      <p className="text-white/70 text-sm mt-1">{Math.round(progress)}%</p>
    </div>
  )
}

export default App
