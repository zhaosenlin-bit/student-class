/*
 * The static library.
 *
 * A folder of files has no server behind it, so the questions the site
 * asks of itself — "what is in the library?", "may this lesson be
 * opened?", "hand this lesson over" — are answered here, from the
 * files that lie next to this one.
 *
 * Nothing here talks to a network.  The catalogue is a file, a lesson
 * is a folder of files, and a lesson that is saved to a machine is
 * packed in the browser, out of the very same files.
 */
(function () {
  'use strict';

  var here = document.currentScript;
  var ROOT = new URL('./', here && here.src ? here.src : location.href);

  /* ------------------------------------------------------ catalogue -- */

  var catalog = null;
  var catalogPromise = null;

  function loadCatalog() {
    if (!catalogPromise) {
      catalogPromise = fetch(new URL('catalog.json', ROOT).href, { cache: 'no-cache' })
        .then(function (r) {
          if (!r.ok) throw new Error('无法读取课件目录');
          return r.json();
        })
        .then(function (data) {
          catalog = data;
          return data;
        });
    }
    return catalogPromise;
  }

  function findProduct(id) {
    if (!catalog) return null;
    var list = catalog.products || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    return null;
  }

  /* -------------------------------------------------------- answers -- */

  function json(value, status) {
    return new Response(JSON.stringify(value), {
      status: status || 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }

  function empty(status) {
    return new Response('', { status: status || 204 });
  }

  var PIXEL =
    'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

  function lessonUrl(id) {
    return 'courseware/' + encodeURIComponent(id) + '/index.html?local=1';
  }

  /*
   * A work that talks to the page that holds it needs the same origin
   * as the page itself.  These are the ones that do.
   */
  function sameOriginLesson(id) {
    return /^(lq-|lab-physics-|lab-process-|lab-reaction-|lab-virtual-|lab-explore-|lab-course-|game-block-)/.test(
      id
    );
  }

  function answer(url, init) {
    var method = String(
      (init && init.method) || (init && init.body) || 'GET'
    ).toUpperCase();
    var body = null;
    if (init && typeof init.body === 'string') {
      try {
        body = JSON.parse(init.body);
      } catch (e) {
        body = null;
      }
    }

    if (url === '/api/catalog') {
      return loadCatalog().then(function (data) {
        return json(data);
      });
    }
    if (url === '/api/session') {
      return json({
        user: {
          id: 'local',
          username: '乐启享本地课件库',
          displayName: '乐启享本地课件库',
          role: 'teacher',
        },
      });
    }
    if (url === '/api/version') {
      return loadCatalog().then(function (data) {
        return json({
          build: 'static',
          version: '',
          courses: (data.products || []).length,
        });
      });
    }
    if (url.indexOf('/api/access/') === 0) {
      var id = decodeURIComponent(url.slice('/api/access/'.length));
      return loadCatalog().then(function () {
        var product = findProduct(id);
        if (!product) return json({ error: '未找到这个课件' }, 404);
        return json({
          product: product,
          canDownload: product.canDownload,
          downloadReason: product.downloadReason,
          owned: product.owned,
          accessible: product.accessible,
          onlineAccessible: product.onlineAccessible,
          launchUrl: lessonUrl(id),
          available: product.available,
          canPurchase: false,
          canFeedback: false,
          feedbackRequiresPurchase: false,
        });
      });
    }
    if (url.indexOf('/api/launch/') === 0) {
      var courseId = decodeURIComponent(url.slice('/api/launch/'.length));
      return loadCatalog().then(function () {
        if (!findProduct(courseId)) return json({ error: '未找到这个课件' }, 404);
        return json({
          productId: courseId,
          url: lessonUrl(courseId),
          expiresAt: Date.now() + 600000,
          lease: null,
          allowSameOrigin: sameOriginLesson(courseId),
        });
      });
    }
    if (url === '/api/classroom/viewer-check') {
      return json({ ok: true, expiresAt: Date.now() + 600000 });
    }
    if (url === '/api/classroom/heartbeat' || url === '/api/classroom/release') {
      return json(
        { error: '这个页面在本地版里用不到，直接打开课件即可。' },
        410
      );
    }
    if (url.indexOf('/api/program-file/verify-access') === 0) {
      return json({ ok: true });
    }
    if (url === '/api/quiet' || url === '/scripts/errorReporter.py') {
      return empty(204);
    }
    if (url === '/offline-check') {
      return json({ error: 'local copy' });
    }
    if (url.indexOf('/offline-yotta/') === 0) {
      return new Response(PIXEL, {
        status: 200,
        headers: { 'Content-Type': 'image/gif' },
      });
    }
    if (url === '/api/downloads/prepare') {
      var wanted = String((body && (body.productId || body.id)) || '');
      if (!wanted) return json({ error: '课件状态不正确' }, 400);
      return prepareDownload(wanted).then(
        function (file) {
          return json({
            url: file.url,
            filename: file.filename,
            bytes: file.bytes,
            expiresAt: Date.now() + 600000,
          });
        },
        function (error) {
          return json({ error: error.message || '本地没有安装这份课件。' }, 404);
        }
      );
    }
    void method;
    return null;
  }

  /* --------------------------------------------------------- archive -- */

  /*
   * The archive of a lesson is written here, in the browser, out of
   * the very files the lesson is shown from.  Nothing is compressed:
   * the files in it are pictures and sound, already compressed, and a
   * reader can open the archive with any program.
   */
  var CRC = (function () {
    var table = new Uint32Array(256);
    for (var i = 0; i < 256; i++) {
      var c = i;
      for (var k = 0; k < 8; k++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      table[i] = c >>> 0;
    }
    return table;
  })();

  function crc32(bytes) {
    var c = 0xffffffff;
    for (var i = 0; i < bytes.length; i++) {
      c = CRC[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  function zip(entries) {
    var parts = [];
    var central = [];
    var offset = 0;
    for (var i = 0; i < entries.length; i++) {
      var name = entries[i].name;
      var data = entries[i].data;
      var nameBytes = new TextEncoder().encode(name);
      var crc = crc32(data);
      var local = new Uint8Array(30 + nameBytes.length);
      var lv = new DataView(local.buffer);
      lv.setUint32(0, 0x04034b50, true);
      lv.setUint16(4, 20, true);
      lv.setUint16(6, 0x0800, true);
      lv.setUint32(14, crc, true);
      lv.setUint32(18, data.length, true);
      lv.setUint32(22, data.length, true);
      lv.setUint16(26, nameBytes.length, true);
      local.set(nameBytes, 30);
      parts.push(local, data);

      var head = new Uint8Array(46 + nameBytes.length);
      var hv = new DataView(head.buffer);
      hv.setUint32(0, 0x02014b50, true);
      hv.setUint16(4, 20, true);
      hv.setUint16(6, 20, true);
      hv.setUint16(8, 0x0800, true);
      hv.setUint32(16, crc, true);
      hv.setUint32(20, data.length, true);
      hv.setUint32(24, data.length, true);
      hv.setUint16(28, nameBytes.length, true);
      hv.setUint32(42, offset, true);
      head.set(nameBytes, 46);
      central.push(head);
      offset += local.length + data.length;
    }
    var directory = new Uint8Array(central.reduce(function (n, c) {
      return n + c.length;
    }, 0));
    var at = 0;
    for (var j = 0; j < central.length; j++) {
      directory.set(central[j], at);
      at += central[j].length;
    }
    var end = new Uint8Array(22);
    var ev = new DataView(end.buffer);
    ev.setUint32(0, 0x06054b50, true);
    ev.setUint16(8, entries.length, true);
    ev.setUint16(10, entries.length, true);
    ev.setUint32(12, directory.length, true);
    ev.setUint32(16, offset, true);
    return new Blob(parts.concat([directory, end]), { type: 'application/zip' });
  }

  var prepared = {};

  function prepareDownload(id) {
    if (prepared[id]) return prepared[id];
    var folder = new URL('courseware/' + encodeURIComponent(id) + '/', ROOT);
    var task = fetch(new URL('download.json', folder).href, { cache: 'no-cache' })
      .then(function (r) {
        if (!r.ok) throw new Error('本地没有安装这份课件。');
        return r.json();
      })
      .then(function (manifest) {
        if (manifest.single) {
          return fetch(new URL(manifest.entries[0][1], folder).href).then(function (r) {
            return r.blob();
          }).then(function (blob) {
            return {
              url: URL.createObjectURL(blob),
              filename: manifest.filename,
              bytes: blob.size,
            };
          });
        }
        var files = manifest.entries.map(function (entry) {
          return fetch(new URL(entry[1], folder).href).then(function (r) {
            return r.arrayBuffer();
          }).then(function (buffer) {
            return { name: entry[0], data: new Uint8Array(buffer) };
          });
        });
        return Promise.all(files).then(function (entries) {
          var blob = zip(entries);
          return {
            url: URL.createObjectURL(blob),
            filename: manifest.filename,
            bytes: blob.size,
          };
        });
      });
    prepared[id] = task;
    return task;
  }

  /* ----------------------------------------------------------- fetch -- */

  var nativeFetch = window.fetch ? window.fetch.bind(window) : null;

  window.fetch = function (input, init) {
    var url =
      typeof input === 'string'
        ? input
        : input && input.url
          ? input.url
          : String(input);
    if (url.charAt(0) === '/' && url.charAt(1) !== '/') {
      var answered = answer(url, init);
      if (answered) return answered;
    }
    if (!nativeFetch) return Promise.reject(new Error('no fetch'));
    return nativeFetch(input, init);
  };

  window.LQStatic = {
    root: ROOT,
    prepareDownload: prepareDownload,
    catalogue: loadCatalog,
  };
})();
