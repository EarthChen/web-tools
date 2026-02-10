import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  ChevronDown, Trash2, Columns, Rows3, ArrowLeftRight, Eraser,
  Link2, SplitSquareHorizontal, Merge,
  Hash, Calendar
} from 'lucide-react'

const MENU_ITEMS = [
  { id: 'divider1', type: 'divider', label: '数据清洗' },
  { id: 'removeDuplicates', icon: Trash2, label: '去除重复行', desc: '删除重复数据' },
  { id: 'removeEmptyRows', icon: Eraser, label: '清除空行', desc: '删除所有空行' },
  { id: 'conditionalDelete', icon: Rows3, label: '条件删除行', desc: '按条件批量删除' },

  { id: 'divider2', type: 'divider', label: '列操作' },
  { id: 'splitColumn', icon: SplitSquareHorizontal, label: '拆分列', desc: '按分隔符拆分为多列' },
  { id: 'mergeColumns', icon: Merge, label: '合并列', desc: '将多列合并为一列' },
  { id: 'regexExtract', icon: Columns, label: '正则提取列', desc: '用正则提取新列' },

  { id: 'divider3', type: 'divider', label: '格式化' },
  { id: 'formatNumbers', icon: Hash, label: '数字格式化', desc: '小数、千分位、百分比' },
  { id: 'convertDate', icon: Calendar, label: '日期格式转换', desc: '统一日期格式' },

  { id: 'divider4', type: 'divider', label: '高级' },
  { id: 'transpose', icon: ArrowLeftRight, label: '行列转置', desc: '行变列、列变行' },
  { id: 'vlookup', icon: Link2, label: 'VLOOKUP 匹配', desc: '跨文件数据匹配' },
]

export default function AdvancedToolbar({ onAction, disabled = false }) {
  const [isOpen, setIsOpen] = useState(false)
  const buttonRef = useRef(null)
  const menuRef = useRef(null)
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 })

  useEffect(() => {
    if (!isOpen) return
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target) && !buttonRef.current?.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isOpen])

  const handleToggle = () => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setMenuPos({ top: rect.bottom + 4, left: Math.max(8, rect.left - 100) })
    }
    setIsOpen(!isOpen)
  }

  return (
    <>
      <button
        ref={buttonRef}
        onClick={handleToggle}
        disabled={disabled}
        className={`flex items-center gap-1 px-2 py-1.5 text-xs font-medium rounded-lg transition-colors
          ${isOpen ? 'text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30' : 'text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'}
          ${disabled ? 'opacity-40 cursor-not-allowed' : ''}
        `}
      >
        高级
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && createPortal(
        <div
          ref={menuRef}
          className="fixed z-[9999] w-64 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-1 overflow-hidden animate-scaleIn max-h-[70vh] overflow-y-auto"
          style={{ top: menuPos.top, left: menuPos.left }}
        >
          {MENU_ITEMS.map((item) => {
            if (item.type === 'divider') {
              return (
                <div key={item.id} className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mt-1 first:mt-0">
                  {item.label}
                </div>
              )
            }
            const Icon = item.icon
            return (
              <button
                key={item.id}
                onClick={() => { onAction(item.id); setIsOpen(false) }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
              >
                <Icon className="w-4 h-4 flex-shrink-0 text-gray-400" />
                <div>
                  <div className="text-sm">{item.label}</div>
                  <div className="text-[10px] text-gray-400">{item.desc}</div>
                </div>
              </button>
            )
          })}
        </div>,
        document.body
      )}
    </>
  )
}
