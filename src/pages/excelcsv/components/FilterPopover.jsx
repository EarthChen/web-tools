import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Search, Square, CheckSquare, Loader2, X } from 'lucide-react'

export default function FilterPopover({
  columnIndex,
  columnName,
  currentFilter,
  onApply,
  onClose,
  onGetUniqueValues,
  anchorRef,
}) {
  const [values, setValues] = useState([])
  const [selectedValues, setSelectedValues] = useState(new Set(currentFilter || []))
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const popoverRef = useRef(null)
  const searchTimeoutRef = useRef(null)

  // 计算弹窗位置
  useEffect(() => {
    if (anchorRef?.current) {
      const rect = anchorRef.current.getBoundingClientRect()
      setPosition({
        top: rect.bottom + 4,
        left: Math.max(8, Math.min(rect.left, window.innerWidth - 300)),
      })
    }
  }, [anchorRef])

  // 加载唯一值
  const loadValues = useCallback(async (search = '') => {
    setIsLoading(true)
    try {
      const result = await onGetUniqueValues(columnIndex, search)
      setValues(result.values)
      setHasMore(result.hasMore)
      
      // 如果没有当前筛选，默认全选
      if (!currentFilter) {
        setSelectedValues(new Set(result.values))
      }
    } catch (error) {
      console.error('Failed to load unique values:', error)
    } finally {
      setIsLoading(false)
    }
  }, [columnIndex, onGetUniqueValues, currentFilter])

  // 初始加载
  useEffect(() => {
    loadValues()
  }, [loadValues])

  // 搜索防抖
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      loadValues(searchTerm)
    }, 300)
    
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchTerm, loadValues])

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        onClose()
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  const handleToggleValue = (value) => {
    const newSelected = new Set(selectedValues)
    if (newSelected.has(value)) {
      newSelected.delete(value)
    } else {
      newSelected.add(value)
    }
    setSelectedValues(newSelected)
  }

  const handleSelectAll = () => {
    setSelectedValues(new Set(values))
  }

  const handleDeselectAll = () => {
    setSelectedValues(new Set())
  }

  const handleInvertSelection = () => {
    const newSelected = new Set()
    values.forEach(v => {
      if (!selectedValues.has(v)) {
        newSelected.add(v)
      }
    })
    setSelectedValues(newSelected)
  }

  const handleApply = () => {
    if (selectedValues.size === values.length) {
      // 全选时清除筛选
      onApply(columnIndex, null)
    } else if (selectedValues.size === 0) {
      // 空选时也清除筛选（显示全部）
      onApply(columnIndex, null)
    } else {
      onApply(columnIndex, Array.from(selectedValues))
    }
    onClose()
  }

  const handleClearFilter = () => {
    onApply(columnIndex, null)
    onClose()
  }

  return createPortal(
    <div
      ref={popoverRef}
      className="fixed w-72 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-[9999] overflow-hidden"
      style={{ top: position.top, left: position.left }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* 标题栏 */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">
          筛选: {columnName}
        </span>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>
      
      {/* 搜索框 */}
      <div className="p-2 border-b border-gray-200 dark:border-gray-700">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="搜索..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-sm text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 border-0 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:bg-white dark:focus:bg-gray-600 transition-all placeholder-gray-400"
          />
        </div>
      </div>
      
      {/* 快捷操作 */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-gray-100 dark:border-gray-700">
        <button
          onClick={handleSelectAll}
          className="px-2 py-1 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
        >
          全选
        </button>
        <button
          onClick={handleDeselectAll}
          className="px-2 py-1 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
        >
          清空
        </button>
        <button
          onClick={handleInvertSelection}
          className="px-2 py-1 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
        >
          反选
        </button>
        {currentFilter && (
          <button
            onClick={handleClearFilter}
            className="ml-auto px-2 py-1 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
          >
            清除筛选
          </button>
        )}
      </div>
      
      {/* 值列表 */}
      <div className="max-h-64 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />
            <span className="ml-2 text-sm text-gray-500">加载中...</span>
          </div>
        ) : values.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-500">
            没有找到匹配的值
          </div>
        ) : (
          <div className="py-1">
            {values.map((value, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                onClick={() => handleToggleValue(value)}
              >
                <span className="flex-shrink-0">
                  {selectedValues.has(value) ? (
                    <CheckSquare className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <Square className="w-4 h-4 text-gray-400" />
                  )}
                </span>
                <span className="text-sm text-gray-700 dark:text-gray-300 truncate flex-1">
                  {value === '' ? <span className="italic text-gray-400">(空值)</span> : value}
                </span>
              </div>
            ))}
            {hasMore && (
              <div className="px-3 py-2 text-xs text-gray-400 text-center">
                仅显示前 1000 个值，请使用搜索缩小范围
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* 底部操作 */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80">
        <span className="text-xs text-gray-500">
          已选 {selectedValues.size} / {values.length}
        </span>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleApply}
            className="px-3 py-1.5 text-sm text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
          >
            应用
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
