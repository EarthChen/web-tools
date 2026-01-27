/**
 * AI 抠图 API 配置组件
 * 支持多种主流 AI 服务提供商，包括 OpenAI 兼容接口
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { AI_PROVIDERS, OPENAI_COMPATIBLE_PRESETS } from '../utils/aiProviders';
import { saveAIConfig, loadAIConfig, loadAllAIConfigs, deleteAIConfig } from '../utils/storage';

export function APIConfig({ 
  apiKey, 
  useAPI, 
  providerId = 'removebg',
  apiOptions = {},
  onChange,
  onProviderChange,
  onOptionsChange
}) {
  const [showKey, setShowKey] = useState(false);
  const [localKey, setLocalKey] = useState(apiKey);
  const [selectedProvider, setSelectedProvider] = useState(providerId);
  const [selectedPreset, setSelectedPreset] = useState('openai');
  const [customBaseUrl, setCustomBaseUrl] = useState(apiOptions.baseUrl || '');
  const [customModel, setCustomModel] = useState(apiOptions.model || '');
  const [isSaved, setIsSaved] = useState(false);
  
  const currentProvider = AI_PROVIDERS.find(p => p.id === selectedProvider) || AI_PROVIDERS[0];
  const isOpenAICompatible = selectedProvider === 'openai-compatible';
  
  // 获取已保存配置的提供商列表
  const savedConfigs = useMemo(() => loadAllAIConfigs(), []);
  const hasSavedConfig = useMemo(() => !!savedConfigs[selectedProvider]?.apiKey, [savedConfigs, selectedProvider]);
  
  // 当切换提供商时，加载保存的配置
  useEffect(() => {
    const savedConfig = loadAIConfig(selectedProvider);
    if (savedConfig) {
      setLocalKey(savedConfig.apiKey || '');
      setCustomBaseUrl(savedConfig.options?.baseUrl || '');
      setCustomModel(savedConfig.options?.model || '');
      setIsSaved(true);
      // 通知父组件
      onChange(savedConfig.apiKey || '', useAPI);
      if (onOptionsChange && savedConfig.options) {
        onOptionsChange(savedConfig.options);
      }
    } else {
      setIsSaved(false);
    }
  }, [selectedProvider]);
  
  // 当预设变化时更新 URL 和模型
  useEffect(() => {
    if (isOpenAICompatible) {
      const preset = OPENAI_COMPATIBLE_PRESETS.find(p => p.id === selectedPreset);
      if (preset && preset.id !== 'custom') {
        setCustomBaseUrl(preset.baseUrl);
        setCustomModel(preset.model);
        if (onOptionsChange) {
          onOptionsChange({ baseUrl: preset.baseUrl, model: preset.model });
        }
      }
    }
  }, [selectedPreset, isOpenAICompatible]);
  
  const handleKeyChange = useCallback((e) => {
    setLocalKey(e.target.value);
  }, []);
  
  const handleKeyBlur = useCallback(() => {
    onChange(localKey, useAPI);
    setIsSaved(false);
  }, [localKey, useAPI, onChange]);
  
  // 保存当前配置
  const handleSaveConfig = useCallback(() => {
    saveAIConfig(selectedProvider, {
      apiKey: localKey,
      options: isOpenAICompatible ? { baseUrl: customBaseUrl, model: customModel } : {},
    });
    setIsSaved(true);
  }, [selectedProvider, localKey, isOpenAICompatible, customBaseUrl, customModel]);
  
  // 删除保存的配置
  const handleDeleteConfig = useCallback(() => {
    deleteAIConfig(selectedProvider);
    setIsSaved(false);
  }, [selectedProvider]);
  
  const handleUseAPIChange = useCallback((e) => {
    onChange(localKey, e.target.checked);
  }, [localKey, onChange]);
  
  const handleProviderChange = useCallback((e) => {
    const newProvider = e.target.value;
    setSelectedProvider(newProvider);
    setLocalKey('');
    if (onProviderChange) {
      onProviderChange(newProvider);
    }
    onChange('', false);
  }, [onChange, onProviderChange]);
  
  const handlePresetChange = useCallback((e) => {
    setSelectedPreset(e.target.value);
  }, []);
  
  const handleBaseUrlChange = useCallback((e) => {
    setCustomBaseUrl(e.target.value);
    if (onOptionsChange) {
      onOptionsChange({ baseUrl: e.target.value, model: customModel });
    }
  }, [customModel, onOptionsChange]);
  
  const handleModelChange = useCallback((e) => {
    setCustomModel(e.target.value);
    if (onOptionsChange) {
      onOptionsChange({ baseUrl: customBaseUrl, model: e.target.value });
    }
  }, [customBaseUrl, onOptionsChange]);
  
  return (
    <div className="space-y-4">
      {/* 服务提供商选择 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          AI 抠图服务
        </label>
        <select
          value={selectedProvider}
          onChange={handleProviderChange}
          className="
            w-full px-3 py-2 text-sm rounded-md border
            border-gray-300 dark:border-gray-600
            bg-white dark:bg-gray-800
            text-gray-900 dark:text-gray-100
            focus:ring-2 focus:ring-blue-500 focus:border-transparent
          "
        >
          {AI_PROVIDERS.map((provider) => (
            <option key={provider.id} value={provider.id}>
              {provider.name}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {currentProvider.description}
        </p>
      </div>
      
      {/* OpenAI 兼容 API 额外配置 */}
      {isOpenAICompatible && (
        <>
          {/* 预设端点选择 */}
          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
              预设服务
            </label>
            <select
              value={selectedPreset}
              onChange={handlePresetChange}
              className="
                w-full px-3 py-2 text-sm rounded-md border
                border-gray-300 dark:border-gray-600
                bg-white dark:bg-gray-800
                text-gray-900 dark:text-gray-100
                focus:ring-2 focus:ring-blue-500 focus:border-transparent
              "
            >
              {OPENAI_COMPATIBLE_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {OPENAI_COMPATIBLE_PRESETS.find(p => p.id === selectedPreset)?.description}
            </p>
          </div>
          
          {/* API 端点 */}
          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
              API 端点
            </label>
            <input
              type="text"
              value={customBaseUrl}
              onChange={handleBaseUrlChange}
              placeholder="https://api.openai.com/v1"
              className="
                w-full px-3 py-2 text-sm rounded-md border
                border-gray-300 dark:border-gray-600
                bg-white dark:bg-gray-800
                text-gray-900 dark:text-gray-100
                placeholder:text-gray-400 dark:placeholder:text-gray-500
                focus:ring-2 focus:ring-blue-500 focus:border-transparent
              "
            />
          </div>
          
          {/* 模型名称 */}
          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
              模型名称
            </label>
            <input
              type="text"
              value={customModel}
              onChange={handleModelChange}
              placeholder="gpt-4o"
              className="
                w-full px-3 py-2 text-sm rounded-md border
                border-gray-300 dark:border-gray-600
                bg-white dark:bg-gray-800
                text-gray-900 dark:text-gray-100
                placeholder:text-gray-400 dark:placeholder:text-gray-500
                focus:ring-2 focus:ring-blue-500 focus:border-transparent
              "
            />
          </div>
        </>
      )}
      
      {/* 免费服务标签 */}
      {currentProvider.isFree && (
        <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded">
          <span className="px-2 py-0.5 text-xs font-medium bg-green-500 text-white rounded">免费</span>
          <span className="text-xs text-green-700 dark:text-green-300">
            {selectedProvider === 'huggingface' ? '无需 API Key 即可使用' : '注册即可免费使用'}
          </span>
        </div>
      )}
      
      {/* 启用开关 */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          启用 AI 抠图
        </label>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={useAPI}
            onChange={handleUseAPIChange}
            disabled={!localKey && selectedProvider !== 'huggingface'}
            className="sr-only peer"
          />
          <div className={`
            w-9 h-5 bg-gray-200 rounded-full peer 
            dark:bg-gray-700 
            peer-checked:after:translate-x-full 
            peer-checked:after:border-white 
            after:content-[''] after:absolute after:top-0.5 after:left-[2px] 
            after:bg-white after:border-gray-300 after:border after:rounded-full 
            after:h-4 after:w-4 after:transition-all 
            dark:border-gray-600 
            peer-checked:bg-blue-500
            ${!localKey && selectedProvider !== 'huggingface' ? 'opacity-50' : ''}
          `} />
        </label>
      </div>
      
      {/* API Key 输入 */}
      <div className="relative">
        <input
          type={showKey ? 'text' : 'password'}
          value={localKey}
          onChange={handleKeyChange}
          onBlur={handleKeyBlur}
          placeholder={currentProvider.apiKeyPlaceholder}
          className="
            w-full px-3 py-2 pr-10 text-sm rounded-md border
            border-gray-300 dark:border-gray-600
            bg-white dark:bg-gray-800
            text-gray-900 dark:text-gray-100
            placeholder:text-gray-400 dark:placeholder:text-gray-500
            focus:ring-2 focus:ring-blue-500 focus:border-transparent
          "
        />
        <button
          type="button"
          onClick={() => setShowKey(!showKey)}
          className="
            absolute right-2 top-1/2 -translate-y-1/2
            text-gray-400 hover:text-gray-600 dark:hover:text-gray-300
          "
        >
          {showKey ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" 
              />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" 
              />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" 
              />
            </svg>
          )}
        </button>
      </div>
      
      {/* 保存/删除配置按钮 */}
      {localKey && (
        <div className="flex items-center gap-2">
          <button
            onClick={handleSaveConfig}
            disabled={isSaved}
            className={`
              flex-1 px-3 py-1.5 text-xs rounded-md transition-colors
              ${isSaved
                ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
              }
            `}
          >
            {isSaved ? '已保存' : '保存配置'}
          </button>
          {hasSavedConfig && (
            <button
              onClick={handleDeleteConfig}
              className="px-3 py-1.5 text-xs rounded-md bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
            >
              删除
            </button>
          )}
        </div>
      )}
      
      {/* 状态提示 */}
      <div className={`
        p-2 rounded text-xs
        ${useAPI && localKey 
          ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' 
          : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
        }
      `}>
        {useAPI && localKey 
          ? `已启用 ${currentProvider.name} 抠图${isSaved ? ' (配置已保存)' : ''}` 
          : '使用本地颜色容差算法抠图'
        }
      </div>
      
      {/* 获取 API Key 链接 */}
      {!localKey && (
        <a 
          href={currentProvider.docsUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="
            inline-flex items-center gap-1 text-xs text-blue-500 
            hover:text-blue-600 dark:hover:text-blue-400
          "
        >
          获取 {currentProvider.name} API Key
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" 
            />
          </svg>
        </a>
      )}
      
      {/* OpenAI 兼容说明 */}
      {isOpenAICompatible && (
        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs text-blue-700 dark:text-blue-300">
          <p className="font-medium mb-1">OpenAI 兼容 API 说明</p>
          <p>AI 将分析图片背景色并辅助抠图。支持 OpenAI、DeepSeek、智谱、通义等兼容 API。</p>
        </div>
      )}
      
      {/* 提示信息 */}
      <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded text-xs text-amber-700 dark:text-amber-300">
        提示：抠图前请先上传图片，然后点击"执行抠图"按钮
      </div>
    </div>
  );
}
