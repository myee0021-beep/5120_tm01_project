(function () {
  'use strict';

  var SNAKE_SPECIES_ID = 7;
  var snakeMedia = null;

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function firstResolvedMedia(payload) {
    var rows = (payload && payload.media) || [];
    for (var i = 0; i < rows.length; i += 1) {
      if (rows[i] && rows[i].image_url) return rows[i];
    }
    return null;
  }

  function fetchSnakeMedia() {
    return fetch('/api/species-media?species_id=' + SNAKE_SPECIES_ID, {
      method: 'GET',
      headers: { Accept: 'application/json' }
    }).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    }).then(firstResolvedMedia);
  }

  function imageHtml() {
    return '<img src="' + esc(snakeMedia.image_url) + '" alt="Snake" class="w-full h-full object-cover">';
  }

  function updateHomeSnake() {
    if (!snakeMedia) return;

    var row = document.querySelector('#home_animalList [data-value="snake"]');
    if (row) {
      var thumb = row.querySelector('span.w-7.h-7');
      if (thumb && thumb.getAttribute('data-db-snake-thumb') !== '1') {
        thumb.innerHTML = imageHtml();
        thumb.setAttribute('data-db-snake-thumb', '1');
      }

      if (row.getAttribute('data-db-snake-click') !== '1') {
        row.addEventListener('click', function () {
          setTimeout(updateSelectedSnake, 0);
          setTimeout(updateSelectedSnake, 50);
        });
        row.setAttribute('data-db-snake-click', '1');
      }
    }

    updateSelectedSnake();
  }

  function updateSelectedSnake() {
    if (!snakeMedia) return;
    var select = document.getElementById('home_animalSelect');
    if (!select || String(select.value).toLowerCase() !== 'snake') return;

    var selectedThumb = document.getElementById('home_animalBtnThumb');
    if (selectedThumb) {
      selectedThumb.innerHTML = imageHtml();
      selectedThumb.classList.remove('hidden');
      selectedThumb.classList.add('flex');
      selectedThumb.setAttribute('data-db-snake-thumb', '1');
    }
  }

  function updateAboutSnake() {
    if (!snakeMedia) return;
    var list = document.getElementById('about_photoList');
    if (!list || list.querySelector('[data-db-snake-photo="1"]')) return;

    var credit = snakeMedia.photographer ? 'Photo: ' + snakeMedia.photographer : 'Species ID 7 database photo';
    var licence = snakeMedia.licence ? ' · ' + snakeMedia.licence : '';
    var sourceUrl = snakeMedia.source_url || snakeMedia.stored_image_url || snakeMedia.image_url;

    var row = document.createElement('div');
    row.setAttribute('data-db-snake-photo', '1');
    row.className = 'flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3';
    row.innerHTML =
      '<div class="w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-slate-200 bg-white">' +
        imageHtml() +
      '</div>' +
      '<div class="min-w-0 flex-1">' +
        '<div class="font-display font-bold text-sm text-slate-900">Snake <span class="font-normal italic text-slate-400">/ Ular</span></div>' +
        '<div class="text-xs text-slate-500 mt-0.5">' + esc(credit + licence) + '</div>' +
      '</div>' +
      '<a href="' + esc(sourceUrl) + '" target="_blank" rel="noopener" class="shrink-0 text-forest-600 hover:text-forest-800 text-xs font-bold inline-flex items-center gap-1">' +
        '<span data-en>View source</span><span data-bm>Lihat sumber</span> ↗' +
      '</a>';

    list.appendChild(row);
  }

  function applyAll() {
    updateHomeSnake();
    updateAboutSnake();
  }

  function boot() {
    applyAll();
    var observer = new MutationObserver(function () { applyAll(); });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    window.addEventListener('hashchange', function () { setTimeout(applyAll, 0); });
    document.addEventListener('click', function () { setTimeout(applyAll, 0); });
  }

  fetchSnakeMedia().then(function (media) {
    snakeMedia = media;
    if (!snakeMedia) {
      console.warn('[RoomForBoth] species_id=7 has no resolved image_url.');
      return;
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', boot, { once: true });
    } else {
      boot();
    }
  }).catch(function (err) {
    console.warn('[RoomForBoth] Failed to load species_id=7 snake photo.', err && err.message ? err.message : err);
  });
})();
