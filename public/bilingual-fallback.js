(function () {
  'use strict';

  function isEmptyValue(value) {
    if (value === null || value === undefined) return true;
    var text = String(value).trim();
    return text === '' || text.toUpperCase() === 'NA' || text.toUpperCase() === 'N/A';
  }

  function makeMarker() {
    var marker = document.createElement('span');
    marker.className = 'ml-1 align-middle text-[9px] font-bold uppercase tracking-wide text-slate-400';
    marker.textContent = '(EN)';
    marker.setAttribute('data-fallback-marker', 'en');
    return marker;
  }

  function fillMalayFromEnglish(parent) {
    if (!parent || parent.nodeType !== Node.ELEMENT_NODE) return;

    var en = null;
    var bm = null;
    Array.prototype.forEach.call(parent.children || [], function (child) {
      if (!en && child.hasAttribute && child.hasAttribute('data-en')) en = child;
      if (!bm && child.hasAttribute && child.hasAttribute('data-bm')) bm = child;
    });

    if (!en) return;
    var enText = (en.textContent || '').trim();
    if (isEmptyValue(enText)) return;

    if (!bm) {
      bm = document.createElement(en.tagName.toLowerCase());
      Array.prototype.forEach.call(en.attributes || [], function (attr) {
        if (attr.name !== 'data-en' && attr.name !== 'id') bm.setAttribute(attr.name, attr.value);
      });
      bm.removeAttribute('data-en');
      bm.setAttribute('data-bm', '');
      parent.appendChild(bm);
    }

    var bmText = (bm.textContent || '').replace(/\(EN\)\s*$/i, '').trim();
    if (!isEmptyValue(bmText)) return;

    bm.innerHTML = en.innerHTML;
    bm.appendChild(makeMarker());
    bm.setAttribute('data-fallback-from', 'en');
  }

  function processPairScope(root) {
    root = root || document.body;
    if (!root || root.nodeType !== Node.ELEMENT_NODE) return;

    if (root.matches && root.matches('[data-en]') && root.parentElement) {
      fillMalayFromEnglish(root.parentElement);
    }

    Array.prototype.forEach.call(root.querySelectorAll ? root.querySelectorAll('[data-en]') : [], function (en) {
      if (en.parentElement) fillMalayFromEnglish(en.parentElement);
    });
  }

  function processDbPlainTextFallbacks(root) {
    // Some API-rendered fields are plain text rather than explicit data-en/data-bm pairs.
    // We do not invent Malay wording for those. If a paired Malay API field is missing,
    // api-data.js omits the data-bm span; processPairScope above creates the English + (EN)
    // fallback. Literal NA/N/A remains suppressed by the existing NA rule.
    return root;
  }

  function run(root) {
    processPairScope(root || document.body);
    processDbPlainTextFallbacks(root || document.body);
  }

  function init() {
    run(document.body);
    var observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        Array.prototype.forEach.call(mutation.addedNodes || [], function (node) {
          if (node.nodeType === Node.ELEMENT_NODE) run(node);
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
