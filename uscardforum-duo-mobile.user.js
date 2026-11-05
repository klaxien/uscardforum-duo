// ==UserScript==
// @name         美卡论坛 Duo 内屏竖屏手机布局
// @namespace    local.uscardforum.duo
// @version      3.1.2
// @homepageURL  https://github.com/klaxien/uscardforum-duo
// @updateURL    https://raw.githubusercontent.com/klaxien/uscardforum-duo/main/uscardforum-duo-mobile.meta.js
// @downloadURL  https://raw.githubusercontent.com/klaxien/uscardforum-duo/main/uscardforum-duo-mobile.user.js
// @description  仅调整内屏竖屏的 JS/CSS 手机断点，保持真实视口与缩放。
// @match        https://www.uscardforum.com/*
// @match        https://uscardforum.com/*
// @run-at       document-start
// @inject-into  page
// @grant        none
// @noframes
// ==/UserScript==

(() => {
  'use strict';

  const screenDimensions = [screen.width, screen.height].sort((left, right) => left - right);
  const isTestedDuo = /iPhone/.test(navigator.userAgent)
    && devicePixelRatio === 3
    && screenDimensions[0] === 466 && screenDimensions[1] === 678;
  if (!isTestedDuo || window.top !== window.self) return;

  // 仅实测内屏竖屏 669 CSS px 改用手机断点。
  // 外屏、横屏以及其他窗口宽度仍计算原始条件。
  const INNER_PORTRAIT_QUERY = '(width: 669px)';
  const originalMatchMedia = window.matchMedia.bind(window);

  // 只给内屏竖屏的现有内容容器留白，不改变视口、字号或弹层宽度。
  const CONTENT_SIDE_PADDING_PX = 32;
  function addContentSpacing() {
    const spacingStyle = document.createElement('style');
    spacingStyle.textContent = `
      @media ${INNER_PORTRAIT_QUERY} {
        #main-outlet-wrapper.wrap {
          box-sizing: border-box;
          padding-inline: ${CONTENT_SIDE_PADDING_PX}px !important;
        }
      }
    `;
    document.head.append(spacingStyle);
  }
  if (document.head) addContentSpacing();
  else document.addEventListener('DOMContentLoaded', addContentSpacing, { once: true });

  function adjustMobileBreakpoint(query) {
    return query.replace(/\([^()]*\)/g, condition => {
      if (!/\bwidth\b/i.test(condition) || !/\b(?:40rem|640px)\b/i.test(condition)) {
        return condition;
      }
      const portraitCondition = condition.replace(/\b40rem\b/gi, '44rem')
        .replace(/\b640px\b/gi, '704px');
      return `((${condition} and (not ${INNER_PORTRAIT_QUERY})) or (${portraitCondition} and ${INNER_PORTRAIT_QUERY}))`;
    });
  }

  // 必须在论坛初始化之前安装。返回真正的 MediaQueryList，保留浏览器
  // 自己的 change 事件；旋转时论坛会正常重新渲染，不伪造 innerWidth。
  window.matchMedia = function matchMedia(query) {
    return originalMatchMedia(adjustMobileBreakpoint(String(query)));
  };

  const processedStylesheets = new WeakSet();

  function makeResourceURLsAbsolute(css, stylesheetURL) {
    return css.replace(/url\(\s*(['"]?)([^'"()]+)\1\s*\)/gi, (original, quote, resourceURL) => {
      if (/^(?:data:|blob:|#)/i.test(resourceURL.trim())) return original;
      return `url("${new URL(resourceURL.trim(), stylesheetURL).href}")`;
    });
  }

  async function adjustStylesheet(stylesheetLink) {
    if (processedStylesheets.has(stylesheetLink)) return;
    const stylesheetURL = new URL(stylesheetLink.href, location.href);
    // 只处理论坛样式，不处理广告或第三方字体。
    if (!/(^|\.)uscardforum\.com$/.test(stylesheetURL.hostname)
      || !stylesheetURL.pathname.startsWith('/stylesheets/')) return;
    processedStylesheets.add(stylesheetLink);

    try {
      const response = await fetch(stylesheetURL.href);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const originalCSS = await response.text();
      const adjustedCSS = originalCSS.replace(/@media\s*([^{}]+)\{/gi,
        (original, query) => `@media ${adjustMobileBreakpoint(query)}{`);
      const originalMedia = stylesheetLink.media;
      const adjustedMedia = adjustMobileBreakpoint(originalMedia);
      if (adjustedCSS === originalCSS && adjustedMedia === originalMedia) return;
      if (!stylesheetLink.isConnected) return;

      // 保持原来的层叠顺序及全部声明，只替换媒体查询条件。
      // CDN 样式不可直接写 cssRules，因此使用本地副本。
      const stylesheetCopy = document.createElement('style');
      stylesheetCopy.dataset.duoBreakpoint = stylesheetURL.pathname;
      stylesheetCopy.media = adjustedMedia;
      stylesheetCopy.textContent = makeResourceURLsAbsolute(adjustedCSS, stylesheetURL);
      stylesheetLink.after(stylesheetCopy);
      stylesheetLink.disabled = true;
    } catch (error) {
      // 读取失败时保留原样式，避免页面丢失样式；控制台明确报告。
      console.warn('[Duo mobile breakpoint] 样式处理失败', stylesheetURL.href, error);
    }
  }

  function scanStylesheets() {
    document.querySelectorAll('link[rel="stylesheet"][href]').forEach(adjustStylesheet);
  }

  // 支持解析过程中和论坛后续加载的样式表，不观察帖子内容变化。
  const stylesheetObserver = new MutationObserver(records => {
    if (records.some(record => [...record.addedNodes].some(node =>
      node.nodeType === 1 && (node.matches('link[rel="stylesheet"]')
        || node.querySelector('link[rel="stylesheet"]'))))) scanStylesheets();
  });
  stylesheetObserver.observe(document, { childList: true, subtree: true });
  scanStylesheets();
})();
