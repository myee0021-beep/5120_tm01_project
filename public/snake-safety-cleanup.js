(function () {
  'use strict';

  // Display-only representative snake photo. This must never be presented as
  // the identity of an unknown snake reported by a user.
  var INAT_TAXON_ID = 26644; // Painted Bronzeback — Dendrelaphis pictus
  var INAT_TAXON_URL = 'https://www.inaturalist.org/taxa/' + INAT_TAXON_ID;
  var cachedPhotoUrl = '';

  function neutralSnakeImage(photoUrl, className) {
    return '<img src="' + photoUrl + '" alt="Representative non-venomous snake — Painted Bronzeback (Dendrelaphis pictus)" class="' + (className || 'w-full h-full object-cover') + '" data-neutral-snake-photo="true">';
  }

  function updateSnakeCopy(root) {
    var walker = document.createTreeWalker(root || document.body, NodeFilter.SHOW_TEXT);
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function (node) {
      var text = String(node.nodeValue || '');
      if (/Naja\s+sumatrana|no species photo shown|tiada foto spesies ditunjukkan|No species name or photo shown for snakes|Tiada nama spesies atau foto ditunjukkan untuk ular/i.test(text)) {
        node.nodeValue = text
          .replace(/representative\s+Naja\s+sumatrana\s+photo/gi, 'representative non-venomous snake photo')
          .replace(/foto\s+wakil\s+Naja\s+sumatrana/gi, 'foto wakil ular tidak berbisa')
          .replace(/No species name or photo shown for snakes\s*[—-]\s*safety first/gi, 'Representative non-venomous snake photo — safety guidance only')
          .replace(/Tiada nama spesies atau foto ditunjukkan untuk ular\s*[—-]\s*keselamatan diutamakan/gi, 'Foto wakil ular tidak berbisa — untuk panduan keselamatan sahaja')
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

  function ancestorLooksSnake(el) {
    var cur = el;
    for (var i = 0; cur && i < 7; i++, cur = cur.parentElement) {
      var id = String(cur.id || '');
      var onclick = String(cur.getAttribute && cur.getAttribute('onclick') || '');
      var speciesId = String(cur.getAttribute && cur.getAttribute('data-species-id') || '');
      var text = String(cur.textContent || '');
      if (/snake/i.test(id) || speciesId === 'snake' || /snake|ular/i.test(onclick) || /snake|ular/i.test(text)) return true;
    }
    return false;
  }

  function replaceAlertGlyphs(root, photoUrl) {
    if (!photoUrl) return;
    (root || document).querySelectorAll('svg').forEach(function (svg) {
      var triangle = svg.querySelector('path[d="M12 3 2 20h20L12 3z"]');
      if (!triangle || !ancestorLooksSnake(svg)) return;
      var box = svg.parentElement;
      if (!box) return;
      box.innerHTML = neutralSnakeImage(photoUrl);
      box.classList.remove('text-amber-300', 'text-amber-500');
    });
  }

  function replaceKnownSnakeBoxes(root, photoUrl) {
    if (!photoUrl) return;

    // Dynamic identity headers on snake pages.
    (root || document).querySelectorAll('[id*="snake"][id$="_iconBox"], [data-species-id="snake"] .relative').forEach(function (box) {
      if (box.querySelector('[data-neutral-snake-photo="true"]')) return;
      box.innerHTML = neutralSnakeImage(photoUrl);
      box.classList.remove('text-amber-300', 'text-amber-500');
    });

    // Any remaining actual snake images, including old Naja asset references.
    (root || document).querySelectorAll('img').forEach(function (img) {
      var src = String(img.getAttribute('src') || '');
      var alt = String(img.getAttribute('alt') || '');
      if (!/naja-sumatrana|snake|ular/i.test(src + ' ' + alt) && !ancestorLooksSnake(img)) return;
      img.src = photoUrl;
      img.alt = 'Representative non-venomous snake — Painted Bronzeback (Dendrelaphis pictus)';
      img.dataset.neutralSnakePhoto = 'true';
    });
  }

  function exposePhotoToExistingRuntime(photoUrl) {
    if (!photoUrl) return;
    try {
      if (typeof STATIC_SNAKE_PHOTO !== 'undefined') STATIC_SNAKE_PHOTO = photoUrl;
      if (typeof STATIC_SNAKE_SOURCE !== 'undefined') STATIC_SNAKE_SOURCE = INAT_TAXON_URL;
      if (typeof ICONS !== 'undefined' && ICONS) ICONS.alert = neutralSnakeImage(photoUrl);
      if (typeof snakeStaticImageHtml === 'function') {
        // Future home/Identify renders will use the neutral photo through ICONS.alert.
      }
    } catch (e) {
      console.warn('[RoomForBoth] Could not expose neutral snake image to page runtime', e);
    }
  }

  function refresh(root) {
    updateSnakeCopy(root || document.body);
    updateSnakeSourceLinks(root || document);
    if (!cachedPhotoUrl) return;
    exposePhotoToExistingRuntime(cachedPhotoUrl);
    replaceKnownSnakeBoxes(root || document, cachedPhotoUrl);
    replaceAlertGlyphs(root || document, cachedPhotoUrl);
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
      // Dynamic route rendering may replace an existing iconBox without adding
      // a snake-labelled wrapper, so also rescan the document after each batch.
      refresh(document);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
