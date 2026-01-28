import { useState, useCallback, useMemo, useRef } from 'react'
import Header from './components/Header'
import Footer from './components/Footer'
import { InlineAd } from '@/components/AdBanner'
import JsonEditor from './components/JsonEditor'
import JsonHighlighter from './components/JsonHighlighter'
import JsonTree from './components/JsonTree'
import Toolbar from './components/Toolbar'
import JsonPathPanel from './components/JsonPathPanel'
import HistoryPanel from './components/HistoryPanel'
import { useHistory } from './hooks/useHistory'
import { formatJson, minifyJson, sortKeys, unescapeJson, escapeJson, repairJson, validateJson } from './utils/jsonUtils'

function App() {
  const [isDark, setIsDark] = useState(false)
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [error, setError] = useState(null)
  const [indentSize, setIndentSize] = useState(2)
  const [outputMode, setOutputMode] = useState('text') // 'text' | 'tree'
  const [showJsonPath, setShowJsonPath] = useState(false)
  const [copyStatus, setCopyStatus] = useState('idle') // 'idle' | 'success' | 'error'
  const { history, addToHistory, removeFromHistory, clearHistory } = useHistory()
  const saveTimeoutRef = useRef(null)
  const copyTimeoutRef = useRef(null)

  const toggleTheme = () => {
    setIsDark(!isDark)
    document.documentElement.classList.toggle('dark')
  }

  // 解析后的 JSON 数据
  const parsedJson = useMemo(() => {
    const validation = validateJson(input)
    return validation.valid ? validation.data : null
  }, [input])

  const handleInputChange = useCallback((value) => {
    setInput(value)
    
    // 自动格式化预览
    if (!value.trim()) {
      setOutput('')
      setError(null)
      return
    }
    
    try {
      const parsed = JSON.parse(value)
      const indent = indentSize === 1 ? '\t' : ' '.repeat(indentSize)
      setOutput(JSON.stringify(parsed, null, indent))
      setError(null)
      
      // 延迟保存到历史记录（避免频繁保存）
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
      saveTimeoutRef.current = setTimeout(() => {
        addToHistory(value)
      }, 2000) // 2秒后保存
    } catch (e) {
      // 显示错误提示但不清空输出
      setError(e.message)
    }
  }, [indentSize, addToHistory])

  const handleSelectHistory = useCallback((json) => {
    setInput(json)
    // 自动格式化
    try {
      const parsed = JSON.parse(json)
      const indent = indentSize === 1 ? '\t' : ' '.repeat(indentSize)
      setOutput(JSON.stringify(parsed, null, indent))
      setError(null)
    } catch (e) {
      setError(e.message)
    }
  }, [indentSize])

  const handleFormat = useCallback(() => {
    const result = formatJson(input, indentSize)
    if (result.error) {
      setError(result.error)
    } else {
      setOutput(result.output)
      setError(null)
    }
  }, [input, indentSize])

  const handleMinify = useCallback(() => {
    const result = minifyJson(input)
    if (result.error) {
      setError(result.error)
    } else {
      setOutput(result.output)
      setError(null)
    }
  }, [input])

  const handleSortKeysAsc = useCallback(() => {
    const result = sortKeys(input, indentSize, true)
    if (result.error) {
      setError(result.error)
    } else {
      setOutput(result.output)
      setError(null)
    }
  }, [input, indentSize])

  const handleSortKeysDesc = useCallback(() => {
    const result = sortKeys(input, indentSize, false)
    if (result.error) {
      setError(result.error)
    } else {
      setOutput(result.output)
      setError(null)
    }
  }, [input, indentSize])

  const handleEscape = useCallback(() => {
    const result = escapeJson(input)
    if (result.error) {
      setError(result.error)
    } else {
      setOutput(result.output)
      setError(null)
    }
  }, [input])

  const handleUnescape = useCallback(() => {
    const result = unescapeJson(input)
    if (result.error) {
      setError(result.error)
    } else {
      setOutput(result.output)
      setError(null)
    }
  }, [input])

  const handleRepair = useCallback(() => {
    const result = repairJson(input, indentSize)
    if (result.error) {
      setError(result.error)
    } else {
      setOutput(result.output)
      setError(null)
    }
  }, [input, indentSize])

  const handleCopyOutput = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(output)
      setCopyStatus('success')
      
      // 清除之前的定时器
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current)
      }
      
      // 2秒后恢复状态
      copyTimeoutRef.current = setTimeout(() => {
        setCopyStatus('idle')
      }, 2000)
    } catch (err) {
      setCopyStatus('error')
      copyTimeoutRef.current = setTimeout(() => {
        setCopyStatus('idle')
      }, 2000)
    }
  }, [output])

  const handleApplyOutput = useCallback(() => {
    setInput(output)
  }, [output])

  return (
    <div className={`min-h-screen gradient-bg animate-gradient ${isDark ? 'dark' : ''}`}>
      <div className="min-h-screen flex flex-col">
        <Header isDark={isDark} onToggleTheme={toggleTheme} />

        <main className="flex-1 max-w-7xl mx-auto px-4 py-6 w-full">
          {/* 标题 */}
          <section className="text-center mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
              JSON 工具集
            </h1>
            <p className="text-white/80">
              格式化、压缩、转义、JSONPath 查询等一站式 JSON 处理工具
            </p>
          </section>

          {/* 主内容区 */}
          <div className="glass rounded-2xl p-4 md:p-6">
            {/* 工具栏 */}
            <Toolbar
              onFormat={handleFormat}
              onMinify={handleMinify}
              onSortKeysAsc={handleSortKeysAsc}
              onSortKeysDesc={handleSortKeysDesc}
              onEscape={handleEscape}
              onUnescape={handleUnescape}
              onRepair={handleRepair}
              indentSize={indentSize}
              onIndentSizeChange={setIndentSize}
            />

            {/* 视图切换和历史记录 */}
            <div className="flex gap-2 mt-4 mb-4 flex-wrap">
              <button
                onClick={() => setShowJsonPath(!showJsonPath)}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
                  showJsonPath
                    ? 'bg-white/30 text-white'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                {showJsonPath ? '隐藏' : '显示'} JSONPath
              </button>
              <HistoryPanel
                history={history}
                onSelect={handleSelectHistory}
                onRemove={removeFromHistory}
                onClear={clearHistory}
              />
            </div>

            {/* JSONPath 面板 */}
            {showJsonPath && (
              <JsonPathPanel input={input} parsedJson={parsedJson} />
            )}

            {/* 编辑器区域 */}
            <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
              {/* 输入区 */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-white/80 text-sm">输入 JSON</label>
                  {error && (
                    <span className="text-red-300 text-xs truncate max-w-[200px]" title={error}>
                      ⚠️ {error}
                    </span>
                  )}
                </div>
                <JsonEditor
                  value={input}
                  onChange={handleInputChange}
                  placeholder="在此粘贴或输入 JSON..."
                />
              </div>

              {/* 输出区 - 文本/树状切换 */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setOutputMode('text')}
                      className={`text-sm px-3 py-1 rounded transition-all ${
                        outputMode === 'text'
                          ? 'bg-white/30 text-white'
                          : 'bg-white/10 text-white/70 hover:bg-white/20'
                      }`}
                    >
                      输出结果
                    </button>
                    <button
                      onClick={() => setOutputMode('tree')}
                      className={`text-sm px-3 py-1 rounded transition-all ${
                        outputMode === 'tree'
                          ? 'bg-white/30 text-white'
                          : 'bg-white/10 text-white/70 hover:bg-white/20'
                      }`}
                    >
                      树状视图
                    </button>
                  </div>
                  {outputMode === 'text' && (
                    <div className="flex gap-2">
                      <button
                        onClick={handleCopyOutput}
                        disabled={!output}
                        className={`text-xs px-2 py-1 rounded transition-all disabled:opacity-50 ${
                          copyStatus === 'success'
                            ? 'bg-green-500/80 text-white'
                            : copyStatus === 'error'
                            ? 'bg-red-500/80 text-white'
                            : 'bg-white/10 text-white hover:bg-white/20'
                        }`}
                      >
                        {copyStatus === 'success' ? '✓ 已复制' : copyStatus === 'error' ? '✗ 失败' : '复制'}
                      </button>
                      <button
                        onClick={handleApplyOutput}
                        disabled={!output}
                        className="text-xs px-2 py-1 bg-white/10 text-white rounded hover:bg-white/20 disabled:opacity-50"
                      >
                        应用到输入
                      </button>
                    </div>
                  )}
                </div>

                {outputMode === 'text' ? (
                  <JsonHighlighter
                    value={output}
                    placeholder="处理结果将显示在这里..."
                  />
                ) : (
                  <div className="bg-white/10 rounded-lg p-4 min-h-[300px] max-h-[800px] overflow-auto">
                    {parsedJson ? (
                      <JsonTree data={parsedJson} />
                    ) : (
                      <p className="text-white/50 text-center py-8">
                        {input ? '无效的 JSON 格式' : '请输入 JSON 数据'}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

          </div>
          
          {/* 广告区域 */}
          <div className="mt-8">
            <InlineAd />
          </div>
        </main>

        <Footer />
      </div>
    </div>
  )
}

export default App
