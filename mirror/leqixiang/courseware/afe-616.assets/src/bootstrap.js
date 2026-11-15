(function bootstrapClassicTalks() {
  const bootstrapScript = document.currentScript;

  if (window.location.protocol === 'file:') {
    document.documentElement.dataset.appError = 'local-server-required';
    const notice = document.createElement('section');
    notice.className = 'protocol-notice';
    notice.setAttribute('role', 'alert');
    notice.innerHTML = `
      <div class="protocol-notice__panel">
        <p class="protocol-notice__eyebrow">启动方式提示</p>
        <h2>请通过本地服务器打开立体书</h2>
        <p>Three.js 使用浏览器模块与本地题库。直接双击 HTML 会被浏览器的安全策略拦截。</p>
        <ol>
          <li>关闭当前页面。</li>
          <li>双击项目根目录中的 <strong>start-game.cmd</strong>。</li>
          <li>浏览器将自动打开 <strong>http://127.0.0.1:4173/</strong>。</li>
        </ol>
        <p class="protocol-notice__fallback">也可以在项目目录运行：<code>py -m http.server 4173</code></p>
      </div>`;
    document.body.append(notice);
    return;
  }

  const moduleScript = document.createElement('script');
  moduleScript.type = 'module';
  moduleScript.src = new URL('./main.js?v=65', bootstrapScript.src).href;
  moduleScript.addEventListener('error', () => {
    document.documentElement.dataset.appError = 'main-module-load-failed';
  });
  document.body.append(moduleScript);
})();
