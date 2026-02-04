import { Link } from 'react-router-dom'
import { InlineAd } from '@/components/AdBanner'

const tools = [
  {
    id: 'excelcsv-tool',
    name: 'CSV/Excel 转换',
    description: '高性能互转，支持 100MB+ 大文件',
    longDescription: '专业级表格数据处理工具。支持 CSV、Excel (XLSX) 格式互转，内置智能筛选、字段映射与大数据量虚拟滚动预览。',
    icon: '📊',
    path: '/excelcsv-tool',
    tags: ['数据处理', '办公'],
    color: 'from-emerald-400 to-cyan-500',
    span: 'md:col-span-4',
  },
  {
    id: 'json-tools',
    name: 'JSON 工具箱',
    description: '格式化、校验、压缩',
    longDescription: '开发者的瑞士军刀。提供 JSON 格式化、压缩、差异对比及 JSONPath 查询功能。',
    icon: '🔧',
    path: '/json-tools',
    tags: ['开发', '调试'],
    color: 'from-amber-400 to-orange-500',
    span: 'md:col-span-2',
  },
  {
    id: 'pdf2png',
    name: 'PDF 转图片',
    description: '文档转高清 PNG',
    longDescription: '快速将 PDF 文档转换为高质量图片，支持批量导出和页面选择。',
    icon: '📄',
    path: '/pdf2png',
    tags: ['文档', '转换'],
    color: 'from-blue-400 to-indigo-500',
    span: 'md:col-span-3',
  },
  {
    id: 'photo-tool',
    name: '证件照 Pro',
    description: 'AI 智能抠图与尺寸调整',
    longDescription: '一键生成标准证件照。支持背景替换、智能美颜及精确的文件体积控制。',
    icon: '📷',
    path: '/photo-tool',
    tags: ['AI', '图像'],
    color: 'from-pink-400 to-rose-500',
    span: 'md:col-span-3',
  },
]

function Home({ isDark, onToggleTheme }) {
  return (
    <div className={`min-h-screen ${isDark ? 'dark-gradient' : 'light-gradient'} transition-colors duration-500`}>
      {/* Header */}
      <header className="glass sticky top-0 z-50 border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-500 flex items-center justify-center text-white font-bold text-xl shadow-lg">
              E
            </div>
            <span className={`font-display font-bold text-xl tracking-tight ${isDark ? 'text-white' : 'text-slate-800'}`}>
              WebTools
            </span>
          </div>
          <nav className="flex items-center gap-2">
            <a
              href="https://earthchen.github.io/"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                isDark 
                  ? 'text-slate-300 hover:text-white hover:bg-white/10' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              主页
            </a>
            <button
              onClick={onToggleTheme}
              className={`p-2 rounded-lg transition-all ${
                isDark 
                  ? 'text-yellow-400 hover:bg-white/10' 
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
              aria-label="Toggle theme"
            >
              {isDark ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center mb-16 space-y-4">
          <h1 className={`text-5xl md:text-6xl font-bold font-display tracking-tight ${
            isDark 
              ? 'bg-gradient-to-r from-white via-cyan-200 to-blue-200 bg-clip-text text-transparent' 
              : 'text-slate-900'
          }`}>
            在线工具集
          </h1>
          <p className={`text-lg md:text-xl max-w-2xl mx-auto ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            免费、开源、隐私安全。所有数据处理均在您的浏览器本地完成，无需上传服务器。
          </p>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-6 mb-12">
          {tools.map((tool) => (
            <Link
              key={tool.id}
              to={tool.path}
              className={`${tool.span} group relative overflow-hidden rounded-3xl p-1 transition-all duration-300 hover:scale-[1.01] hover:shadow-2xl`}
            >
              {/* Gradient Border Gradient */}
              <div className={`absolute inset-0 bg-gradient-to-br ${tool.color} opacity-20 group-hover:opacity-100 transition-opacity duration-300`} />
              
              {/* Inner Content Card */}
              <div className={`relative h-full bg-white dark:bg-slate-900/90 backdrop-blur-xl rounded-[1.3rem] p-8 flex flex-col transition-colors border border-white/20 dark:border-white/10`}>
                <div className="flex items-start justify-between mb-6">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${tool.color} flex items-center justify-center text-3xl shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300`}>
                    {tool.icon}
                  </div>
                  <div className="flex flex-wrap gap-2 justify-end max-w-[50%]">
                    {tool.tags.map((tag) => (
                      <span
                        key={tag}
                        className={`text-xs font-mono px-2 py-1 rounded-md border ${
                          isDark 
                            ? 'border-white/20 text-white/60 bg-white/5' 
                            : 'border-slate-200 text-slate-500 bg-slate-50'
                        }`}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-auto">
                  <h2 className={`text-2xl font-bold mb-2 font-display ${isDark ? 'text-white' : 'text-slate-800'}`}>
                    {tool.name}
                  </h2>
                  <p className={`text-sm leading-relaxed mb-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {tool.longDescription || tool.description}
                  </p>
                  
                  <div className={`flex items-center text-sm font-semibold ${
                    isDark ? 'text-cyan-400' : 'text-cyan-600'
                  } group-hover:gap-2 transition-all`}>
                    立即使用
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Ad Section */}
        <div className="mt-16 bg-white/5 dark:bg-black/20 rounded-2xl p-4 backdrop-blur-sm border border-white/10">
          <InlineAd />
        </div>
      </main>

      {/* Footer */}
      <footer className="glass border-t border-white/10 py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className={`text-sm font-medium ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            &copy; {new Date().getFullYear()} EarthChen. Built with modern web technologies.
          </p>
        </div>
      </footer>
    </div>
  )
}

export default Home
