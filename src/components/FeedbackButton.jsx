/**
 * 反馈按钮组件
 * 提供多种反馈渠道
 */

import { useState, useCallback } from 'react';

const GITHUB_REPO = 'EarthChen/web-tools';

export function FeedbackButton() {
  const [showPanel, setShowPanel] = useState(false);
  
  const handleSubmitIssue = useCallback(() => {
    const issueUrl = `https://github.com/${GITHUB_REPO}/issues/new?template=feedback.md&title=${encodeURIComponent('[反馈] ')}&labels=feedback`;
    window.open(issueUrl, '_blank');
  }, []);
  
  const handleReportBug = useCallback(() => {
    const issueUrl = `https://github.com/${GITHUB_REPO}/issues/new?template=bug_report.md&title=${encodeURIComponent('[Bug] ')}&labels=bug`;
    window.open(issueUrl, '_blank');
  }, []);
  
  const handleFeatureRequest = useCallback(() => {
    const issueUrl = `https://github.com/${GITHUB_REPO}/issues/new?template=feature_request.md&title=${encodeURIComponent('[功能建议] ')}&labels=enhancement`;
    window.open(issueUrl, '_blank');
  }, []);
  
  const handleViewIssues = useCallback(() => {
    window.open(`https://github.com/${GITHUB_REPO}/issues`, '_blank');
  }, []);
  
  return (
    <div className="relative">
      {/* 浮动反馈按钮 */}
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="
          fixed bottom-6 right-6 z-50
          w-14 h-14 rounded-full
          bg-gradient-to-r from-blue-500 to-purple-600
          hover:from-blue-600 hover:to-purple-700
          text-white shadow-lg
          flex items-center justify-center
          transition-all duration-300
          hover:scale-110
        "
        title="反馈建议"
      >
        {showPanel ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" 
            />
          </svg>
        )}
      </button>
      
      {/* 反馈面板 */}
      {showPanel && (
        <div className="
          fixed bottom-24 right-6 z-50
          w-72 bg-white dark:bg-gray-800 
          rounded-xl shadow-2xl
          border border-gray-200 dark:border-gray-700
          overflow-hidden
          animate-in slide-in-from-bottom-5 duration-300
        ">
          {/* 标题 */}
          <div className="px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white">
            <h3 className="font-medium">反馈与建议</h3>
            <p className="text-xs opacity-90">您的反馈帮助我们做得更好</p>
          </div>
          
          {/* 反馈选项 */}
          <div className="p-3 space-y-2">
            <button
              onClick={handleFeatureRequest}
              className="
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                text-left text-sm
                bg-gray-50 dark:bg-gray-700
                hover:bg-gray-100 dark:hover:bg-gray-600
                transition-colors
              "
            >
              <span className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </span>
              <div>
                <div className="font-medium text-gray-900 dark:text-gray-100">功能建议</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">提出新功能想法</div>
              </div>
            </button>
            
            <button
              onClick={handleReportBug}
              className="
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                text-left text-sm
                bg-gray-50 dark:bg-gray-700
                hover:bg-gray-100 dark:hover:bg-gray-600
                transition-colors
              "
            >
              <span className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
                <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </span>
              <div>
                <div className="font-medium text-gray-900 dark:text-gray-100">报告问题</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">报告 Bug 或错误</div>
              </div>
            </button>
            
            <button
              onClick={handleSubmitIssue}
              className="
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                text-left text-sm
                bg-gray-50 dark:bg-gray-700
                hover:bg-gray-100 dark:hover:bg-gray-600
                transition-colors
              "
            >
              <span className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
              </span>
              <div>
                <div className="font-medium text-gray-900 dark:text-gray-100">一般反馈</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">其他意见或建议</div>
              </div>
            </button>
          </div>
          
          {/* 底部链接 */}
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleViewIssues}
              className="
                w-full flex items-center justify-center gap-2
                text-sm text-gray-600 dark:text-gray-400
                hover:text-blue-500 dark:hover:text-blue-400
                transition-colors
              "
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              查看所有反馈
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
