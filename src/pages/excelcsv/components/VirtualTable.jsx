import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Filter, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react'
import FilterPopover from './FilterPopover'

const ROW_HEIGHT = 36
const HEADER_HEIGHT = 40
const OVERSCAN = 5
const ROW_NUM_WIDTH = 56

export default function VirtualTable({
  headers,
  filteredIndices,
  filters,
  getRows,
  onFilterChange,
  onGetUniqueValues,
  sortState,
  onSort,
  onCellEdit,
  columnWidths: externalColumnWidths,
  onColumnWidthsChange,
  searchHighlights,
  currentSearchIndex,
  duplicateHighlights,
  selectedCells,
  onSelectedCellsChange,
  onContextMenu,
  frozenColumns = new Set(), // Set<number> of frozen column indices
  hiddenColumns = new Set(), // Set<number> of hidden column indices
}) {
  const parentRef = useRef(null)
  const filterButtonRefs = useRef({})
  const [columnWidths, setColumnWidths] = useState({})
  const [activeFilter, setActiveFilter] = useState(null)
  const [rowData, setRowData] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const loadedRangeRef = useRef({ start: -1, end: -1 })

  // Editing state
  const [editingCell, setEditingCell] = useState(null)
  const [editValue, setEditValue] = useState('')
  const editInputRef = useRef(null)

  // Active cell for keyboard navigation
  const [activeCell, setActiveCell] = useState(null) // { row, col }

  // Selection state for multi-cell
  const [selectionStart, setSelectionStart] = useState(null)
  const [isSelecting, setIsSelecting] = useState(false)

  // Use external widths if provided
  const effectiveWidths = externalColumnWidths || columnWidths
  const setEffectiveWidths = onColumnWidthsChange || setColumnWidths

  const rowVirtualizer = useVirtualizer({
    count: filteredIndices.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: OVERSCAN,
  })

  const virtualItems = rowVirtualizer.getVirtualItems()
  const defaultColumnWidth = 150

  const getColumnWidth = useCallback((index) => {
    return effectiveWidths[index] || defaultColumnWidth
  }, [effectiveWidths, defaultColumnWidth])

  // Visible column indices (excluding hidden)
  const visibleColumnIndices = useMemo(() => {
    return headers.map((_, idx) => idx).filter(idx => !hiddenColumns.has(idx))
  }, [headers, hiddenColumns])

  // Total width for visible data columns only
  const dataColumnsWidth = useMemo(() => {
    return visibleColumnIndices.reduce((sum, idx) => sum + getColumnWidth(idx), 0)
  }, [visibleColumnIndices, getColumnWidth])

  const totalWidth = ROW_NUM_WIDTH + dataColumnsWidth

  // Sorted frozen column indices (in original column order, visible only)
  const sortedFrozenIndices = useMemo(() => {
    return [...frozenColumns].filter(i => i < headers.length && !hiddenColumns.has(i)).sort((a, b) => a - b)
  }, [frozenColumns, headers.length, hiddenColumns])

  // Frozen columns: map colIndex -> sticky left offset
  const frozenLeftMap = useMemo(() => {
    const map = new Map()
    let accum = ROW_NUM_WIDTH
    for (const colIdx of sortedFrozenIndices) {
      map.set(colIdx, accum)
      accum += getColumnWidth(colIdx)
    }
    return map
  }, [sortedFrozenIndices, getColumnWidth])

  const isFrozenColumn = useCallback((colIndex) => {
    return frozenColumns.has(colIndex)
  }, [frozenColumns])

  // --- Data Loading ---
  const loadData = useCallback(async (startIdx, endIdx) => {
    if (isLoading || filteredIndices.length === 0) return
    const expandedStart = Math.max(0, startIdx - 20)
    const expandedEnd = Math.min(filteredIndices.length, endIdx + 20)
    if (expandedStart >= loadedRangeRef.current.start && expandedEnd <= loadedRangeRef.current.end) return
    setIsLoading(true)
    try {
      const result = await getRows(filteredIndices, expandedStart, expandedEnd - expandedStart)
      setRowData(prev => {
        const newData = { ...prev }
        result.rows.forEach(row => { newData[row.index] = row.data })
        return newData
      })
      loadedRangeRef.current = {
        start: Math.min(loadedRangeRef.current.start === -1 ? expandedStart : loadedRangeRef.current.start, expandedStart),
        end: Math.max(loadedRangeRef.current.end, expandedEnd)
      }
    } catch (error) {
      console.error('Failed to load rows:', error)
    } finally {
      setIsLoading(false)
    }
  }, [getRows, filteredIndices, isLoading])

  // Clear cache when data changes (rows filter or column count)
  useEffect(() => {
    setRowData({})
    loadedRangeRef.current = { start: -1, end: -1 }
  }, [filteredIndices, headers.length])

  useEffect(() => {
    if (virtualItems.length === 0) return
    const startIdx = virtualItems[0].index
    const endIdx = virtualItems[virtualItems.length - 1].index + 1
    let needsLoad = false
    for (let i = startIdx; i < endIdx; i++) {
      const actualIndex = filteredIndices[i]
      if (rowData[actualIndex] === undefined) { needsLoad = true; break }
    }
    if (needsLoad) loadData(startIdx, endIdx)
  }, [virtualItems, filteredIndices, rowData, loadData])

  useEffect(() => {
    if (filteredIndices.length > 0 && Object.keys(rowData).length === 0) {
      loadData(0, Math.min(50, filteredIndices.length))
    }
  }, [filteredIndices, loadData, rowData])

  // --- Column Resize ---
  const handleColumnResize = useCallback((index, newWidth) => {
    setEffectiveWidths(prev => ({ ...prev, [index]: Math.max(80, newWidth) }))
  }, [setEffectiveWidths])

  // --- Sort ---
  const handleSort = useCallback((columnIndex) => {
    if (!onSort) return
    let newDirection = 'asc'
    if (sortState?.columnIndex === columnIndex) {
      if (sortState.direction === 'asc') newDirection = 'desc'
      else if (sortState.direction === 'desc') newDirection = null
    }
    onSort(columnIndex, newDirection)
  }, [onSort, sortState])

  const getSortIcon = (columnIndex) => {
    if (sortState?.columnIndex !== columnIndex || !sortState?.direction) {
      return <ArrowUpDown className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
    }
    if (sortState.direction === 'asc') return <ArrowUp className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
    return <ArrowDown className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
  }

  // --- Editing ---
  const startEditing = useCallback((virtualRowIndex, colIndex, actualRowIndex) => {
    const currentValue = rowData[actualRowIndex]?.[colIndex]
    setEditingCell({ rowIndex: virtualRowIndex, colIndex, actualRowIndex })
    setEditValue(currentValue === null || currentValue === undefined ? '' : String(currentValue))
  }, [rowData])

  const commitEdit = useCallback(async () => {
    if (!editingCell || !onCellEdit) return
    const { actualRowIndex, colIndex } = editingCell
    const result = await onCellEdit(actualRowIndex, colIndex, editValue)
    if (result?.changed) {
      setRowData(prev => {
        const newData = { ...prev }
        if (newData[actualRowIndex]) {
          newData[actualRowIndex] = [...newData[actualRowIndex]]
          newData[actualRowIndex][colIndex] = editValue
        }
        return newData
      })
    }
    setEditingCell(null)
    setEditValue('')
  }, [editingCell, editValue, onCellEdit])

  const cancelEdit = useCallback(() => {
    setEditingCell(null)
    setEditValue('')
  }, [])

  const handleEditKeyDown = useCallback((e) => {
    if (e.key === 'Enter') { e.preventDefault(); commitEdit() }
    else if (e.key === 'Escape') { e.preventDefault(); cancelEdit() }
    else if (e.key === 'Tab') {
      e.preventDefault()
      const cell = editingCell
      commitEdit().then(() => {
        if (cell) {
          const nextCol = e.shiftKey ? Math.max(0, cell.colIndex - 1) : Math.min(headers.length - 1, cell.colIndex + 1)
          startEditing(cell.rowIndex, nextCol, cell.actualRowIndex)
        }
      })
    }
  }, [commitEdit, cancelEdit, editingCell, headers.length, startEditing])

  useEffect(() => {
    if (editingCell && editInputRef.current) {
      editInputRef.current.focus()
      editInputRef.current.select()
    }
  }, [editingCell])

  // --- Keyboard Navigation ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (editingCell) return // Don't navigate while editing
      if (!activeCell) return

      const { row, col } = activeCell
      let newRow = row
      let newCol = col

      switch (e.key) {
        case 'ArrowUp': newRow = Math.max(0, row - 1); e.preventDefault(); break
        case 'ArrowDown': newRow = Math.min(filteredIndices.length - 1, row + 1); e.preventDefault(); break
        case 'ArrowLeft': newCol = Math.max(0, col - 1); e.preventDefault(); break
        case 'ArrowRight': newCol = Math.min(headers.length - 1, col + 1); e.preventDefault(); break
        case 'Enter':
          // Start editing
          if (row < filteredIndices.length) {
            const actualIdx = filteredIndices[row]
            startEditing(row, col, actualIdx)
          }
          e.preventDefault()
          return
        case 'Tab':
          newCol = e.shiftKey ? Math.max(0, col - 1) : Math.min(headers.length - 1, col + 1)
          e.preventDefault()
          break
        default:
          return
      }

      setActiveCell({ row: newRow, col: newCol })

      // Ensure the row is visible
      rowVirtualizer.scrollToIndex(newRow, { align: 'auto' })
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeCell, editingCell, filteredIndices, headers.length, rowVirtualizer, startEditing])

  // --- Multi-cell Selection ---
  const handleCellMouseDown = useCallback((virtualRowIndex, colIndex, actualRowIndex, e) => {
    // Right-click => handled by onContextMenu, skip here to avoid duplicate triggers
    if (e.button === 2) return

    setActiveCell({ row: virtualRowIndex, col: colIndex })
    setSelectionStart({ row: virtualRowIndex, col: colIndex })
    setIsSelecting(true)

    if (onSelectedCellsChange) {
      onSelectedCellsChange([{ row: virtualRowIndex, col: colIndex }])
    }
  }, [onSelectedCellsChange])

  const handleCellMouseEnter = useCallback((virtualRowIndex, colIndex) => {
    if (!isSelecting || !selectionStart) return

    // Build selection range
    const minRow = Math.min(selectionStart.row, virtualRowIndex)
    const maxRow = Math.max(selectionStart.row, virtualRowIndex)
    const minCol = Math.min(selectionStart.col, colIndex)
    const maxCol = Math.max(selectionStart.col, colIndex)

    const cells = []
    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        cells.push({ row: r, col: c })
      }
    }

    if (onSelectedCellsChange) {
      onSelectedCellsChange(cells)
    }
  }, [isSelecting, selectionStart, onSelectedCellsChange])

  useEffect(() => {
    const handleMouseUp = () => {
      setIsSelecting(false)
    }
    window.addEventListener('mouseup', handleMouseUp)
    return () => window.removeEventListener('mouseup', handleMouseUp)
  }, [])

  // --- Search Highlight Helpers ---
  const isSearchHighlight = useCallback((rowIndex, colIndex) => {
    if (!searchHighlights || searchHighlights.length === 0) return false
    return searchHighlights.some(h => h.rowIndex === rowIndex && h.colIndex === colIndex)
  }, [searchHighlights])

  const isCurrentSearchMatch = useCallback((rowIndex, colIndex) => {
    if (currentSearchIndex === undefined || currentSearchIndex === null) return false
    if (!searchHighlights || searchHighlights.length === 0) return false
    const current = searchHighlights[currentSearchIndex]
    return current && current.rowIndex === rowIndex && current.colIndex === colIndex
  }, [searchHighlights, currentSearchIndex])

  const isDuplicateRow = useCallback((rowIndex) => {
    if (!duplicateHighlights || duplicateHighlights.length === 0) return false
    return duplicateHighlights.includes(rowIndex)
  }, [duplicateHighlights])

  const isCellSelected = useCallback((virtualRowIndex, colIndex) => {
    if (!selectedCells || selectedCells.length === 0) return false
    return selectedCells.some(c => c.row === virtualRowIndex && c.col === colIndex)
  }, [selectedCells])

  const isCellActive = useCallback((virtualRowIndex, colIndex) => {
    return activeCell?.row === virtualRowIndex && activeCell?.col === colIndex
  }, [activeCell])

  // --- Context Menu ---
  const handleContextMenu = useCallback((e, virtualRowIndex, colIndex, actualRowIndex) => {
    e.preventDefault()
    setActiveCell({ row: virtualRowIndex, col: colIndex })
    if (onContextMenu) {
      onContextMenu(e, { virtualRowIndex, colIndex, actualRowIndex })
    }
  }, [onContextMenu])

  // --- Render Header Cell ---
  const renderHeaderCell = (header, index) => {
    const hasFilter = filters[index] && filters[index].length > 0
    const isSorted = sortState?.columnIndex === index && sortState?.direction
    const width = getColumnWidth(index)
    const isFrozen = isFrozenColumn(index)
    const frozenLeft = isFrozen ? frozenLeftMap.get(index) : undefined

    return (
      <div
        key={index}
        className={`relative flex-shrink-0 table-header-cell flex items-center justify-between group ${isFrozen ? 'sticky z-20 bg-gray-50 dark:bg-gray-800' : ''}`}
        style={{ width, left: frozenLeft }}
      >
        <button
          className="truncate flex-1 mr-1 text-left cursor-pointer hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors flex items-center gap-1"
          onClick={() => handleSort(index)}
          title={`排序 ${header}`}
        >
          <span className="truncate">{header}</span>
          {getSortIcon(index)}
        </button>

        {isSorted && <span className="absolute top-0.5 left-0.5 w-1.5 h-1.5 rounded-full bg-emerald-500" />}

        <button
          ref={(el) => { filterButtonRefs.current[index] = el }}
          onClick={(e) => { e.stopPropagation(); setActiveFilter(activeFilter === index ? null : index) }}
          className={`p-1 rounded transition-colors flex-shrink-0 ${hasFilter ? 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/40' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-600'}`}
          title={`筛选 ${header}`}
        >
          <Filter className="w-3.5 h-3.5" />
        </button>

        {activeFilter === index && (
          <FilterPopover
            columnIndex={index}
            columnName={header}
            currentFilter={filters[index]}
            onApply={onFilterChange}
            onClose={() => setActiveFilter(null)}
            onGetUniqueValues={onGetUniqueValues}
            anchorEl={filterButtonRefs.current[index]}
          />
        )}

        {/* Column resize handle */}
        <div
          className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-emerald-500 active:bg-emerald-600"
          onMouseDown={(e) => {
            e.preventDefault()
            const startX = e.clientX
            const startWidth = width
            const onMove = (me) => handleColumnResize(index, startWidth + (me.clientX - startX))
            const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }
            document.addEventListener('mousemove', onMove)
            document.addEventListener('mouseup', onUp)
          }}
          onDoubleClick={() => {
            // Auto-fit on double-click resize handle (local calculation)
            let maxLen = header.length
            const sampleSize = Math.min(200, filteredIndices.length)
            for (let i = 0; i < sampleSize; i++) {
              const actualIdx = filteredIndices[i]
              const val = rowData[actualIdx]?.[index]
              const str = val === null || val === undefined ? '' : String(val)
              if (str.length > maxLen) maxLen = str.length
            }
            handleColumnResize(index, Math.max(80, Math.min(400, maxLen * 8 + 24)))
          }}
        />
      </div>
    )
  }

  // --- Render Data Cell ---
  const renderCell = (value, colIndex, virtualRowIndex, actualRowIndex) => {
    const width = getColumnWidth(colIndex)
    const isEditing = editingCell?.rowIndex === virtualRowIndex && editingCell?.colIndex === colIndex
    const isFrozen = isFrozenColumn(colIndex)
    const frozenLeft = isFrozen ? frozenLeftMap.get(colIndex) : undefined

    if (isEditing) {
      return (
        <div key={colIndex} className={`flex-shrink-0 relative ${isFrozen ? 'sticky z-20' : ''}`}
          style={{ width, left: frozenLeft }}>
          <input
            ref={editInputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleEditKeyDown}
            onBlur={commitEdit}
            className="absolute inset-0 w-full h-full px-3 py-1 text-sm bg-white dark:bg-gray-700 border-2 border-emerald-500 dark:border-emerald-400 outline-none z-30 text-gray-900 dark:text-gray-100"
          />
        </div>
      )
    }

    const displayValue = value === null || value === undefined ? '' : String(value)
    const isEmpty = displayValue === ''
    const isHighlighted = isSearchHighlight(actualRowIndex, colIndex)
    const isCurrent = isCurrentSearchMatch(actualRowIndex, colIndex)
    const isSelected = isCellSelected(virtualRowIndex, colIndex)
    const isActive = isCellActive(virtualRowIndex, colIndex)

    let cellClass = 'flex-shrink-0 table-cell select-none cursor-cell'
    if (isFrozen) cellClass += ' sticky z-10'
    if (isEmpty) cellClass += ' cell-empty'
    if (isCurrent) cellClass += ' cell-search-current'
    else if (isHighlighted) cellClass += ' cell-search-highlight'
    if (isSelected) cellClass += ' cell-selected'
    if (isActive) cellClass += ' cell-active'

    return (
      <div
        key={colIndex}
        className={cellClass}
        style={{ width, left: frozenLeft }}
        title={displayValue}
        onDoubleClick={() => startEditing(virtualRowIndex, colIndex, actualRowIndex)}
        onMouseDown={(e) => handleCellMouseDown(virtualRowIndex, colIndex, actualRowIndex, e)}
        onMouseEnter={() => handleCellMouseEnter(virtualRowIndex, colIndex)}
        onContextMenu={(e) => handleContextMenu(e, virtualRowIndex, colIndex, actualRowIndex)}
      >
        {displayValue}
      </div>
    )
  }

  // --- Render Row ---
  const renderRow = (virtualRow) => {
    const actualRowIndex = filteredIndices[virtualRow.index]
    const data = rowData[actualRowIndex]
    const isDup = isDuplicateRow(actualRowIndex)

    return (
      <div
        key={virtualRow.key}
        className={`
          absolute top-0 left-0 flex border-b border-gray-100 dark:border-gray-700
          ${isDup ? 'bg-amber-50/60 dark:bg-amber-900/10' : virtualRow.index % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50/50 dark:bg-gray-800/50'}
          hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors
        `}
        style={{
          height: ROW_HEIGHT,
          transform: `translateY(${virtualRow.start}px)`,
          width: totalWidth,
        }}
      >
        {/* Row number cell */}
        <div
          className="flex-shrink-0 sticky left-0 z-10 flex items-center justify-center text-xs text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 select-none"
          style={{ width: ROW_NUM_WIDTH }}
        >
          {actualRowIndex + 1}
        </div>

        {data ? (
          visibleColumnIndices.map((colIndex) => renderCell(data[colIndex], colIndex, virtualRow.index, actualRowIndex))
        ) : (
          <div className="flex items-center px-3 text-gray-400 text-sm">加载中...</div>
        )}
      </div>
    )
  }

  if (headers.length === 0) {
    return <div className="flex-1 flex items-center justify-center text-gray-500">没有数据</div>
  }

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Unified scrollable area for header + body (ensures horizontal scroll sync) */}
      <div ref={parentRef} className="flex-1 overflow-auto">
        {/* Sticky Header */}
        <div
          className="sticky top-0 z-30 flex border-b border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800"
          style={{ width: totalWidth, minWidth: '100%', height: HEADER_HEIGHT }}
        >
          {/* Row number header */}
          <div
            className="flex-shrink-0 sticky left-0 z-20 flex items-center justify-center text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-600"
            style={{ width: ROW_NUM_WIDTH }}
          >
            #
          </div>
          {visibleColumnIndices.map(idx => renderHeaderCell(headers[idx], idx))}
        </div>

        {/* Virtualized body */}
        <div
          className="relative"
          style={{ height: rowVirtualizer.getTotalSize(), width: totalWidth, minWidth: '100%' }}
        >
          {virtualItems.map(renderRow)}
        </div>
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 px-4 py-2 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 flex justify-between">
        <span>
          显示 {filteredIndices.length.toLocaleString()} 行
          {sortState?.direction && (
            <span className="ml-2 text-emerald-600 dark:text-emerald-400">
              · 按 {headers[sortState.columnIndex]} {sortState.direction === 'asc' ? '升序' : '降序'}
            </span>
          )}
          {duplicateHighlights && duplicateHighlights.length > 0 && (
            <span className="ml-2 text-amber-600 dark:text-amber-400">
              · {duplicateHighlights.length} 个重复行
            </span>
          )}
          {sortedFrozenIndices.length > 0 && (
            <span className="ml-2 text-blue-600 dark:text-blue-400">
              · 冻结 {sortedFrozenIndices.length} 列
            </span>
          )}
          {hiddenColumns.size > 0 && (
            <span className="ml-2 text-orange-600 dark:text-orange-400">
              · 隐藏 {hiddenColumns.size} 列
            </span>
          )}
        </span>
        <span>
          已加载 {Object.keys(rowData).length} 行 {isLoading && '(加载中...)'}
          {editingCell && <span className="ml-2 text-blue-500">· 编辑中</span>}
          {activeCell && <span className="ml-2 text-gray-400">R{activeCell.row + 1}C{activeCell.col + 1}</span>}
        </span>
      </div>
    </div>
  )
}
