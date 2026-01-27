/**
 * 压缩参数控制组件
 * 配置目标文件大小和输出格式
 */

import { useCallback } from 'react';
import { OUTPUT_FORMATS } from '../utils/constants';

export function CompressionController({
  enabled,
  targetSizeKB,
  outputFormat,
  onEnabledChange,
  onTargetSizeChange,
  onFormatChange,
  currentFileSize,
  compressionRatio,
  quality,
}) {
  
  const handleEnabledChange = useCallback((e) => {
    onEnabledChange(e.target.checked);
  }, [onEnabledChange]);
  
  const handleTargetSizeChange = useCallback((e) => {
    const value = parseInt(e.target.value) || 0;
    onTargetSizeChange(value);
  }, [onTargetSizeChange]);
  
  const handleFormatChange = useCallback((e) => {
    onFormatChange(e.target.value);
  }, [onFormatChange]);
  
  // 格式化文件大小
  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };
  
  return (
    <div className="space-y-4">
      {/* 输出格式 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          输出格式
        </label>
        <div className="flex rounded-md overflow-hidden border border-gray-300 dark:border-gray-600">
          {OUTPUT_FORMATS.map((format) => (
            <button
              key={format.id}
              onClick={() => onFormatChange(format.mimeType)}
              className={`
                flex-1 px-3 py-1.5 text-sm transition-colors
                ${format.mimeType !== OUTPUT_FORMATS[0].mimeType ? 'border-l border-gray-300 dark:border-gray-600' : ''}
                ${outputFormat === format.mimeType 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }
              `}
            >
              {format.name}
            </button>
          ))}
        </div>
      </div>
      
      {/* 体积控制开关 */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          启用体积控制
        </label>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={handleEnabledChange}
            className="sr-only peer"
          />
          <div className="
            w-11 h-6 bg-gray-200 rounded-full peer 
            dark:bg-gray-700 
            peer-checked:after:translate-x-full 
            peer-checked:after:border-white 
            after:content-[''] after:absolute after:top-0.5 after:left-[2px] 
            after:bg-white after:border-gray-300 after:border after:rounded-full 
            after:h-5 after:w-5 after:transition-all 
            dark:border-gray-600 
            peer-checked:bg-blue-500
          " />
        </label>
      </div>
      
      {/* 目标大小输入 */}
      {enabled && (
        <div>
          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
            目标文件大小 (KB)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={10}
              max={500}
              step={10}
              value={targetSizeKB}
              onChange={handleTargetSizeChange}
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
            />
            <input
              type="number"
              value={targetSizeKB}
              onChange={handleTargetSizeChange}
              min={10}
              max={5000}
              className="
                w-20 px-2 py-1 text-sm text-center rounded-md border
                border-gray-300 dark:border-gray-600
                bg-white dark:bg-gray-800
                text-gray-900 dark:text-gray-100
                focus:ring-2 focus:ring-blue-500 focus:border-transparent
              "
            />
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            目标: 不大于 {targetSizeKB} KB
          </p>
        </div>
      )}
      
      {/* 压缩信息 */}
      {currentFileSize > 0 && (
        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
            压缩信息
          </h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="text-gray-600 dark:text-gray-400">当前大小:</div>
            <div className={`font-medium ${
              enabled && currentFileSize > targetSizeKB * 1024
                ? 'text-red-500'
                : 'text-green-500'
            }`}>
              {formatSize(currentFileSize)}
            </div>
            
            {enabled && (
              <>
                <div className="text-gray-600 dark:text-gray-400">JPEG 质量:</div>
                <div className="text-gray-900 dark:text-gray-100 font-medium">
                  {Math.round(quality * 100)}%
                </div>
                
                <div className="text-gray-600 dark:text-gray-400">缩放比例:</div>
                <div className="text-gray-900 dark:text-gray-100 font-medium">
                  {Math.round(compressionRatio * 100)}%
                </div>
              </>
            )}
          </div>
        </div>
      )}
      
      {/* 压缩说明 */}
      {enabled && outputFormat === 'image/jpeg' && (
        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs text-blue-700 dark:text-blue-300">
          双维度压缩: 先降低 JPEG 质量 (95%→20%)，再缩小分辨率
        </div>
      )}
    </div>
  );
}
