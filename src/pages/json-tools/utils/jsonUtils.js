import { jsonrepair } from 'jsonrepair'

/**
 * 验证 JSON 是否有效
 */
export function validateJson(input) {
  if (!input.trim()) {
    return { valid: false, error: '输入为空' }
  }
  try {
    const data = JSON.parse(input)
    return { valid: true, data }
  } catch (e) {
    return { valid: false, error: e.message }
  }
}

/**
 * 格式化 JSON
 */
export function formatJson(input, indentSize = 2) {
  try {
    const parsed = JSON.parse(input)
    const indent = indentSize === 1 ? '\t' : ' '.repeat(indentSize)
    const output = JSON.stringify(parsed, null, indent)
    return { output, error: null }
  } catch (e) {
    return { output: '', error: `解析错误: ${e.message}` }
  }
}

/**
 * 压缩/最小化 JSON
 */
export function minifyJson(input) {
  try {
    const parsed = JSON.parse(input)
    const output = JSON.stringify(parsed)
    return { output, error: null }
  } catch (e) {
    return { output: '', error: `解析错误: ${e.message}` }
  }
}

/**
 * 递归排序对象的 key
 * @param {*} obj - 要排序的对象
 * @param {boolean} ascending - true 为正序 (A-Z)，false 为倒序 (Z-A)
 */
function sortObjectKeys(obj, ascending = true) {
  if (Array.isArray(obj)) {
    return obj.map(item => sortObjectKeys(item, ascending))
  }
  if (obj !== null && typeof obj === 'object') {
    const sorted = {}
    const keys = Object.keys(obj).sort((a, b) => {
      const compare = a.localeCompare(b)
      return ascending ? compare : -compare
    })
    for (const key of keys) {
      sorted[key] = sortObjectKeys(obj[key], ascending)
    }
    return sorted
  }
  return obj
}

/**
 * 对 JSON key 进行排序
 * @param {string} input - JSON 字符串
 * @param {number} indentSize - 缩进大小
 * @param {boolean} ascending - true 为正序 (A-Z)，false 为倒序 (Z-A)
 */
export function sortKeys(input, indentSize = 2, ascending = true) {
  try {
    const parsed = JSON.parse(input)
    const sorted = sortObjectKeys(parsed, ascending)
    const indent = indentSize === 1 ? '\t' : ' '.repeat(indentSize)
    const output = JSON.stringify(sorted, null, indent)
    return { output, error: null }
  } catch (e) {
    return { output: '', error: `解析错误: ${e.message}` }
  }
}

/**
 * 转义 JSON（将 JSON 转换为转义字符串）
 */
export function escapeJson(input) {
  try {
    // 先尝试解析确保是有效 JSON
    const parsed = JSON.parse(input)
    // 将整个 JSON 转换为转义字符串
    const output = JSON.stringify(JSON.stringify(parsed))
    // 移除外层引号
    return { output: output.slice(1, -1), error: null }
  } catch (e) {
    // 如果不是有效 JSON，直接转义输入字符串
    const escaped = input
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t')
    return { output: escaped, error: null }
  }
}

/**
 * 去除转义字符（将转义的 JSON 字符串还原）
 */
export function unescapeJson(input) {
  try {
    // 尝试解析为 JSON 字符串
    let unescaped = input.trim()
    
    // 如果是用引号包裹的字符串，尝试解析
    if ((unescaped.startsWith('"') && unescaped.endsWith('"')) ||
        (unescaped.startsWith("'") && unescaped.endsWith("'"))) {
      try {
        unescaped = JSON.parse(unescaped)
      } catch {
        // 如果解析失败，手动处理转义
        unescaped = unescaped.slice(1, -1)
      }
    }
    
    // 处理常见的转义序列
    unescaped = unescaped
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\')
    
    // 尝试格式化结果
    try {
      const parsed = JSON.parse(unescaped)
      return { output: JSON.stringify(parsed, null, 2), error: null }
    } catch {
      return { output: unescaped, error: null }
    }
  } catch (e) {
    return { output: '', error: `处理错误: ${e.message}` }
  }
}

/**
 * 尝试修复不规范的 JSON
 */
export function repairJson(input, indentSize = 2) {
  try {
    const repaired = jsonrepair(input)
    const parsed = JSON.parse(repaired)
    const indent = indentSize === 1 ? '\t' : ' '.repeat(indentSize)
    const output = JSON.stringify(parsed, null, indent)
    return { output, error: null }
  } catch (e) {
    return { output: '', error: `无法修复: ${e.message}` }
  }
}

/**
 * 将 JSON 转换为 TypeScript 类型定义
 */
export function jsonToTypeScript(input) {
  try {
    const parsed = JSON.parse(input)
    
    const getType = (value, name = 'Root') => {
      if (value === null) return 'null'
      if (Array.isArray(value)) {
        if (value.length === 0) return 'any[]'
        const itemTypes = [...new Set(value.map(v => getType(v)))]
        return `(${itemTypes.join(' | ')})[]`
      }
      if (typeof value === 'object') {
        const props = Object.entries(value)
          .map(([k, v]) => `  ${k}: ${getType(v, k)};`)
          .join('\n')
        return `{\n${props}\n}`
      }
      return typeof value
    }
    
    const output = `interface Root ${getType(parsed)}`
    return { output, error: null }
  } catch (e) {
    return { output: '', error: `解析错误: ${e.message}` }
  }
}

/**
 * 差异类型
 */
export const DiffType = {
  ADDED: 'added',      // 新增
  REMOVED: 'removed',  // 删除
  MODIFIED: 'modified', // 修改
  UNCHANGED: 'unchanged' // 未变化
}

/**
 * 深度比较两个 JSON 值，返回差异树
 * @param {*} left - 左侧 JSON 值
 * @param {*} right - 右侧 JSON 值
 * @param {string} path - 当前路径
 * @returns {Array} 差异列表
 */
function deepCompare(left, right, path = '$') {
  const diffs = []
  
  // 类型不同
  const leftType = Array.isArray(left) ? 'array' : typeof left
  const rightType = Array.isArray(right) ? 'array' : typeof right
  
  if (leftType !== rightType) {
    diffs.push({
      path,
      type: DiffType.MODIFIED,
      leftValue: left,
      rightValue: right,
      leftType,
      rightType
    })
    return diffs
  }
  
  // 都是 null
  if (left === null && right === null) {
    return diffs
  }
  
  // 都是数组
  if (Array.isArray(left) && Array.isArray(right)) {
    const maxLen = Math.max(left.length, right.length)
    for (let i = 0; i < maxLen; i++) {
      const itemPath = `${path}[${i}]`
      if (i >= left.length) {
        diffs.push({
          path: itemPath,
          type: DiffType.ADDED,
          rightValue: right[i]
        })
      } else if (i >= right.length) {
        diffs.push({
          path: itemPath,
          type: DiffType.REMOVED,
          leftValue: left[i]
        })
      } else {
        diffs.push(...deepCompare(left[i], right[i], itemPath))
      }
    }
    return diffs
  }
  
  // 都是对象
  if (typeof left === 'object' && left !== null && typeof right === 'object' && right !== null) {
    const allKeys = new Set([...Object.keys(left), ...Object.keys(right)])
    
    for (const key of allKeys) {
      const keyPath = `${path}.${key}`
      const hasLeft = key in left
      const hasRight = key in right
      
      if (!hasLeft) {
        diffs.push({
          path: keyPath,
          type: DiffType.ADDED,
          rightValue: right[key]
        })
      } else if (!hasRight) {
        diffs.push({
          path: keyPath,
          type: DiffType.REMOVED,
          leftValue: left[key]
        })
      } else {
        diffs.push(...deepCompare(left[key], right[key], keyPath))
      }
    }
    return diffs
  }
  
  // 原始值比较
  if (left !== right) {
    diffs.push({
      path,
      type: DiffType.MODIFIED,
      leftValue: left,
      rightValue: right
    })
  }
  
  return diffs
}

/**
 * 比较两个 JSON 字符串
 * @param {string} leftInput - 左侧 JSON 字符串
 * @param {string} rightInput - 右侧 JSON 字符串
 * @returns {Object} 比较结果
 */
export function compareJson(leftInput, rightInput) {
  try {
    if (!leftInput.trim() && !rightInput.trim()) {
      return { diffs: [], stats: { added: 0, removed: 0, modified: 0 }, error: null }
    }
    
    let leftParsed = null
    let rightParsed = null
    let leftError = null
    let rightError = null
    
    if (leftInput.trim()) {
      try {
        leftParsed = JSON.parse(leftInput)
      } catch (e) {
        leftError = `左侧 JSON 解析错误: ${e.message}`
      }
    }
    
    if (rightInput.trim()) {
      try {
        rightParsed = JSON.parse(rightInput)
      } catch (e) {
        rightError = `右侧 JSON 解析错误: ${e.message}`
      }
    }
    
    if (leftError || rightError) {
      return { diffs: [], stats: { added: 0, removed: 0, modified: 0 }, error: leftError || rightError }
    }
    
    // 如果只有一侧有数据
    if (leftParsed === null && rightParsed !== null) {
      const diffs = [{
        path: '$',
        type: DiffType.ADDED,
        rightValue: rightParsed
      }]
      return { diffs, stats: { added: 1, removed: 0, modified: 0 }, error: null }
    }
    
    if (leftParsed !== null && rightParsed === null) {
      const diffs = [{
        path: '$',
        type: DiffType.REMOVED,
        leftValue: leftParsed
      }]
      return { diffs, stats: { added: 0, removed: 1, modified: 0 }, error: null }
    }
    
    const diffs = deepCompare(leftParsed, rightParsed)
    
    // 统计差异
    const stats = {
      added: diffs.filter(d => d.type === DiffType.ADDED).length,
      removed: diffs.filter(d => d.type === DiffType.REMOVED).length,
      modified: diffs.filter(d => d.type === DiffType.MODIFIED).length
    }
    
    return { diffs, stats, leftParsed, rightParsed, error: null }
  } catch (e) {
    return { diffs: [], stats: { added: 0, removed: 0, modified: 0 }, error: `比较错误: ${e.message}` }
  }
}

/**
 * 生成带有差异标记的格式化 JSON（用于并排显示）
 * @param {*} data - JSON 数据
 * @param {Array} diffs - 差异列表
 * @param {string} side - 'left' 或 'right'
 * @param {number} indent - 缩进大小
 * @returns {Array} 带标记的行数组
 */
export function generateDiffLines(data, diffs, side, indent = 2) {
  const lines = []
  const diffMap = new Map()
  
  // 构建差异路径映射
  for (const diff of diffs) {
    diffMap.set(diff.path, diff)
  }
  
  function stringify(value, path, level = 0) {
    const indentStr = ' '.repeat(level * indent)
    const diff = diffMap.get(path)
    
    let lineType = DiffType.UNCHANGED
    if (diff) {
      if (diff.type === DiffType.ADDED && side === 'right') {
        lineType = DiffType.ADDED
      } else if (diff.type === DiffType.REMOVED && side === 'left') {
        lineType = DiffType.REMOVED
      } else if (diff.type === DiffType.MODIFIED) {
        lineType = DiffType.MODIFIED
      }
    }
    
    if (value === null) {
      lines.push({ text: `${indentStr}null`, type: lineType, path })
      return
    }
    
    if (typeof value === 'string') {
      lines.push({ text: `${indentStr}"${value}"`, type: lineType, path })
      return
    }
    
    if (typeof value === 'number' || typeof value === 'boolean') {
      lines.push({ text: `${indentStr}${value}`, type: lineType, path })
      return
    }
    
    if (Array.isArray(value)) {
      if (value.length === 0) {
        lines.push({ text: `${indentStr}[]`, type: lineType, path })
        return
      }
      lines.push({ text: `${indentStr}[`, type: lineType, path })
      value.forEach((item, i) => {
        stringify(item, `${path}[${i}]`, level + 1)
        if (i < value.length - 1) {
          const lastLine = lines[lines.length - 1]
          lastLine.text += ','
        }
      })
      lines.push({ text: `${indentStr}]`, type: DiffType.UNCHANGED, path })
      return
    }
    
    if (typeof value === 'object') {
      const keys = Object.keys(value)
      if (keys.length === 0) {
        lines.push({ text: `${indentStr}{}`, type: lineType, path })
        return
      }
      lines.push({ text: `${indentStr}{`, type: lineType, path })
      keys.forEach((key, i) => {
        const keyPath = `${path}.${key}`
        const keyDiff = diffMap.get(keyPath)
        let keyLineType = DiffType.UNCHANGED
        if (keyDiff) {
          if (keyDiff.type === DiffType.ADDED && side === 'right') {
            keyLineType = DiffType.ADDED
          } else if (keyDiff.type === DiffType.REMOVED && side === 'left') {
            keyLineType = DiffType.REMOVED
          } else if (keyDiff.type === DiffType.MODIFIED) {
            keyLineType = DiffType.MODIFIED
          }
        }
        
        const childIndent = ' '.repeat((level + 1) * indent)
        const childValue = value[key]
        
        // 简单值直接在同一行显示
        if (childValue === null || typeof childValue !== 'object') {
          const valStr = childValue === null ? 'null' :
            typeof childValue === 'string' ? `"${childValue}"` : String(childValue)
          const comma = i < keys.length - 1 ? ',' : ''
          lines.push({ text: `${childIndent}"${key}": ${valStr}${comma}`, type: keyLineType, path: keyPath })
        } else {
          lines.push({ text: `${childIndent}"${key}":`, type: keyLineType, path: keyPath })
          stringify(childValue, keyPath, level + 1)
          if (i < keys.length - 1) {
            const lastLine = lines[lines.length - 1]
            lastLine.text += ','
          }
        }
      })
      lines.push({ text: `${indentStr}}`, type: DiffType.UNCHANGED, path })
    }
  }
  
  if (data !== undefined && data !== null) {
    stringify(data, '$')
  }
  
  return lines
}
