/**
 * 广告横幅组件
 * 支持 Google AdSense 和其他广告平台
 */

import { useState, useEffect, useCallback } from 'react';

// Google AdSense 配置
// 请在 .env 文件或构建时设置这些环境变量
const ADSENSE_CONFIG = {
  // AdSense 客户端 ID (格式: ca-pub-xxxxxxxxxxxxxxxx)
  clientId: import.meta.env.VITE_ADSENSE_CLIENT_ID || '',
  
  // 各广告位的 slot ID
  slots: {
    popup: import.meta.env.VITE_ADSENSE_SLOT_POPUP || '',
    sidebar: import.meta.env.VITE_ADSENSE_SLOT_SIDEBAR || '',
    bottomBanner: import.meta.env.VITE_ADSENSE_SLOT_BOTTOM || '',
    inline: import.meta.env.VITE_ADSENSE_SLOT_INLINE || '',
  },
};

// 广告配置 - 在此处配置广告行为
const AD_CONFIG = {
  // 是否启用广告（当有 AdSense ID 时自动启用）
  enabled: !!ADSENSE_CONFIG.clientId,
  
  // 弹窗广告配置
  popup: {
    enabled: true,
    delay: 5000, // 延迟显示时间（毫秒）
    frequency: 'session', // 'once' | 'session' | 'always'
  },
  
  // 侧边栏广告配置
  sidebar: {
    enabled: true,
  },
  
  // 底部横幅广告配置
  bottomBanner: {
    enabled: true,
  },
};

/**
 * 加载 AdSense 脚本
 */
function loadAdSenseScript() {
  if (!ADSENSE_CONFIG.clientId) return;
  
  // 检查是否已加载
  if (document.querySelector('script[src*="adsbygoogle"]')) return;
  
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CONFIG.clientId}`;
  script.crossOrigin = 'anonymous';
  document.head.appendChild(script);
}

/**
 * 初始化广告单元
 */
function initAdUnit() {
  try {
    (window.adsbygoogle = window.adsbygoogle || []).push({});
  } catch (e) {
    console.warn('AdSense init failed:', e);
  }
}

/**
 * 弹窗广告组件
 */
export function PopupAd() {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [countdown, setCountdown] = useState(5);
  
  useEffect(() => {
    if (!AD_CONFIG.popup.enabled) return;
    
    // 检查是否已经显示过
    const hasShown = sessionStorage.getItem('popup_ad_shown');
    if (AD_CONFIG.popup.frequency === 'once' && localStorage.getItem('popup_ad_shown')) return;
    if (AD_CONFIG.popup.frequency === 'session' && hasShown) return;
    
    const timer = setTimeout(() => {
      setShow(true);
      sessionStorage.setItem('popup_ad_shown', 'true');
      if (AD_CONFIG.popup.frequency === 'once') {
        localStorage.setItem('popup_ad_shown', 'true');
      }
      loadAdSenseScript();
      setTimeout(initAdUnit, 100);
    }, AD_CONFIG.popup.delay);
    
    return () => clearTimeout(timer);
  }, []);
  
  // 倒计时
  useEffect(() => {
    if (!show || countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown(c => c - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [show, countdown]);
  
  const handleClose = useCallback(() => {
    setShow(false);
    setDismissed(true);
  }, []);
  
  if (!show || dismissed) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        {/* 关闭按钮 */}
        <button
          onClick={handleClose}
          disabled={countdown > 0}
          className={`absolute top-2 right-2 p-1 z-10 ${
            countdown > 0 
              ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed' 
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          {countdown > 0 ? (
            <span className="text-xs">{countdown}s</span>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
        </button>
        
        {/* 广告内容区域 */}
        <div className="p-6">
          <div className="text-center mb-4">
            <span className="inline-block px-2 py-0.5 text-xs bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400 rounded">
              广告
            </span>
          </div>
          
          {/* AdSense 广告单元 */}
          {ADSENSE_CONFIG.clientId && ADSENSE_CONFIG.slots.popup ? (
            <ins
              className="adsbygoogle"
              style={{ display: 'block', minHeight: '250px' }}
              data-ad-client={ADSENSE_CONFIG.clientId}
              data-ad-slot={ADSENSE_CONFIG.slots.popup}
              data-ad-format="auto"
              data-full-width-responsive="true"
            />
          ) : (
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-8 text-center min-h-[200px] flex flex-col items-center justify-center">
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                广告位招租
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                设置 VITE_ADSENSE_CLIENT_ID 启用 AdSense
              </p>
            </div>
          )}
        </div>
        
        <div className="px-6 pb-4 text-center">
          <button
            onClick={handleClose}
            disabled={countdown > 0}
            className={`text-sm ${
              countdown > 0 
                ? 'text-gray-300 dark:text-gray-600' 
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            {countdown > 0 ? `${countdown}秒后可关闭` : '关闭广告'}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * 侧边栏广告组件
 */
export function SidebarAd({ position = 'right' }) {
  useEffect(() => {
    if (AD_CONFIG.sidebar.enabled) {
      loadAdSenseScript();
      setTimeout(initAdUnit, 100);
    }
  }, []);
  
  if (!AD_CONFIG.sidebar.enabled) return null;
  
  const positionClass = position === 'left' ? 'left-0' : 'right-0';
  
  return (
    <div className={`fixed ${positionClass} top-1/2 -translate-y-1/2 z-40 hidden xl:block`}>
      <div className="w-[160px] bg-white dark:bg-gray-800 shadow-lg rounded-l-lg overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="p-2 text-center text-xs text-gray-400 dark:text-gray-500 border-b border-gray-200 dark:border-gray-700">
          广告
        </div>
        
        {/* AdSense 广告单元 */}
        <div className="bg-gray-50 dark:bg-gray-700 p-2 min-h-[600px]">
          {ADSENSE_CONFIG.clientId && ADSENSE_CONFIG.slots.sidebar ? (
            <ins
              className="adsbygoogle"
              style={{ display: 'block', width: '160px', height: '600px' }}
              data-ad-client={ADSENSE_CONFIG.clientId}
              data-ad-slot={ADSENSE_CONFIG.slots.sidebar}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
                侧边广告位<br/>160x600
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * 底部横幅广告组件
 */
export function BottomBannerAd() {
  const [dismissed, setDismissed] = useState(false);
  
  useEffect(() => {
    if (AD_CONFIG.bottomBanner.enabled) {
      loadAdSenseScript();
      setTimeout(initAdUnit, 100);
    }
  }, []);
  
  if (!AD_CONFIG.bottomBanner.enabled || dismissed) return null;
  
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-800 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] border-t border-gray-200 dark:border-gray-700">
      <div className="max-w-4xl mx-auto px-4 py-2 flex items-center justify-between">
        {/* AdSense 广告单元 */}
        <div className="flex-1 mr-4 min-h-[90px]">
          {ADSENSE_CONFIG.clientId && ADSENSE_CONFIG.slots.bottomBanner ? (
            <ins
              className="adsbygoogle"
              style={{ display: 'block', height: '90px' }}
              data-ad-client={ADSENSE_CONFIG.clientId}
              data-ad-slot={ADSENSE_CONFIG.slots.bottomBanner}
              data-ad-format="horizontal"
              data-full-width-responsive="true"
            />
          ) : (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 h-full flex items-center justify-center">
              <p className="text-sm text-gray-400 dark:text-gray-500">
                底部横幅广告位 (728x90)
              </p>
            </div>
          )}
        </div>
        
        {/* 关闭按钮 */}
        <button
          onClick={() => setDismissed(true)}
          className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

/**
 * 文章内嵌广告组件
 */
export function InlineAd() {
  if (!AD_CONFIG.enabled) return null;
  
  return (
    <div className="my-4 bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
      <div className="text-center text-xs text-gray-400 dark:text-gray-500 mb-2">
        广告
      </div>
      <div 
        className="bg-white dark:bg-gray-700 rounded p-6 text-center"
        id="inline-ad"
      >
        <p className="text-sm text-gray-400 dark:text-gray-500">
          内嵌广告位
        </p>
      </div>
    </div>
  );
}

/**
 * 广告管理组件 - 统一管理所有广告
 */
export function AdManager() {
  return (
    <>
      <PopupAd />
      <SidebarAd position="right" />
      <BottomBannerAd />
    </>
  );
}
