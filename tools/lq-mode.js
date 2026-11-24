/*
 * 乐启享本地版运行模式。
 *
 * 这个站点只保留一条主线：看目录 → 在线使用 → 下载。
 * 线上那套购买 / 试看计时 / 投稿 / 退款 / 财务结算机制在本地版一律不开放，
 * 所以这里把相关路由与按钮直接挡掉，避免误触后又跳回要付费的流程。
 */
(function () {
  'use strict';

  /* 这些页面在本地版没有意义，访问时统一回课件库。 */
  var BLOCKED_PAGES = [
    'purchases', 'library', 'creator', 'moderation', 'market', 'seller',
    'refunds', 'refund-admin', 'admin', 'owner-login', 'checkout',
    'orders', 'order', 'finance', 'settlement', 'trial',
    'feedback-admin', 'account-safety', 'bulk-download-admin'
  ];
  /* 这些操作属于交易 / 投稿 / 售后，本地版不提供。 */
  var BLOCKED_ACTIONS = [
    'purchase', 'buy', 'checkout', 'pay', 'order', 'library', 'admin',
    'refunds', 'refund-admin', 'refund-record', 'creator', 'creator-preview',
    'publish', 'contribute', 'settlement', 'finance', 'owner-login',
    'feedback-admin', 'account-safety'
  ];
  /* 本地版没有账号，也不需要账号。 */
  var BLOCKED_LOGIN_ACTIONS = [
    'login', 'logout', 'register', 'recover', 'account', 'phone-login',
    'phone-bind', 'phone-rebind', 'owner-recover'
  ];

  function page() {
    return (location.hash.replace(/^#/, '').split('/')[0] || 'works').toLowerCase();
  }

  function hint(text) {
    var box = document.createElement('div');
    box.className = 'lq-mode-note';
    box.setAttribute('role', 'status');
    box.textContent = text;
    box.style.cssText = [
      'position:fixed', 'left:50%', 'bottom:32px', 'transform:translateX(-50%)',
      'z-index:9999', 'padding:12px 20px', 'border-radius:8px',
      'background:#1f2430', 'color:#fff', 'font:500 15px/1.5 system-ui,sans-serif',
      'box-shadow:0 8px 24px rgba(0,0,0,.28)', 'pointer-events:none',
      'opacity:0', 'transition:opacity .18s ease'
    ].join(';');
    document.body.appendChild(box);
    requestAnimationFrame(function () { box.style.opacity = '1'; });
    setTimeout(function () {
      box.style.opacity = '0';
      setTimeout(function () { box.remove(); }, 220);
    }, 2200);
  }

  /* 初始化：早于 app.js 的模块脚本执行，保证它读到的已经是干净的路由。 */
  if (BLOCKED_PAGES.indexOf(page()) >= 0) {
    history.replaceState(null, '', '#catalog');
  }

  window.addEventListener('hashchange', function () {
    if (BLOCKED_PAGES.indexOf(page()) < 0) return;
    history.replaceState(null, '', '#catalog');
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });

  document.addEventListener('click', function (event) {
    var node = event.target.closest ? event.target.closest('[data-action]') : null;
    if (!node) return;
    var action = (node.getAttribute('data-action') || '').toLowerCase();
    if (BLOCKED_LOGIN_ACTIONS.indexOf(action) >= 0) {
      event.preventDefault();
      event.stopPropagation();
      hint('本地版无需登录，课件可直接在线使用或下载。');
      return;
    }
    if (BLOCKED_ACTIONS.indexOf(action) < 0) return;
    event.preventDefault();
    event.stopPropagation();
    hint('本地版不提供购买 / 投稿 / 售后功能，课件可直接在线使用或下载。');
  }, true);
})();
