import { useMemo } from 'react'
import { DiffType, generateDiffLines } from '../utils/jsonUtils'

/**
 * JSON 差异行组件
 */
function DiffLine({ line, lineNumber }) {
  const bgColorClass = {
    [DiffType.ADDED]: 'bg-green-500/20 border-l-2 border-green-500',
    [DiffType.REMOVED]: 'bg-red-500/20 border-l-2 border-red-500',
    [DiffType.MODIFIED]: 'bg-yellow-500/20 border-l-2 border-yellow-500',
    [DiffType.UNCHANGED]: ''
  }[line.type] || ''

  const textColorClass = {
    [DiffType.ADDED]: 'text-green-300',
    [DiffType.REMOVED]: 'text-red-300',
    [DiffType.MODIFIED]: 'text-yellow-300',
    [DiffType.UNCHANGED]: 'text-white/80'
  }[line.type] || 'text-white/80'

  return (
    <div className={`flex ${bgColorClass}`}>
      <span className="w-10 text-right pr-2 text-white/40 text-xs select-none flex-shrink-0 py-0.5">
        {lineNumber}
      </span>
      <pre className={`flex-1 text-sm font-mono whitespace-pre overflow-x-auto py-0.5 ${textColorClass}`}>
        {line.text}
      </pre>
    </div>
  )
}

/**
 * 差异统计显示组件
 */
function DiffStats({ stats }) {
  const total = stats.added + stats.removed + stats.modified

  if (total === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-400">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        两个 JSON 完全相同
      </div>
    )
  }

  return (
    <div className="flex items-center gap-4 text-sm">
      <span className="text-white/60">差异统计:</span>
      {stats.added > 0 && (
        <span className="text-green-400 flex items-center gap-1">
          <span className="w-3 h-3 bg-green-500 rounded-sm"></span>
          +{stats.added} 新增
        </span>
      )}
      {stats.removed > 0 && (
        <span className="text-red-400 flex items-center gap-1">
          <span className="w-3 h-3 bg-red-500 rounded-sm"></span>
          -{stats.removed} 删除
        </span>
      )}
      {stats.modified > 0 && (
        <span className="text-yellow-400 flex items-center gap-1">
          <span className="w-3 h-3 bg-yellow-500 rounded-sm"></span>
          ~{stats.modified} 修改
        </span>
      )}
    </div>
  )
}

/**
 * 差异列表显示组件
 */
function DiffList({ diffs }) {
  if (diffs.length === 0) return null

  return (
    <div className="mt-4 bg-white/5 rounded-lg p-4 max-h-[200px] overflow-auto">
      <h4 className="text-white/80 text-sm font-medium mb-2">差异详情</h4>
      <div className="space-y-1">
        {diffs.map((diff, index) => (
          <div
            key={index}
            className={`text-xs font-mono px-2 py-1 rounded ${
              diff.type === DiffType.ADDED
                ? 'bg-green-500/10 text-green-300'
                : diff.type === DiffType.REMOVED
                ? 'bg-red-500/10 text-red-300'
                : 'bg-yellow-500/10 text-yellow-300'
            }`}
          >
            <span className="text-white/50">{diff.path}</span>
            {diff.type === DiffType.MODIFIED && (
              <span>
                {' '}: {JSON.stringify(diff.leftValue)} → {JSON.stringify(diff.rightValue)}
              </span>
            )}
            {diff.type === DiffType.ADDED && (
              <span>
                {' '}: {JSON.stringify(diff.rightValue)} (新增)
              </span>
            )}
            {diff.type === DiffType.REMOVED && (
              <span>
                {' '}: {JSON.stringify(diff.leftValue)} (已删除)
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * JSON 差异查看器主组件
 */
function JsonDiffViewer({ leftParsed, rightParsed, diffs, stats }) {
  // 生成带差异标记的行
  const leftLines = useMemo(() => {
    if (leftParsed === undefined || leftParsed === null) return []
    return generateDiffLines(leftParsed, diffs, 'left')
  }, [leftParsed, diffs])

  const rightLines = useMemo(() => {
    if (rightParsed === undefined || rightParsed === null) return []
    return generateDiffLines(rightParsed, diffs, 'right')
  }, [rightParsed, diffs])

  // 计算最大行数以对齐显示
  const maxLines = Math.max(leftLines.length, rightLines.length)

  return (
    <div className="space-y-4">
      {/* 差异统计 */}
      <DiffStats stats={stats} />

      {/* 并排对比视图 */}
      <div className="grid grid-cols-2 gap-2">
        {/* 左侧面板 */}
        <div className="bg-white/10 rounded-lg overflow-hidden">
          <div className="bg-white/5 px-3 py-2 border-b border-white/10">
            <span className="text-white/80 text-sm font-medium">原始 JSON (左)</span>
          </div>
          <div className="max-h-[400px] overflow-auto">
            {leftLines.length > 0 ? (
              leftLines.map((line, index) => (
                <DiffLine key={index} line={line} lineNumber={index + 1} />
              ))
            ) : (
              <div className="p-4 text-white/40 text-sm">无数据</div>
            )}
            {/* 填充空行以对齐 */}
            {Array.from({ length: maxLines - leftLines.length }).map((_, i) => (
              <div key={`empty-${i}`} className="h-6"></div>
            ))}
          </div>
        </div>

        {/* 右侧面板 */}
        <div className="bg-white/10 rounded-lg overflow-hidden">
          <div className="bg-white/5 px-3 py-2 border-b border-white/10">
            <span className="text-white/80 text-sm font-medium">对比 JSON (右)</span>
          </div>
          <div className="max-h-[400px] overflow-auto">
            {rightLines.length > 0 ? (
              rightLines.map((line, index) => (
                <DiffLine key={index} line={line} lineNumber={index + 1} />
              ))
            ) : (
              <div className="p-4 text-white/40 text-sm">无数据</div>
            )}
            {/* 填充空行以对齐 */}
            {Array.from({ length: maxLines - rightLines.length }).map((_, i) => (
              <div key={`empty-${i}`} className="h-6"></div>
            ))}
          </div>
        </div>
      </div>

      {/* 差异详情列表 */}
      <DiffList diffs={diffs} />
    </div>
  )
}

export default JsonDiffViewer
