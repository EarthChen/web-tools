import { useState, useCallback, useEffect } from 'react'
import Header from './components/Header'
import Footer from './components/Footer'
import PdfUploader from './components/PdfUploader'
import ConversionResult from './components/ConversionResult'
import ImageUploader from './components/ImageUploader'
import ImagePreviewPanel from './components/ImagePreviewPanel'
import PdfResult from './components/PdfResult'
import { convertPdfToImages } from './utils/pdfConverter'
import { convertImagesToPdf, getImagePreviews, cleanupPreviews } from './utils/imageConverter'

function App() {
  const [isDark, setIsDark] = useState(false)
  const [mode, setMode] = useState('pdf2img') // 'pdf2img' | 'img2pdf'
  
  // PDF 转图片状态
  const [isConverting, setIsConverting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [pdfResults, setPdfResults] = useState([])
  const [error, setError] = useState(null)
  const [dpi, setDpi] = useState(200)

  // 图片转 PDF 状态
  const [imageFiles, setImageFiles] = useState([])
  const [pdfResult, setPdfResult] = useState(null)
  const [pageSize, setPageSize] = useState('a4')
  const [orientation, setOrientation] = useState('auto')

  const toggleTheme = () => {
    setIsDark(!isDark)
    document.documentElement.classList.toggle('dark')
  }

  // 清理图片预览资源
  useEffect(() => {
    return () => {
      cleanupPreviews(imageFiles)
    }
  }, [imageFiles])

  // PDF 转图片处理
  const handlePdfSelect = useCallback(async (file) => {
    setIsConverting(true)
    setProgress(0)
    setPdfResults([])
    setError(null)

    try {
      const images = await convertPdfToImages(file, dpi, (p) => setProgress(p))
      setPdfResults(images)
    } catch (err) {
      setError(err.message || '转换失败，请重试')
    } finally {
      setIsConverting(false)
    }
  }, [dpi])

  // 图片选择处理
  const handleImagesSelect = useCallback(async (files) => {
    try {
      const previews = await getImagePreviews(files)
      setImageFiles(prev => [...prev, ...previews])
    } catch (err) {
      setError(err.message || '图片加载失败')
    }
  }, [])

  // 图片转 PDF 处理
  const handleConvertToPdf = useCallback(async () => {
    if (imageFiles.length === 0) return

    setIsConverting(true)
    setProgress(0)
    setError(null)

    try {
      const files = imageFiles.map(item => item.file)
      const result = await convertImagesToPdf(
        files,
        { pageSize, orientation },
        (p) => setProgress(p)
      )
      setPdfResult(result)
    } catch (err) {
      setError(err.message || '转换失败，请重试')
    } finally {
      setIsConverting(false)
    }
  }, [imageFiles, pageSize, orientation])

  // 移除图片
  const handleRemoveImage = useCallback((index) => {
    setImageFiles(prev => {
      const item = prev[index]
      if (item?.preview) {
        URL.revokeObjectURL(item.preview)
      }
      return prev.filter((_, i) => i !== index)
    })
  }, [])

  // 重新排序图片
  const handleReorderImages = useCallback((newOrder) => {
    setImageFiles(newOrder)
  }, [])

  // 重置 PDF 转图片
  const handleResetPdf2Img = () => {
    setPdfResults([])
    setError(null)
    setProgress(0)
  }

  // 重置图片转 PDF
  const handleResetImg2Pdf = useCallback(() => {
    cleanupPreviews(imageFiles)
    setImageFiles([])
    setPdfResult(null)
    setError(null)
    setProgress(0)
  }, [imageFiles])

  // 切换模式时重置状态
  const handleModeChange = useCallback((newMode) => {
    setMode(newMode)
    setError(null)
    setProgress(0)
    if (newMode === 'pdf2img') {
      handleResetImg2Pdf()
    } else {
      handleResetPdf2Img()
    }
  }, [handleResetImg2Pdf])

  return (
    <div className={`min-h-screen gradient-bg animate-gradient ${isDark ? 'dark' : ''}`}>
      <div className="min-h-screen flex flex-col">
        <Header isDark={isDark} onToggleTheme={toggleTheme} />

        <main className="flex-1 max-w-4xl mx-auto px-4 py-8 w-full">
          {/* 标题 */}
          <section className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
              PDF 与图片互转
            </h1>
            <p className="text-white/80 text-lg">
              免费在线转换 PDF 和图片，支持双向转换
            </p>
          </section>

          {/* 模式切换 */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex bg-white/10 rounded-xl p-1">
              <button
                onClick={() => handleModeChange('pdf2img')}
                className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                  mode === 'pdf2img'
                    ? 'bg-white text-gray-800'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                PDF → 图片
              </button>
              <button
                onClick={() => handleModeChange('img2pdf')}
                className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                  mode === 'img2pdf'
                    ? 'bg-white text-gray-800'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                图片 → PDF
              </button>
            </div>
          </div>

          {/* 主要内容区 */}
          <div className="glass rounded-2xl p-6 md:p-8">
            {mode === 'pdf2img' ? (
              // PDF 转图片模式
              pdfResults.length === 0 ? (
                <>
                  {/* DPI 设置 */}
                  <div className="mb-6">
                    <label className="block text-white/80 text-sm mb-2">
                      图片质量 (DPI)
                    </label>
                    <div className="flex gap-3">
                      {[72, 150, 200, 300].map((d) => (
                        <button
                          key={d}
                          onClick={() => setDpi(d)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            dpi === d
                              ? 'bg-white text-gray-800'
                              : 'bg-white/10 text-white hover:bg-white/20'
                          }`}
                        >
                          {d} DPI
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 上传区域 */}
                  <PdfUploader
                    onFileSelect={handlePdfSelect}
                    isConverting={isConverting}
                    progress={progress}
                  />

                  {error && (
                    <div className="mt-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200">
                      {error}
                    </div>
                  )}
                </>
              ) : (
                <ConversionResult results={pdfResults} onReset={handleResetPdf2Img} />
              )
            ) : (
              // 图片转 PDF 模式
              pdfResult ? (
                <PdfResult result={pdfResult} onReset={handleResetImg2Pdf} />
              ) : imageFiles.length === 0 ? (
                <>
                  {/* PDF 设置 */}
                  <div className="mb-6 flex flex-wrap gap-6">
                    <div>
                      <label className="block text-white/80 text-sm mb-2">
                        页面尺寸
                      </label>
                      <div className="flex gap-2">
                        {[
                          { value: 'a4', label: 'A4' },
                          { value: 'letter', label: 'Letter' },
                          { value: 'a3', label: 'A3' },
                          { value: 'fit', label: '适应图片' },
                        ].map((s) => (
                          <button
                            key={s.value}
                            onClick={() => setPageSize(s.value)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                              pageSize === s.value
                                ? 'bg-white text-gray-800'
                                : 'bg-white/10 text-white hover:bg-white/20'
                            }`}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-white/80 text-sm mb-2">
                        页面方向
                      </label>
                      <div className="flex gap-2">
                        {[
                          { value: 'auto', label: '自动' },
                          { value: 'portrait', label: '纵向' },
                          { value: 'landscape', label: '横向' },
                        ].map((o) => (
                          <button
                            key={o.value}
                            onClick={() => setOrientation(o.value)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                              orientation === o.value
                                ? 'bg-white text-gray-800'
                                : 'bg-white/10 text-white hover:bg-white/20'
                            }`}
                          >
                            {o.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 图片上传 */}
                  <ImageUploader
                    onFilesSelect={handleImagesSelect}
                    isConverting={isConverting}
                    progress={progress}
                  />

                  {error && (
                    <div className="mt-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200">
                      {error}
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* PDF 设置 */}
                  <div className="mb-6 flex flex-wrap gap-6">
                    <div>
                      <label className="block text-white/80 text-sm mb-2">
                        页面尺寸
                      </label>
                      <div className="flex gap-2">
                        {[
                          { value: 'a4', label: 'A4' },
                          { value: 'letter', label: 'Letter' },
                          { value: 'a3', label: 'A3' },
                          { value: 'fit', label: '适应图片' },
                        ].map((s) => (
                          <button
                            key={s.value}
                            onClick={() => setPageSize(s.value)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                              pageSize === s.value
                                ? 'bg-white text-gray-800'
                                : 'bg-white/10 text-white hover:bg-white/20'
                            }`}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-white/80 text-sm mb-2">
                        页面方向
                      </label>
                      <div className="flex gap-2">
                        {[
                          { value: 'auto', label: '自动' },
                          { value: 'portrait', label: '纵向' },
                          { value: 'landscape', label: '横向' },
                        ].map((o) => (
                          <button
                            key={o.value}
                            onClick={() => setOrientation(o.value)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                              orientation === o.value
                                ? 'bg-white text-gray-800'
                                : 'bg-white/10 text-white hover:bg-white/20'
                            }`}
                          >
                            {o.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 图片预览和操作 */}
                  {isConverting ? (
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
                  ) : (
                    <ImagePreviewPanel
                      images={imageFiles}
                      onRemove={handleRemoveImage}
                      onReorder={handleReorderImages}
                      onClear={handleResetImg2Pdf}
                      onAddMore={handleImagesSelect}
                      onConvert={handleConvertToPdf}
                      isConverting={isConverting}
                    />
                  )}

                  {error && (
                    <div className="mt-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200">
                      {error}
                    </div>
                  )}
                </>
              )
            )}
          </div>

          {/* 功能说明 */}
          <section className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            {(mode === 'pdf2img' ? [
              { icon: '🔒', title: '隐私安全', desc: '文件仅在浏览器本地处理，不会上传到服务器' },
              { icon: '⚡', title: '快速转换', desc: '基于 PDF.js，高效渲染每一页' },
              { icon: '📦', title: '批量下载', desc: '多页 PDF 自动打包成 ZIP 文件' },
            ] : [
              { icon: '🔒', title: '隐私安全', desc: '文件仅在浏览器本地处理，不会上传到服务器' },
              { icon: '📄', title: '多图合并', desc: '支持将多张图片合并为一个 PDF 文件' },
              { icon: '⚙️', title: '灵活设置', desc: '自定义页面尺寸、方向，支持拖拽排序' },
            ]).map((item) => (
              <div key={item.title} className="glass rounded-xl p-4 text-center">
                <div className="text-3xl mb-2">{item.icon}</div>
                <h3 className="text-white font-semibold mb-1">{item.title}</h3>
                <p className="text-white/70 text-sm">{item.desc}</p>
              </div>
            ))}
          </section>
        </main>

        <Footer />
      </div>
    </div>
  )
}

export default App
