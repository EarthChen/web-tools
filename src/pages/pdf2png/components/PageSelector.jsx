import { useState, useCallback, useMemo } from 'react'

function PageSelector({ thumbnails, selectedPages, onSelectedPagesChange, onConvert, isConverting }) {
  const [rangeInput, setRangeInput] = useState('')

  const allSelected = useMemo(() => {
    return selectedPages.length === thumbnails.length
  }, [selectedPages, thumbnails])

  const handleTogglePage = useCallback((pageNum) => {
    onSelectedPagesChange(prev => {
      if (prev.includes(pageNum)) return prev.filter(p => p !== pageNum)
      return [...prev, pageNum].sort((a, b) => a - b)
    })
  }, [onSelectedPagesChange])

  const handleSelectAll = useCallback(() => {
    if (allSelected) {
      onSelectedPagesChange([])
    } else {
      onSelectedPagesChange(thumbnails.map(t => t.pageNum))
    }
  }, [allSelected, thumbnails, onSelectedPagesChange])

  const handleApplyRange = useCallback(() => {
    if (!rangeInput.trim()) return
    const pages = new Set()
    const parts = rangeInput.split(',').map(s => s.trim())
    for (const part of parts) {
      const rangeMatch = part.match(/^(\d+)\s*-\s*(\d+)$/)
      if (rangeMatch) {
        const start = parseInt(rangeMatch[1])
        const end = parseInt(rangeMatch[2])
        for (let p = start; p <= end && p <= thumbnails.length; p++) {
          if (p >= 1) pages.add(p)
        }
      } else {
        const num = parseInt(part)
        if (num >= 1 && num <= thumbnails.length) pages.add(num)
      }
    }
    onSelectedPagesChange([...pages].sort((a, b) => a - b))
  }, [rangeInput, thumbnails, onSelectedPagesChange])

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="text-white font-medium">
          选择页面 ({selectedPages.length}/{thumbnails.length})
        </h3>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={rangeInput}
            onChange={(e) => setRangeInput(e.target.value)}
            placeholder="如: 1-3, 5, 8"
            className="px-2 py-1 bg-white/10 text-white text-sm rounded border border-white/20 w-32 placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-white/40"
            onKeyDown={(e) => e.key === 'Enter' && handleApplyRange()}
          />
          <button
            onClick={handleApplyRange}
            className="px-2 py-1 bg-white/10 text-white text-sm rounded hover:bg-white/20 transition-colors"
          >
            应用
          </button>
          <button
            onClick={handleSelectAll}
            className="px-3 py-1 bg-white/10 text-white text-sm rounded hover:bg-white/20 transition-colors"
          >
            {allSelected ? '取消全选' : '全选'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2 mb-4 max-h-[400px] overflow-y-auto p-1">
        {thumbnails.map((thumb) => {
          const isSelected = selectedPages.includes(thumb.pageNum)
          return (
            <div
              key={thumb.pageNum}
              onClick={() => handleTogglePage(thumb.pageNum)}
              className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                isSelected
                  ? 'border-blue-400 ring-1 ring-blue-400/50'
                  : 'border-transparent hover:border-white/30'
              }`}
            >
              <img
                src={thumb.dataUrl}
                alt={`Page ${thumb.pageNum}`}
                className="w-full h-auto"
              />
              <div className={`absolute top-1 left-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                isSelected ? 'bg-blue-500 text-white' : 'bg-black/50 text-white/80'
              }`}>
                {thumb.pageNum}
              </div>
              {isSelected && (
                <div className="absolute top-1 right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="text-center">
        <button
          onClick={onConvert}
          disabled={isConverting || selectedPages.length === 0}
          className="px-6 py-2 bg-white text-gray-800 rounded-lg font-medium hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          转换选中的 {selectedPages.length} 页
        </button>
      </div>
    </div>
  )
}

export default PageSelector
