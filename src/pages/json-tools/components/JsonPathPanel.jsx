import { useState, useCallback, useEffect, useMemo } from 'react'
import { JSONPath } from 'jsonpath-plus'

function JsonPathPanel({ input, parsedJson }) {
  const [query, setQuery] = useState('$')

  // 实时查询结果
  const { result, error } = useMemo(() => {
    if (!query.trim()) {
      return { result: '', error: null }
    }
    
    if (!parsedJson) {
      return { result: '', error: '请输入有效的 JSON 数据' }
    }

    try {
      const queryResult = JSONPath({ path: query, json: parsedJson })
      return { 
        result: JSON.stringify(queryResult, null, 2), 
        error: null 
      }
    } catch (e) {
      return { result: '', error: e.message }
    }
  }, [parsedJson, query])

  // 兼容性保留：点击查询按钮不做额外操作
  const handleQuery = useCallback(() => {
    // 实时查询已处理，此方法仅保留为回车触发
  }, [])

  const handleCopyResult = useCallback(() => {
    navigator.clipboard.writeText(result)
  }, [result])

  const examples = [
    { query: '$', desc: '根节点' },
    { query: '$..*', desc: '所有节点' },
    { query: '$..name', desc: '所有 name 字段' },
    { query: '$[0]', desc: '第一个元素' },
    { query: '$[*]', desc: '所有数组元素' },
  ]

  return (
    <div className="mb-4 p-4 bg-white/5 rounded-lg">
      <div className="flex flex-wrap gap-3 items-start mb-3">
        <div className="flex-1 min-w-[300px]">
          <label className="text-white/80 text-sm font-medium block mb-2">
            JSONPath 查询表达式
          </label>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-white/10 text-white rounded-lg px-4 py-3 font-mono text-base focus:outline-none focus:ring-2 focus:ring-white/30 placeholder-white/40"
            placeholder="输入 JSONPath 表达式，如 $.data.items[*].name"
          />
        </div>
        {result && (
          <button
            onClick={handleCopyResult}
            className="mt-7 px-4 py-2 bg-white/20 text-white rounded-lg text-sm font-medium hover:bg-white/30 transition-colors"
          >
            复制结果
          </button>
        )}
      </div>

      {/* 快捷示例 */}
      <div className="flex flex-wrap gap-2 mb-4">
        <span className="text-white/60 text-xs">快捷示例:</span>
        {examples.map((ex) => (
          <button
            key={ex.query}
            onClick={() => setQuery(ex.query)}
            className="text-xs px-3 py-1.5 bg-white/10 text-white/80 rounded-lg hover:bg-white/20 transition-colors"
            title={ex.desc}
          >
            {ex.query} <span className="text-white/50">({ex.desc})</span>
          </button>
        ))}
      </div>

      {/* 结果显示 */}
      {result && (
        <div>
          <label className="text-white/80 text-sm font-medium block mb-2">
            查询结果
          </label>
          <pre className="bg-white/10 rounded-lg p-4 text-sm text-white/90 font-mono whitespace-pre-wrap break-words">
            {result}
          </pre>
        </div>
      )}

      {error && (
        <p className="text-red-300 text-sm mt-2">⚠️ {error}</p>
      )}
    </div>
  )
}

export default JsonPathPanel
