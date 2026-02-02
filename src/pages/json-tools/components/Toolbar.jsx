import { useState, useRef, useEffect } from 'react'

function Toolbar({
  onFormat,
  onMinify,
  onSortKeysAsc,
  onSortKeysDesc,
  onEscape,
  onUnescape,
  onRepair,
  indentSize,
  onIndentSizeChange,
  compareMode,
  onToggleCompareMode,
}) {
  const [showSortMenu, setShowSortMenu] = useState(false)
  const sortMenuRef = useRef(null)

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(event.target)) {
        setShowSortMenu(false)
      }
    }

    if (showSortMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showSortMenu])

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <button
        onClick={onFormat}
        className="px-3 py-2 bg-white text-gray-800 rounded-lg text-sm font-medium hover:bg-white/90 transition-colors"
      >
        格式化
      </button>
      <button
        onClick={onMinify}
        className="px-3 py-2 bg-white/20 text-white rounded-lg text-sm font-medium hover:bg-white/30 transition-colors"
      >
        压缩
      </button>
      
      {/* Key 排序下拉菜单 */}
      <div className="relative" ref={sortMenuRef}>
        <button
          onClick={() => setShowSortMenu(!showSortMenu)}
          className={`px-3 py-2 bg-white/20 text-white rounded-lg text-sm font-medium hover:bg-white/30 transition-colors flex items-center gap-1 ${
            showSortMenu ? 'bg-white/30' : ''
          }`}
        >
          Key 排序
          <svg className={`w-3 h-3 transition-transform ${showSortMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {showSortMenu && (
          <div className="absolute top-full left-0 mt-1 bg-gray-900/95 backdrop-blur rounded-lg shadow-xl border border-white/10 z-50 overflow-hidden min-w-[120px]">
            <button
              onClick={() => {
                onSortKeysAsc()
                setShowSortMenu(false)
              }}
              className="w-full px-4 py-2 text-left text-sm text-white hover:bg-white/10 transition-colors flex items-center gap-2"
            >
              <span>↑</span> 正序 (A-Z)
            </button>
            <button
              onClick={() => {
                onSortKeysDesc()
                setShowSortMenu(false)
              }}
              className="w-full px-4 py-2 text-left text-sm text-white hover:bg-white/10 transition-colors flex items-center gap-2"
            >
              <span>↓</span> 倒序 (Z-A)
            </button>
          </div>
        )}
      </div>
      <button
        onClick={onEscape}
        className="px-3 py-2 bg-white/20 text-white rounded-lg text-sm font-medium hover:bg-white/30 transition-colors"
      >
        转义
      </button>
      <button
        onClick={onUnescape}
        className="px-3 py-2 bg-white/20 text-white rounded-lg text-sm font-medium hover:bg-white/30 transition-colors"
      >
        去除转义
      </button>
      <button
        onClick={onRepair}
        className="px-3 py-2 bg-white/20 text-white rounded-lg text-sm font-medium hover:bg-white/30 transition-colors"
      >
        尝试修复
      </button>

      {/* 对比模式按钮 */}
      <button
        onClick={onToggleCompareMode}
        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
          compareMode
            ? 'bg-blue-500 text-white hover:bg-blue-600'
            : 'bg-white/20 text-white hover:bg-white/30'
        }`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        {compareMode ? '退出对比' : 'JSON 对比'}
      </button>

      <div className="flex items-center gap-2 ml-auto">
        <span className="text-white/70 text-sm">缩进:</span>
        <select
          value={indentSize}
          onChange={(e) => onIndentSizeChange(Number(e.target.value))}
          className="bg-white/10 text-white rounded px-2 py-1 text-sm focus:outline-none"
        >
          <option value={2}>2 空格</option>
          <option value={4}>4 空格</option>
          <option value={1}>Tab</option>
        </select>
      </div>
    </div>
  )
}

export default Toolbar
