import { useRef, useState, useEffect, useCallback } from 'react'

/**
 * Worker 通信 Hook
 * 封装与 Web Worker 的所有交互
 */
export function useWorker() {
  const workerRef = useRef(null)
  const callbacksRef = useRef(new Map())
  const idCounterRef = useRef(0)
  const [isReady, setIsReady] = useState(false)

  // 初始化 Worker
  useEffect(() => {
    // Vite 方式加载 Worker
    workerRef.current = new Worker(
      new URL('../workers/dataWorker.js', import.meta.url),
      { type: 'module' }
    )
    
    workerRef.current.onmessage = (e) => {
      const { id, type, result, error } = e.data
      const callback = callbacksRef.current.get(id)
      
      if (callback) {
        if (type === 'SUCCESS') {
          callback.resolve(result)
        } else {
          callback.reject(new Error(error))
        }
        callbacksRef.current.delete(id)
      }
    }
    
    workerRef.current.onerror = (error) => {
      console.error('Worker error:', error)
    }
    
    setIsReady(true)
    
    return () => {
      workerRef.current?.terminate()
    }
  }, [])

  // 发送消息到 Worker
  const sendMessage = useCallback((type, payload, transfer = []) => {
    return new Promise((resolve, reject) => {
      const id = ++idCounterRef.current
      callbacksRef.current.set(id, { resolve, reject })
      
      workerRef.current?.postMessage({ id, type, payload }, transfer)
    })
  }, [])

  // 解析文件
  const parseFile = useCallback(async (file) => {
    const buffer = await file.arrayBuffer()
    return sendMessage('PARSE_FILE', { 
      buffer, 
      fileName: file.name 
    }, [buffer])
  }, [sendMessage])

  // 切换 Sheet
  const switchSheet = useCallback((sheetName) => {
    return sendMessage('SWITCH_SHEET', { sheetName })
  }, [sendMessage])

  // 获取唯一值
  const getUniqueValues = useCallback((columnIndex, searchTerm = '') => {
    return sendMessage('GET_UNIQUE_VALUES', { columnIndex, searchTerm })
  }, [sendMessage])

  // 应用筛选
  const applyFilter = useCallback((conditions) => {
    return sendMessage('FILTER', { conditions })
  }, [sendMessage])

  // 获取行数据
  const getRows = useCallback((indices, startIdx, count) => {
    return sendMessage('GET_ROWS', { indices, startIdx, count })
  }, [sendMessage])

  // 导出文件
  const exportFile = useCallback((format, indices) => {
    return sendMessage('EXPORT', { format, indices })
  }, [sendMessage])

  // 清理
  const cleanup = useCallback(() => {
    return sendMessage('CLEANUP', {})
  }, [sendMessage])

  return {
    worker: workerRef.current,
    isReady,
    parseFile,
    switchSheet,
    getUniqueValues,
    applyFilter,
    getRows,
    exportFile,
    cleanup,
  }
}
