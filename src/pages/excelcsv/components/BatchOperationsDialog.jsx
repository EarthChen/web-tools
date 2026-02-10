import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Wand2, CaseSensitive, CaseUpper, CaseLower, Scissors, Plus } from 'lucide-react'

const TRANSFORMS = [
  { id: 'trim', label: '去除首尾空格', icon: Scissors, desc: '移除每个值前后的空白字符' },
  { id: 'removeSpaces', label: '移除所有空格', icon: Scissors, desc: '移除值中的所有空白字符' },
  { id: 'uppercase', label: '转为大写', icon: CaseUpper, desc: 'HELLO WORLD' },
  { id: 'lowercase', label: '转为小写', icon: CaseLower, desc: 'hello world' },
  { id: 'capitalize', label: '首字母大写', icon: CaseSensitive, desc: 'Hello World' },
  { id: 'prefix', label: '添加前缀', icon: Plus, desc: '在每个值前添加文本', hasInput: true },
  { id: 'suffix', label: '添加后缀', icon: Plus, desc: '在每个值后追加文本', hasInput: true },
]

export default function BatchOperationsDialog({
  isOpen,
  columnIndex,
  columnName,
  onClose,
  onApply,
}) {
  const [selectedTransform, setSelectedTransform] = useState(null)
  const [inputText, setInputText] = useState('')
  const [isApplying, setIsApplying] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!isOpen) return
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isOpen, onClose])

  useEffect(() => {
    if (isOpen) {
      setSelectedTransform(null)
      setInputText('')
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleApply = async () => {
    if (!selectedTransform) return
    setIsApplying(true)
    try {
      const options = {}
      if (selectedTransform === 'prefix' || selectedTransform === 'suffix') {
        options.text = inputText
      }
      await onApply(columnIndex, selectedTransform, options)
      onClose()
    } finally {
      setIsApplying(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/20" onClick={onClose}>
      <div
        ref={ref}
        className="w-96 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-emerald-600" />
            <span className="font-medium text-gray-800 dark:text-gray-200 text-sm">
              批量变换: {columnName}
            </span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Transform options */}
        <div className="p-3 max-h-80 overflow-y-auto">
          {TRANSFORMS.map((t) => {
            const Icon = t.icon
            const isSelected = selectedTransform === t.id
            return (
              <div key={t.id}>
                <button
                  onClick={() => setSelectedTransform(isSelected ? null : t.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left mb-1
                    ${isSelected ? 'bg-emerald-50 dark:bg-emerald-900/30 ring-1 ring-emerald-300 dark:ring-emerald-700' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}
                  `}
                >
                  <Icon className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-emerald-600' : 'text-gray-400'}`} />
                  <div>
                    <div className={`text-sm font-medium ${isSelected ? 'text-emerald-700 dark:text-emerald-300' : 'text-gray-700 dark:text-gray-200'}`}>
                      {t.label}
                    </div>
                    <div className="text-xs text-gray-400 dark:text-gray-500">{t.desc}</div>
                  </div>
                </button>
                {isSelected && t.hasInput && (
                  <div className="ml-10 mb-2">
                    <input
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder={t.id === 'prefix' ? '输入前缀文本...' : '输入后缀文本...'}
                      className="w-full px-3 py-1.5 text-sm text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-lg border-0 focus:ring-2 focus:ring-emerald-500 transition-all placeholder-gray-400"
                      autoFocus
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleApply}
            disabled={!selectedTransform || isApplying}
            className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-40 transition-colors"
          >
            {isApplying ? '处理中...' : '应用变换'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
