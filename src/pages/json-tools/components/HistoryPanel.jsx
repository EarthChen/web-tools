import { useState, useMemo, useRef, useEffect } from 'react'

function HistoryPanel({ history, onSelect, onRemove, onClear }) {
  const [search, setSearch] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const panelRef = useRef(null)

  // 点击外部区域自动关闭
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      // 使用 mousedown 以便在点击时立即响应
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const filteredHistory = useMemo(() => {
    if (!search.trim()) return history
    const searchLower = search.toLowerCase()
    return history.filter(
      (item) =>
        item.json.toLowerCase().includes(searchLower) ||
        item.preview.toLowerCase().includes(searchLower)
    )
  }, [history, search])

  const formatTime = (timestamp) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return '刚刚'
    if (diffMins < 60) return `${diffMins}分钟前`
    if (diffHours < 24) return `${diffHours}小时前`
    if (diffDays < 7) return `${diffDays}天前`
    return date.toLocaleDateString()
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
          isOpen
            ? 'bg-white/30 text-white'
            : 'bg-white/10 text-white/70 hover:bg-white/20'
        }`}
      >
        历史记录 ({history.length})
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-gray-900/95 backdrop-blur rounded-lg shadow-xl border border-white/10 z-50">
          {/* 搜索框 */}
          <div className="p-3 border-b border-white/10">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索历史记录..."
              className="w-full bg-white/10 text-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/30 placeholder-white/40"
            />
          </div>

          {/* 历史列表 */}
          <div className="max-h-[300px] overflow-y-auto">
            {filteredHistory.length === 0 ? (
              <p className="text-white/50 text-sm text-center py-6">
                {search ? '未找到匹配记录' : '暂无历史记录'}
              </p>
            ) : (
              filteredHistory.map((item) => (
                <div
                  key={item.id}
                  className="group px-3 py-2 hover:bg-white/5 cursor-pointer border-b border-white/5 last:border-0"
                  onClick={() => {
                    onSelect(item.json)
                    setIsOpen(false)
                  }}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <p className="text-white/90 text-sm font-mono truncate">
                        {item.preview}
                      </p>
                      <p className="text-white/50 text-xs mt-1">
                        {formatTime(item.timestamp)}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onRemove(item.id)
                      }}
                      className="opacity-0 group-hover:opacity-100 ml-2 text-white/40 hover:text-red-400 transition-all"
                      title="删除"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* 底部操作 */}
          {history.length > 0 && (
            <div className="p-2 border-t border-white/10">
              <button
                onClick={() => {
                  if (confirm('确定要清空所有历史记录吗？')) {
                    onClear()
                  }
                }}
                className="text-xs text-white/50 hover:text-red-400 transition-colors"
              >
                清空全部
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default HistoryPanel
