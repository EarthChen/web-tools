/**
 * 本地存储工具模块
 * 用于持久化保存用户配置
 */

const STORAGE_KEYS = {
  // 编辑器配置
  EDITOR_CONFIG: 'photo_tool_editor_config',
  // AI 服务配置列表
  AI_CONFIGS: 'photo_tool_ai_configs',
  // 上次使用的 AI 服务
  LAST_AI_PROVIDER: 'photo_tool_last_ai_provider',
};

/**
 * 保存编辑器配置
 */
export function saveEditorConfig(config) {
  try {
    const dataToSave = {
      backgroundColor: config.backgroundColor,
      sizePresetId: config.sizePreset?.id,
      customWidth: config.customWidth,
      customHeight: config.customHeight,
      unit: config.unit,
      keepAspectRatio: config.keepAspectRatio,
      enableCompression: config.enableCompression,
      targetSizeKB: config.targetSizeKB,
      outputFormat: config.outputFormat,
      aiProvider: config.aiProvider,
      useAPI: config.useAPI,
    };
    localStorage.setItem(STORAGE_KEYS.EDITOR_CONFIG, JSON.stringify(dataToSave));
  } catch (e) {
    console.warn('保存配置失败:', e);
  }
}

/**
 * 加载编辑器配置
 */
export function loadEditorConfig() {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.EDITOR_CONFIG);
    return saved ? JSON.parse(saved) : null;
  } catch (e) {
    console.warn('加载配置失败:', e);
    return null;
  }
}

/**
 * 保存 AI 服务配置
 * @param {string} providerId - 服务提供商 ID
 * @param {object} config - 配置对象 { apiKey, options }
 */
export function saveAIConfig(providerId, config) {
  try {
    const allConfigs = loadAllAIConfigs();
    allConfigs[providerId] = {
      ...config,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEYS.AI_CONFIGS, JSON.stringify(allConfigs));
  } catch (e) {
    console.warn('保存 AI 配置失败:', e);
  }
}

/**
 * 加载指定 AI 服务的配置
 */
export function loadAIConfig(providerId) {
  try {
    const allConfigs = loadAllAIConfigs();
    return allConfigs[providerId] || null;
  } catch (e) {
    console.warn('加载 AI 配置失败:', e);
    return null;
  }
}

/**
 * 加载所有 AI 服务配置
 */
export function loadAllAIConfigs() {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.AI_CONFIGS);
    return saved ? JSON.parse(saved) : {};
  } catch (e) {
    console.warn('加载 AI 配置失败:', e);
    return {};
  }
}

/**
 * 删除指定 AI 服务的配置
 */
export function deleteAIConfig(providerId) {
  try {
    const allConfigs = loadAllAIConfigs();
    delete allConfigs[providerId];
    localStorage.setItem(STORAGE_KEYS.AI_CONFIGS, JSON.stringify(allConfigs));
  } catch (e) {
    console.warn('删除 AI 配置失败:', e);
  }
}

/**
 * 获取已保存的 AI 配置列表
 */
export function getSavedAIProviders() {
  const allConfigs = loadAllAIConfigs();
  return Object.keys(allConfigs).filter(key => allConfigs[key]?.apiKey);
}

/**
 * 清除所有本地存储
 */
export function clearAllStorage() {
  try {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  } catch (e) {
    console.warn('清除存储失败:', e);
  }
}
