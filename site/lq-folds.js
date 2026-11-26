/*
 * The groups that fold on a phone.
 *
 * The version strip and the filter block each collapse into a single
 * line that names the current choice. Whether a group is folded is
 * decided by the stylesheet — a phone folds both, a wide screen shows
 * both — so the only thing this has to remember is what the reader
 * opened, and it keeps that on the window so the next re-render can
 * put the group back the way they left it.
 */
(function () {
  'use strict';

  var GROUPS = {
    'download-gallery-filters': 'lqFiltersOpen',
    'download-edition-fold': 'lqEditionOpen',
  };

  function fold(box) {
    if (!box) return;
    var collapsed = box.dataset.collapsed === 'true';
    box.dataset.collapsed = collapsed ? 'false' : 'true';
    var button = box.querySelector('[data-lq-fold-toggle]');
    if (button) button.setAttribute('aria-expanded', String(collapsed));
    var key = Object.keys(GROUPS).find(function (name) {
      return box.classList.contains(name);
    });
    if (key) window[GROUPS[key]] = collapsed;
  }

  document.addEventListener('click', function (event) {
    var button = event.target.closest ? event.target.closest('[data-lq-fold-toggle]') : null;
    if (!button) return;
    event.preventDefault();
    fold(button.closest('.download-gallery-filters, .download-edition-fold'));
  });
})();
