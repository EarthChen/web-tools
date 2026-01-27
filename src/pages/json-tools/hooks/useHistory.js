import { useState, useCallback, useEffect } from 'react'

const STORAGE_KEY = 'json-tools-history'
const MAX_HISTORY = 100

export function useHistory() {
  const [history, setHistory] = useState([])

  // 从 localStorage 加载历史记录
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        setHistory(JSON.parse(saved))
      }
    } catch (e) {
      console.error('Failed to load history:', e)
    }
  }, [])

  // 保存历史记录到 localStorage
  const saveHistory = useCallback((newHistory) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory))
    } catch (e) {
      console.error('Failed to save history:', e)
    }
  }, [])

  // 添加新记录
  const addToHistory = useCallback((json) => {
    if (!json.trim()) return

    // 尝试解析 JSON 获取预览
    let preview = json.substring(0, 100)
    try {
      const parsed = JSON.parse(json)
      if (typeof parsed === 'object') {
        const keys = Object.keys(parsed)
        preview = keys.length > 0 ? `{${keys.slice(0, 3).join(', ')}${keys.length > 3 ? '...' : ''}}` : '{}'
      }
    } catch {
      // 无效 JSON，使用原始预览
    }

    const newEntry = {
      id: Date.now(),
      json,
      preview,
      timestamp: new Date().toISOString(),
    }

    setHistory((prev) => {
      // 去重：如果内容相同则不添加
      const filtered = prev.filter((item) => item.json !== json)
      const newHistory = [newEntry, ...filtered].slice(0, MAX_HISTORY)
      saveHistory(newHistory)
      return newHistory
    })
  }, [saveHistory])

  // 删除记录
  const removeFromHistory = useCallback((id) => {
    setHistory((prev) => {
      const newHistory = prev.filter((item) => item.id !== id)
      saveHistory(newHistory)
      return newHistory
    })
  }, [saveHistory])

  // 清空历史
  const clearHistory = useCallback(() => {
    setHistory([])
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  return {
    history,
    addToHistory,
    removeFromHistory,
    clearHistory,
  }
}
