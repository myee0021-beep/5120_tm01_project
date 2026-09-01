(function () {
  'use strict';

  var BERNAMA_REPRINT_URL = 'https://www.thestar.com.my/news/nation/2026/06/14/wildlife-conflict-complaints-top-76000-since-2021-losses-reach-rm587mil';

  function addSourceLink() {
    var candidates = Array.prototype.slice.call(document.querySelectorAll('span, p, div'));
    candidates.forEach(function (el) {
      var text = (el.textContent || '').trim();
      if (text !== 'NRES') return;
      if (el.closest && el.closest('a')) return;
      var a = document.createElement('a');
      a.href = BERNAMA_REPRINT_URL;
      a.target = '_blank';
      a.rel = 'noopener';
      a.className = (el.className ? el.className + ' ' : '') + 'underline underline-offset-2 hover:text-forest-700';
      a.textContent = 'NRES / Bernama';
      a.title = 'Bernama report, 14 June 2026: 76,361 wildlife conflict complaints and RM58.7 million estimated losses, 2021–May 2026';
      el.replaceWith(a);
    });
  }

  function init() {
    addSourceLink();
    var observer = new MutationObserver(addSourceLink);
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
