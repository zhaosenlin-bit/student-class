/*
 * Xiaobai Education content guard. Local, best-effort interface protection.
 * Embedded-tool state checks reference disable-devtool's DebugLib detector:
 * https://github.com/theajack/disable-devtool/blob/master/src/detector/sub-detector/debug-lib.ts
 * Viewport size, zoom, browser sidebars and keyboard changes are not inspected.
 *
 * Upstream license: The MIT License (MIT), Copyright (c) 2019 - present
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
(function () {
  'use strict';
  var MARK = '__xiaobaiContentGuardV1__';
  var MESSAGE = 'xiaobai:content-guard';
  var POLL_MS = 2500;

  function install(win) {
    var doc;
    try { doc = win.document; if (!doc || !doc.documentElement) return; } catch (_) { return; }
    try { if (win[MARK] && win[MARK].document === doc) return; } catch (_) { return; }
    var state = { document: doc, version: 1 };
    try { Object.defineProperty(win, MARK, { value: state, configurable: true }); } catch (_) { win[MARK] = state; }
    var children = [], observer = null, pollTimer = null, scanTimer = null;
    var blocked = false, stopped = false, layer = null, checkButton = null, returnButton = null, previousFocus = null;
    var courseId = '';
    try { courseId = doc.currentScript && doc.currentScript.getAttribute('data-course-id') || ''; } catch (_) {}
    if (!/^[a-z0-9-]{1,100}$/.test(courseId)) courseId = '';
    doc.documentElement.setAttribute('data-content-guard', 'ready');

    function embedded() { try { return win.parent !== win; } catch (_) { return false; } }
    function notify(value, reason) {
      if (!embedded()) return;
      var message = { type: MESSAGE, version: 1, state: value, reason: reason || 'embedded-debug-tool' };
      if (courseId) message.courseId = courseId;
      try { win.parent.postMessage(message, '*'); } catch (_) {}
    }
    function cancel(event) {
      if (event.preventDefault) event.preventDefault();
      if (event.stopImmediatePropagation) event.stopImmediatePropagation();
      else if (event.stopPropagation) event.stopPropagation();
      event.returnValue = false;
    }
    function keyOf(event) {
      var key = String(event.key || '').toLowerCase();
      if (key && key !== 'unidentified' && key !== 'process') return key;
      var code = event.keyCode || event.which;
      if (code === 123) return 'f12';
      if (code === 116) return 'f5';
      if (code === 122) return 'f11';
      if (code === 9) return 'tab';
      return code ? String.fromCharCode(code).toLowerCase() : String(event.code || '').replace(/^Key/, '').toLowerCase();
    }
    function protectedShortcut(key, event) {
      var command = event.ctrlKey || event.metaKey;
      return key === 'f12' || command && (key === 'u' || key === 's') ||
        event.ctrlKey && event.shiftKey && /^(i|j|k|c)$/.test(key) ||
        event.metaKey && event.altKey && /^(i|j|k|c|u)$/.test(key);
    }
    function keydown(event) {
      var key = keyOf(event), command = event.ctrlKey || event.metaKey;
      // IMEs and non-Latin keyboard layouts can report Process or a localized
      // event.key while the browser still responds to the physical shortcut.
      var physicalKey = String(event.code || '').replace(/^Key/, '').toLowerCase();
      var forbidden = protectedShortcut(key, event) || protectedShortcut(physicalKey, event);
      if (forbidden) { cancel(event); return; }
      if (!blocked || !layer) return;
      if (key === 'f5' || key === 'f11' || command && key === 'r') return;
      if (key === 'tab') {
        cancel(event);
        (doc.activeElement === checkButton ? returnButton : checkButton).focus();
      } else if (!layer.contains(event.target)) cancel(event);
    }
    function editable(target) {
      var node = target && target.nodeType === 3 ? target.parentElement : target;
      while (node && node !== doc) {
        var tag = String(node.tagName || '').toLowerCase(), attr;
        if (tag === 'input' || tag === 'textarea' || tag === 'select' || node.isContentEditable === true) return true;
        try { attr = node.getAttribute && node.getAttribute('contenteditable'); } catch (_) {}
        if (attr === '' || attr === 'true' || attr === 'plaintext-only') return true;
        node = node.parentElement;
      }
      return false;
    }
    function contextmenu(event) {
      if (editable(event.target)) return;
      // Keep application context-menu handlers (for example CircuitJS editing)
      // while suppressing only the browser's native context menu.
      if (event.preventDefault) event.preventDefault();
      event.returnValue = false;
    }
    var htmlBlobUrls = Object.create(null);
    function htmlType(value) { return /^(text\/html|application\/xhtml\+xml|application\/x-mimearchive)(?:\s*;|\s*$)/i.test(String(value || '').trim()); }
    function authorizedAttachment(href) {
      // The storefront now supplies an explicit, short-lived server download.
      // This narrow route is authenticated and authorized again by the server;
      // arbitrary HTML exports and browser-generated Blob URLs stay protected.
      // Resolve against this document so same-origin storefront frames work too.
      try {
        var current = new win.URL(win.location.href);
        var destination = new win.URL(href, doc.baseURI || current.href);
        return /^https?:$/.test(current.protocol) && destination.origin === current.origin &&
          destination.protocol === current.protocol && !destination.username && !destination.password &&
          /^\/api\/downloads\/file\/[A-Za-z0-9_-]{43}$/.test(destination.pathname) &&
          (destination.href === destination.origin + destination.pathname ||
            destination.href === destination.origin + destination.pathname + '?direct=1');
      } catch (_) { return false; }
    }
    function htmlDownload(anchor) {
      if (!anchor || String(anchor.tagName || '').toLowerCase() !== 'a') return false;
      var href = '', filename = null;
      try { href = String(anchor.getAttribute('href') || anchor.href || '').trim(); filename = anchor.getAttribute('download'); } catch (_) { return false; }
      if (authorizedAttachment(href)) return false;
      if (/^data:\s*(text\/html|application\/xhtml\+xml|application\/x-mimearchive)(?:[;,])/i.test(href) || htmlBlobUrls[href]) return true;
      if (filename === null) return false;
      // Decode only the URL path: query strings may legitimately name a lesson
      // when exporting a PNG or CSV and must not be treated as a file extension.
      var pathname = href.split(/[?#]/)[0];
      try { pathname = decodeURIComponent(pathname); } catch (_) {}
      return /\.(?:html?|xht(?:ml)?|mht(?:ml)?)$/i.test(String(filename).trim()) ||
        /\.(?:html?|xht(?:ml)?|mht(?:ml)?)$/i.test(pathname);
    }
    function downloadClick(event) {
      var node = event.target && event.target.nodeType === 3 ? event.target.parentElement : event.target;
      while (node && node !== doc) {
        if (String(node.tagName || '').toLowerCase() === 'a') { if (htmlDownload(node)) cancel(event); return; }
        node = node.parentElement;
      }
    }
    function protectHtmlDownloads() {
      // Track only known HTML Blob URLs; PNG, CSV, JSON and circuit data remain exportable.
      try {
        var url = win.URL || win.webkitURL;
        if (url && typeof url.createObjectURL === 'function') {
          var create = url.createObjectURL, revoke = url.revokeObjectURL;
          url.createObjectURL = function (blob) { var result = create.apply(this, arguments); if (blob && htmlType(blob.type)) htmlBlobUrls[result] = true; return result; };
          if (typeof revoke === 'function') url.revokeObjectURL = function (value) { delete htmlBlobUrls[value]; return revoke.apply(this, arguments); };
        }
      } catch (_) {}
      try {
        var prototype = win.HTMLAnchorElement && win.HTMLAnchorElement.prototype, click = prototype && prototype.click;
        if (typeof click === 'function') prototype.click = function () { if (!htmlDownload(this)) return click.apply(this, arguments); };
      } catch (_) {}
    }
    function style(element, values) { for (var name in values) if (Object.prototype.hasOwnProperty.call(values, name)) element.style[name] = values[name]; }
    function element(tag, text) { var node = doc.createElement(tag); if (text) node.textContent = text; return node; }

    function returnToCatalog() {
      if (embedded()) {
        // The shell validates the source window before handling this request.
        try { win.parent.postMessage({ type: MESSAGE, version: 1, state: 'return', reason: 'user-request' }, '*'); } catch (_) {}
      } else { try { win.location.href = '/#catalog'; } catch (_) {} }
    }
    function showLayer() {
      if (layer || !doc.body) return;
      var day = doc.documentElement.getAttribute('data-theme') === 'day';
      previousFocus = doc.activeElement;
      layer = element('section'); layer.setAttribute('data-content-guard-layer', '');
      layer.setAttribute('role', 'dialog'); layer.setAttribute('aria-modal', 'true'); layer.setAttribute('aria-label', '内容保护');
      style(layer, { position: 'fixed', top: '0', right: '0', bottom: '0', left: '0', zIndex: '2147483647',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '28px', boxSizing: 'border-box',
        background: day ? '#eeede8' : '#0d1015', color: day ? '#292c31' : '#e7e9ed', fontFamily: 'system-ui, sans-serif',
        lineHeight: '1.8', textAlign: 'center', pointerEvents: 'auto' });
      var panel = element('div'), heading = element('h2', '内容保护'), description = element('p', '请关闭调试工具后继续使用。'), actions = element('div');
      style(panel, { width: '100%', maxWidth: '440px' });
      style(heading, { fontSize: '24px', fontWeight: '500', margin: '0 0 14px' });
      style(description, { fontSize: '17px', margin: '0 0 28px', opacity: '.8' });
      style(actions, { display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '12px' });
      checkButton = element('button', '重新检查'); checkButton.type = 'button';
      returnButton = element('button', '返回课件库'); returnButton.type = 'button';
      var buttons = [checkButton, returnButton];
      for (var i = 0; i < buttons.length; i++) style(buttons[i], { font: 'inherit', fontSize: '16px', minHeight: '46px',
        padding: '10px 20px', border: '1px solid ' + (day ? '#bbc0c6' : '#515965'), borderRadius: '9px',
        color: 'inherit', background: 'transparent', cursor: 'pointer' });
      checkButton.addEventListener('click', function () { checkTools(); requestChildChecks(); });
      returnButton.addEventListener('click', returnToCatalog);
      actions.appendChild(checkButton); actions.appendChild(returnButton); panel.appendChild(heading); panel.appendChild(description); panel.appendChild(actions);
      layer.appendChild(panel); doc.body.appendChild(layer);
      try { checkButton.focus(); } catch (_) {}
    }
    function hideLayer() {
      if (!layer) return;
      try { if (layer.parentNode) layer.parentNode.removeChild(layer); } catch (_) {}
      layer = null; checkButton = null; returnButton = null;
      try { if (previousFocus && doc.documentElement.contains(previousFocus)) previousFocus.focus(); } catch (_) {}
      previousFocus = null;
    }
    function setBlocked(value) {
      if (value === blocked) { if (value) showLayer(); return; }
      blocked = value; doc.documentElement.setAttribute('data-content-guard', value ? 'blocked' : 'ready');
      if (value) showLayer(); else hideLayer();
      notify(value ? 'detected' : 'clear', 'embedded-debug-tool');
    }
    function directToolOpen() {
      try { if (win.eruda && win.eruda._devTools && win.eruda._devTools._isShow === true) return true; } catch (_) {}
      // vConsole explicitly toggles this wrapper class when its panel is open.
      try { if (win._vcOrigConsole && doc.querySelector('#__vconsole.vc-toggle')) return true; } catch (_) {}
      return false;
    }
    function pruneFrames() {
      for (var i = children.length - 1; i >= 0; i--) {
        if (!doc.documentElement.contains(children[i].frame)) {
          children[i].frame.removeEventListener('load', children[i].loaded);
          children.splice(i, 1);
        }
      }
    }
    function checkTools() {
      if (stopped || doc.hidden) return;
      pruneFrames();
      var active = directToolOpen();
      for (var i = children.length - 1; i >= 0; i--) {
        if (embedded() && children[i].detected) active = true;
      }
      setBlocked(active);
    }
    function scheduleProbe() {
      if (pollTimer !== null) win.clearTimeout(pollTimer);
      pollTimer = null;
      if (stopped || doc.hidden) return;
      checkTools();
      pollTimer = win.setTimeout(function () { pollTimer = null; scheduleProbe(); }, POLL_MS);
    }
    function recordFor(source) {
      for (var i = 0; i < children.length; i++) {
        try { if (doc.documentElement.contains(children[i].frame) && children[i].frame.contentWindow === source) return children[i]; } catch (_) {}
      }
      return null;
    }
    function requestChildChecks() {
      pruneFrames();
      for (var i = 0; i < children.length; i++) {
        try { children[i].frame.contentWindow.postMessage({ type: MESSAGE, version: 1, state: 'check', reason: 'user-request' }, '*'); } catch (_) {}
      }
    }
    function message(event) {
      var value = event.data;
      if (!value || value.type !== MESSAGE || value.version !== 1) return;
      if (value.state === 'check') {
        try { if (event.source !== win.parent || !embedded()) return; } catch (_) { return; }
        checkTools(); requestChildChecks(); notify(blocked ? 'detected' : 'clear'); return;
      }
      var child = recordFor(event.source); if (!child) return;
      if (value.state === 'return' && embedded()) { returnToCatalog(); return; }
      if (value.state !== 'detected' && value.state !== 'clear') return;
      if (value.reason !== 'embedded-debug-tool' && value.reason !== 'inspector-probe') return;
      child.detected = value.state === 'detected';
      // The top shell owns its active-lesson policy; it must independently validate
      // the current classroom iframe before acting on the message.
      if (embedded()) checkTools();
    }
    function attachFrame(frame) {
      for (var i = 0; i < children.length; i++) if (children[i].frame === frame) return;
      var child = { frame: frame, detected: false }; children.push(child);
      function loaded() { child.detected = false; try { install(frame.contentWindow); } catch (_) {} if (embedded()) checkTools(); }
      child.loaded = loaded;
      frame.addEventListener('load', loaded); loaded();
    }
    function scanFrames() {
      scanTimer = null; if (stopped) return;
      pruneFrames();
      var frames = doc.querySelectorAll('iframe,frame');
      for (var i = 0; i < frames.length; i++) attachFrame(frames[i]);
      if (embedded()) checkTools();
    }
    function queueScan() { if (!stopped && scanTimer === null) scanTimer = win.setTimeout(scanFrames, 30); }
    function mutations(records) {
      var needsScan = false, toolsChanged = false;
      for (var i = 0; i < records.length; i++) {
        var record = records[i];
        if (record.type === 'attributes') {
          if (record.attributeName === 'src' || record.attributeName === 'srcdoc') needsScan = true;
          if (record.target && record.target.id === '__vconsole') toolsChanged = true;
        } else {
          var list = record.addedNodes || [];
          for (var j = 0; j < list.length; j++) if (list[j].nodeType === 1) {
            var tag = String(list[j].tagName).toLowerCase();
            if (tag === 'iframe' || tag === 'frame' || list[j].querySelector && list[j].querySelector('iframe,frame')) needsScan = true;
          }
          list = record.removedNodes || [];
          for (var k = 0; k < list.length; k++) if (list[k].nodeType === 1) {
            var removedTag = String(list[k].tagName).toLowerCase();
            if (removedTag === 'iframe' || removedTag === 'frame' || list[k].querySelector && list[k].querySelector('iframe,frame')) needsScan = true;
          }
        }
      }
      if (needsScan) queueScan(); if (toolsChanged) checkTools();
    }
    function observe() {
      if (observer) observer.disconnect();
      if (typeof win.MutationObserver === 'function') {
        observer = new win.MutationObserver(mutations);
        observer.observe(doc.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['src', 'srcdoc', 'class'] });
      }
    }
    function start() { stopped = false; observe(); scanFrames(); scheduleProbe(); }
    win.addEventListener('keydown', keydown, true);
    win.addEventListener('contextmenu', contextmenu, true);
    win.addEventListener('click', downloadClick, true);
    win.addEventListener('auxclick', downloadClick, true);
    win.addEventListener('message', message, false);
    win.addEventListener('focus', scheduleProbe, false);
    doc.addEventListener('visibilitychange', scheduleProbe, false);
    doc.addEventListener('DOMContentLoaded', function () { scanFrames(); if (blocked) showLayer(); }, false);
    win.addEventListener('pagehide', function () {
      stopped = true; if (observer) observer.disconnect();
      if (pollTimer !== null) win.clearTimeout(pollTimer); if (scanTimer !== null) win.clearTimeout(scanTimer);
      pollTimer = null; scanTimer = null;
    }, false);
    win.addEventListener('pageshow', function (event) { if (event.persisted) start(); }, false);
    protectHtmlDownloads(); start();
  }
  if (typeof window !== 'undefined') install(window);
}());
