/**
 * Data Worker - 处理大文件解析、筛选、导出
 * 所有重型计算都在这里完成，避免阻塞主线程
 */

import * as XLSX from 'xlsx'

// Worker 内部状态
let workbookData = {
  sheetNames: [],
  sheets: {}, // { sheetName: { headers, rows, columnTypes } }
  currentSheet: null,
}

// 当前活动 Sheet 的数据引用
let parsedData = {
  headers: [],
  rows: [],
  columnTypes: [],
}

/**
 * 解析文件
 */
function parseFile(buffer, fileName) {
  try {
    const isCSV = fileName.toLowerCase().endsWith('.csv')
    
    let workbook
    if (isCSV) {
      // CSV 解析
      const decoder = new TextDecoder('utf-8')
      const text = decoder.decode(buffer)
      workbook = XLSX.read(text, { type: 'string' })
    } else {
      // Excel 解析
      workbook = XLSX.read(buffer, { type: 'array' })
    }
    
    // 解析所有 Sheet
    workbookData.sheetNames = workbook.SheetNames
    workbookData.sheets = {}
    
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })
      
      if (jsonData.length === 0) {
        workbookData.sheets[sheetName] = {
          headers: [],
          rows: [],
          columnTypes: [],
        }
        continue
      }
      
      const headers = jsonData[0].map((h, idx) => String(h || '').trim() || `列${idx + 1}`)
      const rows = jsonData.slice(1)
      const columnTypes = analyzeColumnTypes(rows, headers.length)
      
      workbookData.sheets[sheetName] = {
        headers,
        rows,
        columnTypes,
      }
    }
    
    // 设置当前 Sheet 为第一个
    const firstSheetName = workbook.SheetNames[0]
    workbookData.currentSheet = firstSheetName
    parsedData = workbookData.sheets[firstSheetName]
    
    // 生成所有行索引
    const indices = Array.from({ length: parsedData.rows.length }, (_, i) => i)
    
    // 释放原始 buffer 内存
    buffer = null
    
    return {
      sheetNames: workbookData.sheetNames,
      currentSheet: firstSheetName,
      headers: parsedData.headers,
      totalRows: parsedData.rows.length,
      columnTypes: parsedData.columnTypes,
      indices,
    }
  } catch (error) {
    throw new Error(`解析失败: ${error.message}`)
  }
}

/**
 * 切换 Sheet
 */
function switchSheet(sheetName) {
  if (!workbookData.sheets[sheetName]) {
    throw new Error(`Sheet "${sheetName}" 不存在`)
  }
  
  workbookData.currentSheet = sheetName
  parsedData = workbookData.sheets[sheetName]
  
  const indices = Array.from({ length: parsedData.rows.length }, (_, i) => i)
  
  return {
    currentSheet: sheetName,
    headers: parsedData.headers,
    totalRows: parsedData.rows.length,
    columnTypes: parsedData.columnTypes,
    indices,
  }
}

/**
 * 分析列类型
 */
function analyzeColumnTypes(rows, columnCount) {
  const types = new Array(columnCount).fill('string')
  const sampleSize = Math.min(100, rows.length)
  
  for (let col = 0; col < columnCount; col++) {
    let numberCount = 0
    let dateCount = 0
    
    for (let i = 0; i < sampleSize; i++) {
      const value = rows[i]?.[col]
      if (value === null || value === undefined || value === '') continue
      
      if (typeof value === 'number' || !isNaN(Number(value))) {
        numberCount++
      } else if (isDateLike(String(value))) {
        dateCount++
      }
    }
    
    if (numberCount > sampleSize * 0.8) {
      types[col] = 'number'
    } else if (dateCount > sampleSize * 0.8) {
      types[col] = 'date'
    }
  }
  
  return types
}

/**
 * 检查是否像日期格式
 */
function isDateLike(str) {
  return /^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(str) || 
         /^\d{1,2}[-/]\d{1,2}[-/]\d{4}/.test(str)
}

/**
 * 获取某列的唯一值（前 1000 个）
 */
function getUniqueValues(columnIndex, searchTerm = '') {
  const uniqueSet = new Set()
  const maxValues = 1000
  
  for (const row of parsedData.rows) {
    if (uniqueSet.size >= maxValues) break
    
    const value = row[columnIndex]
    const stringValue = value === null || value === undefined ? '' : String(value)
    
    // 如果有搜索词，进行过滤
    if (searchTerm && !stringValue.toLowerCase().includes(searchTerm.toLowerCase())) {
      continue
    }
    
    uniqueSet.add(stringValue)
  }
  
  const values = Array.from(uniqueSet).sort((a, b) => {
    // 空值排最后
    if (a === '' && b !== '') return 1
    if (b === '' && a !== '') return -1
    
    // 数字排序
    const numA = Number(a)
    const numB = Number(b)
    if (!isNaN(numA) && !isNaN(numB)) {
      return numA - numB
    }
    
    // 字符串排序
    return a.localeCompare(b, 'zh-CN')
  })
  
  return {
    values,
    hasMore: uniqueSet.size >= maxValues,
  }
}

/**
 * 应用筛选条件，返回符合条件的行索引
 */
function applyFilter(conditions) {
  // conditions: { columnIndex: [selectedValues] }
  
  if (Object.keys(conditions).length === 0) {
    // 无筛选条件，返回所有行索引
    return {
      indices: Array.from({ length: parsedData.rows.length }, (_, i) => i),
    }
  }
  
  const indices = []
  
  for (let i = 0; i < parsedData.rows.length; i++) {
    const row = parsedData.rows[i]
    let match = true
    
    for (const [colIdx, selectedValues] of Object.entries(conditions)) {
      const columnIndex = parseInt(colIdx)
      const cellValue = row[columnIndex]
      const stringValue = cellValue === null || cellValue === undefined ? '' : String(cellValue)
      
      if (!selectedValues.includes(stringValue)) {
        match = false
        break
      }
    }
    
    if (match) {
      indices.push(i)
    }
  }
  
  return { indices }
}

/**
 * 根据索引获取指定范围的行数据
 */
function getRows(indices, startIdx, count) {
  const endIdx = Math.min(startIdx + count, indices.length)
  const rows = []
  
  for (let i = startIdx; i < endIdx; i++) {
    const rowIndex = indices[i]
    rows.push({
      index: rowIndex,
      data: parsedData.rows[rowIndex],
    })
  }
  
  return { rows }
}

/**
 * 导出文件
 */
function exportFile(format, indices) {
  try {
    // 构建导出数据
    const exportData = [parsedData.headers]
    
    for (const idx of indices) {
      exportData.push(parsedData.rows[idx])
    }
    
    // 创建工作表
    const worksheet = XLSX.utils.aoa_to_sheet(exportData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1')
    
    // 生成文件
    let fileData
    let mimeType
    
    if (format === 'csv') {
      fileData = XLSX.write(workbook, { type: 'string', bookType: 'csv' })
      mimeType = 'text/csv;charset=utf-8'
    } else {
      fileData = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })
      mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    }
    
    // 创建 Blob
    const blob = new Blob([fileData], { type: mimeType })
    const blobUrl = URL.createObjectURL(blob)
    
    return { blobUrl }
  } catch (error) {
    throw new Error(`导出失败: ${error.message}`)
  }
}

/**
 * 清理内存
 */
function cleanup() {
  workbookData = {
    sheetNames: [],
    sheets: {},
    currentSheet: null,
  }
  parsedData = {
    headers: [],
    rows: [],
    columnTypes: [],
  }
}

// Worker 消息处理
self.onmessage = async (e) => {
  const { id, type, payload } = e.data
  
  try {
    let result
    
    switch (type) {
      case 'PARSE_FILE':
        result = parseFile(payload.buffer, payload.fileName)
        break
      
      case 'SWITCH_SHEET':
        result = switchSheet(payload.sheetName)
        break
        
      case 'GET_UNIQUE_VALUES':
        result = getUniqueValues(payload.columnIndex, payload.searchTerm)
        break
        
      case 'FILTER':
        result = applyFilter(payload.conditions)
        break
        
      case 'GET_ROWS':
        result = getRows(payload.indices, payload.startIdx, payload.count)
        break
        
      case 'EXPORT':
        result = exportFile(payload.format, payload.indices)
        break
        
      case 'CLEANUP':
        cleanup()
        result = { success: true }
        break
        
      default:
        throw new Error(`Unknown command: ${type}`)
    }
    
    self.postMessage({ id, type: 'SUCCESS', result })
  } catch (error) {
    self.postMessage({ id, type: 'ERROR', error: error.message })
  }
}
