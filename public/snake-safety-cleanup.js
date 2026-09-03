(function () {
  'use strict';

  var ALERT_SVG = '<svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3 2 20h20L12 3z"/><line x1="12" y1="10" x2="12" y2="14.5"/><circle cx="12" cy="17.3" r=".6" fill="currentColor" stroke="none"/></svg>';

  function replaceSnakeImages(root) {
    (root || document).querySelectorAll('img[src*="naja-sumatrana.jpg"]').forEach(function (img) {
      var box = img.parentElement;
      if (!box) return;
      box.innerHTML = ALERT_SVG;
      box.classList.add('flex', 'items-center', 'justify-center', 'text-amber-500');
    });
  }

  function removeSnakeSourceLinks(root) {
    (root || document).querySelectorAll('a[href*="106451-Naja-sumatrana"], a[href*="naja-sumatrana"]').forEach(function (link) {
      link.remove();
    });
  }

  function removeOldSnakePhotoCopy(root) {
    var walker = document.createTreeWalker(root || document.body, NodeFilter.SHOW_TEXT);
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function (node) {
      var text = String(node.nodeValue || '');
      if (/representative\s+Naja\s+sumatrana\s+photo/i.test(text) || /foto\s+wakil\s+Naja\s+sumatrana/i.test(text)) {
        node.nodeValue = text
          .replace(/Snake safety route\s*[—-]\s*representative\s+Naja\s+sumatrana\s+photo/gi, 'Snake safety route — no species photo shown')
          .replace(/Laluan keselamatan ular\s*[—-]\s*foto\s+wakil\s+Naja\s+sumatrana/gi, 'Laluan keselamatan ular — tiada foto spesies ditunjukkan')
          .replace(/representative\s+Naja\s+sumatrana\s+photo/gi, 'no species photo shown')
          .replace(/foto\s+wakil\s+Naja\s+sumatrana/gi, 'tiada foto spesies ditunjukkan');
      }
    });
  }

  function removeAboutSnakeSource() {
    var photoList = document.getElementById('about_photoList');
    if (!photoList) return;
    Array.prototype.slice.call(photoList.children).forEach(function (row) {
      var text = String(row.textContent || '');
      var hasSnakeImage = !!row.querySelector('img[src*="naja-sumatrana.jpg"]');
      var hasSnakeLink = !!row.querySelector('a[href*="106451-Naja-sumatrana"], a[href*="naja-sumatrana"]');
      if (hasSnakeImage || hasSnakeLink || /Naja\s+sumatrana/i.test(text)) row.remove();
    });
  }

  function clean(root) {
    replaceSnakeImages(root || document);
    removeSnakeSourceLinks(root || document);
    removeOldSnakePhotoCopy(root || document.body);
    removeAboutSnakeSource();
  }

  function init() {
    clean(document);
    var observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        Array.prototype.forEach.call(mutation.addedNodes || [], function (node) {
          if (node.nodeType === Node.ELEMENT_NODE) clean(node);
        });
      });
      removeAboutSnakeSource();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
