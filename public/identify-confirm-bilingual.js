(function () {
  'use strict';

  function apply() {
    var page = document.getElementById('page-identify');
    if (!page) return;

    page.querySelectorAll('.confirm-btn').forEach(function (btn) {
      var svg = btn.querySelector('svg');
      var labels = Array.prototype.slice.call(btn.querySelectorAll('span'));

      labels.forEach(function (span) { span.remove(); });

      var label = document.createElement('span');
      label.setAttribute('data-bilingual-confirm-label', '1');
      label.textContent = 'Confirm / Sahkan';

      if (svg) btn.insertBefore(label, svg);
      else btn.appendChild(label);
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
