/**
 * AI 抠图服务提供商配置
 * 支持多种主流大模型 API，包括 OpenAI 兼容接口
 */

/**
 * 支持的 AI 服务提供商列表
 */
export const AI_PROVIDERS = [
  {
    id: 'huggingface',
    name: 'Hugging Face (免费)',
    description: '免费 AI 抠图，使用 rembg 模型',
    apiKeyPlaceholder: 'HF Token (可选，hf_xxx)',
    docsUrl: 'https://huggingface.co/settings/tokens',
    corsProxy: false,
    isFree: true,
  },
  {
    id: 'rembg-api',
    name: 'RemBG API (免费)',
    description: '免费抠图 API，注册即可使用',
    apiKeyPlaceholder: 'RemBG API Key',
    docsUrl: 'https://www.rembg.com/en/api-usage',
    corsProxy: false,
    isFree: true,
  },
  {
    id: 'openai-compatible',
    name: 'OpenAI 兼容 API',
    description: '支持任何 OpenAI 兼容的视觉模型 API',
    apiKeyPlaceholder: 'API Key (如 sk-xxx)',
    docsUrl: 'https://platform.openai.com/docs/api-reference',
    corsProxy: false,
    needsBaseUrl: true,
    defaultBaseUrl: 'https://api.openai.com/v1',
  },
  {
    id: 'removebg',
    name: 'Remove.bg',
    description: '专业抠图，每月50次免费',
    apiKeyPlaceholder: 'Remove.bg API Key',
    docsUrl: 'https://www.remove.bg/api',
    corsProxy: false,
  },
  {
    id: 'stability',
    name: 'Stability AI',
    description: '稳定扩散模型，支持图像编辑',
    apiKeyPlaceholder: 'Stability AI API Key',
    docsUrl: 'https://platform.stability.ai/',
    corsProxy: false,
  },
  {
    id: 'replicate',
    name: 'Replicate',
    description: '云端 AI 模型平台 (rembg)',
    apiKeyPlaceholder: 'Replicate API Token',
    docsUrl: 'https://replicate.com/account/api-tokens',
    corsProxy: false,
  },
  {
    id: 'clipdrop',
    name: 'Clipdrop',
    description: 'Adobe 旗下 AI 抠图服务',
    apiKeyPlaceholder: 'Clipdrop API Key',
    docsUrl: 'https://clipdrop.co/apis',
    corsProxy: false,
  },
  {
    id: 'photoroom',
    name: 'PhotoRoom',
    description: '专业电商图片处理',
    apiKeyPlaceholder: 'PhotoRoom API Key',
    docsUrl: 'https://www.photoroom.com/api',
    corsProxy: false,
  },
];

/**
 * 预设的 OpenAI 兼容服务端点
 */
export const OPENAI_COMPATIBLE_PRESETS = [
  { 
    id: 'openai', 
    name: 'OpenAI (官方)', 
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o',
    description: 'OpenAI GPT-4 Vision'
  },
  { 
    id: 'azure', 
    name: 'Azure OpenAI', 
    baseUrl: 'https://{resource}.openai.azure.com/openai/deployments/{deployment}',
    model: 'gpt-4o',
    description: '微软 Azure OpenAI 服务'
  },
  { 
    id: 'deepseek', 
    name: 'DeepSeek', 
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
    description: '深度求索 AI'
  },
  { 
    id: 'zhipu', 
    name: '智谱 AI (GLM)', 
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    model: 'glm-4v',
    description: '智谱清言，支持图像理解'
  },
  { 
    id: 'qwen', 
    name: '通义千问', 
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: 'qwen-vl-max',
    description: '阿里通义千问视觉版'
  },
  { 
    id: 'moonshot', 
    name: 'Moonshot (Kimi)', 
    baseUrl: 'https://api.moonshot.cn/v1',
    model: 'moonshot-v1-8k-vision-preview',
    description: 'Kimi 大模型'
  },
  { 
    id: 'baichuan', 
    name: '百川智能', 
    baseUrl: 'https://api.baichuan-ai.com/v1',
    model: 'Baichuan4',
    description: '百川大模型'
  },
  { 
    id: 'silicon', 
    name: '硅基流动', 
    baseUrl: 'https://api.siliconflow.cn/v1',
    model: 'Qwen/Qwen2-VL-72B-Instruct',
    description: '硅基流动 API，支持多种开源模型'
  },
  { 
    id: 'custom', 
    name: '自定义端点', 
    baseUrl: '',
    model: '',
    description: '自定义 OpenAI 兼容 API 端点'
  },
];

/**
 * 文件转 Base64
 */
async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * 文件转 Data URL
 */
async function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * OpenAI 兼容 API 调用
 * 使用视觉模型进行图像分割/抠图
 */
async function callOpenAICompatible(imageFile, apiKey, options = {}) {
  const { 
    baseUrl = 'https://api.openai.com/v1', 
    model = 'gpt-4o'
  } = options;
  
  const imageDataUrl = await fileToDataUrl(imageFile);
  
  // 构建请求
  const requestBody = {
    model: model,
    messages: [
      {
        role: 'system',
        content: `你是一个专业的图像处理助手。用户会发送一张证件照，你需要分析图像并返回一个 JSON 对象，描述背景区域的颜色信息。
        
返回格式：
{
  "background_color": {"r": 0-255, "g": 0-255, "b": 0-255},
  "background_type": "solid|gradient|complex",
  "suggested_tolerance": 20-80,
  "description": "背景描述"
}

只返回 JSON，不要其他文字。`
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: '请分析这张证件照的背景颜色，返回 JSON 格式的结果。'
          },
          {
            type: 'image_url',
            image_url: {
              url: imageDataUrl,
              detail: 'low'
            }
          }
        ]
      }
    ],
    max_tokens: 500,
    temperature: 0.1,
  };
  
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `API 错误: ${response.status}`);
  }
  
  const result = await response.json();
  const content = result.choices?.[0]?.message?.content || '';
  
  // 解析 JSON 响应
  let bgInfo;
  try {
    // 尝试从响应中提取 JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      bgInfo = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('无法解析响应');
    }
  } catch (e) {
    // 如果解析失败，使用默认值
    bgInfo = {
      background_color: { r: 67, g: 142, b: 219 }, // 默认蓝色
      suggested_tolerance: 40
    };
  }
  
  // 使用 AI 分析的背景色进行本地抠图
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  const img = await loadImageFromFile(imageFile);
  canvas.width = img.width;
  canvas.height = img.height;
  ctx.drawImage(img, 0, 0);
  
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data, width, height } = imageData;
  const newData = new Uint8ClampedArray(data);
  
  const bgColor = [
    bgInfo.background_color?.r || 67,
    bgInfo.background_color?.g || 142,
    bgInfo.background_color?.b || 219
  ];
  const tolerance = bgInfo.suggested_tolerance || 40;
  
  // 使用 AI 识别的背景色进行精确抠图
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    const distance = Math.sqrt(
      Math.pow(r - bgColor[0], 2) +
      Math.pow(g - bgColor[1], 2) +
      Math.pow(b - bgColor[2], 2)
    );
    
    if (distance < tolerance) {
      newData[i + 3] = 0;
    } else if (distance < tolerance * 1.5) {
      const alpha = Math.round(255 * (distance - tolerance) / (tolerance * 0.5));
      newData[i + 3] = Math.max(0, Math.min(255, alpha));
    }
  }
  
  const resultImageData = new ImageData(newData, width, height);
  ctx.putImageData(resultImageData, 0, 0);
  
  return new Promise((resolve) => {
    canvas.toBlob(resolve, 'image/png');
  });
}

/**
 * 从文件加载图片
 */
function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Hugging Face Inference API 调用
 * 使用 rembg 模型进行抠图（免费）
 */
async function callHuggingFace(imageFile, apiKey = '') {
  const base64 = await fileToBase64(imageFile);
  
  // 使用 Hugging Face 的 rembg 模型
  const modelUrl = 'https://api-inference.huggingface.co/models/briaai/RMBG-1.4';
  
  const headers = {
    'Content-Type': 'application/json',
  };
  
  // 如果提供了 token，添加认证头（可以获得更高的速率限制）
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }
  
  const response = await fetch(modelUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      inputs: base64,
    }),
  });
  
  if (!response.ok) {
    // 如果模型正在加载，等待后重试
    if (response.status === 503) {
      const errorData = await response.json().catch(() => ({}));
      if (errorData.estimated_time) {
        throw new Error(`模型加载中，请等待 ${Math.ceil(errorData.estimated_time)} 秒后重试`);
      }
    }
    throw new Error(`Hugging Face API 错误: ${response.status}`);
  }
  
  return await response.blob();
}

/**
 * RemBG API 调用（免费）
 */
async function callRemBgApi(imageFile, apiKey) {
  const formData = new FormData();
  formData.append('image', imageFile);
  
  const response = await fetch('https://api.rembg.com/v1/remove', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
    body: formData,
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `RemBG API 错误: ${response.status}`);
  }
  
  return await response.blob();
}

/**
 * Remove.bg API 调用
 */
async function callRemoveBg(imageFile, apiKey) {
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
    const error = await response.json().catch(() => ({}));
    throw new Error(error.errors?.[0]?.title || `Remove.bg API 错误: ${response.status}`);
  }
  
  return await response.blob();
}

/**
 * Stability AI 抠图 API 调用
 */
async function callStabilityAI(imageFile, apiKey) {
  const formData = new FormData();
  formData.append('image', imageFile);
  formData.append('output_format', 'png');
  
  const response = await fetch('https://api.stability.ai/v2beta/stable-image/edit/remove-background', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Accept': 'image/*',
    },
    body: formData,
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Stability AI 错误: ${response.status}`);
  }
  
  return await response.blob();
}

/**
 * Replicate API 调用 (使用 rembg 模型)
 */
async function callReplicate(imageFile, apiKey) {
  const base64 = await fileToBase64(imageFile);
  const imageUrl = `data:${imageFile.type};base64,${base64}`;
  
  const createResponse = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      'Authorization': `Token ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      version: 'fb8af171cfa1616ddcf1242c851bf5e8076b6c554b1d95a8b60c73b2e8e5c96b',
      input: {
        image: imageUrl,
      },
    }),
  });
  
  if (!createResponse.ok) {
    throw new Error(`Replicate API 错误: ${createResponse.status}`);
  }
  
  const prediction = await createResponse.json();
  
  let result = prediction;
  while (result.status === 'starting' || result.status === 'processing') {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const pollResponse = await fetch(result.urls.get, {
      headers: {
        'Authorization': `Token ${apiKey}`,
      },
    });
    result = await pollResponse.json();
  }
  
  if (result.status === 'failed') {
    throw new Error(result.error || 'Replicate 处理失败');
  }
  
  const imageResponse = await fetch(result.output);
  return await imageResponse.blob();
}

/**
 * Clipdrop API 调用
 */
async function callClipdrop(imageFile, apiKey) {
  const formData = new FormData();
  formData.append('image_file', imageFile);
  
  const response = await fetch('https://clipdrop-api.co/remove-background/v1', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
    },
    body: formData,
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `Clipdrop API 错误: ${response.status}`);
  }
  
  return await response.blob();
}

/**
 * PhotoRoom API 调用
 */
async function callPhotoRoom(imageFile, apiKey) {
  const formData = new FormData();
  formData.append('image_file', imageFile);
  
  const response = await fetch('https://sdk.photoroom.com/v1/segment', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
    },
    body: formData,
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `PhotoRoom API 错误: ${response.status}`);
  }
  
  return await response.blob();
}

/**
 * 统一的 AI 抠图调用接口
 * 
 * @param {File} imageFile - 图片文件
 * @param {string} providerId - 服务提供商 ID
 * @param {string} apiKey - API Key
 * @param {Object} options - 额外选项（用于 OpenAI 兼容 API）
 * @returns {Promise<Blob>} 透明背景的 PNG Blob
 */
export async function removeBackgroundWithAI(imageFile, providerId, apiKey, options = {}) {
  // Hugging Face 可以不需要 API Key
  if (!apiKey && providerId !== 'huggingface') {
    throw new Error('请先配置 API Key');
  }
  
  switch (providerId) {
    case 'huggingface':
      return await callHuggingFace(imageFile, apiKey);
    
    case 'rembg-api':
      return await callRemBgApi(imageFile, apiKey);
    
    case 'openai-compatible':
      return await callOpenAICompatible(imageFile, apiKey, options);
    
    case 'removebg':
      return await callRemoveBg(imageFile, apiKey);
    
    case 'stability':
      return await callStabilityAI(imageFile, apiKey);
    
    case 'replicate':
      return await callReplicate(imageFile, apiKey);
    
    case 'clipdrop':
      return await callClipdrop(imageFile, apiKey);
    
    case 'photoroom':
      return await callPhotoRoom(imageFile, apiKey);
    
    default:
      throw new Error(`不支持的 AI 服务: ${providerId}`);
  }
}

/**
 * 获取提供商信息
 */
export function getProviderInfo(providerId) {
  return AI_PROVIDERS.find(p => p.id === providerId);
}
