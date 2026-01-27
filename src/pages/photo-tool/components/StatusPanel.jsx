/**
 * 状态信息面板组件
 * 显示实时状态：尺寸、压缩比例、文件大小等
 */

import { useMemo } from 'react';
import { pxToMm } from '../utils/imageProcessor';

export function StatusPanel({
  hasImage,
  actualWidth,
  actualHeight,
  currentFileSize,
  compressionRatio,
  quality,
  scale,
  offsetX,
  offsetY,
  enableCompression,
  targetSizeKB,
  outputFormat,
}) {
  // 格式化文件大小
  const formatSize = (bytes) => {
    if (bytes === 0) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };
  
  // 状态指示
  const sizeStatus = useMemo(() => {
    if (!enableCompression || currentFileSize === 0) return null;
    const targetBytes = targetSizeKB * 1024;
    if (currentFileSize <= targetBytes) {
      return { ok: true, text: '符合目标', color: 'text-green-500' };
    }
    return { ok: false, text: '超出目标', color: 'text-red-500' };
  }, [enableCompression, currentFileSize, targetSizeKB]);
  
  const items = [
    { label: '输出尺寸 (px)', value: hasImage ? `${actualWidth} × ${actualHeight}` : '-' },
    { label: '输出尺寸 (mm)', value: hasImage ? `${pxToMm(actualWidth)} × ${pxToMm(actualHeight)}` : '-' },
    { label: '图片缩放', value: hasImage ? `${Math.round(scale * 100)}%` : '-' },
    { label: '图片偏移', value: hasImage ? `X: ${offsetX}, Y: ${offsetY}` : '-' },
    { label: '输出格式', value: outputFormat === 'image/jpeg' ? 'JPEG' : 'PNG' },
    { 
      label: '预估大小', 
      value: formatSize(currentFileSize),
      status: sizeStatus,
    },
  ];
  
  if (enableCompression) {
    items.push(
      { label: '目标大小', value: `≤ ${targetSizeKB} KB` },
      { label: 'JPEG 质量', value: `${Math.round(quality * 100)}%` },
      { label: '分辨率比例', value: `${Math.round(compressionRatio * 100)}%` }
    );
  }
  
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
        实时状态
      </h3>
      
      <div className="space-y-2">
        {items.map((item, index) => (
          <div 
            key={index}
            className="flex items-center justify-between py-1.5 border-b border-gray-100 dark:border-gray-700 last:border-0"
          >
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {item.label}
            </span>
            <span className={`text-xs font-medium ${item.status?.color || 'text-gray-900 dark:text-gray-100'}`}>
              {item.value}
              {item.status && (
                <span className="ml-1">
                  {item.status.ok ? '✓' : '!'}
                </span>
              )}
            </span>
          </div>
        ))}
      </div>
      
      {/* 操作说明 */}
      <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
          操作说明
        </h4>
        <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
          <li>• 拖拽预览区调整人像位置</li>
          <li>• 滚轮缩放调整人像大小</li>
          <li>• 点击"重置"恢复默认</li>
        </ul>
      </div>
    </div>
  );
}
