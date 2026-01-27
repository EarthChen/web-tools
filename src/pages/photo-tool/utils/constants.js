/**
 * 证件照标准尺寸预设
 * 换算公式: px = mm × DPI / 25.4
 * 标准打印 DPI = 300
 */
export const STANDARD_DPI = 300;

// mm 转 px 换算因子
export const MM_TO_PX_FACTOR = STANDARD_DPI / 25.4;

/**
 * 预设尺寸规格
 * 按使用场景分类
 */
export const SIZE_PRESETS = [
  // ===== 常用标准尺寸 =====
  {
    id: 'one-inch',
    name: '一寸',
    width: 25,
    height: 35,
    unit: 'mm',
    category: '标准尺寸',
    description: '常用于各类证件',
  },
  {
    id: 'two-inch',
    name: '二寸',
    width: 35,
    height: 49,
    unit: 'mm',
    category: '标准尺寸',
    description: '常用于护照、签证',
  },
  {
    id: 'small-two-inch',
    name: '小二寸',
    width: 35,
    height: 45,
    unit: 'mm',
    category: '标准尺寸',
    description: '公务员/事业单位/教资报名',
  },
  {
    id: 'large-one-inch',
    name: '大一寸',
    width: 33,
    height: 48,
    unit: 'mm',
    category: '标准尺寸',
    description: '驾驶证、社保卡',
  },
  
  // ===== 考试报名 =====
  {
    id: 'civil-service',
    name: '公务员考试',
    width: 35,
    height: 45,
    unit: 'mm',
    category: '考试报名',
    description: '国考/省考/事业单位 (413×531px)',
  },
  {
    id: 'teacher-cert',
    name: '教师资格证',
    width: 35,
    height: 53,
    unit: 'mm',
    category: '考试报名',
    description: '教资报名 (413×626px)',
  },
  {
    id: 'graduate-exam',
    name: '考研',
    width: 35,
    height: 45,
    unit: 'mm',
    category: '考试报名',
    description: '研究生考试报名',
  },
  {
    id: 'cet',
    name: '英语四六级',
    width: 35,
    height: 45,
    unit: 'mm',
    category: '考试报名',
    description: 'CET-4/CET-6 报名',
  },
  {
    id: 'accounting',
    name: '会计考试',
    width: 35,
    height: 49,
    unit: 'mm',
    category: '考试报名',
    description: '初/中/高级会计职称',
  },
  {
    id: 'judicial',
    name: '法考',
    width: 35,
    height: 45,
    unit: 'mm',
    category: '考试报名',
    description: '法律职业资格考试',
  },
  
  // ===== 证件办理 =====
  {
    id: 'id-card',
    name: '身份证',
    width: 26,
    height: 32,
    unit: 'mm',
    category: '证件办理',
    description: '二代身份证 (358×441px)',
  },
  {
    id: 'passport',
    name: '护照/港澳通行证',
    width: 33,
    height: 48,
    unit: 'mm',
    category: '证件办理',
    description: '出入境证件 (390×567px)',
  },
  {
    id: 'driver-license',
    name: '驾驶证',
    width: 22,
    height: 32,
    unit: 'mm',
    category: '证件办理',
    description: '机动车驾驶证 (260×378px)',
  },
  {
    id: 'social-security',
    name: '社保卡/医保卡',
    width: 26,
    height: 32,
    unit: 'mm',
    category: '证件办理',
    description: '社会保障卡',
  },
  
  // ===== 签证照片 =====
  {
    id: 'us-visa',
    name: '美国签证',
    width: 51,
    height: 51,
    unit: 'mm',
    category: '签证',
    description: '正方形 2x2英寸',
  },
  {
    id: 'schengen-visa',
    name: '申根签证',
    width: 35,
    height: 45,
    unit: 'mm',
    category: '签证',
    description: '欧洲申根签证',
  },
  {
    id: 'japan-visa',
    name: '日本签证',
    width: 45,
    height: 45,
    unit: 'mm',
    category: '签证',
    description: '正方形 4.5x4.5cm',
  },
  {
    id: 'korea-visa',
    name: '韩国签证',
    width: 35,
    height: 45,
    unit: 'mm',
    category: '签证',
    description: '3.5x4.5cm 白底',
  },
  
  // ===== 其他 =====
  {
    id: 'resume',
    name: '简历照片',
    width: 35,
    height: 45,
    unit: 'mm',
    category: '其他',
    description: '求职简历用',
  },
  {
    id: 'custom',
    name: '自定义',
    width: 35,
    height: 45,
    unit: 'mm',
    category: '其他',
    description: '自定义尺寸',
  },
];

/**
 * 预设背景颜色
 */
export const BACKGROUND_COLORS = [
  { id: 'red', name: '红色', hex: '#FF0000', description: '常用于结婚证、护照' },
  { id: 'blue', name: '蓝色', hex: '#438EDB', description: '常用于身份证、驾驶证' },
  { id: 'white', name: '白色', hex: '#FFFFFF', description: '常用于签证、简历' },
];

/**
 * 输出格式
 */
export const OUTPUT_FORMATS = [
  { id: 'jpeg', name: 'JPEG', mimeType: 'image/jpeg', extension: '.jpg' },
  { id: 'png', name: 'PNG', mimeType: 'image/png', extension: '.png' },
];

/**
 * 压缩参数范围
 */
export const COMPRESSION = {
  MIN_QUALITY: 0.2,
  MAX_QUALITY: 0.95,
  QUALITY_STEP: 0.1,
  MIN_SCALE: 0.1,
  SCALE_STEP: 0.05,
};
