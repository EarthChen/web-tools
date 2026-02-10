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
import JsonDiffViewer from './components/JsonDiffViewer'
import { useHistory } from './hooks/useHistory'
import { formatJson, minifyJson, sortKeys, unescapeJson, escapeJson, repairJson, stripComments, validateJson, compareJson } from './utils/jsonUtils'

// Generate a unique tab id
let tabIdCounter = 1
const createTab = (name) => ({
  id: tabIdCounter++,
  name,
  input: '',
  output: '',
  error: null,
})

function App() {
  const [isDark, setIsDark] = useState(false)
  const [indentSize, setIndentSize] = useState(2)
  const [outputMode, setOutputMode] = useState('text') // 'text' | 'tree'
  const [showJsonPath, setShowJsonPath] = useState(false)
  const [copyStatus, setCopyStatus] = useState('idle') // 'idle' | 'success' | 'error'
  const [compareMode, setCompareMode] = useState(false)
  const [compareInput, setCompareInput] = useState('')
  const { history, addToHistory, removeFromHistory, clearHistory } = useHistory()
  const saveTimeoutRef = useRef(null)
  const copyTimeoutRef = useRef(null)

  // Multi-tab state
  const [tabs, setTabs] = useState([createTab('Tab 1')])
  const [activeTabId, setActiveTabId] = useState(1)
  const [editingTabId, setEditingTabId] = useState(null)

  const toggleTheme = () => {
    setIsDark(!isDark)
    document.documentElement.classList.toggle('dark')
  }

  // Active tab helpers
  const activeTab = useMemo(() => tabs.find(t => t.id === activeTabId) || tabs[0], [tabs, activeTabId])

  const updateActiveTab = useCallback((updates) => {
    setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, ...updates } : t))
  }, [activeTabId])

  // Tab management
  const handleAddTab = useCallback(() => {
    const newTab = createTab(`Tab ${tabIdCounter}`)
    setTabs(prev => [...prev, newTab])
    setActiveTabId(newTab.id)
  }, [])

  const handleCloseTab = useCallback((tabId) => {
    setTabs(prev => {
      if (prev.length <= 1) return prev // Don't close last tab
      const idx = prev.findIndex(t => t.id === tabId)
      const newTabs = prev.filter(t => t.id !== tabId)
      if (tabId === activeTabId) {
        // Switch to adjacent tab
        const newIdx = Math.min(idx, newTabs.length - 1)
        setActiveTabId(newTabs[newIdx].id)
      }
      return newTabs
    })
  }, [activeTabId])

  const handleRenameTab = useCallback((tabId, newName) => {
    setTabs(prev => prev.map(t => t.id === tabId ? { ...t, name: newName || t.name } : t))
    setEditingTabId(null)
  }, [])

  // Proxy input/output/error from active tab
  const input = activeTab.input
  const output = activeTab.output
  const error = activeTab.error

  const parsedJson = useMemo(() => {
    const validation = validateJson(input)
    return validation.valid ? validation.data : null
  }, [input])

  const compareResult = useMemo(() => {
    if (!compareMode) return null
    return compareJson(input, compareInput)
  }, [compareMode, input, compareInput])

  const handleToggleCompareMode = useCallback(() => {
    setCompareMode(prev => !prev)
    if (!compareMode) setCompareInput('')
  }, [compareMode])

  const handleInputChange = useCallback((value) => {
    updateActiveTab({ input: value })

    if (!value.trim()) {
      updateActiveTab({ input: value, output: '', error: null })
      return
    }

    try {
      const parsed = JSON.parse(value)
      const indent = indentSize === 1 ? '\t' : ' '.repeat(indentSize)
      updateActiveTab({ input: value, output: JSON.stringify(parsed, null, indent), error: null })

      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = setTimeout(() => { addToHistory(value) }, 2000)
    } catch (e) {
      updateActiveTab({ input: value, error: e.message })
    }
  }, [indentSize, addToHistory, updateActiveTab])

  const handleSelectHistory = useCallback((json) => {
    try {
      const parsed = JSON.parse(json)
      const indent = indentSize === 1 ? '\t' : ' '.repeat(indentSize)
      updateActiveTab({ input: json, output: JSON.stringify(parsed, null, indent), error: null })
    } catch (e) {
      updateActiveTab({ input: json, error: e.message })
    }
  }, [indentSize, updateActiveTab])

  // Toolbar action helper
  const runAction = useCallback((fn, ...args) => {
    const result = fn(input, ...args)
    if (result.error) {
      updateActiveTab({ error: result.error })
    } else {
      updateActiveTab({ output: result.output, error: null })
    }
  }, [input, updateActiveTab])

  const handleFormat = useCallback(() => runAction(formatJson, indentSize), [runAction, indentSize])
  const handleMinify = useCallback(() => runAction(minifyJson), [runAction])
  const handleSortKeysAsc = useCallback(() => runAction(sortKeys, indentSize, true), [runAction, indentSize])
  const handleSortKeysDesc = useCallback(() => runAction(sortKeys, indentSize, false), [runAction, indentSize])
  const handleEscape = useCallback(() => runAction(escapeJson), [runAction])
  const handleUnescape = useCallback(() => runAction(unescapeJson), [runAction])
  const handleRepair = useCallback(() => runAction(repairJson, indentSize), [runAction, indentSize])
  const handleStripComments = useCallback(() => runAction(stripComments, indentSize), [runAction, indentSize])

  const handleCopyOutput = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(output)
      setCopyStatus('success')
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current)
      copyTimeoutRef.current = setTimeout(() => setCopyStatus('idle'), 2000)
    } catch {
      setCopyStatus('error')
      copyTimeoutRef.current = setTimeout(() => setCopyStatus('idle'), 2000)
    }
  }, [output])

  const handleApplyOutput = useCallback(() => {
    updateActiveTab({ input: output })
  }, [output, updateActiveTab])

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
              格式化、压缩、转义、去注释、JSONPath 查询等一站式 JSON 处理工具
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
              onStripComments={handleStripComments}
              indentSize={indentSize}
              onIndentSizeChange={setIndentSize}
              compareMode={compareMode}
              onToggleCompareMode={handleToggleCompareMode}
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

            {/* Multi-tab bar */}
            <div className="flex items-center gap-1 mb-3 overflow-x-auto pb-1">
              {tabs.map(tab => (
                <div
                  key={tab.id}
                  className={`group flex items-center gap-1 px-3 py-1.5 rounded-t-lg text-sm cursor-pointer transition-all select-none min-w-0 ${
                    tab.id === activeTabId
                      ? 'bg-white/20 text-white'
                      : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80'
                  }`}
                  onClick={() => setActiveTabId(tab.id)}
                  onDoubleClick={(e) => { e.stopPropagation(); setEditingTabId(tab.id) }}
                >
                  {editingTabId === tab.id ? (
                    <input
                      className="bg-transparent text-white text-sm w-20 outline-none border-b border-white/40"
                      defaultValue={tab.name}
                      autoFocus
                      onBlur={(e) => handleRenameTab(tab.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRenameTab(tab.id, e.target.value)
                        if (e.key === 'Escape') setEditingTabId(null)
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span className="truncate max-w-[100px]">{tab.name}</span>
                  )}
                  {tab.input && !tab.error && <span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" title="Valid JSON" />}
                  {tab.error && <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" title="Invalid JSON" />}
                  {tabs.length > 1 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleCloseTab(tab.id) }}
                      className="ml-1 text-white/40 hover:text-white/80 opacity-0 group-hover:opacity-100 transition-opacity text-xs flex-shrink-0"
                      title="关闭标签"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={handleAddTab}
                className="px-2 py-1.5 text-white/50 hover:text-white/80 hover:bg-white/10 rounded text-sm transition-all flex-shrink-0"
                title="新建标签"
              >
                +
              </button>
            </div>

            {/* 编辑器区域 */}
            {compareMode ? (
              /* 对比模式 */
              <div className="space-y-4">
                {/* 双输入区 */}
                <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
                  {/* 左侧输入 */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-white/80 text-sm">原始 JSON (左)</label>
                      {error && (
                        <span className="text-red-300 text-xs truncate max-w-[200px]" title={error}>
                          ⚠️ {error}
                        </span>
                      )}
                    </div>
                    <JsonEditor
                      value={input}
                      onChange={handleInputChange}
                      placeholder="在此粘贴、输入原始 JSON 或拖拽文件..."
                    />
                  </div>

                  {/* 右侧输入 */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-white/80 text-sm">对比 JSON (右)</label>
                      {compareResult?.error && (
                        <span className="text-red-300 text-xs truncate max-w-[200px]" title={compareResult.error}>
                          ⚠️ {compareResult.error}
                        </span>
                      )}
                    </div>
                    <JsonEditor
                      value={compareInput}
                      onChange={setCompareInput}
                      placeholder="在此粘贴、输入要对比的 JSON 或拖拽文件..."
                    />
                  </div>
                </div>

                {/* 对比结果 */}
                {compareResult && !compareResult.error && (input.trim() || compareInput.trim()) && (
                  <div className="bg-white/5 rounded-xl p-4">
                    <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      对比结果
                    </h3>
                    <JsonDiffViewer
                      leftParsed={compareResult.leftParsed}
                      rightParsed={compareResult.rightParsed}
                      diffs={compareResult.diffs}
                      stats={compareResult.stats}
                    />
                  </div>
                )}
              </div>
            ) : (
              /* 普通模式 */
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
                    placeholder="在此粘贴、输入 JSON 或拖拽文件..."
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
            )}

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
