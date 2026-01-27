import { useState, useCallback } from 'react'
import { JSONPath } from 'jsonpath-plus'

function JsonPathPanel({ input, parsedJson }) {
  const [query, setQuery] = useState('$')
  const [result, setResult] = useState('')
  const [error, setError] = useState(null)

  const handleQuery = useCallback(() => {
    try {
      if (!parsedJson) {
        setError('请输入有效的 JSON 数据')
        return
      }
      
      const queryResult = JSONPath({ path: query, json: parsedJson })
      setResult(JSON.stringify(queryResult, null, 2))
      setError(null)
    } catch (e) {
      setError(e.message)
      setResult('')
    }
  }, [parsedJson, query])

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
      <div className="flex flex-wrap gap-2 items-center mb-3">
        <span className="text-white/80 text-sm font-medium">JSONPath:</span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 min-w-[200px] bg-white/10 text-white rounded px-3 py-1.5 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-white/30"
          placeholder="输入 JSONPath 表达式"
          onKeyDown={(e) => e.key === 'Enter' && handleQuery()}
        />
        <button
          onClick={handleQuery}
          className="px-3 py-1.5 bg-white text-gray-800 rounded text-sm font-medium hover:bg-white/90 transition-colors"
        >
          查询
        </button>
        {result && (
          <button
            onClick={handleCopyResult}
            className="px-3 py-1.5 bg-white/20 text-white rounded text-sm font-medium hover:bg-white/30 transition-colors"
          >
            复制结果
          </button>
        )}
      </div>

      {/* 快捷示例 */}
      <div className="flex flex-wrap gap-1 mb-3">
        {examples.map((ex) => (
          <button
            key={ex.query}
            onClick={() => setQuery(ex.query)}
            className="text-xs px-2 py-1 bg-white/10 text-white/70 rounded hover:bg-white/20"
            title={ex.desc}
          >
            {ex.query}
          </button>
        ))}
      </div>

      {/* 结果显示 */}
      {result && (
        <pre className="bg-white/10 rounded p-3 text-sm text-white/90 font-mono max-h-[150px] overflow-auto">
          {result}
        </pre>
      )}

      {error && (
        <p className="text-red-300 text-sm mt-2">{error}</p>
      )}
    </div>
  )
}

export default JsonPathPanel
