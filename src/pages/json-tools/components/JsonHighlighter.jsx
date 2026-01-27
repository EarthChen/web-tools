import { useMemo } from 'react'

/**
 * JSON 语法高亮组件
 * 将 JSON 字符串转换为带有语法高亮的 HTML
 */
function JsonHighlighter({ value, placeholder }) {
  const highlightedHtml = useMemo(() => {
    if (!value || !value.trim()) {
      return null
    }

    try {
      // 使用正则表达式进行语法高亮
      const highlighted = value
        // 高亮字符串（键和值）
        .replace(
          /"([^"\\]*(\\.[^"\\]*)*)"/g,
          (match, content) => {
            // 判断是否是键（后面跟着冒号）
            return `<span class="json-string">${escapeHtml(match)}</span>`
          }
        )
        // 高亮数字
        .replace(
          /\b(-?\d+\.?\d*(?:[eE][+-]?\d+)?)\b/g,
          '<span class="json-number">$1</span>'
        )
        // 高亮布尔值
        .replace(
          /\b(true|false)\b/g,
          '<span class="json-boolean">$1</span>'
        )
        // 高亮 null
        .replace(
          /\bnull\b/g,
          '<span class="json-null">null</span>'
        )
        // 高亮括号
        .replace(
          /([{}\[\]])/g,
          '<span class="json-bracket">$1</span>'
        )
        // 高亮冒号
        .replace(
          /:/g,
          '<span class="json-colon">:</span>'
        )
        // 高亮逗号
        .replace(
          /,/g,
          '<span class="json-comma">,</span>'
        )

      // 修复键的高亮（在冒号前的字符串应该是键）
      const fixedHighlight = highlighted.replace(
        /<span class="json-string">("([^"\\]*(\\.[^"\\]*)*)")<\/span>(\s*<span class="json-colon">:<\/span>)/g,
        '<span class="json-key">$1</span>$4'
      )

      return fixedHighlight
    } catch (e) {
      // 如果高亮失败，返回转义后的原始文本
      return escapeHtml(value)
    }
  }, [value])

  // 转义 HTML 特殊字符
  function escapeHtml(text) {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }

  if (!value || !value.trim()) {
    return (
      <div className="w-full h-[400px] bg-white/5 rounded-lg p-4 overflow-auto">
        <p className="text-white/40 font-mono text-sm">{placeholder}</p>
      </div>
    )
  }

  return (
    <div className="w-full h-[400px] bg-gray-900/50 rounded-lg p-4 overflow-auto border border-white/10">
      <pre
        className="json-output text-white m-0"
        dangerouslySetInnerHTML={{ __html: highlightedHtml }}
      />
    </div>
  )
}

export default JsonHighlighter
