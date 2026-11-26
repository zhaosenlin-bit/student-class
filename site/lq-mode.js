/*
 * 乐启享课件库的运行方式。
 *
 * 这个站点只有一条主线：看目录 → 在线使用 → 下载。
 * 站点里没有账号、没有交易、没有投稿，也没有后台。
 * 所以指向上面这些地方的入口一律不放行：路由回到课件目录，
 * 按钮给一句说明，然后把人送回该去的地方。
 */
(function () {
  'use strict';

  /* 站点里真正存在的页面。只有这几个，其余路由一律回目录。 */
  var PAGES = ['works', 'catalog', 'teachers', 'course', 'play', 'classroom'];

  /* 需要账号才有的操作。这里没有账号，点到就说明一句。 */
  var ACCOUNT_ACTIONS = [
    'login', 'logout', 'register', 'recover', 'account'
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
  if (PAGES.indexOf(page()) < 0) {
    history.replaceState(null, '', '#catalog');
  }

  window.addEventListener('hashchange', function () {
    if (PAGES.indexOf(page()) >= 0) return;
    history.replaceState(null, '', '#catalog');
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });

  document.addEventListener('click', function (event) {
    var node = event.target.closest ? event.target.closest('[data-action]') : null;
    if (!node) return;
    var action = (node.getAttribute('data-action') || '').toLowerCase();
    if (ACCOUNT_ACTIONS.indexOf(action) < 0) return;
    event.preventDefault();
    event.stopPropagation();
    hint('这里不需要账号，课件可直接在线使用或下载。');
  }, true);
})();
