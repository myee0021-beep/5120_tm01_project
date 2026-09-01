(function () {
  'use strict';

  var BERNAMA_REPRINT_URL = 'https://www.thestar.com.my/news/nation/2026/06/14/wildlife-conflict-complaints-top-76000-since-2021-losses-reach-rm587mil';
  var SOURCE_TITLE = 'Bernama report, 14 June 2026: 76,361 wildlife conflict complaints and RM58.7 million estimated losses, 2021–May 2026';

  function wrapElementWithExternalLink(el, label) {
    if (!el || (el.closest && el.closest('a'))) return;
    var a = document.createElement('a');
    a.href = BERNAMA_REPRINT_URL;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.className = (el.className ? el.className + ' ' : '') + 'underline underline-offset-2 hover:text-emerald-300 transition-colors';
    a.title = SOURCE_TITLE;
    a.setAttribute('aria-label', 'Open external source for the 76,361 complaints and RM58.7 million losses figure');
    a.innerHTML = label || el.innerHTML;
    el.replaceWith(a);
  }

  function addSourceLink() {
    var candidates = Array.prototype.slice.call(document.querySelectorAll('span, p, div'));

    candidates.forEach(function (el) {
      if (!el || (el.closest && el.closest('a'))) return;
      var text = (el.textContent || '').trim();

      // Home-page headline source line: make the whole attribution directly clickable.
      if (/^Source:\s*NRES,\s*2021[–-]May 2026\s*[·•]\s*RM58\.7M in losses$/i.test(text)) {
        wrapElementWithExternalLink(el, el.innerHTML + ' ↗');
        return;
      }

      // Compact NRES provenance label elsewhere on the site.
      if (text === 'NRES') {
        wrapElementWithExternalLink(el, 'NRES / Bernama ↗');
      }
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
