# 提案: photo-tool 独立仓库 + 小程序版本

> **状态**: AwaitingApproval (v2 - 独立仓库方案)
> **分支**: `feat/photo-tool-miniprogram`
> **创建时间**: 2026-02-09

---

## 1. 背景与目标

当前 `photo-tool`（证件照处理工具）内嵌在 `web-tools` 单体仓库中。用户希望：

1. **photo-tool 独立成单独的 GitHub 仓库**，解耦维护
2. **web-tools 通过外链关联**，首页卡片点击后跳转到独立站点
3. **在新仓库中增加微信小程序版本**，与 Web 版共享核心代码
4. **对移动端做定向优化**

---

## 2. 总体架构

```
GitHub 仓库关系:
┌──────────────────────────┐     外链跳转      ┌──────────────────────────┐
│  EarthChen/web-tools     │ ──────────────→   │  EarthChen/photo-tools   │
│  (工具集入口)             │                    │  (独立仓库 - Monorepo)    │
│  首页卡片 → 外链          │                    │  ├─ web/     (Web版)     │
│                          │                    │  ├─ miniprogram/ (小程序) │
│                          │                    │  └─ shared/  (共享代码)   │
└──────────────────────────┘                    └──────────────────────────┘
```

---

## 3. 新仓库结构设计 (EarthChen/photo-tools)

```
photo-tools/
├── README.md
├── package.json                    # Monorepo 根 (workspace 配置)
│
├── shared/                         # 平台无关的共享代码
│   ├── package.json
│   └── src/
│       ├── constants.js            # 尺寸预设、颜色、压缩参数
│       ├── algorithms.js           # 纯计算函数 (mm/px转换、颜色距离等)
│       ├── removeBackground.js     # 抠图核心算法 (操作 Uint8ClampedArray)
│       └── aiProviderConfigs.js    # AI 提供商配置数据
│
├── web/                            # Web 版本 (从 web-tools 迁移)
│   ├── package.json
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── src/
│       ├── main.jsx
│       ├── App.jsx                 # 独立运行 (无需 react-router)
│       ├── index.css
│       ├── components/             # 全部 React 组件 (含移动端优化)
│       ├── hooks/
│       │   └── useImageEditor.js
│       └── utils/
│           ├── imageProcessor.js   # Web Canvas 封装 (引用 shared)
│           ├── aiProviders.js      # fetch 实现 (引用 shared)
│           └── storage.js          # localStorage 实现
│
├── miniprogram/                    # 微信小程序版本
│   ├── app.js
│   ├── app.json
│   ├── app.wxss
│   ├── project.config.json
│   ├── sitemap.json
│   ├── pages/
│   │   └── index/
│   │       ├── index.wxml
│   │       ├── index.wxss
│   │       ├── index.js
│   │       └── index.json
│   ├── components/
│   │   ├── image-uploader/
│   │   ├── canvas-preview/
│   │   ├── background-selector/
│   │   ├── size-preset-selector/
│   │   └── compression-controller/
│   └── utils/
│       ├── imageProcessor.js       # 小程序 Canvas 适配
│       ├── storage.js              # wx.setStorageSync 适配
│       └── platform.js             # 平台差异抽象层
│
└── .github/
    └── workflows/
        └── deploy.yml              # GitHub Pages 部署 (web/)
```

### 3.1 Monorepo 管理

使用 pnpm workspace:

```yaml
# pnpm-workspace.yaml
packages:
  - 'shared'
  - 'web'
```

小程序不参与 workspace（微信开发者工具有自己的构建），但通过构建脚本将 `shared/` 代码复制到 `miniprogram/utils/shared/`。

### 3.2 共享层设计

共享层只包含**纯函数和纯数据**，零平台依赖:

| 文件 | 来源 | 内容 |
|---|---|---|
| `constants.js` | 现有 `constants.js` 直接复制 | SIZE_PRESETS, BACKGROUND_COLORS, OUTPUT_FORMATS, COMPRESSION |
| `algorithms.js` | 从 `imageProcessor.js` 提取 | mmToPx, pxToMm, hexToRgb, colorDistance, formatFileSize |
| `removeBackground.js` | 从 `imageProcessor.js` 重构 | removeBackground(data, width, height, tolerance) → Uint8ClampedArray |
| `aiProviderConfigs.js` | 从 `aiProviders.js` 提取 | AI_PROVIDERS[], OPENAI_COMPATIBLE_PRESETS[] 纯配置数据 |

---

## 4. web-tools 改造

### 4.1 清理 photo-tool 代码

- 删除 `src/pages/photo-tool/` 整个目录
- 删除 `App.jsx` 中的 PhotoTool 路由
- 清理 `package.json` 中仅 photo-tool 使用的依赖（如果有）

### 4.2 首页改为外链

`Home.jsx` 中 photo-tool 的卡片从 `<Link to="/photo-tool">` 改为 `<a href="https://earthchen.github.io/photo-tools/" target="_blank">`：

```javascript
{
  id: 'photo-tool',
  name: '证件照 Pro',
  description: 'AI 智能抠图与尺寸调整',
  // path: '/photo-tool',  // 移除内部路由
  externalUrl: 'https://earthchen.github.io/photo-tools/',  // 外链
  tags: ['AI', '图像', '小程序'],
  color: 'from-pink-400 to-rose-500',
  span: 'md:col-span-3',
}
```

### 4.3 tools.json 更新

```json
{
  "id": "photo-tool",
  "title": "证件照处理工具",
  "description": "智能抠图、背景替换、尺寸调整、体积压缩",
  "url": "https://earthchen.github.io/photo-tools/",
  "icon": "camera",
  "tags": ["图片处理", "AI", "小程序"]
}
```

---

## 5. Web 移动端优化 (在新仓库中实施)

| 优化项 | 具体措施 |
|---|---|
| 触控拖拽 | `CanvasPreview` 增加 touchstart/touchmove/touchend 支持 |
| 双指缩放 | pinch-to-zoom 替代鼠标滚轮 |
| 响应式布局 | 移动端单栏纵向排列 + 面板折叠 |
| 固定底部栏 | 移动端"执行抠图"和"下载"按钮固定底部 |
| 上传适配 | 移动端显示"拍照/相册"提示 |
| 触控目标 | 按钮最小 44px，增加间距 |

---

## 6. 小程序功能范围 (与 Web 版完全一致)

必须实现全部功能，与 Web 版保持特性对等:

- 从相册/相机选择图片
- 本地抠图（颜色容差算法 + 容差滑块调节）
- AI 抠图（全部 AI 提供商: Hugging Face, RemBG, OpenAI 兼容, Remove.bg, Stability AI, Replicate, Clipdrop, PhotoRoom）
- API Key 配置与持久化存储
- OpenAI 兼容 API 预设端点（OpenAI, Azure, DeepSeek, 智谱, 通义, Moonshot, 百川, 硅基流动, 自定义）
- 背景颜色替换（红/蓝/白 + 自定义颜色）
- 尺寸预设选择（全部预设: 标准尺寸、考试报名、证件办理、签证、其他）
- 自定义尺寸 + mm/px 单位切换
- 保持/不保持纵横比选项
- Canvas 实时预览 + 触控拖拽定位 + 双指缩放
- JPEG/PNG 双格式导出
- 压缩控制（开关 + 目标大小设定）
- 双维度递归压缩（质量 → 分辨率）
- 状态面板（尺寸、文件大小、压缩率、质量信息）
- 保存到相册
- 暗色/亮色主题切换
- 配置自动保存与恢复

---

## 7. 实施计划

### Phase 1: 新仓库创建 + 共享层
- [ ] 1.1 创建 GitHub 仓库 `EarthChen/photo-tools`
- [ ] 1.2 初始化 monorepo 结构 (pnpm workspace)
- [ ] 1.3 创建 `shared/` 并提取纯函数和数据
- [ ] 1.4 迁移 Web 版代码到 `web/`，改为独立应用
- [ ] 1.5 Web 版引用 `shared` 包，确保功能正常
- [ ] 1.6 配置 GitHub Actions 部署到 GitHub Pages

### Phase 2: web-tools 清理
- [ ] 2.1 删除 `src/pages/photo-tool/` 目录
- [ ] 2.2 修改 `App.jsx` 移除 photo-tool 路由
- [ ] 2.3 修改 `Home.jsx` photo-tool 卡片改为外链
- [ ] 2.4 更新 `tools.json`
- [ ] 2.5 清理无用依赖

### Phase 3: Web 移动端优化 (新仓库)
- [ ] 3.1 CanvasPreview 触控事件支持
- [ ] 3.2 ImageUploader 移动端适配
- [ ] 3.3 响应式布局 + 面板折叠
- [ ] 3.4 固定底部操作栏

### Phase 4: 小程序开发 (新仓库)
- [ ] 4.1 初始化小程序项目结构
- [ ] 4.2 开发小程序组件
- [ ] 4.3 实现平台适配层 (Canvas/Storage/Network)
- [ ] 4.4 组装主页面
- [ ] 4.5 保存到相册功能

### Phase 5: 验证
- [ ] 5.1 Web 版功能回归
- [ ] 5.2 web-tools 首页链接验证
- [ ] 5.3 小程序真机测试

---

> **请确认此方案，我将开始执行。**
