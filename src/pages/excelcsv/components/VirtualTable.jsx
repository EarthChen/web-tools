import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Filter } from 'lucide-react'
import FilterPopover from './FilterPopover'

const ROW_HEIGHT = 36
const HEADER_HEIGHT = 40
const OVERSCAN = 5

export default function VirtualTable({
  headers,
  filteredIndices,
  filters,
  getRows,
  onFilterChange,
  onGetUniqueValues,
}) {
  const parentRef = useRef(null)
  const filterButtonRefs = useRef({})
  const [columnWidths, setColumnWidths] = useState({})
  const [activeFilter, setActiveFilter] = useState(null)
  const [rowData, setRowData] = useState({}) // { rowIndex: data }
  const [isLoading, setIsLoading] = useState(false)
  const loadedRangeRef = useRef({ start: -1, end: -1 })

  // 虚拟化配置
  const rowVirtualizer = useVirtualizer({
    count: filteredIndices.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: OVERSCAN,
  })

  const virtualItems = rowVirtualizer.getVirtualItems()

  // 计算默认列宽
  const defaultColumnWidth = 150

  // 获取列宽
  const getColumnWidth = useCallback((index) => {
    return columnWidths[index] || defaultColumnWidth
  }, [columnWidths, defaultColumnWidth])

  // 总宽度
  const totalWidth = useMemo(() => {
    return headers.reduce((sum, _, idx) => sum + getColumnWidth(idx), 0)
  }, [headers, getColumnWidth])

  // 加载数据函数
  const loadData = useCallback(async (startIdx, endIdx) => {
    if (isLoading || filteredIndices.length === 0) return
    
    // 扩展范围
    const expandedStart = Math.max(0, startIdx - 20)
    const expandedEnd = Math.min(filteredIndices.length, endIdx + 20)
    
    // 检查是否已经加载过这个范围
    if (expandedStart >= loadedRangeRef.current.start && expandedEnd <= loadedRangeRef.current.end) {
      return
    }
    
    setIsLoading(true)
    
    try {
      const result = await getRows(filteredIndices, expandedStart, expandedEnd - expandedStart)
      
      setRowData(prev => {
        const newData = { ...prev }
        result.rows.forEach(row => {
          newData[row.index] = row.data
        })
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

  // 当 filteredIndices 变化时重置数据
  useEffect(() => {
    setRowData({})
    loadedRangeRef.current = { start: -1, end: -1 }
  }, [filteredIndices])

  // 初始加载和滚动时加载数据
  useEffect(() => {
    if (virtualItems.length === 0) return
    
    const startIdx = virtualItems[0].index
    const endIdx = virtualItems[virtualItems.length - 1].index + 1
    
    // 检查是否有未加载的行
    let needsLoad = false
    for (let i = startIdx; i < endIdx; i++) {
      const actualIndex = filteredIndices[i]
      if (rowData[actualIndex] === undefined) {
        needsLoad = true
        break
      }
    }
    
    if (needsLoad) {
      loadData(startIdx, endIdx)
    }
  }, [virtualItems, filteredIndices, rowData, loadData])

  // 初始加载
  useEffect(() => {
    if (filteredIndices.length > 0 && Object.keys(rowData).length === 0) {
      loadData(0, Math.min(50, filteredIndices.length))
    }
  }, [filteredIndices, loadData, rowData])

  // 处理列宽调整
  const handleColumnResize = useCallback((index, newWidth) => {
    setColumnWidths(prev => ({
      ...prev,
      [index]: Math.max(80, newWidth),
    }))
  }, [])

  // 渲染表头单元格
  const renderHeaderCell = (header, index) => {
    const hasFilter = filters[index] && filters[index].length > 0
    const width = getColumnWidth(index)

    return (
      <div
        key={index}
        className="relative flex-shrink-0 table-header-cell flex items-center justify-between group"
        style={{ width }}
      >
        <span className="truncate flex-1 mr-1">{header}</span>
        
        <button
          ref={(el) => { filterButtonRefs.current[index] = el }}
          onClick={(e) => {
            e.stopPropagation()
            e.preventDefault()
            setActiveFilter(activeFilter === index ? null : index)
          }}
          className={`
            p-1 rounded transition-colors flex-shrink-0
            ${hasFilter 
              ? 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/40' 
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-600'
            }
          `}
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
            anchorRef={{ current: filterButtonRefs.current[index] }}
          />
        )}

        <div
          className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-emerald-500 active:bg-emerald-600"
          onMouseDown={(e) => {
            e.preventDefault()
            const startX = e.clientX
            const startWidth = width

            const handleMouseMove = (moveEvent) => {
              const newWidth = startWidth + (moveEvent.clientX - startX)
              handleColumnResize(index, newWidth)
            }

            const handleMouseUp = () => {
              document.removeEventListener('mousemove', handleMouseMove)
              document.removeEventListener('mouseup', handleMouseUp)
            }

            document.addEventListener('mousemove', handleMouseMove)
            document.addEventListener('mouseup', handleMouseUp)
          }}
        />
      </div>
    )
  }

  // 渲染数据单元格
  const renderCell = (value, colIndex) => {
    const width = getColumnWidth(colIndex)
    const displayValue = value === null || value === undefined ? '' : String(value)

    return (
      <div
        key={colIndex}
        className="flex-shrink-0 table-cell"
        style={{ width }}
        title={displayValue}
      >
        {displayValue}
      </div>
    )
  }

  // 渲染行
  const renderRow = (virtualRow) => {
    const actualRowIndex = filteredIndices[virtualRow.index]
    const data = rowData[actualRowIndex]

    return (
      <div
        key={virtualRow.key}
        className={`
          absolute top-0 left-0 flex border-b border-gray-100 dark:border-gray-700
          ${virtualRow.index % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50/50 dark:bg-gray-800/50'}
          hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors
        `}
        style={{
          height: ROW_HEIGHT,
          transform: `translateY(${virtualRow.start}px)`,
          width: totalWidth,
        }}
      >
        {data ? (
          headers.map((_, colIndex) => renderCell(data[colIndex], colIndex))
        ) : (
          <div className="flex items-center px-3 text-gray-400 text-sm">
            加载中...
          </div>
        )}
      </div>
    )
  }

  if (headers.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500">
        没有数据
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* 表头 */}
      <div 
        className="flex-shrink-0 overflow-x-auto border-b border-gray-200 dark:border-gray-600"
        style={{ height: HEADER_HEIGHT }}
      >
        <div className="flex" style={{ width: totalWidth, minWidth: '100%' }}>
          {headers.map(renderHeaderCell)}
        </div>
      </div>

      {/* 表体 - 虚拟滚动 */}
      <div
        ref={parentRef}
        className="flex-1 overflow-auto"
      >
        <div
          className="relative"
          style={{
            height: rowVirtualizer.getTotalSize(),
            width: totalWidth,
            minWidth: '100%',
          }}
        >
          {virtualItems.map(renderRow)}
        </div>
      </div>

      {/* 行数统计 */}
      <div className="flex-shrink-0 px-4 py-2 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 flex justify-between">
        <span>显示 {filteredIndices.length.toLocaleString()} 行</span>
        <span>已加载 {Object.keys(rowData).length} 行 {isLoading && '(加载中...)'}</span>
      </div>
    </div>
  )
}
