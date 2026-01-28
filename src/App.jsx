import { Routes, Route } from 'react-router-dom'
import { useState, useEffect, lazy, Suspense } from 'react'
import Home from './pages/Home'
import { FeedbackButton } from './components/FeedbackButton'
import { Agentation } from 'agentation'

// 懒加载各工具页面
const ExcelCsvTool = lazy(() => import('./pages/excelcsv/App'))
const JsonTools = lazy(() => import('./pages/json-tools/App'))
const Pdf2Png = lazy(() => import('./pages/pdf2png/App'))
const PhotoTool = lazy(() => import('./pages/photo-tool/App'))

// 加载中组件
function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center dark-gradient">
      <div className="text-white text-lg">加载中...</div>
    </div>
  )
}

function App() {
  const [isDark, setIsDark] = useState(true)

  useEffect(() => {
    const saved = localStorage.getItem('theme')
    if (saved) {
      setIsDark(saved === 'dark')
    }
  }, [])

  const toggleTheme = () => {
    const newTheme = !isDark
    setIsDark(newTheme)
    localStorage.setItem('theme', newTheme ? 'dark' : 'light')
  }

  return (
    <>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<Home isDark={isDark} onToggleTheme={toggleTheme} />} />
          <Route path="/excelcsv-tool" element={<ExcelCsvTool />} />
          <Route path="/json-tools" element={<JsonTools isDark={isDark} onToggleTheme={toggleTheme} />} />
          <Route path="/pdf2png" element={<Pdf2Png isDark={isDark} onToggleTheme={toggleTheme} />} />
          <Route path="/photo-tool" element={<PhotoTool />} />
        </Routes>
      </Suspense>
      {/* 全局反馈按钮 */}
      <FeedbackButton />
      {/* AI 可视化反馈工具 (仅开发环境) */}
      {import.meta.env.DEV && <Agentation />}
    </>
  )
}

export default App
