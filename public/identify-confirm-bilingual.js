(function () {
  'use strict';

  function apply() {
    var page = document.getElementById('page-identify');
    if (!page) return;

    page.querySelectorAll('.confirm-btn').forEach(function (btn) {
      var en = btn.querySelector('[data-en]');
      var bm = btn.querySelector('[data-bm]');

      if (en) {
        en.removeAttribute('data-en');
        if (en.textContent !== 'Confirm / Sahkan') en.textContent = 'Confirm / Sahkan';
      } else if (!btn.querySelector('[data-bilingual-confirm-label]')) {
        var label = document.createElement('span');
        label.setAttribute('data-bilingual-confirm-label', '1');
        label.textContent = 'Confirm / Sahkan';
        btn.insertBefore(label, btn.firstChild);
      }

      if (bm) bm.remove();
    });
  }

  function init() {
    apply();
    var page = document.getElementById('page-identify');
    if (!page) return;

    var scheduled = false;
    var observer = new MutationObserver(function () {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(function () {
        scheduled = false;
        apply();
      });
    });
    observer.observe(page, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
