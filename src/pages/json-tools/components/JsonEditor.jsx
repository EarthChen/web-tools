import { useRef, useCallback, useEffect } from 'react'

// 括号配对映射
const BRACKET_PAIRS = {
  '{': '}',
  '[': ']',
  '"': '"',
}

// 闭合括号集合
const CLOSING_BRACKETS = new Set(['}', ']', '"'])

function JsonEditor({ value, onChange, placeholder, readOnly = false }) {
  const textareaRef = useRef(null)

  // 自动调整高度
  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    // 重置高度以获取正确的 scrollHeight
    textarea.style.height = 'auto'
    // 设置为内容高度，但不低于最小高度 300px，不超过最大高度 800px
    const newHeight = Math.min(Math.max(textarea.scrollHeight, 300), 800)
    textarea.style.height = `${newHeight}px`
  }, [value])

  // 处理键盘输入，实现括号自动补全
  const handleKeyDown = useCallback((e) => {
    if (readOnly) return

    const textarea = textareaRef.current
    if (!textarea) return

    const { selectionStart, selectionEnd, value: currentValue } = textarea
    const char = e.key

    // 处理左括号输入 - 自动补全右括号
    if (BRACKET_PAIRS[char]) {
      e.preventDefault()
      const closingBracket = BRACKET_PAIRS[char]
      const selectedText = currentValue.substring(selectionStart, selectionEnd)
      
      let newValue
      let newCursorPos

      if (selectedText) {
        // 如果有选中文本，用括号包裹它
        newValue = 
          currentValue.substring(0, selectionStart) + 
          char + selectedText + closingBracket + 
          currentValue.substring(selectionEnd)
        newCursorPos = selectionStart + 1 + selectedText.length
      } else {
        // 没有选中文本，插入括号对并将光标放在中间
        newValue = 
          currentValue.substring(0, selectionStart) + 
          char + closingBracket + 
          currentValue.substring(selectionEnd)
        newCursorPos = selectionStart + 1
      }

      onChange?.(newValue)
      
      // 设置光标位置
      requestAnimationFrame(() => {
        textarea.selectionStart = newCursorPos
        textarea.selectionEnd = newCursorPos
      })
      return
    }

    // 处理右括号输入 - 如果下一个字符就是该右括号，跳过而不是插入
    if (CLOSING_BRACKETS.has(char) && char !== '"') {
      const nextChar = currentValue[selectionStart]
      if (nextChar === char) {
        e.preventDefault()
        // 直接跳过这个字符
        requestAnimationFrame(() => {
          textarea.selectionStart = selectionStart + 1
          textarea.selectionEnd = selectionStart + 1
        })
        return
      }
    }

    // 处理退格键 - 如果删除的是左括号且紧随其后是对应的右括号，一起删除
    if (e.key === 'Backspace' && selectionStart === selectionEnd && selectionStart > 0) {
      const prevChar = currentValue[selectionStart - 1]
      const nextChar = currentValue[selectionStart]
      
      if (BRACKET_PAIRS[prevChar] && BRACKET_PAIRS[prevChar] === nextChar) {
        e.preventDefault()
        const newValue = 
          currentValue.substring(0, selectionStart - 1) + 
          currentValue.substring(selectionStart + 1)
        onChange?.(newValue)
        
        requestAnimationFrame(() => {
          textarea.selectionStart = selectionStart - 1
          textarea.selectionEnd = selectionStart - 1
        })
        return
      }
    }

    // 处理 Tab 键 - 插入两个空格
    if (e.key === 'Tab') {
      e.preventDefault()
      const indent = '  '
      const newValue = 
        currentValue.substring(0, selectionStart) + 
        indent + 
        currentValue.substring(selectionEnd)
      onChange?.(newValue)
      
      requestAnimationFrame(() => {
        const newPos = selectionStart + indent.length
        textarea.selectionStart = newPos
        textarea.selectionEnd = newPos
      })
      return
    }

    // 处理回车键 - 在括号之间自动缩进
    if (e.key === 'Enter') {
      const prevChar = currentValue[selectionStart - 1]
      const nextChar = currentValue[selectionStart]
      
      if ((prevChar === '{' && nextChar === '}') || (prevChar === '[' && nextChar === ']')) {
        e.preventDefault()
        
        // 计算当前行的缩进
        const lineStart = currentValue.lastIndexOf('\n', selectionStart - 1) + 1
        const currentLine = currentValue.substring(lineStart, selectionStart)
        const indent = currentLine.match(/^(\s*)/)[1]
        
        const newValue = 
          currentValue.substring(0, selectionStart) + 
          '\n' + indent + '  \n' + indent +
          currentValue.substring(selectionStart)
        onChange?.(newValue)
        
        requestAnimationFrame(() => {
          const newPos = selectionStart + 1 + indent.length + 2
          textarea.selectionStart = newPos
          textarea.selectionEnd = newPos
        })
        return
      }
    }
  }, [onChange, readOnly])

  return (
    <textarea
      ref={textareaRef}
      className="w-full min-h-[300px] max-h-[800px] bg-white/10 rounded-lg p-4 text-white font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-white/30 placeholder-white/40 json-editor"
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      readOnly={readOnly}
      spellCheck={false}
    />
  )
}

export default JsonEditor
