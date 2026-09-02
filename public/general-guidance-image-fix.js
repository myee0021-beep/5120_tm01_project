(function () {
  'use strict';

  var TAXON_ID = 346360;
  var SOURCE_URL = 'https://www.inaturalist.org/taxa/346360-Dillenia-suffruticosa';
  var imageUrl = '';
  var creditEn = 'iNaturalist — Dillenia suffruticosa';
  var creditBm = 'iNaturalist — Dillenia suffruticosa';

  function isGeneralRoute() {
    try {
      return String((window.APP && window.APP.speciesId) || '').toLowerCase() === 'general';
    } catch (e) {
      return false;
    }
  }

  function getGeneralSpecies() {
    if (!Array.isArray(window.SPECIES)) return null;
    return window.SPECIES.find(function (s) { return s && s.id === 'general'; }) || null;
  }

  function patchGeneralSpecies() {
    if (!imageUrl) return;
    var general = getGeneralSpecies();
    if (!general) return;
    general.photo = general.photo || {};
    general.photo.dataUri = imageUrl;
    general.photo.creditEn = creditEn;
    general.photo.creditBm = creditBm;
    general.photo.sourceUrl = SOURCE_URL;
  }

  function patchVisibleGeneralImage() {
    if (!isGeneralRoute() || !imageUrl) return;

    var selectors = [
      '#auth_iconBox img',
      '#sp_iconBox img',
      '#kif_iconBox img',
      'img[alt="General guidance"]',
      'img[alt="Panduan Am"]'
    ];

    document.querySelectorAll(selectors.join(',')).forEach(function (img) {
      img.src = imageUrl;
      img.alt = currentLang() === 'bm' ? 'Dillenia suffruticosa' : 'Dillenia suffruticosa';
      img.onerror = null;
    });

    ['auth_photoCredit', 'sp_photoCredit', 'kif_photoCredit'].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.classList.remove('hidden');
      var en = el.querySelector('[data-en]');
      var bm = el.querySelector('[data-bm]');
      if (en) en.textContent = creditEn;
      if (bm) bm.textContent = creditBm;
      if (!en && !bm) el.textContent = currentLang() === 'bm' ? creditBm : creditEn;
    });

    ['auth_photoSourceLink', 'sp_photoSourceLink', 'kif_photoSourceLink'].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.href = SOURCE_URL;
      el.target = '_blank';
      el.rel = 'noopener';
      el.style.display = '';
    });
  }

  function currentLang() {
    return document.documentElement.lang === 'bm' ? 'bm' : 'en';
  }

  function apply() {
    patchGeneralSpecies();
    patchVisibleGeneralImage();
  }

  function loadPhoto() {
    return fetch('https://api.inaturalist.org/v1/taxa/' + TAXON_ID, {
      headers: { Accept: 'application/json' }
    })
      .then(function (res) {
        if (!res.ok) throw new Error('iNaturalist HTTP ' + res.status);
        return res.json();
      })
      .then(function (payload) {
        var taxon = payload && payload.results && payload.results[0];
        var photo = taxon && taxon.default_photo;
        if (!photo) throw new Error('No default photo returned');

        imageUrl = photo.medium_url || photo.url || photo.square_url || '';
        if (!imageUrl) throw new Error('No usable photo URL returned');

        var attribution = String(photo.attribution || '').trim();
        if (attribution) {
          creditEn = 'iNaturalist — ' + attribution;
          creditBm = 'iNaturalist — ' + attribution;
        }
        apply();
      })
      .catch(function (err) {
        console.warn('[Room for Both] General Guidance iNaturalist photo could not be loaded:', err.message);
      });
  }

  function init() {
    loadPhoto();
    document.addEventListener('click', function () { setTimeout(apply, 0); }, true);
    window.addEventListener('hashchange', function () { setTimeout(apply, 0); });
    window.addEventListener('roomforboth:db-ready', function () { setTimeout(apply, 0); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
