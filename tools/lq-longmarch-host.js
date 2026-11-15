/*
 * The host side of the 长征 course.
 *
 * This course is a wrapper: the document that is opened asks a page
 * around it for two things — the saved progress and a channel to write
 * it back on.  On the published site a session server answers; here the
 * page answers for itself and keeps the progress in the browser's own
 * storage.
 *
 * The placeholders are filled in when the entry page is written:
 *   %%PROGRAM%%   the number of the course
 *   %%PROTOCOL%%  the name of the handshake
 *   %%KEYS%%      the keys the course is allowed to save
 */
(function () {
  const PROTOCOL = '%%PROTOCOL%%';
  const PROGRAM = '%%PROGRAM%%';
  const KEYS = %%KEYS%%;
  const STORE = 'lq.longmarch.' + PROGRAM + '.';

  const frame = document.getElementById('frame');
  if (!frame) return;

  const readValues = () => {
    const out = {};
    for (const key of KEYS) {
      try {
        const raw = localStorage.getItem(STORE + key);
        if (typeof raw === 'string' && raw.length <= 4096) out[key] = raw;
      } catch (e) {
        /* the browser may refuse; the course carries on without it */
      }
    }
    return out;
  };

  const writeValue = (key, value) => {
    try {
      localStorage.setItem(STORE + key, String(value));
    } catch (e) {}
  };

  const dropValue = (key) => {
    try {
      localStorage.removeItem(STORE + key);
    } catch (e) {}
  };

  window.addEventListener('message', (event) => {
    const data = event.data;
    if (event.source !== frame.contentWindow) return;
    if (!data || data.type !== PROTOCOL + ':ready') return;

    const channel = new MessageChannel();
    channel.port1.onmessage = (message) => {
      const patch = message.data || {};
      if (patch.control === 'checkpoint') {
        /* Every write was stored the moment it arrived. */
        channel.port1.postMessage({ control: 'checkpoint-result', id: patch.id, ok: true });
        return;
      }
      if (typeof patch.id !== 'number') return;
      try {
        if (patch.op === 'set') writeValue(patch.key, patch.value);
        else if (patch.op === 'remove') dropValue(patch.key);
        channel.port1.postMessage({ id: patch.id, ok: true });
      } catch (error) {
        channel.port1.postMessage({
          id: patch.id,
          ok: false,
          error: String((error && error.message) || error),
        });
      }
    };

    frame.contentWindow.postMessage(
      /* The course checks that the answer belongs to the question it
         asked, so the nonce travels back with it. */
      { type: PROTOCOL + ':connect', nonce: data.nonce, values: readValues() },
      location.origin,
      [channel.port2]
    );
  });
})();
