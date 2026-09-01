(function () {
  'use strict';

  function hideSummary() {
    var source = document.getElementById('kif_preventionSource');
    if (!source) return;
    source.innerHTML = '';
    source.classList.add('hidden');
    source.setAttribute('aria-hidden', 'true');
  }

  function init() {
    hideSummary();
    var observer = new MutationObserver(hideSummary);
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
