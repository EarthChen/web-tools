/**
 * 尺寸规格选择器组件
 * 支持预设规格和自定义尺寸
 */

import { useCallback } from 'react';
import { SIZE_PRESETS, STANDARD_DPI } from '../utils/constants';
import { mmToPx, pxToMm } from '../utils/imageProcessor';

export function SizePresetSelector({ 
  preset, 
  onPresetChange,
  customWidth,
  customHeight,
  onCustomSizeChange,
  unit,
  onUnitChange,
  keepAspectRatio = true,
  onKeepAspectRatioChange
}) {
  
  const handlePresetChange = useCallback((e) => {
    const selected = SIZE_PRESETS.find(p => p.id === e.target.value);
    if (selected) {
      onPresetChange(selected);
    }
  }, [onPresetChange]);
  
  const handleWidthChange = useCallback((e) => {
    const value = parseFloat(e.target.value) || 0;
    onCustomSizeChange(value, customHeight);
  }, [customHeight, onCustomSizeChange]);
  
  const handleHeightChange = useCallback((e) => {
    const value = parseFloat(e.target.value) || 0;
    onCustomSizeChange(customWidth, value);
  }, [customWidth, onCustomSizeChange]);
  
  // 计算当前显示的尺寸
  const displayWidth = preset.id === 'custom' ? customWidth : preset.width;
  const displayHeight = preset.id === 'custom' ? customHeight : preset.height;
  
  // 换算后的像素值
  const widthPx = unit === 'mm' ? mmToPx(displayWidth) : displayWidth;
  const heightPx = unit === 'mm' ? mmToPx(displayHeight) : displayHeight;
  
  return (
    <div className="space-y-4">
      {/* 预设选择 - 按分类显示 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          尺寸规格
        </label>
        <select
          value={preset.id}
          onChange={handlePresetChange}
          className="
            w-full px-3 py-2 text-sm rounded-md border
            border-gray-300 dark:border-gray-600
            bg-white dark:bg-gray-800
            text-gray-900 dark:text-gray-100
            focus:ring-2 focus:ring-blue-500 focus:border-transparent
          "
        >
          {/* 按分类分组显示 */}
          {['标准尺寸', '考试报名', '证件办理', '签证', '其他'].map(category => {
            const categoryPresets = SIZE_PRESETS.filter(p => p.category === category);
            if (categoryPresets.length === 0) return null;
            return (
              <optgroup key={category} label={category}>
                {categoryPresets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.width}×{p.height}mm)
                  </option>
                ))}
              </optgroup>
            );
          })}
        </select>
        {preset.description && (
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {preset.description}
          </p>
        )}
      </div>
      
      {/* 单位切换 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          单位
        </label>
        <div className="flex rounded-md overflow-hidden border border-gray-300 dark:border-gray-600">
          <button
            onClick={() => onUnitChange('mm')}
            className={`
              flex-1 px-3 py-1.5 text-sm transition-colors
              ${unit === 'mm' 
                ? 'bg-blue-500 text-white' 
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }
            `}
          >
            毫米 (mm)
          </button>
          <button
            onClick={() => onUnitChange('px')}
            className={`
              flex-1 px-3 py-1.5 text-sm transition-colors border-l border-gray-300 dark:border-gray-600
              ${unit === 'px' 
                ? 'bg-blue-500 text-white' 
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }
            `}
          >
            像素 (px)
          </button>
        </div>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          标准打印 DPI: {STANDARD_DPI}
        </p>
      </div>
      
      {/* 保持原图比例开关 */}
      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div>
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
            保持原图比例
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {keepAspectRatio ? '图片不会变形，可能裁剪边缘' : '图片可能变形，但会完整显示'}
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={keepAspectRatio}
            onChange={(e) => onKeepAspectRatioChange?.(e.target.checked)}
            className="sr-only peer"
          />
          <div className="
            w-9 h-5 bg-gray-200 rounded-full peer 
            dark:bg-gray-700 
            peer-checked:after:translate-x-full 
            peer-checked:after:border-white 
            after:content-[''] after:absolute after:top-0.5 after:left-[2px] 
            after:bg-white after:border-gray-300 after:border after:rounded-full 
            after:h-4 after:w-4 after:transition-all 
            dark:border-gray-600 
            peer-checked:bg-blue-500
          " />
        </label>
      </div>
      
      {/* 自定义尺寸输入 */}
      {preset.id === 'custom' && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
              宽度 ({unit})
            </label>
            <input
              type="number"
              value={customWidth}
              onChange={handleWidthChange}
              min={1}
              step={unit === 'mm' ? 1 : 10}
              className="
                w-full px-3 py-1.5 text-sm rounded-md border
                border-gray-300 dark:border-gray-600
                bg-white dark:bg-gray-800
                text-gray-900 dark:text-gray-100
                focus:ring-2 focus:ring-blue-500 focus:border-transparent
              "
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
              高度 ({unit})
            </label>
            <input
              type="number"
              value={customHeight}
              onChange={handleHeightChange}
              min={1}
              step={unit === 'mm' ? 1 : 10}
              className="
                w-full px-3 py-1.5 text-sm rounded-md border
                border-gray-300 dark:border-gray-600
                bg-white dark:bg-gray-800
                text-gray-900 dark:text-gray-100
                focus:ring-2 focus:ring-blue-500 focus:border-transparent
              "
            />
          </div>
        </div>
      )}
      
      {/* 尺寸信息 */}
      <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="text-gray-600 dark:text-gray-400">
            尺寸 (mm):
          </div>
          <div className="text-gray-900 dark:text-gray-100 font-medium">
            {unit === 'mm' ? displayWidth : pxToMm(displayWidth)} × {unit === 'mm' ? displayHeight : pxToMm(displayHeight)}
          </div>
          <div className="text-gray-600 dark:text-gray-400">
            尺寸 (px):
          </div>
          <div className="text-gray-900 dark:text-gray-100 font-medium">
            {widthPx} × {heightPx}
          </div>
        </div>
      </div>
    </div>
  );
}
