import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'

// 处理 GitHub Pages SPA 404 重定向
const handleRedirect = () => {
  const params = new URLSearchParams(window.location.search)
  const redirect = params.get('redirect')
  if (redirect) {
    // 从重定向参数中恢复原始路径
    const decodedPath = decodeURIComponent(redirect)
    // 移除 /web-tools 前缀（如果存在）
    const path = decodedPath.replace(/^\/web-tools/, '') || '/'
    window.history.replaceState(null, '', '/web-tools' + path)
  }
}

handleRedirect()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter basename="/web-tools">
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
