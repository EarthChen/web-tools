import { useState, useCallback, useRef, useEffect } from 'react'
import { Search, X, ChevronUp, ChevronDown, Replace, CaseSensitive, WholeWord, Regex } from 'lucide-react'

export default function SearchBar({
  isOpen,
  onClose,
  onSearch,
  onFindReplace,
  searchResults,
  currentIndex,
  onNavigate,
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [replaceTerm, setReplaceTerm] = useState('')
  const [showReplace, setShowReplace] = useState(false)
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [wholeWord, setWholeWord] = useState(false)
  const [useRegex, setUseRegex] = useState(false)
  const searchInputRef = useRef(null)
  const searchTimeoutRef = useRef(null)

  // Focus on open
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus()
      searchInputRef.current.select()
    }
  }, [isOpen])

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    searchTimeoutRef.current = setTimeout(() => {
      if (onSearch && searchTerm) {
        onSearch(searchTerm, { caseSensitive, wholeWord, useRegex })
      } else if (onSearch) {
        onSearch('', {})
      }
    }, 300)
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current) }
  }, [searchTerm, caseSensitive, wholeWord, useRegex, onSearch])

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      onClose()
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (e.shiftKey) {
        onNavigate?.('prev')
      } else {
        onNavigate?.('next')
      }
    }
  }, [onClose, onNavigate])

  const handleReplace = useCallback(() => {
    if (onFindReplace && searchTerm) {
      onFindReplace(searchTerm, replaceTerm, { caseSensitive, wholeWord, useRegex, replaceAll: false })
    }
  }, [onFindReplace, searchTerm, replaceTerm, caseSensitive, wholeWord, useRegex])

  const handleReplaceAll = useCallback(() => {
    if (onFindReplace && searchTerm) {
      onFindReplace(searchTerm, replaceTerm, { caseSensitive, wholeWord, useRegex, replaceAll: true })
    }
  }, [onFindReplace, searchTerm, replaceTerm, caseSensitive, wholeWord, useRegex])

  if (!isOpen) return null

  const total = searchResults?.total || 0
  const matchLabel = total > 0 ? `${(currentIndex ?? 0) + 1} / ${total}` : searchTerm ? '无匹配' : ''

  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-2 shadow-sm animate-slideDown">
      <div className="flex items-center gap-2">
        {/* Toggle replace */}
        <button
          onClick={() => setShowReplace(!showReplace)}
          className={`p-1.5 rounded transition-colors ${showReplace ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
          title="查找替换"
        >
          <Replace className="w-4 h-4" />
        </button>

        {/* Search input */}
        <div className="flex-1 flex items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="搜索内容..."
              className="w-full pl-8 pr-20 py-1.5 text-sm text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-lg border-0 focus:ring-2 focus:ring-emerald-500 transition-all placeholder-gray-400"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 whitespace-nowrap">
              {matchLabel}
            </span>
          </div>

          {/* Options */}
          <button onClick={() => setCaseSensitive(!caseSensitive)} title="区分大小写"
            className={`p-1.5 rounded text-xs font-bold transition-colors ${caseSensitive ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
            <CaseSensitive className="w-4 h-4" />
          </button>
          <button onClick={() => setWholeWord(!wholeWord)} title="全词匹配"
            className={`p-1.5 rounded text-xs font-bold transition-colors ${wholeWord ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
            <WholeWord className="w-4 h-4" />
          </button>
          <button onClick={() => setUseRegex(!useRegex)} title="正则表达式"
            className={`p-1.5 rounded text-xs font-bold transition-colors ${useRegex ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
            <Regex className="w-4 h-4" />
          </button>

          {/* Navigation */}
          <button onClick={() => onNavigate?.('prev')} title="上一个 (Shift+Enter)" disabled={total === 0}
            className="p-1.5 rounded text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 transition-colors">
            <ChevronUp className="w-4 h-4" />
          </button>
          <button onClick={() => onNavigate?.('next')} title="下一个 (Enter)" disabled={total === 0}
            className="p-1.5 rounded text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 transition-colors">
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>

        {/* Close */}
        <button onClick={onClose} className="p-1.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Replace row */}
      {showReplace && (
        <div className="flex items-center gap-2 mt-2 ml-9">
          <div className="relative flex-1 max-w-md">
            <Replace className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={replaceTerm}
              onChange={(e) => setReplaceTerm(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Escape') onClose() }}
              placeholder="替换为..."
              className="w-full pl-8 pr-3 py-1.5 text-sm text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-lg border-0 focus:ring-2 focus:ring-emerald-500 transition-all placeholder-gray-400"
            />
          </div>
          <button
            onClick={handleReplace}
            disabled={total === 0}
            className="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg disabled:opacity-30 transition-colors"
          >
            替换
          </button>
          <button
            onClick={handleReplaceAll}
            disabled={total === 0}
            className="px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-30 transition-colors"
          >
            全部替换
          </button>
        </div>
      )}
    </div>
  )
}
