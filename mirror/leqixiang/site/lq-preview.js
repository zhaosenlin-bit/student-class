/*
 * The interactive preview on a course page.
 *
 * The cover is what the page shows first; the courseware itself is loaded
 * only when the reader asks for it. Once it is open, it takes over the
 * page: the frame fills the window, the panel and the text step aside,
 * and a slim bar floats on top with the two things a reader still wants
 * - put it away, or take it full screen.
 *
 * The preview runs in the same origin as the page, so the courseware can
 * talk to the shell the way it does in the full classroom view.
 */
(function () {
  'use strict';

  function host() {
    return document.querySelector('[data-lq-preview-host]');
  }

  function frameOf(box) {
    return box ? box.querySelector('iframe') : null;
  }

  /*
   * The 小白教育 courseware asks the page that hosts it for a classroom
   * acknowledgement before it shows anything. The classroom view answers
   * that question; the inline preview has to answer it as well, or the
   * lesson stays behind a "connecting" screen.
 */
  function sameCourse(requested, previewId) {
    if (!requested) return false;
    if (requested === previewId) return true;
    /* The 图灵智赋 works carry their own number, the catalogue the prefix. */
    return previewId.indexOf('afe-') === 0 && requested === previewId.slice(4);
  }

  window.addEventListener('message', function (event) {
    var data = event.data;
    if (!data || data.type !== 'xiaobai:classroom-access' || data.version !== 1) return;
    if (data.state !== 'request') return;
    var box = host();
    var frame = frameOf(box);
    if (!frame || event.source !== frame.contentWindow) return;
    var previewId = box.getAttribute('data-lq-course');
    if (!sameCourse(data.courseId, previewId)) return;
    event.source.postMessage(
      {
        type: data.type,
        version: 1,
        courseId: data.courseId,
        deliveryId: data.deliveryId,
        requestId: data.requestId,
        state: 'active',
        ttlMs: 600000,
      },
      '*'
    );
  });

  function close(box) {
    var frame = frameOf(box);
    if (!frame) return;
    frame.remove();
    var cover = document.querySelector('.download-cover-image');
    if (cover) cover.hidden = false;
    box.hidden = true;
    document.documentElement.removeAttribute('data-lq-previewing');
    var toggle = document.querySelector('[data-lq-preview]');
    if (toggle) toggle.textContent = '\u25b6 \u5728\u7ebf\u9884\u89c8';
  }

  function open(id, box) {
    if (frameOf(box)) return;
    box.setAttribute('data-lq-course', id);
    var frame = document.createElement('iframe');
    frame.src = '/courseware/' + encodeURIComponent(id) + '?local=1';
    frame.title = '\u8bfe\u4ef6\u9884\u89c8';
    frame.loading = 'eager';
    frame.setAttribute('allow', 'fullscreen; autoplay; microphone; camera');

    var bar = document.createElement('div');
    bar.className = 'lq-preview-bar';
    var state = document.createElement('span');
    state.className = 'lq-preview-state';
    state.textContent = '\u6b63\u5728\u6253\u5f00\u8bfe\u4ef6\u2026';
    var actions = document.createElement('span');
    actions.className = 'lq-preview-actions';
    var hide = document.createElement('button');
    hide.type = 'button';
    hide.setAttribute('data-lq-preview-close', '');
    hide.textContent = '\u6536\u8d77\u9884\u89c8';
    var full = document.createElement('a');
    full.href = '#play/' + encodeURIComponent(id);
    full.target = '_blank';
    full.rel = 'noopener';
    full.textContent = '\u5168\u5c4f\u6253\u5f00 \u2197';
    actions.append(hide, full);
    bar.append(state, actions);

    box.append(bar, frame);
    box.hidden = false;
    document.documentElement.setAttribute('data-lq-previewing', '1');
    var cover = document.querySelector('.download-cover-image');
    if (cover) cover.hidden = true;
    var toggle = document.querySelector('[data-lq-preview]');
    if (toggle) toggle.textContent = '\u6536\u8d77\u9884\u89c8';

    frame.addEventListener('load', function () {
      state.textContent = '\u8bfe\u4ef6\u5df2\u6253\u5f00';
    });
    box.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /*
   * The intro paragraph can run to a screenful. It is folded to three
   * lines and opened on a click, so the title and the buttons stay where
   * the eye expects them.
   */
  function sizeLede() {
    var boxes = document.querySelectorAll('[data-lq-lede]');
    for (var i = 0; i < boxes.length; i++) {
      var box = boxes[i];
      var text = box.querySelector('p');
      var button = box.querySelector('[data-lq-lede-toggle]');
      if (!text || !button) continue;
      button.hidden = text.scrollHeight <= text.clientHeight + 2;
    }
  }

  function toggleLede(button) {
    var box = button.closest('[data-lq-lede]');
    if (!box) return;
    var open = box.getAttribute('data-lq-open') === 'true';
    box.setAttribute('data-lq-open', open ? 'false' : 'true');
    button.setAttribute('aria-expanded', open ? 'false' : 'true');
    button.textContent = open ? '展开简介' : '收起简介';
  }

  /* The page is drawn after the route is known, so the measurement waits
     for the paragraph to show up. */
  var ledeWatch = 0;
  function watchLede() {
    if (document.querySelector('[data-lq-lede]')) {
      sizeLede();
      ledeWatch = 0;
      return;
    }
    if (++ledeWatch > 60) return;
    setTimeout(watchLede, 150);
  }

  /*
   * The catalogue card carries a "preview" button of its own. It cannot
   * open a frame — the frame belongs to the course page — so it remembers
   * the course and goes there; the course page opens it on arrival.
   */
  var PENDING = 'leqixiang.preview.pending';

  function pendingId() {
    try {
      return sessionStorage.getItem(PENDING) || '';
    } catch (e) {
      return '';
    }
  }

  function clearPending() {
    try {
      sessionStorage.removeItem(PENDING);
    } catch (e) {
      /* A locked-down storage only costs the convenience. */
    }
  }

  function hashCourse() {
    var m = /^#course\/(.+)$/.exec(location.hash || '');
    return m ? decodeURIComponent(m[1]) : '';
  }

  /* Wait for the course page to paint, then open what the card asked for. */
  var watch = 0;
  function autoOpen() {
    var wanted = pendingId();
    if (!wanted) return;
    if (hashCourse() !== wanted) return;
    var box = host();
    if (!box) {
      if (++watch > 80) return;
      setTimeout(autoOpen, 250);
      return;
    }
    clearPending();
    open(wanted, box);
  }

  window.addEventListener('hashchange', autoOpen);
  window.addEventListener('hashchange', watchLede);

  document.addEventListener('click', function (event) {
    var lede = event.target.closest ? event.target.closest('[data-lq-lede-toggle]') : null;
    if (lede) {
      event.preventDefault();
      toggleLede(lede);
      return;
    }
    var starter = event.target.closest ? event.target.closest('[data-lq-preview-start]') : null;
    if (starter) {
      event.preventDefault();
      var id = starter.getAttribute('data-lq-preview-start');
      try {
        sessionStorage.setItem(PENDING, id);
      } catch (e) {
        /* Without storage the reader still lands on the course page. */
      }
      location.hash = '#course/' + encodeURIComponent(id);
      return;
    }
    var closer = event.target.closest ? event.target.closest('[data-lq-preview-close]') : null;
    if (closer) {
      event.preventDefault();
      close(host());
      return;
    }
    var trigger = event.target.closest ? event.target.closest('[data-lq-preview]') : null;
    if (!trigger) return;
    event.preventDefault();
    var box = host();
    if (!box) return;
    if (frameOf(box)) close(box);
    else open(trigger.getAttribute('data-lq-preview'), box);
  });

  autoOpen();
  watchLede();
})();
