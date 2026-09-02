(function () {
  'use strict';

  var GENERAL_IMAGE_URL = '/general-guidance-artwork.svg';

  function isGeneralRoute() {
    try {
      return String((window.APP && window.APP.speciesId) || '').toLowerCase() === 'general';
    } catch (e) {
      return false;
    }
  }

  function patchGeneralSpecies() {
    if (!Array.isArray(window.SPECIES)) return;
    var general = window.SPECIES.find(function (s) { return s && s.id === 'general'; });
    if (!general) return;
    general.photo = general.photo || {};
    general.photo.dataUri = GENERAL_IMAGE_URL;
    general.photo.creditEn = '';
    general.photo.creditBm = '';
    general.photo.sourceUrl = '';
  }

  function patchGeneralImageIn(root) {
    root = root || document;
    var images = root.querySelectorAll ? root.querySelectorAll('img') : [];
    Array.prototype.forEach.call(images, function (img) {
      var alt = String(img.getAttribute('alt') || '').toLowerCase();
      var src = String(img.getAttribute('src') || '');
      if (isGeneralRoute() && (alt.indexOf('general guidance') !== -1 || src.indexOf('data:image') === 0 || img.closest('#auth_iconBox'))) {
        img.src = GENERAL_IMAGE_URL;
        img.alt = 'Natural Heritage Protection';
        img.onerror = null;
      }
    });
  }

  function hideGeneralPhotoCredit() {
    if (!isGeneralRoute()) return;
    ['auth_photoCredit', 'sp_photoCredit'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.classList.add('hidden');
    });
    ['auth_photoSourceLink', 'sp_photoSourceLink'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) {
        el.removeAttribute('href');
        el.style.display = 'none';
      }
    });
  }

  function patchGeneralHeroBackground() {
    if (!isGeneralRoute()) return;
    var headings = Array.prototype.filter.call(document.querySelectorAll('h1,h2,h3'), function (el) {
      var text = String(el.textContent || '').toLowerCase();
      return text.indexOf('general guidance') !== -1 || text.indexOf('panduan am') !== -1;
    });
    headings.forEach(function (heading) {
      var node = heading;
      for (var i = 0; i < 7 && node; i += 1, node = node.parentElement) {
        var style = window.getComputedStyle(node);
        if (style.backgroundImage && style.backgroundImage !== 'none') {
          node.style.backgroundImage = 'linear-gradient(rgba(5,24,17,.72),rgba(5,24,17,.72)),url("' + GENERAL_IMAGE_URL + '")';
          node.style.backgroundSize = 'cover';
          node.style.backgroundPosition = 'center';
          break;
        }
      }
    });
  }

  function apply() {
    patchGeneralSpecies();
    if (!isGeneralRoute()) return;
    patchGeneralImageIn(document);
    hideGeneralPhotoCredit();
    patchGeneralHeroBackground();
  }

  function init() {
    patchGeneralSpecies();
    setTimeout(apply, 0);
    setTimeout(apply, 200);
    setTimeout(apply, 600);
    document.addEventListener('click', function () { setTimeout(apply, 0); }, true);
    window.addEventListener('hashchange', function () { setTimeout(apply, 0); });
    window.addEventListener('roomforboth:db-ready', function () { setTimeout(apply, 0); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
