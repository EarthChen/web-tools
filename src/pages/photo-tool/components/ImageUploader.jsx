/**
 * 图片上传组件
 * 支持拖拽上传和点击上传
 */

import { useCallback, useRef, useState } from 'react';

export function ImageUploader({ onUpload, disabled }) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef(null);
  
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);
  
  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);
  
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type.startsWith('image/')) {
      onUpload(files[0]);
    }
  }, [onUpload]);
  
  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);
  
  const handleChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
    }
  }, [onUpload]);
  
  return (
    <div
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        relative flex flex-col items-center justify-center
        w-full h-48 border-2 border-dashed rounded-lg
        cursor-pointer transition-all duration-200
        ${isDragging 
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
          : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        disabled={disabled}
        className="hidden"
      />
      
      <svg 
        className={`w-12 h-12 mb-3 ${isDragging ? 'text-blue-500' : 'text-gray-400'}`}
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={1.5}
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" 
        />
      </svg>
      
      <p className="text-sm text-gray-600 dark:text-gray-400">
        {isDragging ? '松开以上传图片' : '点击或拖拽上传证件照'}
      </p>
      <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
        支持 JPG、PNG 格式
      </p>
    </div>
  );
}
