/**
 * 万能证件照在线处理工具
 * 主应用组件
 */

import { useEffect, useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { useImageEditor } from './hooks/useImageEditor';
import {
  ImageUploader,
  CanvasPreview,
  BackgroundSelector,
  SizePresetSelector,
  CompressionController,
  APIConfig,
  StatusPanel,
  ThemeToggle,
} from './components';
import { AdManager } from '@/components/AdBanner';

function App() {
  const editor = useImageEditor();
  const [tolerance, setTolerance] = useState(30);
  
  // 当相关参数变化时更新预览
  useEffect(() => {
    if (editor.processedImage && editor.previewCanvasRef.current) {
      editor.updatePreview();
    }
  }, [
    editor.processedImage,
    editor.backgroundColor,
    editor.sizePreset,
    editor.customWidth,
    editor.customHeight,
    editor.unit,
    editor.offsetX,
    editor.offsetY,
    editor.scale,
    editor.updatePreview,
    editor.previewCanvasRef,
  ]);
  
  // 处理抠图
  const handleCutout = useCallback(() => {
    editor.performCutout(tolerance);
  }, [editor, tolerance]);
  
  // 处理导出预览（更新文件大小信息）
  const handlePreviewExport = useCallback(async () => {
    await editor.exportImage();
  }, [editor]);
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* 顶部导航 */}
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" 
                  />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" 
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                  证件照处理工具
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  智能抠图 · 背景替换 · 尺寸调整 · 体积压缩
                </p>
              </div>
            </Link>
          </div>
          
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors text-sm"
            >
              返回首页
            </Link>
            <a
              href="https://github.com/EarthChen/web-tools"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
            </a>
            <ThemeToggle />
          </div>
        </div>
      </header>
      
      {/* 主内容区 */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* 左侧面板 - 参数设置 */}
          <aside className="lg:col-span-3 space-y-6">
            {/* 图片上传 */}
            <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
              <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                上传图片
              </h2>
              <ImageUploader 
                onUpload={editor.uploadImage}
                disabled={editor.isLoading}
              />
              
              {editor.originalImage && (
                <div className="mt-3 space-y-3">
                  {/* 抠图设置 */}
                  <div>
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                      本地抠图容差: {tolerance}
                    </label>
                    <input
                      type="range"
                      min={5}
                      max={100}
                      value={tolerance}
                      onChange={(e) => setTolerance(parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                    />
                  </div>
                  
                  <button
                    onClick={handleCutout}
                    disabled={editor.isLoading}
                    className="
                      w-full py-2 px-4 text-sm font-medium rounded-lg
                      bg-blue-500 hover:bg-blue-600 text-white
                      disabled:opacity-50 disabled:cursor-not-allowed
                      transition-colors
                    "
                  >
                    {editor.isLoading ? '处理中...' : '执行抠图'}
                  </button>
                </div>
              )}
            </section>
            
            {/* API 配置 */}
            <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
              <APIConfig
                apiKey={editor.apiKey}
                useAPI={editor.useAPI}
                providerId={editor.aiProvider}
                apiOptions={editor.apiOptions}
                onChange={editor.setAPIConfig}
                onProviderChange={editor.setAIProvider}
                onOptionsChange={editor.setAPIOptions}
              />
            </section>
            
            {/* 背景颜色 */}
            <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
              <BackgroundSelector
                value={editor.backgroundColor}
                onChange={editor.setBackgroundColor}
              />
              {/* 抠图状态提示 */}
              {editor.originalImage && !editor.hasCutout && (
                <div className="mt-3 p-2 bg-amber-50 dark:bg-amber-900/20 rounded text-xs text-amber-700 dark:text-amber-300">
                  提示：请先执行抠图，才能看到背景颜色替换效果
                </div>
              )}
              {editor.hasCutout && (
                <div className="mt-3 p-2 bg-green-50 dark:bg-green-900/20 rounded text-xs text-green-700 dark:text-green-300">
                  已完成抠图，可以切换背景颜色
                </div>
              )}
            </section>
            
            {/* 尺寸设置 */}
            <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
              <SizePresetSelector
                preset={editor.sizePreset}
                onPresetChange={editor.setSizePreset}
                customWidth={editor.customWidth}
                customHeight={editor.customHeight}
                onCustomSizeChange={editor.setCustomSize}
                unit={editor.unit}
                onUnitChange={editor.setUnit}
                keepAspectRatio={editor.keepAspectRatio}
                onKeepAspectRatioChange={editor.setKeepAspectRatio}
              />
            </section>
          </aside>
          
          {/* 中间区域 - Canvas 预览 */}
          <section className="lg:col-span-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 min-h-[500px]">
            <CanvasPreview
              canvasRef={editor.previewCanvasRef}
              processedImage={editor.processedImage}
              backgroundColor={editor.backgroundColor}
              sizePreset={editor.sizePreset}
              customWidth={editor.customWidth}
              customHeight={editor.customHeight}
              unit={editor.unit}
              offsetX={editor.offsetX}
              offsetY={editor.offsetY}
              scale={editor.scale}
              onOffsetChange={editor.setOffset}
              onScaleChange={editor.setScale}
            />
          </section>
          
          {/* 右侧面板 - 状态与导出 */}
          <aside className="lg:col-span-3 space-y-6">
            {/* 压缩控制 */}
            <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
              <CompressionController
                enabled={editor.enableCompression}
                targetSizeKB={editor.targetSizeKB}
                outputFormat={editor.outputFormat}
                onEnabledChange={(enabled) => editor.setCompression(editor.targetSizeKB, enabled)}
                onTargetSizeChange={(size) => editor.setCompression(size, editor.enableCompression)}
                onFormatChange={editor.setOutputFormat}
                currentFileSize={editor.currentFileSize}
                compressionRatio={editor.compressionRatio}
                quality={editor.quality}
              />
            </section>
            
            {/* 状态面板 */}
            <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
              <StatusPanel
                hasImage={!!editor.processedImage}
                actualWidth={editor.actualWidth}
                actualHeight={editor.actualHeight}
                currentFileSize={editor.currentFileSize}
                compressionRatio={editor.compressionRatio}
                quality={editor.quality}
                scale={editor.scale}
                offsetX={editor.offsetX}
                offsetY={editor.offsetY}
                enableCompression={editor.enableCompression}
                targetSizeKB={editor.targetSizeKB}
                outputFormat={editor.outputFormat}
              />
            </section>
            
            {/* 操作按钮 */}
            <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 space-y-3">
              <button
                onClick={handlePreviewExport}
                disabled={!editor.processedImage || editor.isLoading}
                className="
                  w-full py-2 px-4 text-sm font-medium rounded-lg
                  bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600
                  text-gray-700 dark:text-gray-200
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-colors
                "
              >
                预览导出效果
              </button>
              
              <button
                onClick={editor.downloadImage}
                disabled={!editor.processedImage || editor.isLoading}
                className="
                  w-full py-2.5 px-4 text-sm font-medium rounded-lg
                  bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700
                  text-white shadow-lg
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-all
                "
              >
                {editor.isLoading ? '处理中...' : '下载证件照'}
              </button>
              
              <button
                onClick={editor.reset}
                className="
                  w-full py-2 px-4 text-sm font-medium rounded-lg
                  text-gray-500 dark:text-gray-400
                  hover:bg-gray-100 dark:hover:bg-gray-700
                  transition-colors
                "
              >
                重新开始
              </button>
            </section>
          </aside>
        </div>
        
        {/* 错误提示 */}
        {editor.error && (
          <div className="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-3 rounded-lg shadow-lg max-w-sm">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                />
              </svg>
              <div>
                <p className="text-sm font-medium">处理失败</p>
                <p className="text-xs opacity-90 mt-0.5">{editor.error}</p>
              </div>
              <button
                onClick={() => editor.updateState({ error: null })}
                className="flex-shrink-0 hover:opacity-70"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </main>
      
      {/* 页脚 */}
      <footer className="mt-8 py-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-center text-sm text-gray-400 dark:text-gray-500">
          &copy; {new Date().getFullYear()} EarthChen. All rights reserved.
        </p>
      </footer>
      
      {/* 广告管理 */}
      <AdManager />
    </div>
  );
}

export default App;
