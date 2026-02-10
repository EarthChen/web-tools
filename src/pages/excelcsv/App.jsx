import { useState, useCallback, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Header from './components/Header'
import { InlineAd } from '@/components/AdBanner'
import FileUploader from './components/FileUploader'
import VirtualTable from './components/VirtualTable'
import StatusBar from './components/StatusBar'
import FilterTags from './components/FilterTags'
import SearchBar from './components/SearchBar'
import ContextMenu from './components/ContextMenu'
import ColumnStatsPopover from './components/ColumnStatsPopover'
import BatchOperationsDialog from './components/BatchOperationsDialog'
import AdvancedToolbar from './components/AdvancedToolbar'
import {
  ConditionalDeleteDialog, SplitColumnDialog, MergeColumnsDialog,
  RegexExtractDialog, VLookupDialog, NumberFormatDialog, DateFormatDialog,
  ExportSelectiveDialog, JsonExportDialog,
} from './components/AdvancedDialogs'
import { useWorker } from './hooks/useWorker'

function App() {
  // Core state
  const [fileInfo, setFileInfo] = useState(null)
  const [sheetNames, setSheetNames] = useState([])
  const [currentSheet, setCurrentSheet] = useState(null)
  const [headers, setHeaders] = useState([])
  const [totalRows, setTotalRows] = useState(0)
  const [filteredIndices, setFilteredIndices] = useState([])
  const [filters, setFilters] = useState({})
  const [sheetFilters, setSheetFilters] = useState({})
  const [sheetIndices, setSheetIndices] = useState({})
  const [status, setStatus] = useState({ type: 'idle', message: '' })
  const [uploadProgress, setUploadProgress] = useState(0)
  const [sortState, setSortState] = useState({ columnIndex: null, direction: null })
  const [editState, setEditState] = useState({ canUndo: false, canRedo: false, isModified: false, historySize: 0 })

  // Search
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchResults, setSearchResults] = useState(null)
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0)
  const [searchHighlights, setSearchHighlights] = useState([])

  // UI state
  const [contextMenu, setContextMenu] = useState({ isOpen: false, position: { x: 0, y: 0 }, cellInfo: null })
  const [columnStats, setColumnStats] = useState({ isOpen: false, stats: null })
  const [batchOps, setBatchOps] = useState({ isOpen: false, columnIndex: null, columnName: '' })
  const [duplicateHighlights, setDuplicateHighlights] = useState([])
  const [selectedCells, setSelectedCells] = useState([])
  const [columnWidths, setColumnWidths] = useState({})
  const [frozenColumns, setFrozenColumns] = useState(new Set()) // Set<number> of frozen column indices
  const [hiddenColumns, setHiddenColumns] = useState(new Set()) // Set<number> of hidden column indices

  // Advanced dialog state
  const [activeDialog, setActiveDialog] = useState(null)
  // 'conditionalDelete' | 'splitColumn' | 'mergeColumns' | 'regexExtract' | 'vlookup' | 'numberFormat' | 'dateFormat' | 'exportSelective' | 'exportJson'

  // Drag-and-drop overlay state (when file is already loaded)
  const [isDragOver, setIsDragOver] = useState(false)
  const [pendingDropFile, setPendingDropFile] = useState(null) // file awaiting user choice (overwrite/append)

  const w = useWorker()

  const navigate = useNavigate()

  // Navigation guard: confirm before leaving when file is loaded
  const confirmLeave = useCallback((e, path) => {
    if (!fileInfo) return // No data, allow navigation
    e.preventDefault()
    const msg = editState.isModified
      ? '当前有已修改但未导出的数据，离开后将丢失。确定要离开吗？'
      : '当前有已加载的数据，离开后将丢失。确定要离开吗？'
    if (window.confirm(msg)) {
      navigate(path)
    }
  }, [fileInfo, editState.isModified, navigate])

  // Helper: download blob
  const downloadBlob = useCallback((blobUrl, filename) => {
    const link = document.createElement('a')
    link.href = blobUrl
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(blobUrl)
  }, [])

  // Helper: refresh indices
  const refreshIndices = useCallback(async () => {
    try {
      let result
      if (sortState.columnIndex !== null && sortState.direction) result = await w.sortData(sortState.columnIndex, sortState.direction, filters)
      else result = await w.applyFilter(filters)
      setFilteredIndices(result.indices)
    } catch (error) { console.error('refresh error:', error) }
  }, [w, sortState, filters])

  // Helper: sync edit state
  const markModified = useCallback(() => {
    setEditState(prev => ({ ...prev, canUndo: true, canRedo: false, isModified: true }))
  }, [])

  // --- Global Keyboard ---
  useEffect(() => {
    const h = (e) => {
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key === 'f' && fileInfo) { e.preventDefault(); setSearchOpen(true) }
      if (mod && e.key === 'z' && !e.shiftKey && fileInfo) { e.preventDefault(); handleUndo() }
      if (mod && ((e.key === 'z' && e.shiftKey) || e.key === 'y') && fileInfo) { e.preventDefault(); handleRedo() }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [fileInfo, editState])

  // Block browser tab close / refresh when file is loaded
  useEffect(() => {
    const h = (e) => {
      if (fileInfo) { e.preventDefault(); e.returnValue = '当前有数据未导出，确定离开吗？' }
    }
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [fileInfo])

  // Block browser back/forward navigation (popstate) when file is loaded
  const popstateSkipRef = useRef(false)
  useEffect(() => {
    if (!fileInfo) return
    // Push a guard entry so pressing back triggers popstate instead of leaving
    window.history.pushState({ excelGuard: true }, '')
    const handlePopState = () => {
      // Skip popstate events triggered by our own cleanup
      if (popstateSkipRef.current) {
        popstateSkipRef.current = false
        return
      }
      const msg = editState.isModified
        ? '当前有已修改但未导出的数据，离开后将丢失。确定要离开吗？'
        : '当前有已加载的数据，离开后将丢失。确定要离开吗？'
      if (window.confirm(msg)) {
        // User confirmed: go back for real
        popstateSkipRef.current = true
        window.history.back()
      } else {
        // User cancelled: re-push guard entry to stay
        window.history.pushState({ excelGuard: true }, '')
      }
    }
    window.addEventListener('popstate', handlePopState)
    return () => {
      window.removeEventListener('popstate', handlePopState)
      // Clean up the guard entry if component unmounts normally
      if (window.history.state?.excelGuard) {
        popstateSkipRef.current = true
        window.history.back()
      }
    }
  }, [fileInfo, editState.isModified])

  // ========================== FILE ==========================
  const handleFileUpload = useCallback(async (file) => {
    try {
      setStatus({ type: 'loading', message: '正在解析文件...' })
      setUploadProgress(0)
      const iv = setInterval(() => setUploadProgress(p => Math.min(p + 10, 90)), 100)
      const r = await w.parseFile(file)
      clearInterval(iv); setUploadProgress(100)
      const ext = file.name.split('.').pop()?.toLowerCase() || ''
      const fileType = ext === 'csv' ? 'csv' : ['json', 'jsonl', 'ndjson'].includes(ext) ? 'json' : 'xlsx'
      setFileInfo({ name: file.name, size: file.size, type: fileType })
      const first = r.currentSheet || r.sheetNames?.[0]
      setSheetNames(r.sheetNames || []); setCurrentSheet(first); setHeaders(r.headers); setTotalRows(r.totalRows); setFilteredIndices(r.indices)
      setFilters({}); setSortState({ columnIndex: null, direction: null }); setEditState({ canUndo: false, canRedo: false, isModified: false, historySize: 0 })
      setColumnWidths({}); setFrozenColumns(new Set()); setHiddenColumns(new Set()); setDuplicateHighlights([]); setSearchHighlights([]); setSearchResults(null)
      const sf = {}, si = {}; r.sheetNames?.forEach(n => { sf[n] = {}; si[n] = null }); if (first) si[first] = r.indices
      setSheetFilters(sf); setSheetIndices(si)
      setStatus({ type: 'success', message: `成功加载 ${r.totalRows.toLocaleString()} 行数据${r.sheetNames?.length > 1 ? ` (${r.sheetNames.length}个工作表)` : ''}` })
      setTimeout(() => setUploadProgress(0), 500)
    } catch (e) { setStatus({ type: 'error', message: `解析失败: ${e.message}` }); setUploadProgress(0) }
  }, [w])

  const handleAppendFile = useCallback(async (file) => {
    try {
      setStatus({ type: 'loading', message: '正在追加导入...' })
      const r = await w.appendFile(file)
      setTotalRows(r.totalRows); setFilteredIndices(r.indices); await refreshIndices()
      setStatus({ type: 'success', message: `追加 ${r.appended} 行，共 ${r.totalRows} 行` })
    } catch (e) { setStatus({ type: 'error', message: `追加失败: ${e.message}` }) }
  }, [w, refreshIndices])

  // ========================== HIDE COLUMN ==========================
  const handleHideColumn = useCallback((colIndex) => {
    setHiddenColumns(prev => { const next = new Set(prev); next.add(colIndex); return next })
    setStatus({ type: 'success', message: `已隐藏列 "${headers[colIndex]}"` })
  }, [headers])

  const handleShowColumn = useCallback((colIndex) => {
    setHiddenColumns(prev => { const next = new Set(prev); next.delete(colIndex); return next })
  }, [])

  const handleShowAllColumns = useCallback(() => {
    setHiddenColumns(new Set())
    setStatus({ type: 'success', message: '已显示所有列' })
  }, [])

  // ========================== FILTER ==========================
  const handleFilterChange = useCallback(async (columnIndex, selectedValues) => {
    const nf = { ...filters }; if (!selectedValues || selectedValues.length === 0) delete nf[columnIndex]; else nf[columnIndex] = selectedValues
    setFilters(nf); setStatus({ type: 'loading', message: '正在筛选...' })
    try {
      const r = sortState.direction ? await w.sortData(sortState.columnIndex, sortState.direction, nf) : await w.applyFilter(nf)
      setFilteredIndices(r.indices)
      if (currentSheet) { setSheetFilters(p => ({ ...p, [currentSheet]: nf })); setSheetIndices(p => ({ ...p, [currentSheet]: r.indices })) }
      setStatus({ type: 'success', message: `显示 ${r.indices.length.toLocaleString()} / ${totalRows.toLocaleString()} 行` })
    } catch (e) { setStatus({ type: 'error', message: e.message }) }
  }, [filters, w, sortState, totalRows, currentSheet])

  const handleGetUniqueValues = useCallback(async (ci) => {
    try { return await w.getUniqueValues(ci) } catch { return { values: [], hasMore: false } }
  }, [w])

  const handleRemoveFilter = useCallback(async (ci) => {
    const nf = { ...filters }; delete nf[ci]; setFilters(nf)
    try {
      const r = sortState.direction ? await w.sortData(sortState.columnIndex, sortState.direction, nf) : await w.applyFilter(nf)
      setFilteredIndices(r.indices)
      if (currentSheet) { setSheetFilters(p => ({ ...p, [currentSheet]: nf })); setSheetIndices(p => ({ ...p, [currentSheet]: r.indices })) }
      setStatus({ type: 'success', message: `显示 ${r.indices.length.toLocaleString()} 行` })
    } catch (e) { setStatus({ type: 'error', message: e.message }) }
  }, [filters, w, sortState, currentSheet])

  const handleClearAllFilters = useCallback(async () => {
    setFilters({})
    try {
      const r = sortState.direction ? await w.sortData(sortState.columnIndex, sortState.direction, {}) : await w.applyFilter({})
      setFilteredIndices(r.indices)
      if (currentSheet) { setSheetFilters(p => ({ ...p, [currentSheet]: {} })); setSheetIndices(p => ({ ...p, [currentSheet]: r.indices })) }
      setStatus({ type: 'success', message: `显示全部 ${totalRows.toLocaleString()} 行` })
    } catch (e) { setStatus({ type: 'error', message: e.message }) }
  }, [w, sortState, totalRows, currentSheet])

  // ========================== SORT ==========================
  const handleSort = useCallback(async (ci, dir) => {
    try {
      if (!dir) { setSortState({ columnIndex: null, direction: null }); const r = await w.applyFilter(filters); setFilteredIndices(r.indices); setStatus({ type: 'success', message: '已还原排序' }) }
      else { setSortState({ columnIndex: ci, direction: dir }); const r = await w.sortData(ci, dir, filters); setFilteredIndices(r.indices); setStatus({ type: 'success', message: `已按 ${headers[ci]} ${dir === 'asc' ? '升序' : '降序'}` }) }
    } catch (e) { setStatus({ type: 'error', message: e.message }) }
  }, [w, filters, headers])

  // ========================== EDIT ==========================
  const handleCellEdit = useCallback(async (ri, ci, val) => {
    try {
      const r = await w.updateCell(ri, ci, val)
      if (r.changed) { setEditState(p => ({ ...p, canUndo: r.canUndo, canRedo: r.canRedo, isModified: true, historySize: r.historySize })); setStatus({ type: 'success', message: `已更新 [行${ri + 1}, ${headers[ci]}]` }) }
      return r
    } catch (e) { setStatus({ type: 'error', message: e.message }); return { changed: false } }
  }, [w, headers])

  const handleUndo = useCallback(async () => {
    if (!editState.canUndo) return
    try {
      const r = await w.undoEdit()
      if (r.success) { setEditState(p => ({ ...p, canUndo: r.canUndo, canRedo: r.canRedo, isModified: r.canUndo })); if (r.headers) setHeaders(r.headers); if (r.totalRows !== undefined) setTotalRows(r.totalRows); if (r.indices) setFilteredIndices(r.indices); setStatus({ type: 'success', message: '已撤销' }) }
    } catch (e) { setStatus({ type: 'error', message: e.message }) }
  }, [w, editState.canUndo])

  const handleRedo = useCallback(async () => {
    if (!editState.canRedo) return
    try {
      const r = await w.redoEdit()
      if (r.success) { setEditState(p => ({ ...p, canUndo: r.canUndo, canRedo: r.canRedo, isModified: true })); if (r.headers) setHeaders(r.headers); if (r.totalRows !== undefined) setTotalRows(r.totalRows); if (r.indices) setFilteredIndices(r.indices); setStatus({ type: 'success', message: '已重做' }) }
    } catch (e) { setStatus({ type: 'error', message: e.message }) }
  }, [w, editState.canRedo])

  // ========================== SEARCH ==========================
  const handleSearch = useCallback(async (term, opts) => {
    if (!term) { setSearchResults(null); setSearchHighlights([]); setCurrentSearchIndex(0); return }
    try { const r = await w.searchData(term, opts); setSearchResults(r); setSearchHighlights(r.matches || []); setCurrentSearchIndex(0) }
    catch (e) { setStatus({ type: 'error', message: e.message }) }
  }, [w])

  const handleSearchNavigate = useCallback((d) => {
    if (!searchResults?.total) return
    setCurrentSearchIndex(p => d === 'next' ? (p + 1) % searchResults.total : (p === 0 ? searchResults.total - 1 : p - 1))
  }, [searchResults])

  const handleFindReplace = useCallback(async (s, r, opts) => {
    try {
      const res = await w.findReplace(s, r, opts)
      if (res.replaced > 0) { markModified(); setStatus({ type: 'success', message: `已替换 ${res.replaced} 处` }); handleSearch(s, opts) }
      else setStatus({ type: 'success', message: '无匹配' })
    } catch (e) { setStatus({ type: 'error', message: e.message }) }
  }, [w, handleSearch, markModified])

  // ========================== ROW/COL OPS ==========================
  const handleAddRowAbove = useCallback(async (ri) => { const r = await w.addRow(ri); setTotalRows(r.totalRows); setFilteredIndices(r.indices); markModified(); setStatus({ type: 'success', message: '已插入行' }) }, [w, markModified])
  const handleAddRowBelow = useCallback(async (ri) => { const r = await w.addRow(ri + 1); setTotalRows(r.totalRows); setFilteredIndices(r.indices); markModified(); setStatus({ type: 'success', message: '已插入行' }) }, [w, markModified])
  const handleDeleteRow = useCallback(async (ri) => { const r = await w.deleteRows([ri]); setTotalRows(r.totalRows); setFilteredIndices(r.indices); markModified(); setStatus({ type: 'success', message: '已删除行' }) }, [w, markModified])
  const handleDuplicateRow = useCallback(async (ri) => { const r = await w.duplicateRow(ri); setTotalRows(r.totalRows); setFilteredIndices(r.indices); markModified(); setStatus({ type: 'success', message: '已复制行' }) }, [w, markModified])
  const handleAddColumnLeft = useCallback(async (ci) => { const r = await w.addColumn(ci); setHeaders(r.headers); markModified(); setStatus({ type: 'success', message: '已插入列' }) }, [w, markModified])
  const handleAddColumnRight = useCallback(async (ci) => { const r = await w.addColumn(ci + 1); setHeaders(r.headers); markModified(); setStatus({ type: 'success', message: '已插入列' }) }, [w, markModified])
  const handleDeleteColumn = useCallback(async (ci) => { const r = await w.deleteColumn(ci); setHeaders(r.headers); markModified(); setStatus({ type: 'success', message: '已删除列' }) }, [w, markModified])

  const handleCopyCell = useCallback(async (ri, ci) => {
    try { const r = await w.getRows([ri], 0, 1); const v = r.rows[0]?.data?.[ci]; await navigator.clipboard.writeText(v == null ? '' : String(v)); setStatus({ type: 'success', message: '已复制' }) }
    catch (e) { setStatus({ type: 'error', message: e.message }) }
  }, [w])

  const handlePasteCell = useCallback(async (ri, ci) => {
    try {
      const text = await navigator.clipboard.readText()
      const lines = text.split('\n').filter(Boolean)
      if (lines.length > 1 || lines[0]?.includes('\t')) {
        for (let r = 0; r < lines.length; r++) { const cols = lines[r].split('\t'); for (let c = 0; c < cols.length; c++) { if (ri + r < totalRows && ci + c < headers.length) await w.updateCell(ri + r, ci + c, cols[c]) } }
        markModified(); setStatus({ type: 'success', message: `已粘贴 ${lines.length} 行` })
      } else { await handleCellEdit(ri, ci, text) }
    } catch (e) { setStatus({ type: 'error', message: e.message }) }
  }, [w, handleCellEdit, totalRows, headers.length, markModified])

  // ========================== STATS / ANALYSIS ==========================
  const handleShowColumnStats = useCallback(async (ci) => { try { setColumnStats({ isOpen: true, stats: await w.getColumnStats(ci) }) } catch (e) { setStatus({ type: 'error', message: e.message }) } }, [w])
  const handleShowBatchOps = useCallback((ci) => setBatchOps({ isOpen: true, columnIndex: ci, columnName: headers[ci] }), [headers])

  const handleBatchTransform = useCallback(async (ci, tt, opts) => {
    try { const r = await w.batchTransform(ci, tt, opts); if (r.transformed > 0) { markModified(); setStatus({ type: 'success', message: `已变换 ${r.transformed} 个` }) } else setStatus({ type: 'success', message: '无变化' }) }
    catch (e) { setStatus({ type: 'error', message: e.message }) }
  }, [w, markModified])

  const handleFindDuplicates = useCallback(async () => {
    try { const r = await w.findDuplicates(); setDuplicateHighlights(r.duplicateIndices || []); setStatus({ type: 'success', message: r.totalDuplicateRows > 0 ? `${r.totalDuplicateGroups} 组重复 (${r.totalDuplicateRows} 行)` : '无重复' }) }
    catch (e) { setStatus({ type: 'error', message: e.message }) }
  }, [w])

  const handleAutoFitWidths = useCallback(async () => {
    try { const r = await w.autoFitWidths(); const m = {}; r.widths.forEach((v, i) => { m[i] = v }); setColumnWidths(m); setStatus({ type: 'success', message: '列宽已调整' }) }
    catch (e) { setStatus({ type: 'error', message: e.message }) }
  }, [w])

  // ========================== ADVANCED ACTIONS ==========================
  const handleAdvancedAction = useCallback((actionId) => {
    switch (actionId) {
      case 'removeDuplicates': handleRemoveDuplicates(); break
      case 'removeEmptyRows': handleRemoveEmptyRows(); break
      case 'conditionalDelete': setActiveDialog('conditionalDelete'); break
      case 'splitColumn': setActiveDialog('splitColumn'); break
      case 'mergeColumns': setActiveDialog('mergeColumns'); break
      case 'regexExtract': setActiveDialog('regexExtract'); break
      case 'formatNumbers': setActiveDialog('numberFormat'); break
      case 'convertDate': setActiveDialog('dateFormat'); break
      case 'transpose': handleTranspose(); break
      case 'vlookup': setActiveDialog('vlookup'); break
      case 'exportJson': setActiveDialog('exportJson'); break
      case 'exportSelective': setActiveDialog('exportSelective'); break
      default: break
    }
  }, [])

  const handleRemoveDuplicates = useCallback(async () => {
    try { setStatus({ type: 'loading', message: '正在去重...' }); const r = await w.removeDuplicates(); setTotalRows(r.totalRows); setFilteredIndices(r.indices); markModified(); setDuplicateHighlights([]); setStatus({ type: 'success', message: r.removed > 0 ? `已删除 ${r.removed} 个重复行` : '无重复行' }) }
    catch (e) { setStatus({ type: 'error', message: e.message }) }
  }, [w, markModified])

  const handleRemoveEmptyRows = useCallback(async () => {
    try { setStatus({ type: 'loading', message: '正在清除空行...' }); const r = await w.removeEmptyRows(); setTotalRows(r.totalRows); setFilteredIndices(r.indices); markModified(); setStatus({ type: 'success', message: r.removed > 0 ? `已清除 ${r.removed} 个空行` : '无空行' }) }
    catch (e) { setStatus({ type: 'error', message: e.message }) }
  }, [w, markModified])

  const handleConditionalDelete = useCallback(async (ci, cond, val) => {
    try { const r = await w.conditionalDelete(ci, cond, val); setTotalRows(r.totalRows); setFilteredIndices(r.indices); markModified(); setStatus({ type: 'success', message: `已删除 ${r.removed} 行` }) }
    catch (e) { setStatus({ type: 'error', message: e.message }) }
  }, [w, markModified])

  const handleSplitColumn = useCallback(async (ci, delim) => {
    try { const r = await w.splitColumn(ci, delim); setHeaders(r.headers); setStatus({ type: 'success', message: `已拆分为 ${r.splitCount} 列` }) }
    catch (e) { setStatus({ type: 'error', message: e.message }) }
  }, [w])

  const handleMergeColumns = useCallback(async (cols, sep, name) => {
    try { const r = await w.mergeColumns(cols, sep, name); setHeaders(r.headers); setStatus({ type: 'success', message: '已合并列' }) }
    catch (e) { setStatus({ type: 'error', message: e.message }) }
  }, [w])

  const handleRegexExtract = useCallback(async (ci, pattern, name) => {
    try { const r = await w.regexExtract(ci, pattern, name); setHeaders(r.headers); setStatus({ type: 'success', message: '已提取新列' }) }
    catch (e) { setStatus({ type: 'error', message: e.message }) }
  }, [w])

  const handleTranspose = useCallback(async () => {
    try { setStatus({ type: 'loading', message: '正在转置...' }); const r = await w.transpose(); setHeaders(r.headers); setTotalRows(r.totalRows); setFilteredIndices(r.indices); setStatus({ type: 'success', message: '已完成行列转置' }) }
    catch (e) { setStatus({ type: 'error', message: e.message }) }
  }, [w])

  const handleVlookup = useCallback(async (file, keyCol, lkCol, lvCol) => {
    try { setStatus({ type: 'loading', message: '正在匹配...' }); const r = await w.vlookup(file, keyCol, lkCol, lvCol); setHeaders(r.headers); setStatus({ type: 'success', message: `匹配完成，${r.matchCount} 个匹配` }) }
    catch (e) { setStatus({ type: 'error', message: e.message }) }
  }, [w])

  const handleNumberFormat = useCallback(async (ci, ft, opts) => {
    try { const r = await w.formatNumbers(ci, ft, opts); markModified(); setStatus({ type: 'success', message: `已格式化 ${r.formatted} 个` }) }
    catch (e) { setStatus({ type: 'error', message: e.message }) }
  }, [w, markModified])

  const handleDateFormat = useCallback(async (ci, from, to) => {
    try { const r = await w.convertDateFormat(ci, from, to); markModified(); setStatus({ type: 'success', message: `已转换 ${r.converted} 个日期` }) }
    catch (e) { setStatus({ type: 'error', message: e.message }) }
  }, [w, markModified])

  const handleExportJson = useCallback(async (format) => {
    try { setStatus({ type: 'loading', message: '正在导出 JSON...' }); const r = await w.exportAsJson(filteredIndices, format); downloadBlob(r.blobUrl, `export_${Date.now()}.${r.ext}`); setStatus({ type: 'success', message: '已导出 JSON' }) }
    catch (e) { setStatus({ type: 'error', message: e.message }) }
  }, [w, filteredIndices, downloadBlob])

  const handleExportSelective = useCallback(async (format, colIndices) => {
    try {
      setStatus({ type: 'loading', message: '正在导出...' })
      const r = await w.exportSelective(format, filteredIndices, colIndices)
      const ext = r.ext || format
      downloadBlob(r.blobUrl, `export_${Date.now()}.${ext}`)
      setStatus({ type: 'success', message: '已导出' })
    } catch (e) { setStatus({ type: 'error', message: e.message }) }
  }, [w, filteredIndices, downloadBlob])

  // ========================== EXPORT / CLEAR / SHEET ==========================
  const handleExport = useCallback(async (format) => {
    try { setStatus({ type: 'loading', message: `正在导出...` }); const r = await w.exportFile(format, filteredIndices); downloadBlob(r.blobUrl, `export_${Date.now()}.${format}`); setStatus({ type: 'success', message: `已导出 ${filteredIndices.length.toLocaleString()} 行` }) }
    catch (e) { setStatus({ type: 'error', message: e.message }) }
  }, [w, filteredIndices, downloadBlob])

  const handleClear = useCallback(() => {
    w.cleanup(); setFileInfo(null); setSheetNames([]); setCurrentSheet(null); setHeaders([]); setTotalRows(0); setFilteredIndices([]); setFilters({}); setSheetFilters({}); setSheetIndices({})
    setSortState({ columnIndex: null, direction: null }); setEditState({ canUndo: false, canRedo: false, isModified: false, historySize: 0 })
    setColumnWidths({}); setFrozenColumns(new Set()); setHiddenColumns(new Set()); setDuplicateHighlights([]); setSearchHighlights([]); setSearchResults(null); setSearchOpen(false); setStatus({ type: 'idle', message: '' })
  }, [w])

  const handleSwitchSheet = useCallback(async (name) => {
    if (name === currentSheet) return
    if (currentSheet) { setSheetFilters(p => ({ ...p, [currentSheet]: filters })); setSheetIndices(p => ({ ...p, [currentSheet]: filteredIndices })) }
    setStatus({ type: 'loading', message: `切换到 ${name}...` })
    try {
      const r = await w.switchSheet(name); setCurrentSheet(r.currentSheet); setHeaders(r.headers); setTotalRows(r.totalRows); setSortState({ columnIndex: null, direction: null }); setDuplicateHighlights([])
      const sf = sheetFilters[name] || {}; setFilters(sf)
      if (Object.keys(sf).length > 0) { const fr = await w.applyFilter(sf); setFilteredIndices(fr.indices); setStatus({ type: 'success', message: `${name}: ${fr.indices.length}/${r.totalRows} 行` }) }
      else { setFilteredIndices(r.indices); setStatus({ type: 'success', message: `${name}: ${r.totalRows} 行` }) }
    } catch (e) { setStatus({ type: 'error', message: e.message }) }
  }, [currentSheet, w, filters, filteredIndices, sheetFilters, sheetIndices])

  // ========================== DRAG & DROP (with file loaded) ==========================
  const isValidDropFile = useCallback((file) => {
    const validExtensions = ['.csv', '.xls', '.xlsx', '.json', '.jsonl', '.ndjson']
    return validExtensions.some(ext => file.name.toLowerCase().endsWith(ext))
  }, [])

  // Prevent browser from navigating to dropped files globally (when file is loaded)
  const dragCounterRef = useRef(0)
  useEffect(() => {
    if (!fileInfo) return
    const preventDragNav = (e) => { e.preventDefault() }
    const handleGlobalDragEnter = (e) => {
      e.preventDefault()
      dragCounterRef.current++
      if (dragCounterRef.current === 1) setIsDragOver(true)
    }
    const handleGlobalDragLeave = (e) => {
      e.preventDefault()
      dragCounterRef.current--
      if (dragCounterRef.current <= 0) { dragCounterRef.current = 0; setIsDragOver(false) }
    }
    const handleGlobalDrop = (e) => {
      e.preventDefault()
      dragCounterRef.current = 0
      setIsDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file && isValidDropFile(file)) {
        setPendingDropFile(file)
      }
    }
    window.addEventListener('dragover', preventDragNav)
    window.addEventListener('dragenter', handleGlobalDragEnter)
    window.addEventListener('dragleave', handleGlobalDragLeave)
    window.addEventListener('drop', handleGlobalDrop)
    return () => {
      window.removeEventListener('dragover', preventDragNav)
      window.removeEventListener('dragenter', handleGlobalDragEnter)
      window.removeEventListener('dragleave', handleGlobalDragLeave)
      window.removeEventListener('drop', handleGlobalDrop)
      dragCounterRef.current = 0
    }
  }, [fileInfo, isValidDropFile])

  const handleDropOverwrite = useCallback(() => {
    if (pendingDropFile) {
      handleFileUpload(pendingDropFile)
      setPendingDropFile(null)
    }
  }, [pendingDropFile, handleFileUpload])

  const handleDropAppend = useCallback(() => {
    if (pendingDropFile) {
      handleAppendFile(pendingDropFile)
      setPendingDropFile(null)
    }
  }, [pendingDropFile, handleAppendFile])

  const handleDropCancel = useCallback(() => {
    setPendingDropFile(null)
  }, [])

  // ========================== RENDER ==========================
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex flex-col">
      <nav className="bg-emerald-600 dark:bg-emerald-800 text-white px-4 py-2">
        <div className="max-w-full mx-auto flex items-center justify-between">
          <Link to="/" onClick={(e) => confirmLeave(e, '/')} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm">E</div>
            <span className="text-sm font-medium">工具集</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/" onClick={(e) => confirmLeave(e, '/')} className="text-white/80 hover:text-white text-sm">返回首页</Link>
            <a href="https://github.com/EarthChen/web-tools" target="_blank" rel="noopener noreferrer" className="text-white/80 hover:text-white">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" /></svg>
            </a>
          </div>
        </div>
      </nav>

      <Header
        fileInfo={fileInfo} totalRows={totalRows} filteredCount={filteredIndices.length}
        sheetNames={sheetNames} currentSheet={currentSheet} onSwitchSheet={handleSwitchSheet}
        onExport={handleExport} onClear={handleClear} editState={editState} onUndo={handleUndo} onRedo={handleRedo}
        onSearch={() => setSearchOpen(true)} onFindDuplicates={handleFindDuplicates} onClearDuplicates={() => setDuplicateHighlights([])}
        hasDuplicates={duplicateHighlights.length > 0} onAutoFitWidths={handleAutoFitWidths} onImportFile={(file) => setPendingDropFile(file)}
        frozenColumns={frozenColumns} onFrozenColumnsChange={setFrozenColumns} headers={headers}
        hiddenColumns={hiddenColumns} onShowColumn={handleShowColumn} onShowAllColumns={handleShowAllColumns}
        onAdvancedAction={handleAdvancedAction}
      />

      <SearchBar isOpen={searchOpen} onClose={() => { setSearchOpen(false); setSearchHighlights([]); setSearchResults(null) }}
        onSearch={handleSearch} onFindReplace={handleFindReplace} searchResults={searchResults} currentIndex={currentSearchIndex} onNavigate={handleSearchNavigate} />

      {fileInfo && Object.keys(filters).length > 0 && (
        <FilterTags filters={filters} headers={headers} onRemoveFilter={handleRemoveFilter} onClearAll={handleClearAllFilters} />
      )}

      <main className="flex-1 flex flex-col p-4 overflow-hidden relative">
        {!fileInfo ? (
          <FileUploader onFileSelect={handleFileUpload} progress={uploadProgress} isLoading={status.type === 'loading'} />
        ) : (
          <VirtualTable headers={headers} filteredIndices={filteredIndices} filters={filters} getRows={w.getRows}
            onFilterChange={handleFilterChange} onGetUniqueValues={handleGetUniqueValues}
            sortState={sortState} onSort={handleSort} onCellEdit={handleCellEdit}
            columnWidths={columnWidths} onColumnWidthsChange={setColumnWidths}
            searchHighlights={searchHighlights} currentSearchIndex={currentSearchIndex}
            duplicateHighlights={duplicateHighlights} selectedCells={selectedCells} onSelectedCellsChange={setSelectedCells}
            onContextMenu={(e, info) => setContextMenu({ isOpen: true, position: { x: e.clientX, y: e.clientY }, cellInfo: info })}
            frozenColumns={frozenColumns} hiddenColumns={hiddenColumns} />
        )}

        {/* Drag overlay when file is loaded */}
        {isDragOver && fileInfo && (
          <div className="absolute inset-0 z-50 bg-emerald-500/10 dark:bg-emerald-400/10 backdrop-blur-sm border-2 border-dashed border-emerald-500 rounded-xl flex items-center justify-center pointer-events-none">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl px-8 py-6 text-center">
              <div className="w-14 h-14 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center mx-auto mb-3">
                <svg className="w-7 h-7 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <p className="text-lg font-semibold text-gray-800 dark:text-white">释放文件以导入</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">将提示选择覆盖或追加模式</p>
            </div>
          </div>
        )}
      </main>

      {/* Drop mode selection dialog */}
      {pendingDropFile && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={handleDropCancel}>
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">检测到新文件</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                <span className="font-medium text-gray-700 dark:text-gray-300">{pendingDropFile.name}</span>
                <span className="ml-2">({(pendingDropFile.size / 1024).toFixed(1)} KB)</span>
              </p>
            </div>
            <div className="p-6 space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">当前已加载数据，请选择导入方式：</p>
              <button
                onClick={handleDropOverwrite}
                className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all group"
              >
                <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-gray-800 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400">覆盖当前数据</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">清空现有数据，使用新文件替换</p>
                </div>
              </button>
              <button
                onClick={handleDropAppend}
                className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all group"
              >
                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-gray-800 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400">追加到现有数据</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">保留现有数据，将新文件追加到末尾</p>
                </div>
              </button>
            </div>
            <div className="px-6 py-3 bg-gray-50 dark:bg-gray-800/80 border-t border-gray-200 dark:border-gray-700 flex justify-end">
              <button
                onClick={handleDropCancel}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      <StatusBar status={status} />
      <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700"><InlineAd /></div>

      {/* Overlays */}
      <ContextMenu isOpen={contextMenu.isOpen} position={contextMenu.position} cellInfo={contextMenu.cellInfo}
        onClose={() => setContextMenu(p => ({ ...p, isOpen: false }))}
        onAddRowAbove={handleAddRowAbove} onAddRowBelow={handleAddRowBelow} onDeleteRow={handleDeleteRow} onDuplicateRow={handleDuplicateRow}
        onAddColumnLeft={handleAddColumnLeft} onAddColumnRight={handleAddColumnRight} onDeleteColumn={handleDeleteColumn}
        onCopyCell={handleCopyCell} onPasteCell={handlePasteCell} onShowColumnStats={handleShowColumnStats} onShowBatchOps={handleShowBatchOps}
        onHideColumn={handleHideColumn} />

      <ColumnStatsPopover isOpen={columnStats.isOpen} stats={columnStats.stats} onClose={() => setColumnStats({ isOpen: false, stats: null })} />
      <BatchOperationsDialog isOpen={batchOps.isOpen} columnIndex={batchOps.columnIndex} columnName={batchOps.columnName}
        onClose={() => setBatchOps({ isOpen: false, columnIndex: null, columnName: '' })} onApply={handleBatchTransform} />

      {/* Advanced Dialogs */}
      <ConditionalDeleteDialog isOpen={activeDialog === 'conditionalDelete'} onClose={() => setActiveDialog(null)} headers={headers} onApply={handleConditionalDelete} />
      <SplitColumnDialog isOpen={activeDialog === 'splitColumn'} onClose={() => setActiveDialog(null)} headers={headers} onApply={handleSplitColumn} />
      <MergeColumnsDialog isOpen={activeDialog === 'mergeColumns'} onClose={() => setActiveDialog(null)} headers={headers} onApply={handleMergeColumns} />
      <RegexExtractDialog isOpen={activeDialog === 'regexExtract'} onClose={() => setActiveDialog(null)} headers={headers} onApply={handleRegexExtract} />
      <VLookupDialog isOpen={activeDialog === 'vlookup'} onClose={() => setActiveDialog(null)} headers={headers} onApply={handleVlookup} />
      <NumberFormatDialog isOpen={activeDialog === 'numberFormat'} onClose={() => setActiveDialog(null)} headers={headers} onApply={handleNumberFormat} />
      <DateFormatDialog isOpen={activeDialog === 'dateFormat'} onClose={() => setActiveDialog(null)} headers={headers} onApply={handleDateFormat} />
      <ExportSelectiveDialog isOpen={activeDialog === 'exportSelective'} onClose={() => setActiveDialog(null)} headers={headers} onApply={handleExportSelective} />
      <JsonExportDialog isOpen={activeDialog === 'exportJson'} onClose={() => setActiveDialog(null)} onApply={handleExportJson} />
    </div>
  )
}

export default App
