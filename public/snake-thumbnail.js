(function () {
  'use strict';

  var SNAKE_SPECIES_ID = 7;
  var snakeImageUrl = '';

  function firstResolvedImage(payload) {
    var rows = (payload && payload.media) || [];
    for (var i = 0; i < rows.length; i += 1) {
      if (rows[i] && rows[i].image_url) return rows[i].image_url;
    }
    return '';
  }

  function fetchSnakeImage() {
    return fetch('/api/species-media?species_id=' + encodeURIComponent(SNAKE_SPECIES_ID), {
      method: 'GET',
      headers: { Accept: 'application/json' }
    }).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    }).then(firstResolvedImage);
  }

  function imageMarkup(url) {
    return '<img src="' + String(url).replace(/"/g, '&quot;') + '" alt="Snake" class="w-full h-full object-cover">';
  }

  function setThumbElement(el) {
    if (!el || !snakeImageUrl) return;
    el.innerHTML = imageMarkup(snakeImageUrl);
    el.setAttribute('data-db-snake-thumb', '1');
  }

  function getSnakeRow() {
    var exact = document.querySelector('#home_animalList [data-value="snake"]');
    if (exact) return exact;

    var scope = document.getElementById('home_animalList') || document;
    var candidates = scope.querySelectorAll('button, li, div');
    for (var i = 0; i < candidates.length; i += 1) {
      var text = (candidates[i].textContent || '').trim().toLowerCase();
      if (text === 'snake') return candidates[i];
    }
    return null;
  }

  function findRowThumb(row) {
    if (!row) return null;
    var marked = row.querySelector('[data-db-snake-thumb="1"]');
    if (marked) return marked;

    var nodes = row.querySelectorAll('span, div');
    for (var i = 0; i < nodes.length; i += 1) {
      var cls = (nodes[i].className || '').toString();
      if (/w-7|w-8|h-7|h-8|rounded-full/.test(cls)) return nodes[i];
    }
    return row.querySelector('span, div');
  }

  function updateSelectedThumb() {
    var select = document.getElementById('home_animalSelect');
    var selectedThumb = document.getElementById('home_animalBtnThumb');
    var selectedText = document.getElementById('home_animalBtnText');
    var isSnake = false;

    if (select && String(select.value).toLowerCase() === 'snake') isSnake = true;
    if (selectedText && /snake/i.test(selectedText.textContent || '')) isSnake = true;

    if (isSnake && selectedThumb) {
      setThumbElement(selectedThumb);
      selectedThumb.classList.remove('hidden');
      selectedThumb.classList.add('flex');
    }
  }

  function bindRowClick(row) {
    if (!row || row.getAttribute('data-db-snake-click') === '1') return;
    row.addEventListener('click', function () {
      window.setTimeout(updateSelectedThumb, 0);
      window.setTimeout(updateSelectedThumb, 50);
      window.setTimeout(updateSelectedThumb, 150);
    });
    row.setAttribute('data-db-snake-click', '1');
  }

  function applySnakeThumbnail() {
    if (!snakeImageUrl) return false;

    var row = getSnakeRow();
    if (row) {
      var thumb = findRowThumb(row);
      if (thumb) setThumbElement(thumb);
      bindRowClick(row);
    }

    updateSelectedThumb();
    return Boolean(row);
  }

  function boot() {
    applySnakeThumbnail();

    var observer = new MutationObserver(function () {
      applySnakeThumbnail();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });

    var attempts = 0;
    var timer = setInterval(function () {
      applySnakeThumbnail();
      attempts += 1;
      if (attempts > 40) clearInterval(timer);
    }, 250);
  }

  fetchSnakeImage().then(function (url) {
    snakeImageUrl = url || '';
    if (!snakeImageUrl) return;
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', boot, { once: true });
    } else {
      boot();
    }
  }).catch(function (err) {
    console.warn('[RoomForBoth] Failed to load snake thumbnail from species 7.', err && err.message ? err.message : err);
  });
})();
