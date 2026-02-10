import { useRef, useState, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  FileSpreadsheet, Download, Trash2, FileText, Table, Layers,
  Undo2, Redo2, PenLine, Search, Copy, Columns, FilePlus2, Lock, Unlock, Eye, EyeOff,
  FileJson, FileDown, ChevronDown
} from 'lucide-react'
import AdvancedToolbar from './AdvancedToolbar'

export default function Header({
  fileInfo,
  totalRows,
  filteredCount,
  sheetNames = [],
  currentSheet,
  onSwitchSheet,
  onExport,
  onClear,
  editState,
  onUndo,
  onRedo,
  onSearch,
  onFindDuplicates,
  onClearDuplicates,
  hasDuplicates,
  onAutoFitWidths,
  onImportFile,
  frozenColumns, // Set<number>
  onFrozenColumnsChange,
  headers = [],
  hiddenColumns, // Set<number>
  onShowColumn,
  onShowAllColumns,
  onAdvancedAction,
}) {
  const hasFile = !!fileInfo
  const hasFilter = filteredCount !== totalRows
  const hasMultipleSheets = sheetNames.length > 1
  const isModified = editState?.isModified
  const appendInputRef = useRef(null)
  const [freezeOpen, setFreezeOpen] = useState(false)
  const freezeRef = useRef(null)

  const hasFrozen = frozenColumns && frozenColumns.size > 0
  const hasHidden = hiddenColumns && hiddenColumns.size > 0
  const [hiddenOpen, setHiddenOpen] = useState(false)
  const hiddenRef = useRef(null)
  const [exportOpen, setExportOpen] = useState(false)
  const exportRef = useRef(null)
  const exportBtnRef = useRef(null)
  const [exportMenuPos, setExportMenuPos] = useState({ top: 0, left: 0 })

  const handleImportFileChange = useCallback((e) => {
    const file = e.target.files?.[0]
    if (file) {
      onImportFile?.(file)
      e.target.value = ''
    }
  }, [onImportFile])

  const toggleFreezeColumn = useCallback((colIndex) => {
    if (!onFrozenColumnsChange) return
    const next = new Set(frozenColumns || [])
    if (next.has(colIndex)) next.delete(colIndex)
    else next.add(colIndex)
    onFrozenColumnsChange(next)
  }, [frozenColumns, onFrozenColumnsChange])

  const clearAllFrozen = useCallback(() => {
    onFrozenColumnsChange?.(new Set())
  }, [onFrozenColumnsChange])

  const handleExportToggle = useCallback(() => {
    if (!exportOpen && exportBtnRef.current) {
      const rect = exportBtnRef.current.getBoundingClientRect()
      setExportMenuPos({ top: rect.bottom + 4, left: Math.max(8, rect.right - 220) })
    }
    setExportOpen(!exportOpen)
  }, [exportOpen])

  // Close popovers on outside click
  useEffect(() => {
    if (!freezeOpen && !hiddenOpen && !exportOpen) return
    const handler = (e) => {
      if (freezeOpen && freezeRef.current && !freezeRef.current.contains(e.target)) setFreezeOpen(false)
      if (hiddenOpen && hiddenRef.current && !hiddenRef.current.contains(e.target)) setHiddenOpen(false)
      if (exportOpen && exportRef.current && !exportRef.current.contains(e.target) && !exportBtnRef.current?.contains(e.target)) setExportOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [freezeOpen, hiddenOpen, exportOpen])

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-2 shadow-sm">
      <div className="max-w-full mx-auto flex items-center justify-between gap-3">
        {/* Logo & Title */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
            <FileSpreadsheet className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-800 dark:text-white flex items-center gap-2">
              ExcelCSV Tool
              {isModified && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/30 rounded-full">
                  <PenLine className="w-2.5 h-2.5" />已修改
                </span>
              )}
            </h1>
            <p className="text-[10px] text-gray-500 dark:text-gray-400">
              双击编辑 · 点击排序 · 右键菜单 · Ctrl+F搜索
            </p>
          </div>
        </div>

        {/* File Info */}
        {hasFile && (
          <div className="hidden lg:flex items-center gap-2 text-sm flex-1 justify-center">
            <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <FileText className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-gray-700 dark:text-gray-300 text-xs font-medium truncate max-w-[120px]">{fileInfo.name}</span>
              <span className="text-[10px] text-gray-500 uppercase">{fileInfo.type}</span>
            </div>

            {hasMultipleSheets && (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                <Layers className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <select
                  value={currentSheet || ''}
                  onChange={(e) => onSwitchSheet(e.target.value)}
                  className="text-xs text-blue-700 dark:text-blue-300 bg-transparent border-none focus:ring-0 cursor-pointer font-medium"
                >
                  {sheetNames.map((name) => <option key={name} value={name} className="text-gray-800">{name}</option>)}
                </select>
              </div>
            )}

            <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg">
              <Table className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs text-emerald-700 dark:text-emerald-300">
                {hasFilter ? (<><span className="font-semibold">{filteredCount.toLocaleString()}</span><span className="text-emerald-600/70"> / {totalRows.toLocaleString()}</span></>) : (<span className="font-semibold">{totalRows.toLocaleString()} 行</span>)}
              </span>
            </div>

            {/* Frozen columns - multi-select popover */}
            <div className="relative" ref={freezeRef}>
              <button
                onClick={() => setFreezeOpen(!freezeOpen)}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-colors ${hasFrozen ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 hover:text-gray-700'}`}
                title="选择冻结列"
              >
                {hasFrozen ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                <span>{hasFrozen ? `冻结 ${frozenColumns.size} 列` : '冻结列'}</span>
              </button>

              {freezeOpen && (
                <div className="absolute top-full left-0 mt-1 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl py-1 min-w-[180px] max-h-[300px] overflow-y-auto animate-scaleIn">
                  {/* Header */}
                  <div className="px-3 py-1.5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-300">选择冻结列</span>
                    {hasFrozen && (
                      <button
                        onClick={clearAllFrozen}
                        className="text-[10px] text-red-500 hover:text-red-700 transition-colors"
                      >
                        全部取消
                      </button>
                    )}
                  </div>

                  {/* Column list */}
                  {headers.map((header, idx) => {
                    const isFrozen = frozenColumns?.has(idx)
                    return (
                      <label
                        key={idx}
                        className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${isFrozen ? 'bg-blue-50/50 dark:bg-blue-900/20' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={isFrozen || false}
                          onChange={() => toggleFreezeColumn(idx)}
                          className="w-3.5 h-3.5 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                        />
                        <span className={`text-xs truncate max-w-[120px] ${isFrozen ? 'text-blue-700 dark:text-blue-300 font-medium' : 'text-gray-700 dark:text-gray-300'}`}>
                          {header}
                        </span>
                        <span className="text-[10px] text-gray-400 ml-auto flex-shrink-0">列{idx + 1}</span>
                      </label>
                    )
                  })}

                  {headers.length === 0 && (
                    <div className="px-3 py-2 text-xs text-gray-400">无列可选</div>
                  )}
                </div>
              )}
            </div>

            {/* Hidden columns indicator & manager */}
            {hasHidden && (
              <div className="relative" ref={hiddenRef}>
                <button
                  onClick={() => setHiddenOpen(!hiddenOpen)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 transition-colors"
                  title="管理隐藏列"
                >
                  <EyeOff className="w-3.5 h-3.5" />
                  <span>隐藏 {hiddenColumns.size} 列</span>
                </button>

                {hiddenOpen && (
                  <div className="absolute top-full left-0 mt-1 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl py-1 min-w-[200px] max-h-[300px] overflow-y-auto animate-scaleIn">
                    <div className="px-3 py-1.5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-300">已隐藏的列</span>
                      <button
                        onClick={() => { onShowAllColumns?.(); setHiddenOpen(false) }}
                        className="text-[10px] text-blue-500 hover:text-blue-700 transition-colors"
                      >
                        全部显示
                      </button>
                    </div>
                    {[...hiddenColumns].sort((a, b) => a - b).map((colIdx) => (
                      <button
                        key={colIdx}
                        onClick={() => onShowColumn?.(colIdx)}
                        className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left"
                      >
                        <Eye className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-xs text-gray-700 dark:text-gray-300 truncate">{headers[colIdx]}</span>
                        <span className="text-[10px] text-gray-400 ml-auto flex-shrink-0">列{colIdx + 1}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1">
          {hasFile && (
            <>
              {/* Search */}
              <button onClick={onSearch} className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors" title="搜索 (Ctrl+F)">
                <Search className="w-4 h-4" />
              </button>

              {/* Find Duplicates */}
              <button
                onClick={hasDuplicates ? onClearDuplicates : onFindDuplicates}
                className={`p-1.5 rounded-lg transition-colors ${hasDuplicates ? 'text-amber-600 bg-amber-50 dark:bg-amber-900/30' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                title={hasDuplicates ? '清除重复标记' : '检测重复行'}
              >
                <Copy className="w-4 h-4" />
              </button>

              {/* Auto Fit */}
              <button onClick={onAutoFitWidths} className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors" title="自动调整列宽">
                <Columns className="w-4 h-4" />
              </button>

              <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-0.5" />

              {/* Undo */}
              <button onClick={onUndo} disabled={!editState?.canUndo}
                className={`p-1.5 rounded-lg transition-colors ${editState?.canUndo ? 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700' : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'}`}
                title="撤销 (Ctrl+Z)">
                <Undo2 className="w-4 h-4" />
              </button>

              {/* Redo */}
              <button onClick={onRedo} disabled={!editState?.canRedo}
                className={`p-1.5 rounded-lg transition-colors ${editState?.canRedo ? 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700' : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'}`}
                title="重做 (Ctrl+Shift+Z)">
                <Redo2 className="w-4 h-4" />
              </button>

              <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-0.5" />

              {/* Import file (overwrite/append dialog) */}
              <input ref={appendInputRef} type="file" accept=".csv,.xls,.xlsx,.json,.jsonl,.ndjson" onChange={handleImportFileChange} className="hidden" />
              <button onClick={() => appendInputRef.current?.click()} className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors" title="导入文件">
                <FilePlus2 className="w-4 h-4" />
              </button>

              {/* Unified Export Dropdown */}
              <button
                ref={exportBtnRef}
                onClick={handleExportToggle}
                className={`flex items-center gap-1 px-2 py-1.5 text-xs font-medium rounded-lg transition-colors shadow-sm
                  ${exportOpen ? 'text-white bg-emerald-700' : 'text-white bg-emerald-600 hover:bg-emerald-700'}
                `}
                title="导出"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">导出</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${exportOpen ? 'rotate-180' : ''}`} />
              </button>

              {exportOpen && createPortal(
                <div
                  ref={exportRef}
                  className="fixed z-[9999] w-56 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-1 overflow-hidden"
                  style={{ top: exportMenuPos.top, left: exportMenuPos.left }}
                >
                  <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">导出格式</div>
                  <button onClick={() => { onExport('csv'); setExportOpen(false) }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left">
                    <FileText className="w-4 h-4 flex-shrink-0 text-gray-400" />
                    <div><div>导出为 CSV</div><div className="text-[10px] text-gray-400">逗号分隔文本</div></div>
                  </button>
                  <button onClick={() => { onExport('xlsx'); setExportOpen(false) }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left">
                    <FileSpreadsheet className="w-4 h-4 flex-shrink-0 text-emerald-500" />
                    <div><div>导出为 Excel</div><div className="text-[10px] text-gray-400">XLSX 格式</div></div>
                  </button>
                  <button onClick={() => { onAdvancedAction('exportJson'); setExportOpen(false) }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left">
                    <FileJson className="w-4 h-4 flex-shrink-0 text-amber-500" />
                    <div><div>导出为 JSON</div><div className="text-[10px] text-gray-400">JSON / JSON Lines</div></div>
                  </button>
                  <div className="my-1 border-t border-gray-100 dark:border-gray-700" />
                  <button onClick={() => { onAdvancedAction('exportSelective'); setExportOpen(false) }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left">
                    <FileDown className="w-4 h-4 flex-shrink-0 text-blue-500" />
                    <div><div>选择性导出</div><div className="text-[10px] text-gray-400">仅导出选定的列</div></div>
                  </button>
                </div>,
                document.body
              )}

              {/* Advanced Toolbar */}
              <AdvancedToolbar onAction={onAdvancedAction} />

              <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-0.5" />

              {/* Clear */}
              <button onClick={onClear}
                className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                title="清除数据">
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
