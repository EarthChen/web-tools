import { useState, useCallback, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Header from './components/Header'
import FileUploader from './components/FileUploader'
import VirtualTable from './components/VirtualTable'
import StatusBar from './components/StatusBar'
import FilterTags from './components/FilterTags'
import { useWorker } from './hooks/useWorker'

function App() {
  const [fileInfo, setFileInfo] = useState(null)
  const [sheetNames, setSheetNames] = useState([])
  const [currentSheet, setCurrentSheet] = useState(null)
  const [headers, setHeaders] = useState([])
  const [totalRows, setTotalRows] = useState(0)
  const [filteredIndices, setFilteredIndices] = useState([])
  const [filters, setFilters] = useState({})
  const [sheetFilters, setSheetFilters] = useState({}) // { sheetName: filters }
  const [sheetIndices, setSheetIndices] = useState({}) // { sheetName: filteredIndices }
  const [status, setStatus] = useState({ type: 'idle', message: '' })
  const [uploadProgress, setUploadProgress] = useState(0)
  
  const { 
    parseFile, 
    switchSheet,
    getUniqueValues, 
    applyFilter, 
    getRows, 
    exportFile,
    cleanup 
  } = useWorker()

  // 页面关闭/刷新确认
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (fileInfo) {
        e.preventDefault()
        e.returnValue = '您有未保存的数据，确定要离开吗？'
        return e.returnValue
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [fileInfo])

  // 处理文件上传
  const handleFileUpload = useCallback(async (file) => {
    try {
      setStatus({ type: 'loading', message: '正在解析文件...' })
      setUploadProgress(0)
      
      // 模拟进度
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90))
      }, 100)

      const result = await parseFile(file)
      
      clearInterval(progressInterval)
      setUploadProgress(100)
      
      setFileInfo({
        name: file.name,
        size: file.size,
        type: file.name.endsWith('.csv') ? 'csv' : 'xlsx'
      })
      const firstSheet = result.currentSheet || result.sheetNames?.[0] || null
      setSheetNames(result.sheetNames || [])
      setCurrentSheet(firstSheet)
      setHeaders(result.headers)
      setTotalRows(result.totalRows)
      setFilteredIndices(result.indices)
      setFilters({})
      // 初始化每个 Sheet 的筛选状态
      const initialSheetFilters = {}
      const initialSheetIndices = {}
      result.sheetNames?.forEach(name => {
        initialSheetFilters[name] = {}
        initialSheetIndices[name] = null // null 表示未筛选
      })
      if (firstSheet) {
        initialSheetIndices[firstSheet] = result.indices
      }
      setSheetFilters(initialSheetFilters)
      setSheetIndices(initialSheetIndices)
      
      const sheetInfo = result.sheetNames?.length > 1 ? ` (${result.sheetNames.length} 个工作表)` : ''
      setStatus({ type: 'success', message: `成功加载 ${result.totalRows.toLocaleString()} 行数据${sheetInfo}` })
      
      setTimeout(() => {
        setUploadProgress(0)
      }, 500)
    } catch (error) {
      setStatus({ type: 'error', message: `解析失败: ${error.message}` })
      setUploadProgress(0)
    }
  }, [parseFile])

  // 处理筛选变更
  const handleFilterChange = useCallback(async (columnIndex, selectedValues) => {
    const newFilters = { ...filters }
    
    if (selectedValues === null || selectedValues.length === 0) {
      delete newFilters[columnIndex]
    } else {
      newFilters[columnIndex] = selectedValues
    }
    
    setFilters(newFilters)
    setStatus({ type: 'loading', message: '正在应用筛选...' })
    
    try {
      const result = await applyFilter(newFilters)
      setFilteredIndices(result.indices)
      // 保存当前 Sheet 的筛选状态
      if (currentSheet) {
        setSheetFilters(prev => ({ ...prev, [currentSheet]: newFilters }))
        setSheetIndices(prev => ({ ...prev, [currentSheet]: result.indices }))
      }
      setStatus({ 
        type: 'success', 
        message: `筛选完成，显示 ${result.indices.length.toLocaleString()} / ${totalRows.toLocaleString()} 行` 
      })
    } catch (error) {
      setStatus({ type: 'error', message: `筛选失败: ${error.message}` })
    }
  }, [filters, applyFilter, totalRows, currentSheet])

  // 获取列的唯一值
  const handleGetUniqueValues = useCallback(async (columnIndex) => {
    try {
      const result = await getUniqueValues(columnIndex)
      return result
    } catch (error) {
      setStatus({ type: 'error', message: `获取筛选值失败: ${error.message}` })
      return { values: [], hasMore: false }
    }
  }, [getUniqueValues])

  // 处理导出
  const handleExport = useCallback(async (format) => {
    try {
      setStatus({ type: 'loading', message: `正在导出 ${format.toUpperCase()} 文件...` })
      
      const result = await exportFile(format, filteredIndices)
      
      // 创建下载链接
      const link = document.createElement('a')
      link.href = result.blobUrl
      link.download = `export_${Date.now()}.${format}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      // 释放 Blob URL
      URL.revokeObjectURL(result.blobUrl)
      
      setStatus({ type: 'success', message: `成功导出 ${filteredIndices.length.toLocaleString()} 行数据` })
    } catch (error) {
      setStatus({ type: 'error', message: `导出失败: ${error.message}` })
    }
  }, [exportFile, filteredIndices])

  // 清理
  const handleClear = useCallback(() => {
    cleanup()
    setFileInfo(null)
    setSheetNames([])
    setCurrentSheet(null)
    setHeaders([])
    setTotalRows(0)
    setFilteredIndices([])
    setFilters({})
    setSheetFilters({})
    setSheetIndices({})
    setStatus({ type: 'idle', message: '' })
  }, [cleanup])

  // 移除单个筛选条件
  const handleRemoveFilter = useCallback(async (columnIndex) => {
    const newFilters = { ...filters }
    delete newFilters[columnIndex]
    
    setFilters(newFilters)
    setStatus({ type: 'loading', message: '正在更新筛选...' })
    
    try {
      const result = await applyFilter(newFilters)
      setFilteredIndices(result.indices)
      // 保存当前 Sheet 的筛选状态
      if (currentSheet) {
        setSheetFilters(prev => ({ ...prev, [currentSheet]: newFilters }))
        setSheetIndices(prev => ({ ...prev, [currentSheet]: result.indices }))
      }
      setStatus({ 
        type: 'success', 
        message: Object.keys(newFilters).length > 0 
          ? `筛选完成，显示 ${result.indices.length.toLocaleString()} / ${totalRows.toLocaleString()} 行`
          : `已清除筛选，显示全部 ${totalRows.toLocaleString()} 行`
      })
    } catch (error) {
      setStatus({ type: 'error', message: `更新筛选失败: ${error.message}` })
    }
  }, [filters, applyFilter, totalRows, currentSheet])

  // 清除所有筛选条件
  const handleClearAllFilters = useCallback(async () => {
    setFilters({})
    setStatus({ type: 'loading', message: '正在清除筛选...' })
    
    try {
      const result = await applyFilter({})
      setFilteredIndices(result.indices)
      // 保存当前 Sheet 的筛选状态
      if (currentSheet) {
        setSheetFilters(prev => ({ ...prev, [currentSheet]: {} }))
        setSheetIndices(prev => ({ ...prev, [currentSheet]: result.indices }))
      }
      setStatus({ type: 'success', message: `已清除筛选，显示全部 ${totalRows.toLocaleString()} 行` })
    } catch (error) {
      setStatus({ type: 'error', message: `清除筛选失败: ${error.message}` })
    }
  }, [applyFilter, totalRows, currentSheet])

  // 切换 Sheet
  const handleSwitchSheet = useCallback(async (sheetName) => {
    if (sheetName === currentSheet) return
    
    // 保存当前 Sheet 的筛选状态
    if (currentSheet) {
      setSheetFilters(prev => ({ ...prev, [currentSheet]: filters }))
      setSheetIndices(prev => ({ ...prev, [currentSheet]: filteredIndices }))
    }
    
    setStatus({ type: 'loading', message: `正在切换到 ${sheetName}...` })
    
    try {
      const result = await switchSheet(sheetName)
      setCurrentSheet(result.currentSheet)
      setHeaders(result.headers)
      setTotalRows(result.totalRows)
      
      // 恢复目标 Sheet 的筛选状态
      const savedFilters = sheetFilters[sheetName] || {}
      const savedIndices = sheetIndices[sheetName]
      
      setFilters(savedFilters)
      
      if (Object.keys(savedFilters).length > 0 && savedIndices) {
        // 重新应用已保存的筛选
        const filterResult = await applyFilter(savedFilters)
        setFilteredIndices(filterResult.indices)
        setStatus({ 
          type: 'success', 
          message: `已切换到 ${sheetName}，显示 ${filterResult.indices.length.toLocaleString()} / ${result.totalRows.toLocaleString()} 行` 
        })
      } else {
        setFilteredIndices(result.indices)
        setStatus({ type: 'success', message: `已切换到 ${sheetName}，共 ${result.totalRows.toLocaleString()} 行` })
      }
    } catch (error) {
      setStatus({ type: 'error', message: `切换失败: ${error.message}` })
    }
  }, [currentSheet, switchSheet, filters, filteredIndices, sheetFilters, sheetIndices, applyFilter])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex flex-col">
      {/* 顶部导航 */}
      <nav className="bg-emerald-600 dark:bg-emerald-800 text-white px-4 py-2">
        <div className="max-w-full mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm">
              E
            </div>
            <span className="text-sm font-medium">工具集</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/" className="text-white/80 hover:text-white text-sm transition-colors">
              返回首页
            </Link>
            <a
              href="https://github.com/EarthChen/web-tools"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/80 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
            </a>
          </div>
        </div>
      </nav>
      
      {/* 工具栏 */}
      <Header 
        fileInfo={fileInfo}
        totalRows={totalRows}
        filteredCount={filteredIndices.length}
        sheetNames={sheetNames}
        currentSheet={currentSheet}
        onSwitchSheet={handleSwitchSheet}
        onExport={handleExport}
        onClear={handleClear}
      />
      
      {/* 筛选条件标签 */}
      {fileInfo && Object.keys(filters).length > 0 && (
        <FilterTags
          filters={filters}
          headers={headers}
          onRemoveFilter={handleRemoveFilter}
          onClearAll={handleClearAllFilters}
        />
      )}
      
      {/* 主内容区 */}
      <main className="flex-1 flex flex-col p-4 overflow-hidden">
        {!fileInfo ? (
          <FileUploader 
            onFileSelect={handleFileUpload}
            progress={uploadProgress}
            isLoading={status.type === 'loading'}
          />
        ) : (
          <VirtualTable
            headers={headers}
            filteredIndices={filteredIndices}
            filters={filters}
            getRows={getRows}
            onFilterChange={handleFilterChange}
            onGetUniqueValues={handleGetUniqueValues}
          />
        )}
      </main>
      
      {/* 底部状态栏 */}
      <StatusBar status={status} />
    </div>
  )
}

export default App
