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
   * The courseware asks the page that hosts it for a classroom
   * acknowledgement before it shows anything. The classroom view answers
   * that question; the inline preview has to answer it as well, or the
   * lesson stays behind a "connecting" screen.
 */
  function sameCourse(requested, previewId) {
    if (!requested) return false;
    if (requested === previewId) return true;
    /* The works carry their own number, the catalogue the prefix. */
    return previewId.indexOf('lq-') === 0 && requested === previewId.slice(4);
  }

  window.addEventListener('message', function (event) {
    var data = event.data;
    if (!data || data.type !== 'leqixiang:classroom-access' || data.version !== 1) return;
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
    frame.style.height = '';
    var cover = document.querySelector('.download-cover-image');
    if (cover) cover.hidden = false;
    box.hidden = true;
    document.documentElement.removeAttribute('data-lq-previewing');
    var toggle = document.querySelector('[data-lq-preview]');
    if (toggle) toggle.textContent = '\u25b6 \u5728\u7ebf\u9884\u89c8';
  }

  /*
   * How much of the window is left for the lesson.
   *
   * The frame sits under the site header and under its own bar, so those
   * two are taken off the height of the window.  The numbers are measured
   * rather than written down, because the header changes with the screen.
   */
  function roomForFrame() {
    var head = document.querySelector('.site-header');
    var headH = head ? Math.round(head.getBoundingClientRect().height) : 0;
    var box = host();
    var bar = box ? box.querySelector('.lq-preview-bar') : null;
    var barH = bar ? Math.round(bar.getBoundingClientRect().height) : 0;
    /*
     * The header and the bar are the only things above the lesson, so
     * what is left of the window belongs to the lesson.  The lesson is
     * given all of it, which is what keeps the bottom of the lesson
     * from falling off the screen.
     */
    return Math.max(300, window.innerHeight - headH - barH);
  }

  /*
   * Give the lesson the whole room it can have.
   *
   * A lesson that is laid out for a window draws itself to the height of
   * the frame it sits in, so a frame that is too short cuts the lesson
   * off at the bottom.  The frame is measured against the window and set
   * to the room that is left.
   */
  function fitFrame(frame) {
    if (!frame || !frame.parentNode) return;
    frame.style.height = roomForFrame() + 'px';
  }

  /*
   * A lesson that is taller than the frame.
   *
   * Some lessons lay more out than one screen holds and hide the rest.
   * The tallest thing on the page is measured; if it reaches past the
   * bottom of the frame, the frame grows to meet it and the lesson is
   * allowed to scroll for whatever is left.
   */
  function contentHeight(frame) {
    var doc;
    var view;
    try {
      doc = frame.contentDocument;
      view = frame.contentWindow;
    } catch (e) {
      return 0;
    }
    if (!doc || !doc.body) return 0;
    var offset = (view && view.scrollY) || 0;
    var tallest = 0;
    var all = doc.body.getElementsByTagName('*');
    var count = Math.min(all.length, 20000);
    for (var i = 0; i < count; i++) {
      var rect = all[i].getBoundingClientRect();
      if (!rect.height) continue;
      var bottom = rect.bottom + offset;
      if (bottom > tallest) tallest = bottom;
    }
    var docH = doc.documentElement ? doc.documentElement.scrollHeight : 0;
    return Math.max(tallest, docH);
  }

  function fitContent(frame) {
    if (!frame || !frame.parentNode) return;
    var base = frame.getBoundingClientRect().height;
    if (!base) return;
    var need = contentHeight(frame);
    if (need <= base + 4) return;
    var doc;
    try {
      doc = frame.contentDocument;
    } catch (e) {
      return;
    }
    if (!doc || !doc.body) return;
    /* Whatever is still out of reach is now reachable by scrolling. */
    if (doc.documentElement) doc.documentElement.style.overflowY = 'auto';
    doc.body.style.overflowY = 'auto';
    /*
     * A lesson that lays its parts out by hand may still refuse to
     * scroll.  Then the frame grows to reach the foot of it, but not
     * without end: a lesson that thinks in screens must not be turned
     * into a very long page.
     */
    var de = doc.documentElement;
    if (de.scrollHeight <= de.clientHeight + 2) {
      frame.style.height = Math.min(need, Math.round(base * 4)) + 'px';
    }
  }

  /*
   * A lesson that is not on this machine answers with a page of its own.
   * The bar says so, instead of claiming that the lesson is open.
   */
  function reportState(frame, state) {
    var doc;
    try {
      doc = frame.contentDocument;
    } catch (e) {
      doc = null;
    }
    var text = doc && doc.body ? doc.body.innerText || '' : '';
    if (/本机还没有这份课件的文件/.test(text)) {
      state.textContent = '\u8fd9\u95e8\u8bfe\u4ef6\u672c\u673a\u8fd8\u6ca1\u6709\u6587\u4ef6';
      state.classList.add('is-error');
      return;
    }
    state.classList.remove('is-error');
    state.textContent = '\u8bfe\u4ef6\u5df2\u6253\u5f00';
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
      fitFrame(frame);
      reportState(frame, state);
      /*
       * The lesson draws itself once it is measured, and a lesson that
       * is put together by a script takes its time.  So the height is
       * measured again a few times: once when the document has arrived,
       * once when the lesson has finished drawing, and once more in
       * case it is still settling.
       */
      [400, 1200, 2600].forEach(function (wait) {
        window.setTimeout(function () {
          fitContent(frame);
          reportState(frame, state);
        }, wait);
      });
    });
    box.scrollIntoView({ behavior: 'smooth', block: 'start' });
    fitFrame(frame);
  }

  /*
   * The window is resized, the header is folded away, the reader turns
   * the phone: the frame is measured again each time.
   */
  var resizeTimer = null;
  window.addEventListener('resize', function () {
    if (resizeTimer) window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(function () {
      var box = host();
      var frame = frameOf(box);
      if (!frame) return;
      fitFrame(frame);
      fitContent(frame);
    }, 180);
  });

  /*
   * The intro paragraph can run to a screenful. It is folded to three
   * lines and opened on a click, so the title and the buttons stay where
   * the eye expects them.
   */
  function sizeLede() {
    var boxes = document.querySelectorAll('[data-lq-lede]');
    for (var i = 0; i < boxes.length; i++) {
      var box = boxes[i];
      var text = box.querySelector('[data-lq-lede-text]') || box.querySelector('p');
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
