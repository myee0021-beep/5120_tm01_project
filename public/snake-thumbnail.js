(function () {
  'use strict';

  var snakeImageUrl = '';

  function firstResolvedImage(payload) {
    var rows = (payload && payload.media) || [];
    for (var i = 0; i < rows.length; i += 1) {
      if (rows[i] && rows[i].image_url) return rows[i].image_url;
    }
    return '';
  }

  function fetchSnakeImage(speciesId) {
    return fetch('/api/species-media?species_id=' + encodeURIComponent(speciesId), {
      method: 'GET',
      headers: { Accept: 'application/json' }
    }).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    }).then(firstResolvedImage);
  }

  function loadSnakeImage() {
    // Prefer the database photo for species_id 4 (python). If that row has
    // no usable media, fall back to species_id 7 (cobra).
    return fetchSnakeImage(4).then(function (url) {
      if (url) return url;
      return fetchSnakeImage(7);
    }).catch(function () {
      return fetchSnakeImage(7).catch(function () { return ''; });
    });
  }

  function imageMarkup(url) {
    return '<img src="' + String(url).replace(/"/g, '&quot;') + '" alt="Snake" class="w-full h-full object-cover">';
  }

  function applySnakeThumbnail() {
    if (!snakeImageUrl) return false;

    var row = document.querySelector('#home_animalList [data-value="snake"]');
    if (!row) return false;

    var thumb = row.querySelector('span.w-7.h-7');
    if (thumb && thumb.getAttribute('data-db-snake-thumb') !== '1') {
      thumb.innerHTML = imageMarkup(snakeImageUrl);
      thumb.setAttribute('data-db-snake-thumb', '1');
    }

    if (row.getAttribute('data-db-snake-click') !== '1') {
      row.addEventListener('click', function () {
        // The V1.2 click handler first applies its embedded generic snake
        // icon. Run immediately afterwards and replace it with the DB photo.
        var selectedThumb = document.getElementById('home_animalBtnThumb');
        if (selectedThumb && snakeImageUrl) {
          selectedThumb.innerHTML = imageMarkup(snakeImageUrl);
          selectedThumb.classList.remove('hidden');
          selectedThumb.classList.add('flex');
        }
      });
      row.setAttribute('data-db-snake-click', '1');
    }

    var select = document.getElementById('home_animalSelect');
    var selectedThumb = document.getElementById('home_animalBtnThumb');
    if (select && select.value === 'snake' && selectedThumb) {
      selectedThumb.innerHTML = imageMarkup(snakeImageUrl);
      selectedThumb.classList.remove('hidden');
      selectedThumb.classList.add('flex');
    }

    return true;
  }

  function watchForDropdown() {
    if (applySnakeThumbnail()) return;
    var observer = new MutationObserver(function () {
      if (applySnakeThumbnail()) observer.disconnect();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  loadSnakeImage().then(function (url) {
    snakeImageUrl = url || '';
    if (!snakeImageUrl) return;
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', watchForDropdown, { once: true });
    } else {
      watchForDropdown();
    }
  });
})();
