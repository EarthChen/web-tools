import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X, BarChart3, Hash, Type, Calendar } from 'lucide-react'

export default function ColumnStatsPopover({ isOpen, stats, onClose }) {
  const ref = useRef(null)

  useEffect(() => {
    if (!isOpen) return
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isOpen, onClose])

  if (!isOpen || !stats) return null

  const typeIcon = {
    number: Hash,
    date: Calendar,
    string: Type,
  }
  const TypeIcon = typeIcon[stats.type] || Type

  const StatItem = ({ label, value, highlight = false }) => (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
      <span className={`text-sm font-medium ${highlight ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-800 dark:text-gray-200'}`}>
        {value}
      </span>
    </div>
  )

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/20" onClick={onClose}>
      <div
        ref={ref}
        className="w-80 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-emerald-600" />
            <span className="font-medium text-gray-800 dark:text-gray-200 text-sm truncate max-w-[180px]">
              {stats.header}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs text-gray-600 dark:text-gray-300">
              <TypeIcon className="w-3 h-3" />
              {stats.type}
            </span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Stats */}
        <div className="px-4 py-3 divide-y divide-gray-100 dark:divide-gray-700">
          <StatItem label="总行数" value={stats.total?.toLocaleString()} />
          <StatItem label="非空值" value={stats.nonEmptyCount?.toLocaleString()} highlight />
          <StatItem label="空值" value={stats.emptyCount?.toLocaleString()} />
          <StatItem label="唯一值" value={stats.uniqueCount?.toLocaleString()} highlight />

          {stats.type === 'number' && stats.numericCount > 0 && (
            <>
              <div className="pt-2 mt-2">
                <div className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">数值统计</div>
              </div>
              <StatItem label="最小值" value={stats.min?.toLocaleString()} />
              <StatItem label="最大值" value={stats.max?.toLocaleString()} />
              <StatItem label="求和" value={stats.sum?.toLocaleString(undefined, { maximumFractionDigits: 2 })} />
              <StatItem label="平均值" value={stats.avg?.toLocaleString(undefined, { maximumFractionDigits: 2 })} highlight />
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
