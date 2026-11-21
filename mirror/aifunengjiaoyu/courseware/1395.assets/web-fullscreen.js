/* Use the course's existing control; keep the lesson and its exercises together. */
(function () {
  'use strict';
  const current = () => document.fullscreenElement || document.webkitFullscreenElement;
  async function toggle() {
    if (current()) {
      const exit = document.exitFullscreen || document.webkitExitFullscreen;
      if (exit) await exit.call(document);
    } else {
      const root = document.documentElement;
      const enter = root.requestFullscreen || root.webkitRequestFullscreen;
      if (!enter) throw Error('浏览器不支持课件全屏');
      await enter.call(root);
    }
  }
  function label() {
    const button = document.getElementById('fullscreen');
    if (button) {
      button.textContent = current() ? '退出全屏' : '全屏';
      button.setAttribute('aria-pressed', String(Boolean(current())));
    }
  }
  document.addEventListener('click', function (event) {
    const button = event.target.closest?.('#fullscreen, #fullscreen-exit');
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    toggle().then(label).catch(() => {
      button.textContent = '全屏未开启，请重试';
      button.title = '也可以使用浏览器的全屏功能。';
    });
  }, true);
  document.addEventListener('fullscreenchange', label);
  document.addEventListener('webkitfullscreenchange', label);
  document.addEventListener('DOMContentLoaded', label);
})();
