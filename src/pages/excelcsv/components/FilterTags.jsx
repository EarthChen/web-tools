import { X } from 'lucide-react'

export default function FilterTags({ filters, headers, onRemoveFilter, onClearAll }) {
  const filterEntries = Object.entries(filters)
  
  if (filterEntries.length === 0) {
    return null
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800">
      <span className="text-xs font-medium text-amber-700 dark:text-amber-300 flex-shrink-0">
        筛选条件:
      </span>
      
      <div className="flex items-center gap-2 flex-wrap flex-1 overflow-hidden">
        {filterEntries.map(([colIdx, values]) => {
          const columnName = headers[parseInt(colIdx)] || `列${parseInt(colIdx) + 1}`
          const displayValues = values.length > 3 
            ? `${values.slice(0, 3).join(', ')}... (共${values.length}项)`
            : values.join(', ')
          
          return (
            <div
              key={colIdx}
              className="flex items-center gap-1 px-2 py-1 bg-white dark:bg-gray-800 border border-amber-300 dark:border-amber-700 rounded-lg text-xs"
            >
              <span className="font-medium text-amber-800 dark:text-amber-200">
                {columnName}:
              </span>
              <span className="text-gray-700 dark:text-gray-300 max-w-[150px] truncate" title={values.join(', ')}>
                {displayValues}
              </span>
              <button
                onClick={() => onRemoveFilter(parseInt(colIdx))}
                className="p-0.5 hover:bg-amber-100 dark:hover:bg-amber-800 rounded transition-colors"
                title="移除此筛选"
              >
                <X className="w-3 h-3 text-amber-600 dark:text-amber-400" />
              </button>
            </div>
          )
        })}
      </div>
      
      <button
        onClick={onClearAll}
        className="flex-shrink-0 px-2 py-1 text-xs text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-800 rounded transition-colors"
      >
        清除全部
      </button>
    </div>
  )
}
