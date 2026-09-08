(function () {
  'use strict';

  function navigateCard(card) {
    if (!card || !card.dataset || typeof window.goTo !== 'function') return;
    var speciesId = card.dataset.speciesId;
    if (!speciesId) return;

    if (speciesId === 'snake') {
      window.goTo('snakewhattodo');
      return;
    }

    window.goTo('whattodo', { id: speciesId });
  }

  function prepareConfirmButton(btn) {
    if (!btn || btn.getAttribute('data-full-confirm-click') === '1') return;

    btn.setAttribute('data-full-confirm-click', '1');
    btn.style.cursor = 'pointer';

    // Make every pixel of the Confirm / Sahkan pill trigger the same route.
    // Previously the existing behaviour could feel like only the arrow icon
    // was actionable. This explicit handler makes label, empty padding and
    // arrow all behave identically.
    btn.addEventListener('click', function (event) {
      var card = btn.closest('.id-card[data-species-id]');
      if (!card) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      navigateCard(card);
    }, true);
  }

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

      prepareConfirmButton(btn);
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
