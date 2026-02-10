import { useRef, useState, useEffect, useCallback } from 'react'

/**
 * Worker 通信 Hook - 封装与 Web Worker 的所有交互
 */
export function useWorker() {
  const workerRef = useRef(null)
  const callbacksRef = useRef(new Map())
  const idCounterRef = useRef(0)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    workerRef.current = new Worker(
      new URL('../workers/dataWorker.js', import.meta.url),
      { type: 'module' }
    )
    workerRef.current.onmessage = (e) => {
      const { id, type, result, error } = e.data
      const callback = callbacksRef.current.get(id)
      if (callback) {
        if (type === 'SUCCESS') callback.resolve(result)
        else callback.reject(new Error(error))
        callbacksRef.current.delete(id)
      }
    }
    workerRef.current.onerror = (error) => console.error('Worker error:', error)
    setIsReady(true)
    return () => { workerRef.current?.terminate() }
  }, [])

  const send = useCallback((type, payload, transfer = []) => {
    return new Promise((resolve, reject) => {
      const id = ++idCounterRef.current
      callbacksRef.current.set(id, { resolve, reject })
      workerRef.current?.postMessage({ id, type, payload }, transfer)
    })
  }, [])

  return {
    worker: workerRef.current,
    isReady,
    // File
    parseFile: useCallback(async (file) => { const b = await file.arrayBuffer(); return send('PARSE_FILE', { buffer: b, fileName: file.name }, [b]) }, [send]),
    appendFile: useCallback(async (file) => { const b = await file.arrayBuffer(); return send('APPEND_FILE', { buffer: b, fileName: file.name }, [b]) }, [send]),
    reparseEncoding: useCallback(async (file, encoding) => { const b = await file.arrayBuffer(); return send('REPARSE_ENCODING', { buffer: b, fileName: file.name, encoding }, [b]) }, [send]),
    // Sheet
    switchSheet: useCallback((sheetName) => send('SWITCH_SHEET', { sheetName }), [send]),
    // Filter
    getUniqueValues: useCallback((columnIndex, searchTerm = '') => send('GET_UNIQUE_VALUES', { columnIndex, searchTerm }), [send]),
    applyFilter: useCallback((conditions) => send('FILTER', { conditions }), [send]),
    // Rows
    getRows: useCallback((indices, startIdx, count) => send('GET_ROWS', { indices, startIdx, count }), [send]),
    // Sort
    sortData: useCallback((columnIndex, direction, filterConditions = {}) => send('SORT', { columnIndex, direction, filterConditions }), [send]),
    // Cell edit
    updateCell: useCallback((rowIndex, columnIndex, newValue) => send('UPDATE_CELL', { rowIndex, columnIndex, newValue }), [send]),
    undoEdit: useCallback(() => send('UNDO', {}), [send]),
    redoEdit: useCallback(() => send('REDO', {}), [send]),
    getEditState: useCallback(() => send('GET_EDIT_STATE', {}), [send]),
    // Search
    searchData: useCallback((term, options = {}) => send('SEARCH', { term, options }), [send]),
    findReplace: useCallback((searchTerm, replaceTerm, options = {}) => send('FIND_REPLACE', { searchTerm, replaceTerm, options }), [send]),
    // Row operations
    addRow: useCallback((atIndex, data = null) => send('ADD_ROW', { atIndex, data }), [send]),
    deleteRows: useCallback((rowIndices) => send('DELETE_ROWS', { rowIndices }), [send]),
    duplicateRow: useCallback((rowIndex) => send('DUPLICATE_ROW', { rowIndex }), [send]),
    // Column operations
    addColumn: useCallback((atIndex, headerName = '') => send('ADD_COLUMN', { atIndex, headerName }), [send]),
    deleteColumn: useCallback((columnIndex) => send('DELETE_COLUMN', { columnIndex }), [send]),
    renameColumn: useCallback((columnIndex, newName) => send('RENAME_COLUMN', { columnIndex, newName }), [send]),
    // Stats & Analysis
    getColumnStats: useCallback((columnIndex) => send('GET_COLUMN_STATS', { columnIndex }), [send]),
    findDuplicates: useCallback((columnIndices = null) => send('FIND_DUPLICATES', { columnIndices }), [send]),
    // Batch
    batchTransform: useCallback((columnIndex, transformType, options = {}) => send('BATCH_TRANSFORM', { columnIndex, transformType, options }), [send]),
    autoFitWidths: useCallback(() => send('AUTO_FIT_WIDTHS', {}), [send]),
    // Advanced data operations
    removeDuplicates: useCallback((columnIndices, keepStrategy) => send('REMOVE_DUPLICATES', { columnIndices, keepStrategy }), [send]),
    splitColumn: useCallback((columnIndex, delimiter, maxSplits) => send('SPLIT_COLUMN', { columnIndex, delimiter, maxSplits }), [send]),
    mergeColumns: useCallback((columnIndices, separator, newHeaderName) => send('MERGE_COLUMNS', { columnIndices, separator, newHeaderName }), [send]),
    transpose: useCallback(() => send('TRANSPOSE', {}), [send]),
    removeEmptyRows: useCallback(() => send('REMOVE_EMPTY_ROWS', {}), [send]),
    conditionalDelete: useCallback((columnIndex, condition, value) => send('CONDITIONAL_DELETE', { columnIndex, condition, value }), [send]),
    regexExtract: useCallback((columnIndex, pattern, newHeaderName) => send('REGEX_EXTRACT', { columnIndex, pattern, newHeaderName }), [send]),
    vlookup: useCallback(async (file, keyColumnIndex, lookupKeyColumn, lookupValueColumn) => {
      const b = await file.arrayBuffer()
      return send('VLOOKUP', { buffer: b, fileName: file.name, keyColumnIndex, lookupKeyColumn, lookupValueColumn }, [b])
    }, [send]),
    fillSeries: useCallback((columnIndex, startRow, endRow, fillType, step) => send('FILL_SERIES', { columnIndex, startRow, endRow, fillType, step }), [send]),
    // Export
    exportFile: useCallback((format, indices) => send('EXPORT', { format, indices }), [send]),
    exportAsJson: useCallback((indices, format = 'array') => send('EXPORT_JSON', { indices, format }), [send]),
    exportSelective: useCallback((format, indices, columnIndices) => send('EXPORT_SELECTIVE', { format, indices, columnIndices }), [send]),
    // Formatting
    convertDateFormat: useCallback((columnIndex, fromFormat, toFormat) => send('CONVERT_DATE_FORMAT', { columnIndex, fromFormat, toFormat }), [send]),
    formatNumbers: useCallback((columnIndex, formatType, options) => send('FORMAT_NUMBERS', { columnIndex, formatType, options }), [send]),
    // Cleanup
    cleanup: useCallback(() => send('CLEANUP', {}), [send]),
  }
}
