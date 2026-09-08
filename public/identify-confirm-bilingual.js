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

  function prepareCard(card) {
    if (!card || !card.dataset || !card.dataset.speciesId) return;
    card.setAttribute('role', 'link');
    card.setAttribute('tabindex', '0');
    card.style.cursor = 'pointer';
    card.setAttribute('aria-label', 'Open guidance for ' + card.dataset.speciesId);
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
    });

    page.querySelectorAll('.id-card[data-species-id]').forEach(prepareCard);
  }

  function init() {
    apply();
    var page = document.getElementById('page-identify');
    if (!page) return;

    // Make the whole species result card clickable, not just the arrow/
    // Confirm control. Keep photo-credit links and other interactive controls
    // working normally.
    page.addEventListener('click', function (event) {
      var card = event.target && event.target.closest
        ? event.target.closest('.id-card[data-species-id]')
        : null;
      if (!card) return;

      if (event.target.closest('a, button, input, select, textarea')) return;

      event.preventDefault();
      event.stopPropagation();
      navigateCard(card);
    }, true);

    page.addEventListener('keydown', function (event) {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      var card = event.target && event.target.closest
        ? event.target.closest('.id-card[data-species-id]')
        : null;
      if (!card) return;

      event.preventDefault();
      navigateCard(card);
    });

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
