(function () {
  'use strict';

  function navigateCard(card) {
    if (!card || !card.dataset) return;
    var speciesId = card.dataset.speciesId;
    if (!speciesId || typeof window.goTo !== 'function') return;

    if (speciesId === 'snake') {
      window.goTo('snakewhattodo');
      return;
    }

    window.goTo('whattodo', { id: speciesId });
  }

  // Species result cards are rendered dynamically on the Identify page.
  // Use delegated events so the whole card (image, name, description, or
  // arrow area) navigates immediately instead of requiring the Confirm arrow.
  document.addEventListener('click', function (event) {
    var card = event.target && event.target.closest
      ? event.target.closest('.id-card[data-species-id]')
      : null;
    if (!card) return;

    // Preserve explicit links such as the photo-credit "i" badge and the
    // existing Confirm button. Everything else on the card is a direct hit.
    if (event.target.closest('a, button, input, select, textarea')) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    navigateCard(card);
  }, true);

  // Also make dynamically rendered cards keyboard-accessible.
  function prepareCards(root) {
    var scope = root && root.querySelectorAll ? root : document;
    scope.querySelectorAll('.id-card[data-species-id]').forEach(function (card) {
      if (!card.hasAttribute('tabindex')) card.setAttribute('tabindex', '0');
      if (!card.hasAttribute('role')) card.setAttribute('role', 'link');
      card.setAttribute('aria-label', 'Open species guidance');
    });
  }

  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    var card = event.target && event.target.closest
      ? event.target.closest('.id-card[data-species-id]')
      : null;
    if (!card) return;
    event.preventDefault();
    navigateCard(card);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { prepareCards(document); });
  } else {
    prepareCards(document);
  }

  var observer = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
      Array.prototype.forEach.call(mutation.addedNodes || [], function (node) {
        if (!node || node.nodeType !== 1) return;
        if (node.matches && node.matches('.id-card[data-species-id]')) prepareCards(node.parentNode || document);
        else prepareCards(node);
      });
    });
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
