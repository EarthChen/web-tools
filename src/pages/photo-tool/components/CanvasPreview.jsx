/**
 * Canvas 预览组件
 * 实时显示合成效果，支持拖拽调整图片位置
 */

import { useRef, useEffect, useState, useCallback } from 'react';
import { compositeImage, mmToPx } from '../utils/imageProcessor';

export function CanvasPreview({
  canvasRef,
  processedImage,
  backgroundColor,
  sizePreset,
  customWidth,
  customHeight,
  unit,
  offsetX,
  offsetY,
  scale,
  onOffsetChange,
  onScaleChange,
}) {
  const containerRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [displayScale, setDisplayScale] = useState(1);
  
  // 计算实际像素尺寸
  const getActualSize = useCallback(() => {
    let width, height;
    if (unit === 'mm') {
      width = sizePreset.id === 'custom' ? mmToPx(customWidth) : mmToPx(sizePreset.width);
      height = sizePreset.id === 'custom' ? mmToPx(customHeight) : mmToPx(sizePreset.height);
    } else {
      width = sizePreset.id === 'custom' ? customWidth : mmToPx(sizePreset.width);
      height = sizePreset.id === 'custom' ? customHeight : mmToPx(sizePreset.height);
    }
    return { width, height };
  }, [sizePreset, customWidth, customHeight, unit]);
  
  // 更新 Canvas 内容 - 由 App 组件的 updatePreview 统一处理
  // 这里不再重复调用，避免竞争条件
  
  // 计算显示缩放比例（使 Canvas 适应容器）
  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;
    
    const container = containerRef.current;
    const { width, height } = getActualSize();
    
    const containerWidth = container.clientWidth - 32; // padding
    const containerHeight = container.clientHeight - 32;
    
    const scaleX = containerWidth / width;
    const scaleY = containerHeight / height;
    const newDisplayScale = Math.min(scaleX, scaleY, 1);
    
    setDisplayScale(newDisplayScale);
  }, [containerRef, canvasRef, getActualSize]);
  
  // 拖拽事件处理
  const handleMouseDown = useCallback((e) => {
    if (!processedImage) return;
    setIsDragging(true);
    setDragStart({
      x: e.clientX - offsetX,
      y: e.clientY - offsetY,
    });
  }, [processedImage, offsetX, offsetY]);
  
  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    
    const newOffsetX = e.clientX - dragStart.x;
    const newOffsetY = e.clientY - dragStart.y;
    
    onOffsetChange(newOffsetX, newOffsetY);
  }, [isDragging, dragStart, onOffsetChange]);
  
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);
  
  // 滚轮缩放
  const handleWheel = useCallback((e) => {
    if (!processedImage) return;
    e.preventDefault();
    
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    const newScale = Math.max(0.1, Math.min(3, scale + delta));
    
    onScaleChange(newScale);
  }, [processedImage, scale, onScaleChange]);
  
  // 重置位置和缩放
  const handleReset = useCallback(() => {
    onOffsetChange(0, 0);
    onScaleChange(1);
  }, [onOffsetChange, onScaleChange]);
  
  const { width, height } = getActualSize();
  
  return (
    <div className="flex flex-col h-full">
      {/* 工具栏 */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          预览
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            缩放: {Math.round(scale * 100)}%
          </span>
          <button
            onClick={handleReset}
            className="
              px-2 py-1 text-xs rounded
              text-gray-600 dark:text-gray-400
              hover:bg-gray-100 dark:hover:bg-gray-700
              transition-colors
            "
          >
            重置
          </button>
        </div>
      </div>
      
      {/* Canvas 容器 */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        className={`
          flex-1 flex items-center justify-center
          bg-gray-100 dark:bg-gray-800 rounded-lg
          overflow-hidden p-4
          ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}
          ${!processedImage ? 'cursor-default' : ''}
        `}
        style={{
          // 棋盘格背景，用于显示透明区域
          backgroundImage: `
            linear-gradient(45deg, #ccc 25%, transparent 25%),
            linear-gradient(-45deg, #ccc 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, #ccc 75%),
            linear-gradient(-45deg, transparent 75%, #ccc 75%)
          `,
          backgroundSize: '16px 16px',
          backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
        }}
      >
        {processedImage ? (
          <canvas
            ref={canvasRef}
            style={{
              transform: `scale(${displayScale})`,
              transformOrigin: 'center',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            }}
          />
        ) : (
          <div className="text-center text-gray-400 dark:text-gray-500">
            <svg 
              className="w-16 h-16 mx-auto mb-2 opacity-50"
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={1}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" 
              />
            </svg>
            <p className="text-sm">请先上传图片</p>
          </div>
        )}
      </div>
      
      {/* 尺寸信息 */}
      {processedImage && (
        <div className="mt-3 flex justify-center gap-4 text-xs text-gray-500 dark:text-gray-400">
          <span>宽: {width}px</span>
          <span>高: {height}px</span>
          <span>显示: {Math.round(displayScale * 100)}%</span>
        </div>
      )}
      
      {/* 操作提示 */}
      {processedImage && (
        <p className="mt-2 text-center text-xs text-gray-400 dark:text-gray-500">
          拖拽调整位置 | 滚轮缩放
        </p>
      )}
    </div>
  );
}
