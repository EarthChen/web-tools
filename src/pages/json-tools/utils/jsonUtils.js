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
