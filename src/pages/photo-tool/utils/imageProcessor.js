/**
 * 图像处理核心算法模块
 * 包含：抠图、压缩、尺寸换算等功能
 */

import { STANDARD_DPI, MM_TO_PX_FACTOR, COMPRESSION } from './constants';

/**
 * 图片处理的最大尺寸限制
 * 超过此尺寸会先缩放再处理，避免卡死
 */
const MAX_PROCESS_SIZE = 1500;

/**
 * 预处理图片：如果图片过大，先缩放到合理尺寸
 * @param {HTMLImageElement} img - 原始图片
 * @returns {{ canvas: HTMLCanvasElement, scale: number }} 处理后的 canvas 和缩放比例
 */
export function preprocessImage(img) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  let scale = 1;
  let width = img.width;
  let height = img.height;
  
  // 如果图片过大，等比例缩放
  if (width > MAX_PROCESS_SIZE || height > MAX_PROCESS_SIZE) {
    scale = Math.min(MAX_PROCESS_SIZE / width, MAX_PROCESS_SIZE / height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }
  
  canvas.width = width;
  canvas.height = height;
  
  // 使用高质量缩放
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, width, height);
  
  return { canvas, scale, width, height };
}

/**
 * mm 转 px
 * @param {number} mm - 毫米值
 * @param {number} dpi - DPI值，默认300
 * @returns {number} 像素值
 */
export function mmToPx(mm, dpi = STANDARD_DPI) {
  return Math.round(mm * dpi / 25.4);
}

/**
 * px 转 mm
 * @param {number} px - 像素值
 * @param {number} dpi - DPI值，默认300
 * @returns {number} 毫米值
 */
export function pxToMm(px, dpi = STANDARD_DPI) {
  return Math.round((px * 25.4 / dpi) * 10) / 10;
}

/**
 * 计算颜色距离（欧氏距离）
 * @param {number[]} color1 - RGB颜色1 [r, g, b]
 * @param {number[]} color2 - RGB颜色2 [r, g, b]
 * @returns {number} 颜色距离
 */
function colorDistance(color1, color2) {
  const dr = color1[0] - color2[0];
  const dg = color1[1] - color2[1];
  const db = color1[2] - color2[2];
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

/**
 * HEX 颜色转 RGB
 * @param {string} hex - HEX颜色值
 * @returns {number[]} RGB数组 [r, g, b]
 */
export function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
  ] : [0, 0, 0];
}

/**
 * 本地颜色容差抠图算法（改进版 v2）
 * 使用 Flood Fill + 边缘膨胀 + 颜色去污
 * 优化：支持大图片分块处理，避免卡死
 * 
 * @param {ImageData} imageData - Canvas 图像数据
 * @param {number} tolerance - 颜色容差阈值 (0-255)，建议 20-60
 * @param {function} onProgress - 进度回调（可选）
 * @returns {ImageData} 处理后的图像数据
 */
export function removeBackground(imageData, tolerance = 30, onProgress = null) {
  const { data, width, height } = imageData;
  const newData = new Uint8ClampedArray(data);
  const totalPixels = width * height;
  
  // 创建透明度掩码
  const mask = new Uint8Array(totalPixels);
  
  // 多点边缘采样策略（优化：减少采样点）
  const sampleStep = Math.max(5, Math.floor(Math.max(width, height) / 100));
  const edgeSamples = [];
  for (let x = 0; x < width; x += sampleStep) {
    edgeSamples.push([x, 0], [x, height - 1]);
  }
  for (let y = 0; y < height; y += sampleStep) {
    edgeSamples.push([0, y], [width - 1, y]);
  }
  
  // 收集边缘采样点的颜色
  const sampleColors = [];
  for (const [x, y] of edgeSamples) {
    if (x >= 0 && x < width && y >= 0 && y < height) {
      const idx = (y * width + x) * 4;
      sampleColors.push([data[idx], data[idx + 1], data[idx + 2]]);
    }
  }
  
  if (sampleColors.length === 0) {
    return imageData;
  }
  
  // 使用中位数计算背景色
  const sortedR = sampleColors.map(c => c[0]).sort((a, b) => a - b);
  const sortedG = sampleColors.map(c => c[1]).sort((a, b) => a - b);
  const sortedB = sampleColors.map(c => c[2]).sort((a, b) => a - b);
  const mid = Math.floor(sampleColors.length / 2);
  const bgColor = [sortedR[mid], sortedG[mid], sortedB[mid]];
  
  // 第一步：标记所有与背景色相似的像素
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const dr = r - bgColor[0], dg = g - bgColor[1], db = b - bgColor[2];
    const distance = Math.sqrt(dr * dr + dg * dg + db * db);
    
    if (distance < tolerance) {
      mask[i / 4] = 1;
    }
  }
  
  // 第二步：从边缘开始 Flood Fill（优化：使用数组模拟队列）
  const visited = new Uint8Array(totalPixels);
  const bgMask = new Uint8Array(totalPixels);
  
  // 使用数组作为队列（比 shift 更快）
  let queue = [];
  let queueStart = 0;
  
  // 从四边开始
  for (let x = 0; x < width; x++) {
    queue.push(x); // y = 0
    queue.push(x + (height - 1) * width); // y = height - 1
  }
  for (let y = 1; y < height - 1; y++) {
    queue.push(y * width); // x = 0
    queue.push(y * width + width - 1); // x = width - 1
  }
  
  while (queueStart < queue.length) {
    const idx = queue[queueStart++];
    
    if (idx < 0 || idx >= totalPixels || visited[idx]) continue;
    visited[idx] = 1;
    
    if (mask[idx] === 1) {
      bgMask[idx] = 1;
      const x = idx % width;
      const y = Math.floor(idx / width);
      // 添加相邻像素
      if (x > 0) queue.push(idx - 1);
      if (x < width - 1) queue.push(idx + 1);
      if (y > 0) queue.push(idx - width);
      if (y < height - 1) queue.push(idx + width);
    }
  }
  
  // 第三步：简化的边缘处理（优化：减少嵌套循环）
  const dilateRadius = Math.max(1, Math.min(3, Math.floor(tolerance / 20)));
  
  // 第四步：应用透明度
  for (let i = 0; i < data.length; i += 4) {
    const pixelIdx = i / 4;
    
    if (bgMask[pixelIdx] === 1) {
      // 纯背景区域，完全透明
      newData[i + 3] = 0;
    } else {
      // 检查是否在边缘附近
      const x = pixelIdx % width;
      const y = Math.floor(pixelIdx / width);
      let minDistToBg = Infinity;
      
      // 简化的边缘检测
      for (let dy = -dilateRadius; dy <= dilateRadius; dy++) {
        for (let dx = -dilateRadius; dx <= dilateRadius; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            if (bgMask[ny * width + nx] === 1) {
              const dist = Math.sqrt(dx * dx + dy * dy);
              minDistToBg = Math.min(minDistToBg, dist);
            }
          }
        }
      }
      
      if (minDistToBg < dilateRadius) {
        // 边缘区域，渐进透明
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const dr = r - bgColor[0], dg = g - bgColor[1], db = b - bgColor[2];
        const colorDist = Math.sqrt(dr * dr + dg * dg + db * db);
        
        if (colorDist < tolerance * 1.8) {
          const alpha = Math.round(255 * Math.min(1, colorDist / (tolerance * 1.5)));
          newData[i + 3] = Math.max(0, alpha);
          
          // 简化的颜色去污
          if (alpha > 50 && alpha < 200) {
            const ratio = alpha / 255;
            for (let c = 0; c < 3; c++) {
              const adjusted = Math.round(data[i + c] + (data[i + c] - bgColor[c]) * (1 - ratio) * 0.3);
              newData[i + c] = Math.max(0, Math.min(255, adjusted));
            }
          }
        }
      }
    }
  }
  
  return new ImageData(newData, width, height);
}

/**
 * 调用第三方抠图 API (Remove.bg)
 * 
 * @param {File} imageFile - 图片文件
 * @param {string} apiKey - API Key
 * @returns {Promise<Blob>} 透明背景的 PNG Blob
 */
export async function removeBackgroundAPI(imageFile, apiKey) {
  const formData = new FormData();
  formData.append('image_file', imageFile);
  formData.append('size', 'auto');
  
  const response = await fetch('https://api.remove.bg/v1.0/removebg', {
    method: 'POST',
    headers: {
      'X-Api-Key': apiKey,
    },
    body: formData,
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.errors?.[0]?.title || 'API 调用失败');
  }
  
  return await response.blob();
}

/**
 * 在 Canvas 上合成背景和人物图层
 * 
 * @param {HTMLCanvasElement} canvas - 目标 Canvas
 * @param {HTMLImageElement} foregroundImage - 前景图片（抠图后）
 * @param {string} backgroundColor - 背景颜色 HEX
 * @param {Object} options - 配置选项
 * @param {number} options.width - 输出宽度
 * @param {number} options.height - 输出高度
 * @param {number} options.offsetX - 图片 X 偏移
 * @param {number} options.offsetY - 图片 Y 偏移
 * @param {number} options.scale - 图片缩放比例（1 表示自动填充）
 * @param {string} options.fillMode - 填充模式: 'cover' (覆盖填充) | 'contain' (包含) | 'none' (原始大小)
 */
export function compositeImage(canvas, foregroundImage, backgroundColor, options = {}) {
  const ctx = canvas.getContext('2d');
  const { width, height, offsetX = 0, offsetY = 0, scale = 1, fillMode = 'cover' } = options;
  
  // 设置 Canvas 尺寸
  canvas.width = width;
  canvas.height = height;
  
  // 绘制背景
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, width, height);
  
  // 计算基础缩放比例
  let baseScaleX = 1;
  let baseScaleY = 1;
  
  if (fillMode === 'cover') {
    // 覆盖模式：图片填满画布，保持比例，可能裁剪
    const uniformScale = Math.max(width / foregroundImage.width, height / foregroundImage.height);
    baseScaleX = uniformScale;
    baseScaleY = uniformScale;
  } else if (fillMode === 'contain') {
    // 包含模式：图片完整显示在画布内，保持比例
    const uniformScale = Math.min(width / foregroundImage.width, height / foregroundImage.height);
    baseScaleX = uniformScale;
    baseScaleY = uniformScale;
  } else if (fillMode === 'fill') {
    // 填充模式：拉伸填满画布，不保持比例（可能变形）
    baseScaleX = width / foregroundImage.width;
    baseScaleY = height / foregroundImage.height;
  }
  // fillMode === 'none' 时保持原始大小
  
  // 应用用户的额外缩放
  const finalScaleX = baseScaleX * scale;
  const finalScaleY = baseScaleY * scale;
  
  // 计算图片绘制尺寸
  const imgWidth = foregroundImage.width * finalScaleX;
  const imgHeight = foregroundImage.height * finalScaleY;
  
  // 默认居中 + 用户偏移
  const x = (width - imgWidth) / 2 + offsetX;
  const y = (height - imgHeight) / 2 + offsetY;
  
  // 启用高质量缩放
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  
  // 绘制前景图片
  ctx.drawImage(foregroundImage, x, y, imgWidth, imgHeight);
}

/**
 * 双维度递归压缩算法
 * 阶段1: 降低 JPEG 质量 (0.9 → 0.2)
 * 阶段2: 缩小分辨率 (100% → 10%)
 * 
 * @param {HTMLCanvasElement} canvas - 源 Canvas
 * @param {number} targetSizeKB - 目标文件大小 (KB)
 * @param {string} format - 输出格式 ('image/jpeg' | 'image/png')
 * @returns {Promise<{blob: Blob, quality: number, scale: number}>} 压缩结果
 */
export async function compressImage(canvas, targetSizeKB, format = 'image/jpeg') {
  const targetSizeBytes = targetSizeKB * 1024;
  const originalWidth = canvas.width;
  const originalHeight = canvas.height;
  
  // PNG 格式不支持质量参数，直接进入缩放阶段
  if (format === 'image/png') {
    return await compressWithScale(canvas, targetSizeBytes, format, originalWidth, originalHeight);
  }
  
  // 阶段1: 尝试降低 JPEG 质量
  let quality = COMPRESSION.MAX_QUALITY;
  
  while (quality >= COMPRESSION.MIN_QUALITY) {
    const blob = await canvasToBlob(canvas, format, quality);
    
    if (blob.size <= targetSizeBytes) {
      return { blob, quality, scale: 1 };
    }
    
    quality -= COMPRESSION.QUALITY_STEP;
  }
  
  // 阶段2: 质量已降到最低，开始缩小分辨率
  return await compressWithScale(
    canvas, 
    targetSizeBytes, 
    format, 
    originalWidth, 
    originalHeight,
    COMPRESSION.MIN_QUALITY
  );
}

/**
 * 通过缩小分辨率压缩图片
 * 
 * @param {HTMLCanvasElement} sourceCanvas - 源 Canvas
 * @param {number} targetSizeBytes - 目标大小 (字节)
 * @param {string} format - 输出格式
 * @param {number} originalWidth - 原始宽度
 * @param {number} originalHeight - 原始高度
 * @param {number} quality - JPEG 质量
 * @returns {Promise<{blob: Blob, quality: number, scale: number}>}
 */
async function compressWithScale(
  sourceCanvas, 
  targetSizeBytes, 
  format, 
  originalWidth, 
  originalHeight,
  quality = 0.9
) {
  let scale = 1;
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d');
  
  while (scale >= COMPRESSION.MIN_SCALE) {
    const newWidth = Math.round(originalWidth * scale);
    const newHeight = Math.round(originalHeight * scale);
    
    tempCanvas.width = newWidth;
    tempCanvas.height = newHeight;
    
    // 使用双线性插值缩放
    tempCtx.imageSmoothingEnabled = true;
    tempCtx.imageSmoothingQuality = 'high';
    tempCtx.drawImage(sourceCanvas, 0, 0, newWidth, newHeight);
    
    const blob = await canvasToBlob(tempCanvas, format, quality);
    
    if (blob.size <= targetSizeBytes) {
      return { blob, quality, scale };
    }
    
    scale -= COMPRESSION.SCALE_STEP;
  }
  
  // 已经压缩到最小，返回当前结果
  const finalBlob = await canvasToBlob(tempCanvas, format, quality);
  return { blob: finalBlob, quality, scale: COMPRESSION.MIN_SCALE };
}

/**
 * Canvas 转 Blob 的 Promise 封装
 * 
 * @param {HTMLCanvasElement} canvas 
 * @param {string} format 
 * @param {number} quality 
 * @returns {Promise<Blob>}
 */
function canvasToBlob(canvas, format, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Canvas 转换失败'));
        }
      },
      format,
      quality
    );
  });
}

/**
 * 加载图片并返回 Image 元素
 * 
 * @param {string | File} source - 图片源（URL 或 File）
 * @returns {Promise<HTMLImageElement>}
 */
export function loadImage(source) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('图片加载失败'));
    
    if (source instanceof File) {
      img.src = URL.createObjectURL(source);
    } else {
      img.src = source;
    }
  });
}

/**
 * 格式化文件大小
 * 
 * @param {number} bytes - 字节数
 * @returns {string} 格式化后的大小
 */
export function formatFileSize(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  } else {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
}
