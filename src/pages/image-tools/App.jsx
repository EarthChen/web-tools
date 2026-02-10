import { useState } from 'react'
import Header from './components/Header'
import Footer from './components/Footer'
import { InlineAd } from '@/components/AdBanner'
import ImageCompressor from './components/ImageCompressor'
import FormatConverter from './components/FormatConverter'
import ImageStitcher from './components/ImageStitcher'

const MODES = [
  { value: 'compress', label: '图片压缩', icon: '📦', desc: '批量压缩，可视化对比' },
  { value: 'convert', label: '格式转换', icon: '🔄', desc: 'PNG/JPG/WebP/ICO 互转' },
  { value: 'stitch', label: '图片拼接', icon: '🧩', desc: '横向/纵向/网格拼接' },
]

function App({ isDark: propsDark, onToggleTheme: propsToggle }) {
  const [localDark, setLocalDark] = useState(false)
  const isDark = propsDark !== undefined ? propsDark : localDark
  const toggleTheme = propsToggle || (() => {
    setLocalDark(prev => !prev)
    document.documentElement.classList.toggle('dark')
  })

  const [mode, setMode] = useState('compress')

  return (
    <div className={`min-h-screen gradient-bg animate-gradient ${isDark ? 'dark' : ''}`}>
      <div className="min-h-screen flex flex-col">
        <Header isDark={isDark} onToggleTheme={toggleTheme} />

        <main className="flex-1 max-w-5xl mx-auto px-4 py-8 w-full">
          {/* Title */}
          <section className="text-center mb-6">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">图片工具箱</h1>
            <p className="text-white/80">压缩、格式转换、拼接 — 纯浏览器处理，隐私安全</p>
          </section>

          {/* Mode tabs */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex bg-white/10 rounded-xl p-1 gap-1">
              {MODES.map(m => (
                <button
                  key={m.value}
                  onClick={() => setMode(m.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                    mode === m.value
                      ? 'bg-white text-gray-800'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <span>{m.icon}</span>
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Main content */}
          <div className="glass rounded-2xl p-6 md:p-8">
            {mode === 'compress' && <ImageCompressor />}
            {mode === 'convert' && <FormatConverter />}
            {mode === 'stitch' && <ImageStitcher />}
          </div>

          {/* Feature cards */}
          <section className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon: '🔒', title: '隐私安全', desc: '所有处理均在浏览器本地完成，图片不会上传到任何服务器' },
              { icon: '⚡', title: '极速处理', desc: '基于 Canvas API，充分利用 GPU 加速，处理速度极快' },
              { icon: '📱', title: '功能丰富', desc: '压缩、格式转换、拼接一站式解决，支持批量操作' },
            ].map(item => (
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

export default App
