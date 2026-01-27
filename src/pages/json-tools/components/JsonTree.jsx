import { useState, useCallback } from 'react'

function JsonNode({ keyName, value, path, depth = 0 }) {
  const [isExpanded, setIsExpanded] = useState(depth < 2)
  
  const isObject = value !== null && typeof value === 'object'
  const isArray = Array.isArray(value)
  const isEmpty = isObject && Object.keys(value).length === 0

  const handleCopy = useCallback((e) => {
    e.stopPropagation()
    const textToCopy = JSON.stringify(value, null, 2)
    navigator.clipboard.writeText(textToCopy)
  }, [value])

  const handleCopyPath = useCallback((e) => {
    e.stopPropagation()
    navigator.clipboard.writeText(path)
  }, [path])

  const renderValue = () => {
    if (value === null) {
      return <span className="json-null">null</span>
    }
    if (typeof value === 'boolean') {
      return <span className="json-boolean">{value.toString()}</span>
    }
    if (typeof value === 'number') {
      return <span className="json-number">{value}</span>
    }
    if (typeof value === 'string') {
      return <span className="json-string">"{value}"</span>
    }
    return null
  }

  const toggleExpand = () => {
    if (isObject && !isEmpty) {
      setIsExpanded(!isExpanded)
    }
  }

  return (
    <div className="json-tree" style={{ marginLeft: depth > 0 ? '20px' : '0' }}>
      <div
        className="group flex items-center gap-1 py-0.5 hover:bg-white/5 rounded cursor-pointer"
        onClick={toggleExpand}
      >
        {isObject && !isEmpty && (
          <span className="text-white/50 w-4 text-center">
            {isExpanded ? '▼' : '▶'}
          </span>
        )}
        {(!isObject || isEmpty) && <span className="w-4" />}
        
        {keyName !== null && (
          <>
            <span className="json-key">"{keyName}"</span>
            <span className="text-white/50">:</span>
          </>
        )}
        
        {isObject ? (
          <>
            <span className="text-white/70">
              {isArray ? '[' : '{'}
            </span>
            {(!isExpanded || isEmpty) && (
              <span className="text-white/50">
                {isEmpty 
                  ? (isArray ? ']' : '}')
                  : `...${Object.keys(value).length} items${isArray ? ']' : '}'}`
                }
              </span>
            )}
          </>
        ) : (
          renderValue()
        )}

        {/* 复制按钮 */}
        <div className="opacity-0 group-hover:opacity-100 flex gap-1 ml-2">
          <button
            onClick={handleCopy}
            className="text-xs px-1.5 py-0.5 bg-white/10 text-white/70 rounded hover:bg-white/20"
            title="复制值"
          >
            复制
          </button>
          <button
            onClick={handleCopyPath}
            className="text-xs px-1.5 py-0.5 bg-white/10 text-white/70 rounded hover:bg-white/20"
            title="复制路径"
          >
            路径
          </button>
        </div>
      </div>

      {isObject && isExpanded && !isEmpty && (
        <>
          {Object.entries(value).map(([k, v], index) => {
            const childPath = isArray ? `${path}[${k}]` : `${path}.${k}`
            return (
              <JsonNode
                key={k}
                keyName={isArray ? null : k}
                value={v}
                path={childPath}
                depth={depth + 1}
              />
            )
          })}
          <div style={{ marginLeft: '20px' }}>
            <span className="text-white/70">{isArray ? ']' : '}'}</span>
          </div>
        </>
      )}
    </div>
  )
}

function JsonTree({ data }) {
  return (
    <div className="json-tree text-white">
      <JsonNode keyName={null} value={data} path="$" depth={0} />
    </div>
  )
}

export default JsonTree
