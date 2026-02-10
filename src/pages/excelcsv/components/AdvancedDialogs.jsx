import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

// --- Shared Dialog Shell ---
function DialogShell({ title, isOpen, onClose, children, width = 'w-96' }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!isOpen) return
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/20" onClick={onClose}>
      <div ref={ref} className={`${width} bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700">
          <span className="font-medium text-gray-800 dark:text-gray-200 text-sm">{title}</span>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"><X className="w-4 h-4 text-gray-500" /></button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  )
}

// --- Conditional Delete Dialog ---
export function ConditionalDeleteDialog({ isOpen, onClose, headers, onApply }) {
  const [colIdx, setColIdx] = useState(0)
  const [condition, setCondition] = useState('empty')
  const [value, setValue] = useState('')

  const conditions = [
    { id: 'empty', label: '为空' },
    { id: 'notEmpty', label: '非空' },
    { id: 'equals', label: '等于' },
    { id: 'contains', label: '包含' },
    { id: 'startsWith', label: '开头是' },
    { id: 'endsWith', label: '结尾是' },
    { id: 'regex', label: '正则匹配' },
  ]
  const needsValue = !['empty', 'notEmpty'].includes(condition)

  return (
    <DialogShell title="条件删除行" isOpen={isOpen} onClose={onClose}>
      <div className="p-4 space-y-3">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">选择列</label>
          <select value={colIdx} onChange={(e) => setColIdx(parseInt(e.target.value))} className="w-full px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 rounded-lg border-0 focus:ring-2 focus:ring-emerald-500 text-gray-800 dark:text-gray-200">
            {headers.map((h, i) => <option key={i} value={i}>{h}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">条件</label>
          <select value={condition} onChange={(e) => setCondition(e.target.value)} className="w-full px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 rounded-lg border-0 focus:ring-2 focus:ring-emerald-500 text-gray-800 dark:text-gray-200">
            {conditions.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>
        {needsValue && (
          <div>
            <label className="text-xs text-gray-500 mb-1 block">值</label>
            <input type="text" value={value} onChange={(e) => setValue(e.target.value)} placeholder="输入匹配值..."
              className="w-full px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 rounded-lg border-0 focus:ring-2 focus:ring-emerald-500 text-gray-800 dark:text-gray-200 placeholder-gray-400" />
          </div>
        )}
      </div>
      <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80">
        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg">取消</button>
        <button onClick={() => { onApply(colIdx, condition, value); onClose() }} className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg">删除匹配行</button>
      </div>
    </DialogShell>
  )
}

// --- Split Column Dialog ---
export function SplitColumnDialog({ isOpen, onClose, headers, onApply }) {
  const [colIdx, setColIdx] = useState(0)
  const [delimiter, setDelimiter] = useState(',')

  return (
    <DialogShell title="拆分列" isOpen={isOpen} onClose={onClose}>
      <div className="p-4 space-y-3">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">选择列</label>
          <select value={colIdx} onChange={(e) => setColIdx(parseInt(e.target.value))} className="w-full px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 rounded-lg border-0 focus:ring-2 focus:ring-emerald-500 text-gray-800 dark:text-gray-200">
            {headers.map((h, i) => <option key={i} value={i}>{h}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">分隔符</label>
          <input type="text" value={delimiter} onChange={(e) => setDelimiter(e.target.value)} placeholder=","
            className="w-full px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 rounded-lg border-0 focus:ring-2 focus:ring-emerald-500 text-gray-800 dark:text-gray-200 placeholder-gray-400" />
        </div>
      </div>
      <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80">
        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-lg">取消</button>
        <button onClick={() => { onApply(colIdx, delimiter); onClose() }} className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg">拆分</button>
      </div>
    </DialogShell>
  )
}

// --- Merge Columns Dialog ---
export function MergeColumnsDialog({ isOpen, onClose, headers, onApply }) {
  const [selectedCols, setSelectedCols] = useState([])
  const [separator, setSeparator] = useState('')
  const [newName, setNewName] = useState('')

  const toggle = (idx) => {
    setSelectedCols(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx])
  }

  return (
    <DialogShell title="合并列" isOpen={isOpen} onClose={onClose}>
      <div className="p-4 space-y-3">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">选择要合并的列 (至少2列)</label>
          <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
            {headers.map((h, i) => (
              <button key={i} onClick={() => toggle(i)}
                className={`px-2 py-1 text-xs rounded-lg transition-colors ${selectedCols.includes(i) ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200'}`}>
                {h}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">分隔符</label>
          <input type="text" value={separator} onChange={(e) => setSeparator(e.target.value)} placeholder="留空则直接拼接"
            className="w-full px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 rounded-lg border-0 focus:ring-2 focus:ring-emerald-500 text-gray-800 dark:text-gray-200 placeholder-gray-400" />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">新列名 (可选)</label>
          <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="自动生成"
            className="w-full px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 rounded-lg border-0 focus:ring-2 focus:ring-emerald-500 text-gray-800 dark:text-gray-200 placeholder-gray-400" />
        </div>
      </div>
      <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80">
        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-lg">取消</button>
        <button onClick={() => { onApply(selectedCols, separator, newName); onClose() }} disabled={selectedCols.length < 2}
          className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-40">合并</button>
      </div>
    </DialogShell>
  )
}

// --- Regex Extract Dialog ---
export function RegexExtractDialog({ isOpen, onClose, headers, onApply }) {
  const [colIdx, setColIdx] = useState(0)
  const [pattern, setPattern] = useState('')
  const [newName, setNewName] = useState('')

  return (
    <DialogShell title="正则提取列" isOpen={isOpen} onClose={onClose}>
      <div className="p-4 space-y-3">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">源列</label>
          <select value={colIdx} onChange={(e) => setColIdx(parseInt(e.target.value))} className="w-full px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 rounded-lg border-0 focus:ring-2 focus:ring-emerald-500 text-gray-800 dark:text-gray-200">
            {headers.map((h, i) => <option key={i} value={i}>{h}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">正则表达式 (捕获组优先)</label>
          <input type="text" value={pattern} onChange={(e) => setPattern(e.target.value)} placeholder="例: (\d+)"
            className="w-full px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 rounded-lg border-0 focus:ring-2 focus:ring-emerald-500 text-gray-800 dark:text-gray-200 placeholder-gray-400 font-mono" />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">新列名</label>
          <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="自动生成"
            className="w-full px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 rounded-lg border-0 focus:ring-2 focus:ring-emerald-500 text-gray-800 dark:text-gray-200 placeholder-gray-400" />
        </div>
      </div>
      <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80">
        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-lg">取消</button>
        <button onClick={() => { onApply(colIdx, pattern, newName); onClose() }} disabled={!pattern}
          className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-40">提取</button>
      </div>
    </DialogShell>
  )
}

// --- VLookup Dialog ---
export function VLookupDialog({ isOpen, onClose, headers, onApply }) {
  const [keyCol, setKeyCol] = useState(0)
  const [lookupFile, setLookupFile] = useState(null)
  const [lookupKeyCol, setLookupKeyCol] = useState(0)
  const [lookupValueCol, setLookupValueCol] = useState(1)
  const fileInputRef = useRef(null)

  return (
    <DialogShell title="VLOOKUP - 跨文件匹配" isOpen={isOpen} onClose={onClose} width="w-[28rem]">
      <div className="p-4 space-y-3">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">当前表的 Key 列</label>
          <select value={keyCol} onChange={(e) => setKeyCol(parseInt(e.target.value))} className="w-full px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 rounded-lg border-0 focus:ring-2 focus:ring-emerald-500 text-gray-800 dark:text-gray-200">
            {headers.map((h, i) => <option key={i} value={i}>{h}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">查找文件</label>
          <input ref={fileInputRef} type="file" accept=".csv,.xls,.xlsx" onChange={(e) => setLookupFile(e.target.files?.[0])}
            className="w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">查找文件的 Key 列号</label>
            <input type="number" min={0} value={lookupKeyCol} onChange={(e) => setLookupKeyCol(parseInt(e.target.value))}
              className="w-full px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 rounded-lg border-0 focus:ring-2 focus:ring-emerald-500 text-gray-800 dark:text-gray-200" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">查找文件的值列号</label>
            <input type="number" min={0} value={lookupValueCol} onChange={(e) => setLookupValueCol(parseInt(e.target.value))}
              className="w-full px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 rounded-lg border-0 focus:ring-2 focus:ring-emerald-500 text-gray-800 dark:text-gray-200" />
          </div>
        </div>
        <p className="text-[10px] text-gray-400">提示：列号从 0 开始。匹配结果将作为新列追加到当前表末尾。</p>
      </div>
      <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80">
        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-lg">取消</button>
        <button onClick={() => { onApply(lookupFile, keyCol, lookupKeyCol, lookupValueCol); onClose() }} disabled={!lookupFile}
          className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-40">执行匹配</button>
      </div>
    </DialogShell>
  )
}

// --- Number Format Dialog ---
export function NumberFormatDialog({ isOpen, onClose, headers, onApply }) {
  const [colIdx, setColIdx] = useState(0)
  const [formatType, setFormatType] = useState('fixed')
  const [decimals, setDecimals] = useState(2)

  const types = [
    { id: 'fixed', label: '固定小数', desc: '1234.56' },
    { id: 'thousands', label: '千分位', desc: '1,234.56' },
    { id: 'percentage', label: '百分比', desc: '12.34%' },
    { id: 'integer', label: '取整', desc: '1235' },
  ]

  return (
    <DialogShell title="数字格式化" isOpen={isOpen} onClose={onClose}>
      <div className="p-4 space-y-3">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">选择列</label>
          <select value={colIdx} onChange={(e) => setColIdx(parseInt(e.target.value))} className="w-full px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 rounded-lg border-0 focus:ring-2 focus:ring-emerald-500 text-gray-800 dark:text-gray-200">
            {headers.map((h, i) => <option key={i} value={i}>{h}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">格式</label>
          <div className="space-y-1">
            {types.map(t => (
              <button key={t.id} onClick={() => setFormatType(t.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${formatType === t.id ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-gray-50 text-gray-600 hover:bg-gray-100 dark:bg-gray-700/50 dark:text-gray-300'}`}>
                <span>{t.label}</span>
                <span className="text-xs text-gray-400">{t.desc}</span>
              </button>
            ))}
          </div>
        </div>
        {formatType !== 'integer' && (
          <div>
            <label className="text-xs text-gray-500 mb-1 block">小数位数</label>
            <input type="number" min={0} max={10} value={decimals} onChange={(e) => setDecimals(parseInt(e.target.value))}
              className="w-full px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 rounded-lg border-0 focus:ring-2 focus:ring-emerald-500 text-gray-800 dark:text-gray-200" />
          </div>
        )}
      </div>
      <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80">
        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-lg">取消</button>
        <button onClick={() => { onApply(colIdx, formatType, { decimals }); onClose() }}
          className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg">应用</button>
      </div>
    </DialogShell>
  )
}

// --- Date Format Dialog ---
export function DateFormatDialog({ isOpen, onClose, headers, onApply }) {
  const [colIdx, setColIdx] = useState(0)
  const [fromFormat, setFromFormat] = useState('auto')
  const [toFormat, setToFormat] = useState('YYYY-MM-DD')

  const formats = ['auto', 'YYYY-MM-DD', 'YYYY/MM/DD', 'DD/MM/YYYY', 'MM/DD/YYYY', 'YYYYMMDD']

  return (
    <DialogShell title="日期格式转换" isOpen={isOpen} onClose={onClose}>
      <div className="p-4 space-y-3">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">选择列</label>
          <select value={colIdx} onChange={(e) => setColIdx(parseInt(e.target.value))} className="w-full px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 rounded-lg border-0 focus:ring-2 focus:ring-emerald-500 text-gray-800 dark:text-gray-200">
            {headers.map((h, i) => <option key={i} value={i}>{h}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">源格式</label>
          <select value={fromFormat} onChange={(e) => setFromFormat(e.target.value)} className="w-full px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 rounded-lg border-0 focus:ring-2 focus:ring-emerald-500 text-gray-800 dark:text-gray-200">
            {formats.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">目标格式</label>
          <select value={toFormat} onChange={(e) => setToFormat(e.target.value)} className="w-full px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 rounded-lg border-0 focus:ring-2 focus:ring-emerald-500 text-gray-800 dark:text-gray-200">
            {formats.filter(f => f !== 'auto').map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
      </div>
      <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80">
        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-lg">取消</button>
        <button onClick={() => { onApply(colIdx, fromFormat, toFormat); onClose() }}
          className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg">转换</button>
      </div>
    </DialogShell>
  )
}

// --- Export Selective Dialog ---
const EXPORT_FORMATS = [
  { id: 'xlsx', label: 'Excel', desc: 'XLSX 格式' },
  { id: 'csv', label: 'CSV', desc: '逗号分隔文本' },
  { id: 'json', label: 'JSON', desc: 'JSON Array' },
  { id: 'jsonl', label: 'JSONL', desc: 'JSON Lines' },
]

export function ExportSelectiveDialog({ isOpen, onClose, headers, onApply }) {
  const [selectedCols, setSelectedCols] = useState([])
  const [format, setFormat] = useState('xlsx')

  useEffect(() => { if (isOpen) setSelectedCols(headers.map((_, i) => i)) }, [isOpen, headers])

  const toggle = (idx) => setSelectedCols(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx])
  const selectAll = () => setSelectedCols(headers.map((_, i) => i))
  const deselectAll = () => setSelectedCols([])

  return (
    <DialogShell title="选择性导出" isOpen={isOpen} onClose={onClose}>
      <div className="p-4 space-y-3">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">导出格式</label>
          <div className="flex flex-wrap gap-2">
            {EXPORT_FORMATS.map(f => (
              <button key={f.id} onClick={() => setFormat(f.id)}
                className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${format === f.id ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300 dark:ring-emerald-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'}`}>
                <div className="font-medium">{f.label}</div>
                <div className="text-[10px] opacity-70">{f.desc}</div>
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs text-gray-500">选择导出列</label>
            <div className="flex gap-2">
              <button onClick={selectAll} className="text-[10px] text-emerald-600 hover:underline">全选</button>
              <button onClick={deselectAll} className="text-[10px] text-gray-400 hover:underline">清空</button>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
            {headers.map((h, i) => (
              <button key={i} onClick={() => toggle(i)}
                className={`px-2 py-1 text-xs rounded-lg transition-colors ${selectedCols.includes(i) ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
                {h}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80">
        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-lg">取消</button>
        <button onClick={() => { onApply(format, selectedCols); onClose() }} disabled={selectedCols.length === 0}
          className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-40">导出</button>
      </div>
    </DialogShell>
  )
}

// --- JSON Export Dialog ---
export function JsonExportDialog({ isOpen, onClose, onApply }) {
  const [format, setFormat] = useState('array')

  return (
    <DialogShell title="导出为 JSON" isOpen={isOpen} onClose={onClose}>
      <div className="p-4 space-y-3">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">格式</label>
          <div className="space-y-1">
            <button onClick={() => setFormat('array')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${format === 'array' ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-300' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}>
              <span>JSON Array</span><span className="text-xs text-gray-400">[{'{...}'}, {'{...}'}]</span>
            </button>
            <button onClick={() => setFormat('lines')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${format === 'lines' ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-300' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}>
              <span>JSON Lines</span><span className="text-xs text-gray-400">{'{...}'}\n{'{...'}</span>
            </button>
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80">
        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-lg">取消</button>
        <button onClick={() => { onApply(format); onClose() }}
          className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg">导出</button>
      </div>
    </DialogShell>
  )
}
