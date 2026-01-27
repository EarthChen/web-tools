/**
 * 图像编辑器状态管理 Hook
 * 管理整个编辑流程的状态：上传、抠图、背景、尺寸、压缩等
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { 
  loadImage, 
  removeBackground, 
  compositeImage,
  compressImage,
  mmToPx,
  formatFileSize,
  preprocessImage
} from '../utils/imageProcessor';
import { removeBackgroundWithAI } from '../utils/aiProviders';
import { SIZE_PRESETS, BACKGROUND_COLORS, STANDARD_DPI } from '../utils/constants';
import { 
  saveEditorConfig, 
  loadEditorConfig, 
  saveAIConfig, 
  loadAIConfig 
} from '../utils/storage';

const initialState = {
  // 原始图片
  originalFile: null,
  originalImage: null,
  
  // 抠图后的图片
  processedImage: null,
  
  // 是否已执行抠图
  hasCutout: false,
  
  // 编辑参数
  backgroundColor: BACKGROUND_COLORS[1].hex, // 默认蓝色
  sizePreset: SIZE_PRESETS[0], // 默认一寸
  customWidth: 25,
  customHeight: 35,
  unit: 'mm', // 'mm' | 'px'
  
  // 图片位置调整
  offsetX: 0,
  offsetY: 0,
  scale: 1,
  
  // 保持原图比例（防止人物变形）
  keepAspectRatio: true,
  
  // 压缩参数
  targetSizeKB: 50,
  enableCompression: false,
  outputFormat: 'image/jpeg',
  
  // API 配置
  apiKey: '',
  useAPI: false,
  aiProvider: 'removebg', // AI 服务提供商
  apiOptions: {}, // OpenAI 兼容 API 的额外选项 { baseUrl, model }
  
  // 状态信息
  currentFileSize: 0,
  actualWidth: 0,
  actualHeight: 0,
  compressionRatio: 1,
  quality: 0.9,
  
  // 加载状态
  isLoading: false,
  error: null,
};

export function useImageEditor() {
  // 从本地存储加载初始配置
  const getInitialState = () => {
    const savedConfig = loadEditorConfig();
    if (!savedConfig) return initialState;
    
    // 查找对应的尺寸预设
    const savedPreset = SIZE_PRESETS.find(p => p.id === savedConfig.sizePresetId) || SIZE_PRESETS[0];
    
    // 加载保存的 AI 配置
    const savedAIConfig = loadAIConfig(savedConfig.aiProvider);
    
    return {
      ...initialState,
      backgroundColor: savedConfig.backgroundColor || initialState.backgroundColor,
      sizePreset: savedPreset,
      customWidth: savedConfig.customWidth || initialState.customWidth,
      customHeight: savedConfig.customHeight || initialState.customHeight,
      unit: savedConfig.unit || initialState.unit,
      keepAspectRatio: savedConfig.keepAspectRatio ?? initialState.keepAspectRatio,
      enableCompression: savedConfig.enableCompression ?? initialState.enableCompression,
      targetSizeKB: savedConfig.targetSizeKB || initialState.targetSizeKB,
      outputFormat: savedConfig.outputFormat || initialState.outputFormat,
      aiProvider: savedConfig.aiProvider || initialState.aiProvider,
      useAPI: savedConfig.useAPI ?? initialState.useAPI,
      apiKey: savedAIConfig?.apiKey || '',
      apiOptions: savedAIConfig?.options || {},
    };
  };
  
  const [state, setState] = useState(getInitialState);
  const canvasRef = useRef(null);
  const previewCanvasRef = useRef(null);
  
  /**
   * 更新状态的辅助函数
   */
  const updateState = useCallback((updates) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);
  
  /**
   * 自动保存配置到本地存储
   */
  useEffect(() => {
    // 延迟保存，避免频繁写入
    const timeoutId = setTimeout(() => {
      saveEditorConfig(state);
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [
    state.backgroundColor,
    state.sizePreset,
    state.customWidth,
    state.customHeight,
    state.unit,
    state.keepAspectRatio,
    state.enableCompression,
    state.targetSizeKB,
    state.outputFormat,
    state.aiProvider,
    state.useAPI,
  ]);
  
  /**
   * 上传图片
   */
  const uploadImage = useCallback(async (file) => {
    updateState({ isLoading: true, error: null });
    
    try {
      const image = await loadImage(file);
      updateState({
        originalFile: file,
        originalImage: image,
        processedImage: image, // 初始时使用原图
        hasCutout: false,
        isLoading: false,
        // 重置位置和缩放
        offsetX: 0,
        offsetY: 0,
        scale: 1,
      });
    } catch (error) {
      updateState({ 
        isLoading: false, 
        error: '图片加载失败，请检查文件格式' 
      });
    }
  }, [updateState]);
  
  /**
   * 执行抠图
   */
  const performCutout = useCallback(async (tolerance = 30) => {
    if (!state.originalImage) {
      updateState({ error: '请先上传图片' });
      return;
    }
    
    updateState({ isLoading: true, error: null });
    
    try {
      let image;
      
      if (state.useAPI && (state.apiKey || state.aiProvider === 'huggingface')) {
        // 使用 AI API 抠图
        const blob = await removeBackgroundWithAI(
          state.originalFile, 
          state.aiProvider, 
          state.apiKey,
          state.apiOptions
        );
        image = await loadImage(URL.createObjectURL(blob));
      } else {
        // 使用本地颜色容差算法（优化：预处理大图片）
        const { canvas: preprocessedCanvas } = preprocessImage(state.originalImage);
        const ctx = preprocessedCanvas.getContext('2d');
        
        const imageData = ctx.getImageData(0, 0, preprocessedCanvas.width, preprocessedCanvas.height);
        
        // 使用 setTimeout 让 UI 有机会更新
        await new Promise(resolve => setTimeout(resolve, 50));
        
        const processedData = removeBackground(imageData, tolerance);
        ctx.putImageData(processedData, 0, 0);
        
        image = await loadImage(preprocessedCanvas.toDataURL('image/png'));
      }
      
      updateState({ 
        processedImage: image, 
        hasCutout: true,
        isLoading: false 
      });
    } catch (error) {
      updateState({ 
        isLoading: false, 
        error: error.message || '抠图失败，请检查网络或 API Key' 
      });
    }
  }, [state.originalImage, state.originalFile, state.useAPI, state.apiKey, state.aiProvider, updateState]);
  
  /**
   * 更新预览 Canvas
   */
  const updatePreview = useCallback(() => {
    if (!previewCanvasRef.current || !state.processedImage) return;
    
    // 计算实际像素尺寸
    const preset = state.sizePreset;
    let width, height;
    
    if (state.unit === 'mm') {
      width = preset.id === 'custom' 
        ? mmToPx(state.customWidth) 
        : mmToPx(preset.width);
      height = preset.id === 'custom' 
        ? mmToPx(state.customHeight) 
        : mmToPx(preset.height);
    } else {
      width = preset.id === 'custom' ? state.customWidth : mmToPx(preset.width);
      height = preset.id === 'custom' ? state.customHeight : mmToPx(preset.height);
    }
    
    // 合成图片
    // keepAspectRatio=true 时使用 cover 模式（保持比例，可能裁剪）
    // keepAspectRatio=false 时使用 fill 模式（拉伸填满，可能变形）
    compositeImage(previewCanvasRef.current, state.processedImage, state.backgroundColor, {
      width,
      height,
      offsetX: state.offsetX,
      offsetY: state.offsetY,
      scale: state.scale,
      fillMode: state.keepAspectRatio ? 'cover' : 'fill',
    });
    
    // 更新实际尺寸状态
    updateState({
      actualWidth: width,
      actualHeight: height,
    });
  }, [state, updateState]);
  
  /**
   * 导出图片
   */
  const exportImage = useCallback(async () => {
    if (!previewCanvasRef.current) return null;
    
    updateState({ isLoading: true });
    
    try {
      let result;
      
      if (state.enableCompression && state.targetSizeKB > 0) {
        // 执行压缩
        result = await compressImage(
          previewCanvasRef.current,
          state.targetSizeKB,
          state.outputFormat
        );
        
        updateState({
          currentFileSize: result.blob.size,
          compressionRatio: result.scale,
          quality: result.quality,
          isLoading: false,
        });
      } else {
        // 不压缩，直接导出
        const quality = state.outputFormat === 'image/jpeg' ? 0.92 : undefined;
        const blob = await new Promise(resolve => {
          previewCanvasRef.current.toBlob(resolve, state.outputFormat, quality);
        });
        
        result = { blob, quality: quality || 1, scale: 1 };
        updateState({
          currentFileSize: blob.size,
          compressionRatio: 1,
          quality: quality || 1,
          isLoading: false,
        });
      }
      
      return result.blob;
    } catch (error) {
      updateState({ isLoading: false, error: '导出失败' });
      return null;
    }
  }, [state.enableCompression, state.targetSizeKB, state.outputFormat, updateState]);
  
  /**
   * 下载图片
   */
  const downloadImage = useCallback(async () => {
    const blob = await exportImage();
    if (!blob) return;
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const extension = state.outputFormat === 'image/jpeg' ? '.jpg' : '.png';
    link.href = url;
    link.download = `证件照_${state.sizePreset.name}${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [exportImage, state.outputFormat, state.sizePreset]);
  
  /**
   * 重置编辑器
   */
  const reset = useCallback(() => {
    setState(initialState);
  }, []);
  
  /**
   * 设置背景颜色
   */
  const setBackgroundColor = useCallback((color) => {
    updateState({ backgroundColor: color });
  }, [updateState]);
  
  /**
   * 设置尺寸预设
   */
  const setSizePreset = useCallback((preset) => {
    updateState({ sizePreset: preset });
  }, [updateState]);
  
  /**
   * 设置自定义尺寸
   */
  const setCustomSize = useCallback((width, height) => {
    updateState({ customWidth: width, customHeight: height });
  }, [updateState]);
  
  /**
   * 设置单位
   */
  const setUnit = useCallback((unit) => {
    updateState({ unit });
  }, [updateState]);
  
  /**
   * 设置图片位置偏移
   */
  const setOffset = useCallback((offsetX, offsetY) => {
    updateState({ offsetX, offsetY });
  }, [updateState]);
  
  /**
   * 设置图片缩放
   */
  const setScale = useCallback((scale) => {
    updateState({ scale });
  }, [updateState]);
  
  /**
   * 设置压缩参数
   */
  const setCompression = useCallback((targetSizeKB, enabled) => {
    updateState({ 
      targetSizeKB, 
      enableCompression: enabled !== undefined ? enabled : state.enableCompression 
    });
  }, [state.enableCompression, updateState]);
  
  /**
   * 设置输出格式
   */
  const setOutputFormat = useCallback((format) => {
    updateState({ outputFormat: format });
  }, [updateState]);
  
  /**
   * 设置保持原图比例
   */
  const setKeepAspectRatio = useCallback((keep) => {
    updateState({ keepAspectRatio: keep });
  }, [updateState]);
  
  /**
   * 设置 API 配置
   */
  const setAPIConfig = useCallback((apiKey, useAPI) => {
    updateState({ apiKey, useAPI });
  }, [updateState]);
  
  /**
   * 设置 AI 服务提供商
   */
  const setAIProvider = useCallback((provider) => {
    updateState({ aiProvider: provider });
  }, [updateState]);
  
  /**
   * 设置 API 额外选项（用于 OpenAI 兼容 API）
   */
  const setAPIOptions = useCallback((options) => {
    updateState({ apiOptions: options });
  }, [updateState]);
  
  return {
    // 状态
    ...state,
    
    // Refs
    canvasRef,
    previewCanvasRef,
    
    // 方法
    uploadImage,
    performCutout,
    updatePreview,
    exportImage,
    downloadImage,
    reset,
    
    // 设置方法
    setBackgroundColor,
    setSizePreset,
    setCustomSize,
    setUnit,
    setOffset,
    setScale,
    setCompression,
    setOutputFormat,
    setAPIConfig,
    setAIProvider,
    setAPIOptions,
    setKeepAspectRatio,
    updateState,
  };
}
