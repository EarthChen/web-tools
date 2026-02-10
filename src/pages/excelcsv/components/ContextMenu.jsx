import { useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Plus, Trash2, Copy, ClipboardPaste, BarChart3, Columns, Scissors, Type, EyeOff } from 'lucide-react'

// Stable sub-components defined outside to prevent re-creation
function MenuItem({ icon: Icon, label, onClick, danger = false }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors text-left
        ${danger ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'}
      `}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span>{label}</span>
    </button>
  )
}

function Divider() {
  return <div className="my-1 border-t border-gray-100 dark:border-gray-700" />
}

function SectionLabel({ children }) {
  return <div className="px-3 py-1.5 text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">{children}</div>
}

export default function ContextMenu({
  isOpen,
  position,
  cellInfo,
  onClose,
  onAddRowAbove,
  onAddRowBelow,
  onDeleteRow,
  onDuplicateRow,
  onAddColumnLeft,
  onAddColumnRight,
  onDeleteColumn,
  onCopyCell,
  onPasteCell,
  onShowColumnStats,
  onShowBatchOps,
  onHideColumn,
}) {
  const menuRef = useRef(null)

  // Calculate position once when menu opens, memoized
  const adjustedPosition = useMemo(() => {
    if (!position) return { x: 0, y: 0 }
    const menuWidth = 224
    const menuHeight = 420
    let x = position.x
    let y = position.y
    if (x + menuWidth > window.innerWidth) x = window.innerWidth - menuWidth - 8
    if (y + menuHeight > window.innerHeight) y = window.innerHeight - menuHeight - 8
    if (x < 4) x = 4
    if (y < 4) y = 4
    return { x, y }
  }, [position])

  useEffect(() => {
    if (!isOpen) return
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) onClose()
    }
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    // Use setTimeout to avoid catching the same right-click event
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClick)
      document.addEventListener('keydown', handleKeyDown)
    }, 0)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen || !cellInfo) return null

  const { actualRowIndex, colIndex } = cellInfo

  const close = onClose

  return createPortal(
    <div
      ref={menuRef}
      className="fixed z-[9999] w-56 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-1 overflow-hidden"
      style={{ top: adjustedPosition.y, left: adjustedPosition.x, opacity: 1 }}
    >
      <SectionLabel>行操作</SectionLabel>
      <MenuItem icon={Plus} label="在上方插入行" onClick={() => { onAddRowAbove(actualRowIndex); close() }} />
      <MenuItem icon={Plus} label="在下方插入行" onClick={() => { onAddRowBelow(actualRowIndex); close() }} />
      <MenuItem icon={Copy} label="复制当前行" onClick={() => { onDuplicateRow(actualRowIndex); close() }} />
      <MenuItem icon={Trash2} label="删除当前行" onClick={() => { onDeleteRow(actualRowIndex); close() }} danger />

      <Divider />

      <SectionLabel>列操作</SectionLabel>
      <MenuItem icon={Columns} label="在左侧插入列" onClick={() => { onAddColumnLeft(colIndex); close() }} />
      <MenuItem icon={Columns} label="在右侧插入列" onClick={() => { onAddColumnRight(colIndex); close() }} />
      <MenuItem icon={EyeOff} label="隐藏当前列" onClick={() => { onHideColumn?.(colIndex); close() }} />
      <MenuItem icon={Trash2} label="删除当前列" onClick={() => { onDeleteColumn(colIndex); close() }} danger />

      <Divider />

      <SectionLabel>其他</SectionLabel>
      <MenuItem icon={Scissors} label="复制单元格" onClick={() => { onCopyCell(actualRowIndex, colIndex); close() }} />
      <MenuItem icon={ClipboardPaste} label="粘贴" onClick={() => { onPasteCell(actualRowIndex, colIndex); close() }} />
      <MenuItem icon={BarChart3} label="列统计" onClick={() => { onShowColumnStats(colIndex); close() }} />
      <MenuItem icon={Type} label="批量变换此列" onClick={() => { onShowBatchOps(colIndex); close() }} />
    </div>,
    document.body
  )
}
