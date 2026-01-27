/**
 * 背景颜色选择器组件
 * 支持预设颜色和自定义 HEX
 */

import { useState, useCallback } from 'react';
import { BACKGROUND_COLORS } from '../utils/constants';

export function BackgroundSelector({ value, onChange }) {
  const [customColor, setCustomColor] = useState('#FFFFFF');
  const [showCustom, setShowCustom] = useState(false);
  
  const handlePresetClick = useCallback((hex) => {
    setShowCustom(false);
    onChange(hex);
  }, [onChange]);
  
  const handleCustomChange = useCallback((e) => {
    const hex = e.target.value.toUpperCase();
    setCustomColor(hex);
    if (/^#[0-9A-F]{6}$/i.test(hex)) {
      onChange(hex);
    }
  }, [onChange]);
  
  const handleColorPickerChange = useCallback((e) => {
    const hex = e.target.value.toUpperCase();
    setCustomColor(hex);
    onChange(hex);
  }, [onChange]);
  
  const isPresetSelected = (hex) => value === hex && !showCustom;
  
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        背景颜色
      </label>
      
      {/* 预设颜色 */}
      <div className="flex gap-2">
        {BACKGROUND_COLORS.map((color) => (
          <button
            key={color.id}
            onClick={() => handlePresetClick(color.hex)}
            className={`
              relative w-10 h-10 rounded-lg border-2 transition-all
              ${isPresetSelected(color.hex) 
                ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-800' 
                : 'border-gray-200 dark:border-gray-600 hover:border-gray-400'
              }
            `}
            style={{ backgroundColor: color.hex }}
            title={`${color.name} - ${color.description}`}
          >
            {isPresetSelected(color.hex) && (
              <svg 
                className="absolute inset-0 m-auto w-5 h-5 text-white drop-shadow-md"
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2}
                  d="M5 13l4 4L19 7" 
                />
              </svg>
            )}
          </button>
        ))}
        
        {/* 自定义颜色按钮 */}
        <button
          onClick={() => setShowCustom(true)}
          className={`
            relative w-10 h-10 rounded-lg border-2 transition-all overflow-hidden
            ${showCustom 
              ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-800' 
              : 'border-gray-200 dark:border-gray-600 hover:border-gray-400'
            }
          `}
          title="自定义颜色"
        >
          <div className="absolute inset-0 bg-gradient-conic from-red-500 via-yellow-500 via-green-500 via-blue-500 to-red-500" />
          <input
            type="color"
            value={customColor}
            onChange={handleColorPickerChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </button>
      </div>
      
      {/* 自定义 HEX 输入 */}
      {showCustom && (
        <div className="flex items-center gap-2">
          <div 
            className="w-8 h-8 rounded border border-gray-300 dark:border-gray-600"
            style={{ backgroundColor: customColor }}
          />
          <input
            type="text"
            value={customColor}
            onChange={handleCustomChange}
            placeholder="#FFFFFF"
            maxLength={7}
            className="
              flex-1 px-3 py-1.5 text-sm rounded-md border
              border-gray-300 dark:border-gray-600
              bg-white dark:bg-gray-800
              text-gray-900 dark:text-gray-100
              focus:ring-2 focus:ring-blue-500 focus:border-transparent
            "
          />
        </div>
      )}
      
      {/* 当前颜色描述 */}
      <p className="text-xs text-gray-500 dark:text-gray-400">
        当前: {value}
        {BACKGROUND_COLORS.find(c => c.hex === value)?.description && 
          ` - ${BACKGROUND_COLORS.find(c => c.hex === value).description}`
        }
      </p>
    </div>
  );
}
