(function () {
  'use strict';

  // Use a neutral, non-venomous Malaysian/Southeast Asian snake as the
  // representative image for the generic snake-safety route. The page must
  // not imply that an unidentified snake is this species; this is display-only.
  var INAT_TAXON_ID = 26644; // Painted Bronzeback — Dendrelaphis pictus
  var INAT_TAXON_URL = 'https://www.inaturalist.org/taxa/' + INAT_TAXON_ID;
  var FALLBACK_PHOTO = '';
  var cachedPhotoUrl = '';

  function isSnakeImage(img) {
    var src = String(img.getAttribute('src') || '');
    var alt = String(img.getAttribute('alt') || '');
    return /naja-sumatrana|snake|ular/i.test(src + ' ' + alt);
  }

  function updateSnakeCopy(root) {
    var walker = document.createTreeWalker(root || document.body, NodeFilter.SHOW_TEXT);
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function (node) {
      var text = String(node.nodeValue || '');
      if (/Naja\s+sumatrana|no species photo shown|tiada foto spesies ditunjukkan/i.test(text)) {
        node.nodeValue = text
          .replace(/representative\s+Naja\s+sumatrana\s+photo/gi, 'representative non-venomous snake photo')
          .replace(/foto\s+wakil\s+Naja\s+sumatrana/gi, 'foto wakil ular tidak berbisa')
          .replace(/no species photo shown/gi, 'representative non-venomous snake photo')
          .replace(/tiada foto spesies ditunjukkan/gi, 'foto wakil ular tidak berbisa')
          .replace(/Naja\s+sumatrana/gi, 'Dendrelaphis pictus');
      }
    });
  }

  function updateSnakeSourceLinks(root) {
    (root || document).querySelectorAll('a[href*="106451-Naja-sumatrana"], a[href*="naja-sumatrana"], a[href*="26644"]').forEach(function (link) {
      link.href = INAT_TAXON_URL;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    });
  }

  function applyPhoto(root, photoUrl) {
    if (!photoUrl) return;
    (root || document).querySelectorAll('img').forEach(function (img) {
      if (!isSnakeImage(img)) return;
      img.src = photoUrl;
      img.alt = 'Representative non-venomous snake — Painted Bronzeback (Dendrelaphis pictus)';
      img.dataset.neutralSnakePhoto = 'true';
    });

    // Restore any snake image boxes that the previous cleanup version replaced
    // with an alert icon. The box can be identified by nearby snake-route copy.
    (root || document).querySelectorAll('svg').forEach(function (svg) {
      var box = svg.parentElement;
      if (!box) return;
      var context = String((box.parentElement && box.parentElement.textContent) || '');
      if (!/snake|ular/i.test(context)) return;
      if (!svg.querySelector('path[d="M12 3 2 20h20L12 3z"]')) return;
      var img = document.createElement('img');
      img.src = photoUrl;
      img.alt = 'Representative non-venomous snake — Painted Bronzeback (Dendrelaphis pictus)';
      img.className = 'w-full h-full object-cover';
      img.dataset.neutralSnakePhoto = 'true';
      box.innerHTML = '';
      box.appendChild(img);
      box.classList.remove('text-amber-500');
    });
  }

  function refresh(root) {
    updateSnakeCopy(root || document.body);
    updateSnakeSourceLinks(root || document);
    applyPhoto(root || document, cachedPhotoUrl || FALLBACK_PHOTO);
  }

  async function loadINaturalistPhoto() {
    try {
      var response = await fetch('https://api.inaturalist.org/v1/taxa/' + INAT_TAXON_ID);
      if (!response.ok) throw new Error('iNaturalist taxon request failed');
      var payload = await response.json();
      var photo = payload && payload.results && payload.results[0] && payload.results[0].default_photo;
      cachedPhotoUrl = photo && (photo.medium_url || photo.url || photo.square_url) || '';
    } catch (error) {
      console.warn('[RoomForBoth] Could not load neutral snake photo from iNaturalist', error);
    }
    refresh(document);
  }

  function init() {
    refresh(document);
    loadINaturalistPhoto();

    var observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        Array.prototype.forEach.call(mutation.addedNodes || [], function (node) {
          if (node.nodeType === Node.ELEMENT_NODE) refresh(node);
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
