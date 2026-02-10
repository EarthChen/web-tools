/**
 * Data Worker - 处理大文件解析、筛选、排序、编辑、搜索、统计、导出
 * 所有重型计算都在这里完成，避免阻塞主线程
 */

import * as XLSX from 'xlsx'

// ============================================================
// Worker 内部状态
// ============================================================

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

// 编辑历史栈
let editHistory = []
let editHistoryIndex = -1
const MAX_HISTORY = 100

// 当前排序状态
let currentSort = { columnIndex: null, direction: null }

// ============================================================
// 文件解析
// ============================================================

/**
 * Parse JSON text into headers and row arrays
 * Supports: JSON Array of objects, JSON Lines, and nested arrays
 */
function parseJsonToTable(text) {
  let data

  // Try standard JSON parse first
  try {
    data = JSON.parse(text)
  } catch {
    // Try JSON Lines (one JSON object per line)
    const lines = text.split('\n').filter(l => l.trim())
    data = lines.map(line => JSON.parse(line))
  }

  if (!Array.isArray(data)) {
    // Single object -> wrap in array
    data = [data]
  }

  if (data.length === 0) return { headers: [], rows: [] }

  // If array of arrays (e.g., [[1,2],[3,4]]), treat first row as headers
  if (Array.isArray(data[0])) {
    const headers = data[0].map((h, i) => String(h ?? '') || `列${i + 1}`)
    const rows = data.slice(1).map(row => Array.isArray(row) ? row : [])
    return { headers, rows }
  }

  // Array of objects -> extract keys as headers
  const keySet = new Set()
  for (const obj of data) {
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
      Object.keys(obj).forEach(k => keySet.add(k))
    }
  }
  const headers = [...keySet]
  const rows = data.map(obj => {
    if (!obj || typeof obj !== 'object') return headers.map(() => '')
    return headers.map(h => {
      const val = obj[h]
      if (val === null || val === undefined) return ''
      if (typeof val === 'object') return JSON.stringify(val)
      return val
    })
  })

  return { headers, rows }
}

function parseFile(buffer, fileName) {
  try {
    const lowerName = fileName.toLowerCase()
    const isCSV = lowerName.endsWith('.csv')
    const isJSON = lowerName.endsWith('.json') || lowerName.endsWith('.jsonl') || lowerName.endsWith('.ndjson')

    // --- JSON import ---
    if (isJSON) {
      const decoder = new TextDecoder('utf-8')
      const text = decoder.decode(buffer)
      const { headers, rows } = parseJsonToTable(text)

      if (headers.length === 0) {
        throw new Error('JSON 文件中没有可用数据')
      }

      const columnTypes = analyzeColumnTypes(rows, headers.length)
      const sheetName = 'Sheet1'
      workbookData.sheetNames = [sheetName]
      workbookData.sheets = { [sheetName]: { headers, rows, columnTypes } }
      workbookData.currentSheet = sheetName
      parsedData = workbookData.sheets[sheetName]

      editHistory = []
      editHistoryIndex = -1
      currentSort = { columnIndex: null, direction: null }

      return {
        sheetNames: [sheetName],
        currentSheet: sheetName,
        headers: parsedData.headers,
        totalRows: parsedData.rows.length,
        indices: Array.from({ length: parsedData.rows.length }, (_, i) => i),
      }
    }

    // --- CSV / Excel import ---
    let workbook
    if (isCSV) {
      const decoder = new TextDecoder('utf-8')
      const text = decoder.decode(buffer)
      workbook = XLSX.read(text, { type: 'string' })
    } else {
      workbook = XLSX.read(buffer, { type: 'array' })
    }

    workbookData.sheetNames = workbook.SheetNames
    workbookData.sheets = {}

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })

      if (jsonData.length === 0) {
        workbookData.sheets[sheetName] = { headers: [], rows: [], columnTypes: [] }
        continue
      }

      const headers = jsonData[0].map((h, idx) => String(h || '').trim() || `列${idx + 1}`)
      const rows = jsonData.slice(1)
      const columnTypes = analyzeColumnTypes(rows, headers.length)

      workbookData.sheets[sheetName] = { headers, rows, columnTypes }
    }

    const firstSheetName = workbook.SheetNames[0]
    workbookData.currentSheet = firstSheetName
    parsedData = workbookData.sheets[firstSheetName]

    const indices = Array.from({ length: parsedData.rows.length }, (_, i) => i)
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
 * 追加导入：将新文件数据追加到当前 Sheet
 */
function appendFile(buffer, fileName) {
  try {
    const lowerName = fileName.toLowerCase()
    const isCSV = lowerName.endsWith('.csv')
    const isJSON = lowerName.endsWith('.json') || lowerName.endsWith('.jsonl') || lowerName.endsWith('.ndjson')

    let newRows

    if (isJSON) {
      const decoder = new TextDecoder('utf-8')
      const text = decoder.decode(buffer)
      const { rows } = parseJsonToTable(text)
      newRows = rows
    } else {
      let workbook
      if (isCSV) {
        const decoder = new TextDecoder('utf-8')
        const text = decoder.decode(buffer)
        workbook = XLSX.read(text, { type: 'string' })
      } else {
        workbook = XLSX.read(buffer, { type: 'array' })
      }

      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })

      if (jsonData.length < 2) {
        return { appended: 0, totalRows: parsedData.rows.length }
      }

      newRows = jsonData.slice(1)
    }

    if (!newRows || newRows.length === 0) {
      return { appended: 0, totalRows: parsedData.rows.length }
    }

    // Pad or trim rows to match current column count
    const colCount = parsedData.headers.length
    const normalizedRows = newRows.map(row => {
      const r = Array.isArray(row) ? row : []
      if (r.length < colCount) return [...r, ...new Array(colCount - r.length).fill('')]
      return r.slice(0, colCount)
    })

    parsedData.rows.push(...normalizedRows)
    parsedData.columnTypes = analyzeColumnTypes(parsedData.rows, colCount)

    const indices = Array.from({ length: parsedData.rows.length }, (_, i) => i)

    return {
      appended: normalizedRows.length,
      totalRows: parsedData.rows.length,
      indices,
    }
  } catch (error) {
    throw new Error(`追加导入失败: ${error.message}`)
  }
}

// ============================================================
// Sheet 操作
// ============================================================

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

// ============================================================
// 列类型分析
// ============================================================

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

    if (numberCount > sampleSize * 0.8) types[col] = 'number'
    else if (dateCount > sampleSize * 0.8) types[col] = 'date'
  }

  return types
}

function isDateLike(str) {
  return /^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(str) ||
    /^\d{1,2}[-/]\d{1,2}[-/]\d{4}/.test(str)
}

// ============================================================
// 筛选
// ============================================================

function getUniqueValues(columnIndex, searchTerm = '') {
  const uniqueSet = new Set()
  const maxValues = 1000

  for (const row of parsedData.rows) {
    if (uniqueSet.size >= maxValues) break
    const value = row[columnIndex]
    const stringValue = value === null || value === undefined ? '' : String(value)
    if (searchTerm && !stringValue.toLowerCase().includes(searchTerm.toLowerCase())) continue
    uniqueSet.add(stringValue)
  }

  const values = Array.from(uniqueSet).sort((a, b) => {
    if (a === '' && b !== '') return 1
    if (b === '' && a !== '') return -1
    const numA = Number(a)
    const numB = Number(b)
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB
    return a.localeCompare(b, 'zh-CN')
  })

  return { values, hasMore: uniqueSet.size >= maxValues }
}

function applyFilter(conditions) {
  if (Object.keys(conditions).length === 0) {
    return { indices: Array.from({ length: parsedData.rows.length }, (_, i) => i) }
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
    if (match) indices.push(i)
  }

  return { indices }
}

// ============================================================
// 行数据获取
// ============================================================

function getRows(indices, startIdx, count) {
  const endIdx = Math.min(startIdx + count, indices.length)
  const rows = []
  for (let i = startIdx; i < endIdx; i++) {
    const rowIndex = indices[i]
    rows.push({ index: rowIndex, data: parsedData.rows[rowIndex] })
  }
  return { rows }
}

// ============================================================
// 排序
// ============================================================

function sortData(columnIndex, direction, filterConditions = {}) {
  currentSort = { columnIndex, direction }

  let baseIndices
  if (Object.keys(filterConditions).length === 0) {
    baseIndices = Array.from({ length: parsedData.rows.length }, (_, i) => i)
  } else {
    baseIndices = applyFilter(filterConditions).indices
  }

  if (columnIndex === null || direction === null) {
    return { indices: baseIndices, sort: { columnIndex: null, direction: null } }
  }

  const colType = parsedData.columnTypes[columnIndex]

  const sorted = [...baseIndices].sort((a, b) => {
    const valA = parsedData.rows[a]?.[columnIndex]
    const valB = parsedData.rows[b]?.[columnIndex]

    const emptyA = valA === null || valA === undefined || valA === ''
    const emptyB = valB === null || valB === undefined || valB === ''
    if (emptyA && emptyB) return 0
    if (emptyA) return 1
    if (emptyB) return -1

    let cmp = 0
    if (colType === 'number') {
      const numA = Number(valA)
      const numB = Number(valB)
      cmp = (!isNaN(numA) && !isNaN(numB)) ? numA - numB : String(valA).localeCompare(String(valB), 'zh-CN')
    } else if (colType === 'date') {
      const dateA = new Date(valA)
      const dateB = new Date(valB)
      cmp = dateA.getTime() - dateB.getTime()
      if (isNaN(cmp)) cmp = String(valA).localeCompare(String(valB), 'zh-CN')
    } else {
      cmp = String(valA).localeCompare(String(valB), 'zh-CN')
    }

    return direction === 'desc' ? -cmp : cmp
  })

  return { indices: sorted, sort: { columnIndex, direction } }
}

// ============================================================
// 单元格编辑 + 撤销/重做
// ============================================================

function pushHistory(entry) {
  if (editHistoryIndex < editHistory.length - 1) {
    editHistory = editHistory.slice(0, editHistoryIndex + 1)
  }
  editHistory.push(entry)
  if (editHistory.length > MAX_HISTORY) {
    editHistory = editHistory.slice(editHistory.length - MAX_HISTORY)
  }
  editHistoryIndex = editHistory.length - 1
}

function updateCell(rowIndex, columnIndex, newValue) {
  const oldValue = parsedData.rows[rowIndex]?.[columnIndex]
  if (String(oldValue ?? '') === String(newValue ?? '')) {
    return { changed: false }
  }

  pushHistory({
    type: 'cell',
    sheet: workbookData.currentSheet,
    rowIndex, columnIndex, oldValue, newValue,
  })

  if (!parsedData.rows[rowIndex]) parsedData.rows[rowIndex] = []
  parsedData.rows[rowIndex][columnIndex] = newValue

  return {
    changed: true, rowIndex, columnIndex, oldValue, newValue,
    canUndo: editHistoryIndex >= 0, canRedo: false,
    historySize: editHistory.length,
  }
}

function undoEdit() {
  if (editHistoryIndex < 0) return { success: false, message: '没有可撤销的操作' }

  const entry = editHistory[editHistoryIndex]
  if (entry.sheet !== workbookData.currentSheet) {
    return { success: false, message: '撤销操作跨 Sheet，暂不支持' }
  }

  // Reverse the operation based on entry type
  if (entry.type === 'cell') {
    parsedData.rows[entry.rowIndex][entry.columnIndex] = entry.oldValue
  } else if (entry.type === 'addRow') {
    parsedData.rows.splice(entry.rowIndex, 1)
  } else if (entry.type === 'deleteRows') {
    // Re-insert deleted rows in order
    for (let i = 0; i < entry.deletedRows.length; i++) {
      parsedData.rows.splice(entry.deletedRows[i].index, 0, entry.deletedRows[i].data)
    }
  } else if (entry.type === 'addColumn') {
    parsedData.headers.splice(entry.columnIndex, 1)
    parsedData.columnTypes.splice(entry.columnIndex, 1)
    for (const row of parsedData.rows) {
      row.splice(entry.columnIndex, 1)
    }
  } else if (entry.type === 'deleteColumn') {
    parsedData.headers.splice(entry.columnIndex, 0, entry.header)
    parsedData.columnTypes.splice(entry.columnIndex, 0, entry.columnType)
    for (let i = 0; i < parsedData.rows.length; i++) {
      parsedData.rows[i].splice(entry.columnIndex, 0, entry.columnData[i])
    }
  } else if (entry.type === 'batchReplace') {
    for (const change of entry.changes) {
      parsedData.rows[change.rowIndex][change.columnIndex] = change.oldValue
    }
  } else if (entry.type === 'batchTransform') {
    for (const change of entry.changes) {
      parsedData.rows[change.rowIndex][change.columnIndex] = change.oldValue
    }
  }

  editHistoryIndex--
  return {
    success: true,
    entryType: entry.type,
    canUndo: editHistoryIndex >= 0,
    canRedo: true,
    headers: parsedData.headers,
    totalRows: parsedData.rows.length,
    indices: Array.from({ length: parsedData.rows.length }, (_, i) => i),
  }
}

function redoEdit() {
  if (editHistoryIndex >= editHistory.length - 1) return { success: false, message: '没有可重做的操作' }

  editHistoryIndex++
  const entry = editHistory[editHistoryIndex]
  if (entry.sheet !== workbookData.currentSheet) {
    editHistoryIndex--
    return { success: false, message: '重做操作跨 Sheet，暂不支持' }
  }

  if (entry.type === 'cell') {
    parsedData.rows[entry.rowIndex][entry.columnIndex] = entry.newValue
  } else if (entry.type === 'addRow') {
    parsedData.rows.splice(entry.rowIndex, 0, entry.rowData)
  } else if (entry.type === 'deleteRows') {
    for (let i = entry.deletedRows.length - 1; i >= 0; i--) {
      parsedData.rows.splice(entry.deletedRows[i].index, 1)
    }
  } else if (entry.type === 'addColumn') {
    parsedData.headers.splice(entry.columnIndex, 0, entry.header)
    parsedData.columnTypes.splice(entry.columnIndex, 0, 'string')
    for (const row of parsedData.rows) {
      row.splice(entry.columnIndex, 0, '')
    }
  } else if (entry.type === 'deleteColumn') {
    parsedData.headers.splice(entry.columnIndex, 1)
    parsedData.columnTypes.splice(entry.columnIndex, 1)
    for (const row of parsedData.rows) {
      row.splice(entry.columnIndex, 1)
    }
  } else if (entry.type === 'batchReplace') {
    for (const change of entry.changes) {
      parsedData.rows[change.rowIndex][change.columnIndex] = change.newValue
    }
  } else if (entry.type === 'batchTransform') {
    for (const change of entry.changes) {
      parsedData.rows[change.rowIndex][change.columnIndex] = change.newValue
    }
  }

  return {
    success: true,
    entryType: entry.type,
    canUndo: true,
    canRedo: editHistoryIndex < editHistory.length - 1,
    headers: parsedData.headers,
    totalRows: parsedData.rows.length,
    indices: Array.from({ length: parsedData.rows.length }, (_, i) => i),
  }
}

function getEditState() {
  return {
    canUndo: editHistoryIndex >= 0,
    canRedo: editHistoryIndex < editHistory.length - 1,
    historySize: editHistory.length,
    isModified: editHistory.length > 0,
  }
}

// ============================================================
// 搜索 & 查找替换
// ============================================================

/**
 * 全局搜索
 * @returns {{ matches: Array<{rowIndex, colIndex}>, total: number }}
 */
function searchData(term, options = {}) {
  const { caseSensitive = false, wholeWord = false, useRegex = false, columnIndex = -1 } = options

  if (!term) return { matches: [], total: 0 }

  let matcher
  if (useRegex) {
    try {
      matcher = new RegExp(term, caseSensitive ? 'g' : 'gi')
    } catch {
      return { matches: [], total: 0, error: '无效的正则表达式' }
    }
  }

  const matches = []
  const maxMatches = 10000

  for (let r = 0; r < parsedData.rows.length; r++) {
    if (matches.length >= maxMatches) break
    const row = parsedData.rows[r]

    const cols = columnIndex >= 0 ? [columnIndex] : parsedData.headers.map((_, i) => i)

    for (const c of cols) {
      if (matches.length >= maxMatches) break
      const val = row[c]
      const str = val === null || val === undefined ? '' : String(val)
      if (!str) continue

      let isMatch = false
      if (useRegex) {
        matcher.lastIndex = 0
        isMatch = matcher.test(str)
      } else if (wholeWord) {
        const s = caseSensitive ? str : str.toLowerCase()
        const t = caseSensitive ? term : term.toLowerCase()
        isMatch = s === t
      } else {
        const s = caseSensitive ? str : str.toLowerCase()
        const t = caseSensitive ? term : term.toLowerCase()
        isMatch = s.includes(t)
      }

      if (isMatch) {
        matches.push({ rowIndex: r, colIndex: c })
      }
    }
  }

  return { matches, total: matches.length, hasMore: matches.length >= maxMatches }
}

/**
 * 查找替换
 */
function findReplace(searchTerm, replaceTerm, options = {}) {
  const { caseSensitive = false, wholeWord = false, useRegex = false, columnIndex = -1, replaceAll = true } = options

  if (!searchTerm) return { replaced: 0 }

  let matcher
  if (useRegex) {
    try {
      matcher = new RegExp(searchTerm, caseSensitive ? 'g' : 'gi')
    } catch {
      return { replaced: 0, error: '无效的正则表达式' }
    }
  }

  const changes = []

  for (let r = 0; r < parsedData.rows.length; r++) {
    const row = parsedData.rows[r]
    const cols = columnIndex >= 0 ? [columnIndex] : parsedData.headers.map((_, i) => i)

    for (const c of cols) {
      const val = row[c]
      const str = val === null || val === undefined ? '' : String(val)
      if (!str) continue

      let newStr
      if (useRegex) {
        newStr = str.replace(matcher, replaceTerm)
      } else if (wholeWord) {
        const s = caseSensitive ? str : str.toLowerCase()
        const t = caseSensitive ? searchTerm : searchTerm.toLowerCase()
        if (s === t) {
          newStr = replaceTerm
        }
      } else {
        if (caseSensitive) {
          newStr = str.split(searchTerm).join(replaceTerm)
        } else {
          const regex = new RegExp(escapeRegex(searchTerm), 'gi')
          newStr = str.replace(regex, replaceTerm)
        }
      }

      if (newStr !== undefined && newStr !== str) {
        changes.push({ rowIndex: r, columnIndex: c, oldValue: str, newValue: newStr })
        parsedData.rows[r][c] = newStr
        if (!replaceAll) break
      }
    }
    if (!replaceAll && changes.length > 0) break
  }

  if (changes.length > 0) {
    pushHistory({
      type: 'batchReplace',
      sheet: workbookData.currentSheet,
      changes,
    })
  }

  return {
    replaced: changes.length,
    canUndo: editHistoryIndex >= 0,
    canRedo: false,
  }
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// ============================================================
// 行操作
// ============================================================

/**
 * 插入行
 */
function addRow(atIndex, data = null) {
  const idx = Math.max(0, Math.min(atIndex, parsedData.rows.length))
  const rowData = data || new Array(parsedData.headers.length).fill('')

  pushHistory({
    type: 'addRow',
    sheet: workbookData.currentSheet,
    rowIndex: idx,
    rowData: [...rowData],
  })

  parsedData.rows.splice(idx, 0, rowData)
  const indices = Array.from({ length: parsedData.rows.length }, (_, i) => i)

  return {
    totalRows: parsedData.rows.length,
    indices,
    insertedAt: idx,
  }
}

/**
 * 删除行（支持批量）
 */
function deleteRows(rowIndices) {
  const sorted = [...rowIndices].sort((a, b) => a - b)
  const deletedRows = []

  // Collect data before deletion (in order)
  for (const idx of sorted) {
    if (idx >= 0 && idx < parsedData.rows.length) {
      deletedRows.push({ index: idx, data: [...parsedData.rows[idx]] })
    }
  }

  // Delete from end to preserve indices
  for (let i = deletedRows.length - 1; i >= 0; i--) {
    parsedData.rows.splice(deletedRows[i].index, 1)
  }

  pushHistory({
    type: 'deleteRows',
    sheet: workbookData.currentSheet,
    deletedRows,
  })

  const indices = Array.from({ length: parsedData.rows.length }, (_, i) => i)

  return {
    deleted: deletedRows.length,
    totalRows: parsedData.rows.length,
    indices,
  }
}

/**
 * 复制行
 */
function duplicateRow(rowIndex) {
  if (rowIndex < 0 || rowIndex >= parsedData.rows.length) {
    throw new Error('行索引越界')
  }
  const rowData = [...parsedData.rows[rowIndex]]
  return addRow(rowIndex + 1, rowData)
}

// ============================================================
// 列操作
// ============================================================

/**
 * 插入列
 */
function addColumn(atIndex, headerName = '') {
  const idx = Math.max(0, Math.min(atIndex, parsedData.headers.length))
  const header = headerName || `新列${idx + 1}`

  pushHistory({
    type: 'addColumn',
    sheet: workbookData.currentSheet,
    columnIndex: idx,
    header,
  })

  parsedData.headers.splice(idx, 0, header)
  parsedData.columnTypes.splice(idx, 0, 'string')
  for (const row of parsedData.rows) {
    row.splice(idx, 0, '')
  }

  return {
    headers: parsedData.headers,
    columnTypes: parsedData.columnTypes,
    insertedAt: idx,
  }
}

/**
 * 删除列
 */
function deleteColumn(columnIndex) {
  if (columnIndex < 0 || columnIndex >= parsedData.headers.length) {
    throw new Error('列索引越界')
  }

  const header = parsedData.headers[columnIndex]
  const columnType = parsedData.columnTypes[columnIndex]
  const columnData = parsedData.rows.map(row => row[columnIndex])

  pushHistory({
    type: 'deleteColumn',
    sheet: workbookData.currentSheet,
    columnIndex,
    header,
    columnType,
    columnData,
  })

  parsedData.headers.splice(columnIndex, 1)
  parsedData.columnTypes.splice(columnIndex, 1)
  for (const row of parsedData.rows) {
    row.splice(columnIndex, 1)
  }

  return {
    headers: parsedData.headers,
    columnTypes: parsedData.columnTypes,
  }
}

/**
 * 重命名列
 */
function renameColumn(columnIndex, newName) {
  if (columnIndex < 0 || columnIndex >= parsedData.headers.length) {
    throw new Error('列索引越界')
  }
  const oldName = parsedData.headers[columnIndex]
  parsedData.headers[columnIndex] = newName
  return { oldName, newName, headers: parsedData.headers }
}

// ============================================================
// 列统计
// ============================================================

function getColumnStats(columnIndex) {
  if (columnIndex < 0 || columnIndex >= parsedData.headers.length) {
    throw new Error('列索引越界')
  }

  const colType = parsedData.columnTypes[columnIndex]
  let total = parsedData.rows.length
  let emptyCount = 0
  let uniqueSet = new Set()
  let min = null
  let max = null
  let sum = 0
  let numericCount = 0

  for (const row of parsedData.rows) {
    const val = row[columnIndex]
    const str = val === null || val === undefined ? '' : String(val)

    if (str === '') {
      emptyCount++
    } else {
      uniqueSet.add(str)
    }

    if (colType === 'number') {
      const num = Number(val)
      if (!isNaN(num)) {
        numericCount++
        sum += num
        if (min === null || num < min) min = num
        if (max === null || num > max) max = num
      }
    }
  }

  const result = {
    header: parsedData.headers[columnIndex],
    type: colType,
    total,
    emptyCount,
    nonEmptyCount: total - emptyCount,
    uniqueCount: uniqueSet.size,
  }

  if (colType === 'number' && numericCount > 0) {
    result.min = min
    result.max = max
    result.sum = sum
    result.avg = sum / numericCount
    result.numericCount = numericCount
  }

  return result
}

// ============================================================
// 重复行检测
// ============================================================

function findDuplicates(columnIndices = null) {
  // If no columns specified, use all columns
  const cols = columnIndices || parsedData.headers.map((_, i) => i)

  const seen = new Map() // key -> [row indices]
  const duplicateGroups = []

  for (let r = 0; r < parsedData.rows.length; r++) {
    const row = parsedData.rows[r]
    const key = cols.map(c => {
      const v = row[c]
      return v === null || v === undefined ? '' : String(v)
    }).join('\x00')

    if (seen.has(key)) {
      seen.get(key).push(r)
    } else {
      seen.set(key, [r])
    }
  }

  let duplicateRowIndices = []
  for (const [, indices] of seen) {
    if (indices.length > 1) {
      duplicateGroups.push(indices)
      duplicateRowIndices.push(...indices)
    }
  }

  return {
    totalDuplicateGroups: duplicateGroups.length,
    totalDuplicateRows: duplicateRowIndices.length,
    duplicateIndices: duplicateRowIndices,
    groups: duplicateGroups.slice(0, 100), // Limit groups returned
  }
}

// ============================================================
// 批量数据变换
// ============================================================

function batchTransform(columnIndex, transformType, options = {}) {
  if (columnIndex < 0 || columnIndex >= parsedData.headers.length) {
    throw new Error('列索引越界')
  }

  const changes = []

  for (let r = 0; r < parsedData.rows.length; r++) {
    const val = parsedData.rows[r][columnIndex]
    const str = val === null || val === undefined ? '' : String(val)
    let newVal = str

    switch (transformType) {
      case 'trim':
        newVal = str.trim()
        break
      case 'uppercase':
        newVal = str.toUpperCase()
        break
      case 'lowercase':
        newVal = str.toLowerCase()
        break
      case 'capitalize':
        newVal = str.replace(/\b\w/g, c => c.toUpperCase())
        break
      case 'removeSpaces':
        newVal = str.replace(/\s+/g, '')
        break
      case 'prefix':
        if (str) newVal = (options.text || '') + str
        break
      case 'suffix':
        if (str) newVal = str + (options.text || '')
        break
      default:
        break
    }

    if (newVal !== str) {
      changes.push({ rowIndex: r, columnIndex, oldValue: str, newValue: newVal })
      parsedData.rows[r][columnIndex] = newVal
    }
  }

  if (changes.length > 0) {
    pushHistory({
      type: 'batchTransform',
      sheet: workbookData.currentSheet,
      changes,
    })
  }

  return {
    transformed: changes.length,
    canUndo: editHistoryIndex >= 0,
    canRedo: false,
  }
}

// ============================================================
// 列宽自适应计算
// ============================================================

function calculateAutoFitWidths() {
  const widths = []
  const maxSample = Math.min(200, parsedData.rows.length)

  for (let c = 0; c < parsedData.headers.length; c++) {
    // Header width (approx: 8px per char + padding)
    let maxLen = parsedData.headers[c].length

    for (let r = 0; r < maxSample; r++) {
      const val = parsedData.rows[r]?.[c]
      const str = val === null || val === undefined ? '' : String(val)
      if (str.length > maxLen) maxLen = str.length
    }

    // Clamp width: min 80, max 400, ~8px per char + 24px padding
    widths.push(Math.max(80, Math.min(400, maxLen * 8 + 24)))
  }

  return { widths }
}

// ============================================================
// 去重操作
// ============================================================

function removeDuplicates(columnIndices = null, keepStrategy = 'first') {
  const cols = columnIndices || parsedData.headers.map((_, i) => i)
  const seen = new Map()

  for (let r = 0; r < parsedData.rows.length; r++) {
    const row = parsedData.rows[r]
    const key = cols.map(c => {
      const v = row[c]
      return v === null || v === undefined ? '' : String(v)
    }).join('\x00')

    if (seen.has(key)) {
      seen.get(key).push(r)
    } else {
      seen.set(key, [r])
    }
  }

  const toDelete = []
  for (const [, indices] of seen) {
    if (indices.length > 1) {
      if (keepStrategy === 'first') {
        toDelete.push(...indices.slice(1))
      } else {
        toDelete.push(...indices.slice(0, -1))
      }
    }
  }

  if (toDelete.length === 0) return { removed: 0, totalRows: parsedData.rows.length, indices: Array.from({ length: parsedData.rows.length }, (_, i) => i) }

  const sorted = [...toDelete].sort((a, b) => b - a)
  const deletedRows = []
  for (const idx of sorted) {
    deletedRows.unshift({ index: idx, data: [...parsedData.rows[idx]] })
    parsedData.rows.splice(idx, 1)
  }

  pushHistory({ type: 'deleteRows', sheet: workbookData.currentSheet, deletedRows })

  return {
    removed: toDelete.length,
    totalRows: parsedData.rows.length,
    indices: Array.from({ length: parsedData.rows.length }, (_, i) => i),
  }
}

// ============================================================
// 列拆分
// ============================================================

function splitColumn(columnIndex, delimiter, maxSplits = -1) {
  if (columnIndex < 0 || columnIndex >= parsedData.headers.length) throw new Error('列索引越界')

  const header = parsedData.headers[columnIndex]
  // Determine max number of parts
  let maxParts = 0
  for (const row of parsedData.rows) {
    const val = row[columnIndex]
    const str = val === null || val === undefined ? '' : String(val)
    const parts = maxSplits > 0 ? str.split(delimiter, maxSplits) : str.split(delimiter)
    if (parts.length > maxParts) maxParts = parts.length
  }

  if (maxParts <= 1) return { headers: parsedData.headers, splitCount: 0 }

  // Create new headers
  const newHeaders = []
  for (let i = 0; i < maxParts; i++) {
    newHeaders.push(`${header}_${i + 1}`)
  }

  // Replace old column with split columns
  parsedData.headers.splice(columnIndex, 1, ...newHeaders)
  parsedData.columnTypes.splice(columnIndex, 1, ...new Array(maxParts).fill('string'))

  for (let r = 0; r < parsedData.rows.length; r++) {
    const val = parsedData.rows[r][columnIndex]
    const str = val === null || val === undefined ? '' : String(val)
    const parts = maxSplits > 0 ? str.split(delimiter, maxSplits) : str.split(delimiter)
    while (parts.length < maxParts) parts.push('')
    parsedData.rows[r].splice(columnIndex, 1, ...parts)
  }

  return { headers: parsedData.headers, columnTypes: parsedData.columnTypes, splitCount: maxParts }
}

// ============================================================
// 列合并
// ============================================================

function mergeColumns(columnIndices, separator = '', newHeaderName = '') {
  if (!columnIndices || columnIndices.length < 2) throw new Error('至少需要选择两列')

  const header = newHeaderName || columnIndices.map(i => parsedData.headers[i]).join('+')
  const insertAt = Math.min(...columnIndices)

  // Generate merged data
  const mergedData = parsedData.rows.map(row => {
    return columnIndices.map(i => {
      const v = row[i]
      return v === null || v === undefined ? '' : String(v)
    }).join(separator)
  })

  // Insert new column
  parsedData.headers.splice(insertAt, 0, header)
  parsedData.columnTypes.splice(insertAt, 0, 'string')
  for (let r = 0; r < parsedData.rows.length; r++) {
    parsedData.rows[r].splice(insertAt, 0, mergedData[r])
  }

  return { headers: parsedData.headers, columnTypes: parsedData.columnTypes, insertedAt: insertAt }
}

// ============================================================
// 行列转置
// ============================================================

function transpose() {
  const oldHeaders = parsedData.headers
  const oldRows = parsedData.rows

  // New headers = first column values (or row numbers)
  const newHeaders = ['原表头', ...oldRows.map((_, i) => `行${i + 1}`)]

  // New rows = original columns become rows
  const newRows = oldHeaders.map((header, colIdx) => {
    const row = [header]
    for (let r = 0; r < oldRows.length; r++) {
      const v = oldRows[r][colIdx]
      row.push(v === null || v === undefined ? '' : v)
    }
    return row
  })

  parsedData.headers = newHeaders
  parsedData.rows = newRows
  parsedData.columnTypes = analyzeColumnTypes(newRows, newHeaders.length)

  return {
    headers: parsedData.headers,
    totalRows: parsedData.rows.length,
    indices: Array.from({ length: parsedData.rows.length }, (_, i) => i),
  }
}

// ============================================================
// 清除空行
// ============================================================

function removeEmptyRows() {
  const toDelete = []
  for (let r = 0; r < parsedData.rows.length; r++) {
    const row = parsedData.rows[r]
    const isEmpty = row.every(v => v === null || v === undefined || String(v).trim() === '')
    if (isEmpty) toDelete.push(r)
  }

  if (toDelete.length === 0) return { removed: 0, totalRows: parsedData.rows.length, indices: Array.from({ length: parsedData.rows.length }, (_, i) => i) }

  const deletedRows = []
  for (let i = toDelete.length - 1; i >= 0; i--) {
    const idx = toDelete[i]
    deletedRows.unshift({ index: idx, data: [...parsedData.rows[idx]] })
    parsedData.rows.splice(idx, 1)
  }

  pushHistory({ type: 'deleteRows', sheet: workbookData.currentSheet, deletedRows })

  return {
    removed: toDelete.length,
    totalRows: parsedData.rows.length,
    indices: Array.from({ length: parsedData.rows.length }, (_, i) => i),
  }
}

// ============================================================
// 条件删除行
// ============================================================

function conditionalDeleteRows(columnIndex, condition, value) {
  // condition: 'empty' | 'notEmpty' | 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'regex'
  const toDelete = []

  for (let r = 0; r < parsedData.rows.length; r++) {
    const cellVal = parsedData.rows[r][columnIndex]
    const str = cellVal === null || cellVal === undefined ? '' : String(cellVal)
    let match = false

    switch (condition) {
      case 'empty': match = str.trim() === ''; break
      case 'notEmpty': match = str.trim() !== ''; break
      case 'equals': match = str === value; break
      case 'contains': match = str.includes(value); break
      case 'startsWith': match = str.startsWith(value); break
      case 'endsWith': match = str.endsWith(value); break
      case 'regex':
        try { match = new RegExp(value).test(str) } catch { match = false }
        break
      default: break
    }

    if (match) toDelete.push(r)
  }

  if (toDelete.length === 0) return { removed: 0, totalRows: parsedData.rows.length, indices: Array.from({ length: parsedData.rows.length }, (_, i) => i) }

  const deletedRows = []
  for (let i = toDelete.length - 1; i >= 0; i--) {
    const idx = toDelete[i]
    deletedRows.unshift({ index: idx, data: [...parsedData.rows[idx]] })
    parsedData.rows.splice(idx, 1)
  }

  pushHistory({ type: 'deleteRows', sheet: workbookData.currentSheet, deletedRows })

  return {
    removed: toDelete.length,
    totalRows: parsedData.rows.length,
    indices: Array.from({ length: parsedData.rows.length }, (_, i) => i),
  }
}

// ============================================================
// 正则提取列
// ============================================================

function regexExtractColumn(columnIndex, pattern, newHeaderName = '') {
  if (columnIndex < 0 || columnIndex >= parsedData.headers.length) throw new Error('列索引越界')

  let regex
  try { regex = new RegExp(pattern) } catch { throw new Error('无效的正则表达式') }

  const header = newHeaderName || `${parsedData.headers[columnIndex]}_提取`
  const insertAt = columnIndex + 1

  parsedData.headers.splice(insertAt, 0, header)
  parsedData.columnTypes.splice(insertAt, 0, 'string')

  for (let r = 0; r < parsedData.rows.length; r++) {
    const val = parsedData.rows[r][columnIndex]
    const str = val === null || val === undefined ? '' : String(val)
    const match = str.match(regex)
    parsedData.rows[r].splice(insertAt, 0, match ? (match[1] || match[0]) : '')
  }

  return { headers: parsedData.headers, columnTypes: parsedData.columnTypes, insertedAt: insertAt }
}

// ============================================================
// VLOOKUP - 跨数据匹配
// ============================================================

function vlookup(lookupBuffer, lookupFileName, keyColumnIndex, lookupKeyColumn, lookupValueColumn) {
  try {
    const isCSV = lookupFileName.toLowerCase().endsWith('.csv')
    let wb
    if (isCSV) {
      const decoder = new TextDecoder('utf-8')
      const text = decoder.decode(lookupBuffer)
      wb = XLSX.read(text, { type: 'string' })
    } else {
      wb = XLSX.read(lookupBuffer, { type: 'array' })
    }

    const sheet = wb.Sheets[wb.SheetNames[0]]
    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })

    if (jsonData.length < 2) throw new Error('查找文件数据不足')

    const lookupHeaders = jsonData[0]
    const lookupRows = jsonData.slice(1)

    // Build lookup map
    const lookupMap = new Map()
    for (const row of lookupRows) {
      const key = row[lookupKeyColumn]
      const keyStr = key === null || key === undefined ? '' : String(key)
      if (keyStr) lookupMap.set(keyStr, row[lookupValueColumn])
    }

    // Add new column
    const header = `VLOOKUP_${lookupHeaders[lookupValueColumn] || '结果'}`
    const insertAt = parsedData.headers.length
    parsedData.headers.push(header)
    parsedData.columnTypes.push('string')

    let matchCount = 0
    for (let r = 0; r < parsedData.rows.length; r++) {
      const keyVal = parsedData.rows[r][keyColumnIndex]
      const keyStr = keyVal === null || keyVal === undefined ? '' : String(keyVal)
      const result = lookupMap.get(keyStr)
      parsedData.rows[r].push(result !== undefined ? result : '')
      if (result !== undefined) matchCount++
    }

    return {
      headers: parsedData.headers,
      matchCount,
      totalRows: parsedData.rows.length,
      lookupHeaders: lookupHeaders.map((h, i) => ({ index: i, name: String(h || `列${i + 1}`) })),
    }
  } catch (error) {
    throw new Error(`VLOOKUP 失败: ${error.message}`)
  }
}

// ============================================================
// 填充序列
// ============================================================

function fillSeries(columnIndex, startRow, endRow, fillType = 'copy', step = 1) {
  // fillType: 'copy' | 'increment' | 'date_increment'
  if (startRow < 0 || startRow >= parsedData.rows.length) throw new Error('起始行越界')
  const end = Math.min(endRow, parsedData.rows.length - 1)

  const sourceValue = parsedData.rows[startRow][columnIndex]
  const changes = []

  for (let r = startRow + 1; r <= end; r++) {
    const oldValue = parsedData.rows[r][columnIndex]
    let newValue

    if (fillType === 'copy') {
      newValue = sourceValue
    } else if (fillType === 'increment') {
      const baseNum = Number(sourceValue)
      if (!isNaN(baseNum)) {
        newValue = baseNum + step * (r - startRow)
      } else {
        newValue = sourceValue
      }
    } else if (fillType === 'date_increment') {
      const baseDate = new Date(sourceValue)
      if (!isNaN(baseDate.getTime())) {
        const d = new Date(baseDate)
        d.setDate(d.getDate() + step * (r - startRow))
        newValue = d.toISOString().split('T')[0]
      } else {
        newValue = sourceValue
      }
    }

    if (String(newValue) !== String(oldValue)) {
      changes.push({ rowIndex: r, columnIndex, oldValue, newValue })
      parsedData.rows[r][columnIndex] = newValue
    }
  }

  if (changes.length > 0) {
    pushHistory({ type: 'batchTransform', sheet: workbookData.currentSheet, changes })
  }

  return { filled: changes.length }
}

// ============================================================
// JSON 导出
// ============================================================

function exportAsJson(indices, format = 'array') {
  // format: 'array' (array of objects) | 'lines' (JSON Lines)
  const data = indices.map(idx => {
    const row = parsedData.rows[idx]
    const obj = {}
    parsedData.headers.forEach((h, i) => {
      obj[h] = row[i] === undefined ? '' : row[i]
    })
    return obj
  })

  let content
  let mimeType = 'application/json;charset=utf-8'
  let ext = 'json'

  if (format === 'lines') {
    content = data.map(obj => JSON.stringify(obj)).join('\n')
    ext = 'jsonl'
  } else {
    content = JSON.stringify(data, null, 2)
  }

  const blob = new Blob([content], { type: mimeType })
  const blobUrl = URL.createObjectURL(blob)
  return { blobUrl, ext }
}

// ============================================================
// 编码重解析
// ============================================================

function reParseWithEncoding(buffer, fileName, encoding = 'utf-8') {
  try {
    const decoder = new TextDecoder(encoding)
    const text = decoder.decode(buffer)
    const workbook = XLSX.read(text, { type: 'string' })

    const firstSheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[firstSheetName]
    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })

    if (jsonData.length === 0) throw new Error('文件为空')

    const headers = jsonData[0].map((h, idx) => String(h || '').trim() || `列${idx + 1}`)
    const rows = jsonData.slice(1)
    const columnTypes = analyzeColumnTypes(rows, headers.length)

    // Update current sheet data
    parsedData.headers = headers
    parsedData.rows = rows
    parsedData.columnTypes = columnTypes

    if (workbookData.currentSheet) {
      workbookData.sheets[workbookData.currentSheet] = parsedData
    }

    return {
      headers: parsedData.headers,
      totalRows: parsedData.rows.length,
      indices: Array.from({ length: parsedData.rows.length }, (_, i) => i),
    }
  } catch (error) {
    throw new Error(`重新解析失败: ${error.message}`)
  }
}

// ============================================================
// 选择性导出
// ============================================================

function exportSelective(format, indices, columnIndices) {
  try {
    const selectedHeaders = columnIndices.map(i => parsedData.headers[i])

    // JSON / JSONL export
    if (format === 'json' || format === 'jsonl') {
      const objects = indices.map(idx => {
        const row = parsedData.rows[idx]
        const obj = {}
        columnIndices.forEach((ci, hi) => { obj[selectedHeaders[hi]] = row[ci] })
        return obj
      })

      let text, mimeType
      if (format === 'jsonl') {
        text = objects.map(o => JSON.stringify(o)).join('\n')
        mimeType = 'application/x-ndjson'
      } else {
        text = JSON.stringify(objects, null, 2)
        mimeType = 'application/json'
      }

      const blob = new Blob([text], { type: mimeType })
      return { blobUrl: URL.createObjectURL(blob), ext: format === 'jsonl' ? 'jsonl' : 'json' }
    }

    // CSV / XLSX export
    const exportData = [selectedHeaders]
    for (const idx of indices) {
      const row = parsedData.rows[idx]
      exportData.push(columnIndices.map(i => row[i]))
    }

    const worksheet = XLSX.utils.aoa_to_sheet(exportData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1')

    let fileData, mimeType
    if (format === 'csv') {
      fileData = XLSX.write(workbook, { type: 'string', bookType: 'csv' })
      mimeType = 'text/csv;charset=utf-8'
    } else {
      fileData = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })
      mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    }

    const blob = new Blob([fileData], { type: mimeType })
    return { blobUrl: URL.createObjectURL(blob), ext: format }
  } catch (error) {
    throw new Error(`选择性导出失败: ${error.message}`)
  }
}

// ============================================================
// 日期格式转换
// ============================================================

function convertDateFormat(columnIndex, fromFormat, toFormat) {
  if (columnIndex < 0 || columnIndex >= parsedData.headers.length) throw new Error('列索引越界')

  const changes = []

  for (let r = 0; r < parsedData.rows.length; r++) {
    const val = parsedData.rows[r][columnIndex]
    const str = val === null || val === undefined ? '' : String(val).trim()
    if (!str) continue

    const date = parseDateString(str, fromFormat)
    if (!date) continue

    const newStr = formatDateString(date, toFormat)
    if (newStr !== str) {
      changes.push({ rowIndex: r, columnIndex, oldValue: str, newValue: newStr })
      parsedData.rows[r][columnIndex] = newStr
    }
  }

  if (changes.length > 0) {
    pushHistory({ type: 'batchTransform', sheet: workbookData.currentSheet, changes })
  }

  return { converted: changes.length }
}

function parseDateString(str, format) {
  // Simple date parser supporting common formats
  const patterns = {
    'YYYY-MM-DD': /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
    'YYYY/MM/DD': /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/,
    'DD/MM/YYYY': /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    'MM/DD/YYYY': /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    'YYYYMMDD': /^(\d{4})(\d{2})(\d{2})$/,
    'auto': null,
  }

  if (format === 'auto') {
    const d = new Date(str)
    return isNaN(d.getTime()) ? null : d
  }

  const regex = patterns[format]
  if (!regex) return null

  const match = str.match(regex)
  if (!match) return null

  let year, month, day
  if (format === 'DD/MM/YYYY') {
    day = parseInt(match[1]); month = parseInt(match[2]); year = parseInt(match[3])
  } else if (format === 'MM/DD/YYYY') {
    month = parseInt(match[1]); day = parseInt(match[2]); year = parseInt(match[3])
  } else {
    year = parseInt(match[1]); month = parseInt(match[2]); day = parseInt(match[3])
  }

  return new Date(year, month - 1, day)
}

function formatDateString(date, format) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')

  switch (format) {
    case 'YYYY-MM-DD': return `${y}-${m}-${d}`
    case 'YYYY/MM/DD': return `${y}/${m}/${d}`
    case 'DD/MM/YYYY': return `${d}/${m}/${y}`
    case 'MM/DD/YYYY': return `${m}/${d}/${y}`
    case 'YYYYMMDD': return `${y}${m}${d}`
    default: return `${y}-${m}-${d}`
  }
}

// ============================================================
// 数字格式化
// ============================================================

function formatNumbers(columnIndex, formatType, options = {}) {
  if (columnIndex < 0 || columnIndex >= parsedData.headers.length) throw new Error('列索引越界')

  const changes = []
  const { decimals = 2, prefix = '', suffix = '' } = options

  for (let r = 0; r < parsedData.rows.length; r++) {
    const val = parsedData.rows[r][columnIndex]
    const num = Number(val)
    if (isNaN(num)) continue

    let newStr
    switch (formatType) {
      case 'fixed': newStr = `${prefix}${num.toFixed(decimals)}${suffix}`; break
      case 'thousands': newStr = `${prefix}${num.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`; break
      case 'percentage': newStr = `${(num * 100).toFixed(decimals)}%`; break
      case 'integer': newStr = `${prefix}${Math.round(num)}${suffix}`; break
      default: continue
    }

    const oldStr = val === null || val === undefined ? '' : String(val)
    if (newStr !== oldStr) {
      changes.push({ rowIndex: r, columnIndex, oldValue: oldStr, newValue: newStr })
      parsedData.rows[r][columnIndex] = newStr
    }
  }

  if (changes.length > 0) {
    pushHistory({ type: 'batchTransform', sheet: workbookData.currentSheet, changes })
  }

  return { formatted: changes.length }
}

// ============================================================
// 导出
// ============================================================

function exportFile(format, indices) {
  try {
    const exportData = [parsedData.headers]
    for (const idx of indices) {
      exportData.push(parsedData.rows[idx])
    }

    const worksheet = XLSX.utils.aoa_to_sheet(exportData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1')

    let fileData
    let mimeType

    if (format === 'csv') {
      fileData = XLSX.write(workbook, { type: 'string', bookType: 'csv' })
      mimeType = 'text/csv;charset=utf-8'
    } else {
      fileData = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })
      mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    }

    const blob = new Blob([fileData], { type: mimeType })
    const blobUrl = URL.createObjectURL(blob)
    return { blobUrl }
  } catch (error) {
    throw new Error(`导出失败: ${error.message}`)
  }
}

// ============================================================
// 清理
// ============================================================

function cleanup() {
  workbookData = { sheetNames: [], sheets: {}, currentSheet: null }
  parsedData = { headers: [], rows: [], columnTypes: [] }
  editHistory = []
  editHistoryIndex = -1
  currentSort = { columnIndex: null, direction: null }
}

// ============================================================
// Worker 消息路由
// ============================================================

self.onmessage = async (e) => {
  const { id, type, payload } = e.data

  try {
    let result

    switch (type) {
      case 'PARSE_FILE':
        result = parseFile(payload.buffer, payload.fileName)
        break
      case 'APPEND_FILE':
        result = appendFile(payload.buffer, payload.fileName)
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
      case 'SORT':
        result = sortData(payload.columnIndex, payload.direction, payload.filterConditions)
        break
      case 'UPDATE_CELL':
        result = updateCell(payload.rowIndex, payload.columnIndex, payload.newValue)
        break
      case 'UNDO':
        result = undoEdit()
        break
      case 'REDO':
        result = redoEdit()
        break
      case 'GET_EDIT_STATE':
        result = getEditState()
        break
      case 'SEARCH':
        result = searchData(payload.term, payload.options)
        break
      case 'FIND_REPLACE':
        result = findReplace(payload.searchTerm, payload.replaceTerm, payload.options)
        break
      case 'ADD_ROW':
        result = addRow(payload.atIndex, payload.data)
        break
      case 'DELETE_ROWS':
        result = deleteRows(payload.rowIndices)
        break
      case 'DUPLICATE_ROW':
        result = duplicateRow(payload.rowIndex)
        break
      case 'ADD_COLUMN':
        result = addColumn(payload.atIndex, payload.headerName)
        break
      case 'DELETE_COLUMN':
        result = deleteColumn(payload.columnIndex)
        break
      case 'RENAME_COLUMN':
        result = renameColumn(payload.columnIndex, payload.newName)
        break
      case 'GET_COLUMN_STATS':
        result = getColumnStats(payload.columnIndex)
        break
      case 'FIND_DUPLICATES':
        result = findDuplicates(payload.columnIndices)
        break
      case 'BATCH_TRANSFORM':
        result = batchTransform(payload.columnIndex, payload.transformType, payload.options)
        break
      case 'AUTO_FIT_WIDTHS':
        result = calculateAutoFitWidths()
        break
      case 'REMOVE_DUPLICATES':
        result = removeDuplicates(payload.columnIndices, payload.keepStrategy)
        break
      case 'SPLIT_COLUMN':
        result = splitColumn(payload.columnIndex, payload.delimiter, payload.maxSplits)
        break
      case 'MERGE_COLUMNS':
        result = mergeColumns(payload.columnIndices, payload.separator, payload.newHeaderName)
        break
      case 'TRANSPOSE':
        result = transpose()
        break
      case 'REMOVE_EMPTY_ROWS':
        result = removeEmptyRows()
        break
      case 'CONDITIONAL_DELETE':
        result = conditionalDeleteRows(payload.columnIndex, payload.condition, payload.value)
        break
      case 'REGEX_EXTRACT':
        result = regexExtractColumn(payload.columnIndex, payload.pattern, payload.newHeaderName)
        break
      case 'VLOOKUP':
        result = vlookup(payload.buffer, payload.fileName, payload.keyColumnIndex, payload.lookupKeyColumn, payload.lookupValueColumn)
        break
      case 'FILL_SERIES':
        result = fillSeries(payload.columnIndex, payload.startRow, payload.endRow, payload.fillType, payload.step)
        break
      case 'EXPORT_JSON':
        result = exportAsJson(payload.indices, payload.format)
        break
      case 'REPARSE_ENCODING':
        result = reParseWithEncoding(payload.buffer, payload.fileName, payload.encoding)
        break
      case 'EXPORT_SELECTIVE':
        result = exportSelective(payload.format, payload.indices, payload.columnIndices)
        break
      case 'CONVERT_DATE_FORMAT':
        result = convertDateFormat(payload.columnIndex, payload.fromFormat, payload.toFormat)
        break
      case 'FORMAT_NUMBERS':
        result = formatNumbers(payload.columnIndex, payload.formatType, payload.options)
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
