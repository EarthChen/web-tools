# EarthChen Web Tools

免费、开源、隐私安全的在线工具集合，所有处理均在浏览器本地完成。

## 在线访问

**工具集首页**: https://earthchen.github.io/web-tools/

## 工具列表

| 工具 | 描述 | 路径 |
|------|------|------|
| CSV/Excel 转换工具 | 高性能 CSV/Excel 互转，支持 100MB+ 大文件处理，智能筛选，虚拟滚动 | `/excelcsv-tool` |
| JSON 工具集 | 格式化、压缩、对比、JSONPath 查询、树状视图、历史记录 | `/json-tools` |
| PDF 转 PNG | 免费在线将 PDF 文档转换为高质量 PNG 图片，支持批量下载 | `/pdf2png` |
| 证件照处理工具 | 智能抠图、背景替换、多种标准尺寸预设、精确文件体积控制 | `/photo-tool` |

## 功能特性

- **隐私安全**: 所有文件处理均在浏览器本地完成，不上传服务器
- **响应式设计**: 适配手机/平板/电脑
- **深色模式**: 支持深色/浅色主题切换
- **现代 UI**: 毛玻璃效果、渐变背景

## 技术栈

- React 18
- React Router 7
- Vite 6
- Tailwind CSS 3
- pnpm

## 本地开发

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 构建生产版本
pnpm build

# 预览构建结果
pnpm preview
```

## 项目结构

```
web-tools/
├── src/
│   ├── components/        # 共享组件
│   │   ├── AdBanner.jsx   # 广告组件
│   │   └── Layout.jsx     # 布局组件
│   ├── pages/             # 页面组件
│   │   ├── Home.jsx       # 首页
│   │   ├── excelcsv/      # CSV/Excel 工具
│   │   ├── json-tools/    # JSON 工具集
│   │   ├── pdf2png/       # PDF 转 PNG
│   │   └── photo-tool/    # 证件照工具
│   ├── App.jsx            # 主应用（路由配置）
│   ├── main.jsx           # 入口文件
│   └── index.css          # 全局样式
├── .github/workflows/     # GitHub Actions
│   └── deploy.yml         # 自动部署配置
├── index.html
├── package.json
├── vite.config.js
└── tailwind.config.js
```

## 部署

推送到 `main` 分支后，GitHub Actions 会自动构建并部署到 GitHub Pages。

## License

MIT
