(function () {
  'use strict';

  var GENERAL_IMAGE = 'data:image/jpeg;base64,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';

  var STATE_ID_BY_NAME = {
    'Johor':'johor','Kedah':'kedah','Kelantan':'kelantan','Melaka':'melaka',
    'Negeri Sembilan':'negeri-sembilan','Pahang':'pahang','Perak':'perak','Perlis':'perlis',
    'Pulau Pinang':'penang','Sabah':'sabah','Sarawak':'sarawak','Selangor':'selangor',
    'Terengganu':'terengganu','Kuala Lumpur':'kl','Putrajaya':'putrajaya','Labuan':'labuan'
  };

  function currentLang() {
    return document.documentElement.lang === 'bm' ? 'bm' : 'en';
  }

  function optionValue(row) {
    var name = String((row && row.state_name) || '').trim();
    return STATE_ID_BY_NAME[name] || name.toLowerCase().replace(/\s+/g, '-');
  }

  function isVisible(el) {
    return !!(el && (el.offsetWidth || el.offsetHeight || el.getClientRects().length));
  }

  function patchGeneralSpeciesData() {
    if (!Array.isArray(window.SPECIES)) return;
    var general = window.SPECIES.find(function (s) { return s && s.id === 'general'; });
    if (!general) return;
    general.photo = general.photo || {};
    general.photo.dataUri = GENERAL_IMAGE;
    general.photo.creditEn = 'Room for Both illustration — Natural Heritage Protection';
    general.photo.creditBm = 'Ilustrasi Room for Both — Perlindungan Warisan Semula Jadi';
    general.photo.sourceUrl = '';
  }

  function patchVisibleGeneralHero() {
    var headings = Array.prototype.filter.call(document.querySelectorAll('h1,h2,h3'), function (el) {
      var text = (el.textContent || '').trim().toLowerCase();
      return isVisible(el) && (text.indexOf('general guidance') !== -1 || text.indexOf('panduan am') !== -1);
    });
    headings.forEach(function (heading) {
      var node = heading;
      for (var i = 0; i < 7 && node; i += 1, node = node.parentElement) {
        var bg = window.getComputedStyle(node).backgroundImage || '';
        if (bg && bg !== 'none') {
          node.style.backgroundImage = 'linear-gradient(rgba(5,24,17,.72),rgba(5,24,17,.72)),url("' + GENERAL_IMAGE + '")';
          node.style.backgroundSize = 'cover';
          node.style.backgroundPosition = 'center';
          node.setAttribute('data-general-guidance-artwork', 'natural-heritage-protection');
          break;
        }
      }
    });
  }

  function looksLikeAuthorityStateSelect(select) {
    if (!select || select.id === 'home_stateSelect') return false;
    var options = Array.prototype.map.call(select.options || [], function (o) { return (o.textContent || '').trim(); });
    var hits = options.filter(function (name) { return Object.prototype.hasOwnProperty.call(STATE_ID_BY_NAME, name); }).length;
    if (hits >= 2) return true;
    var nearby = select.closest('section,article,div');
    var text = nearby ? (nearby.textContent || '').toLowerCase() : '';
    return (text.indexOf('authority') !== -1 || text.indexOf('contact') !== -1 || text.indexOf('agensi') !== -1 || text.indexOf('hubungan') !== -1) && options.some(function (x) { return /select a state|pilih negeri/i.test(x); });
  }

  function populateAuthorityStates() {
    return fetch('/api/states', { method:'GET', headers:{Accept:'application/json'}, cache:'no-store' })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        var rows = Array.isArray(data.states) ? data.states : [];
        if (!rows.length) throw new Error('No states returned');
        var selects = Array.prototype.filter.call(document.querySelectorAll('select'), looksLikeAuthorityStateSelect);
        selects.forEach(function (select) {
          var previous = select.value || (window.APP && window.APP.stateId) || '';
          select.innerHTML = '';
          var placeholder = document.createElement('option');
          placeholder.value = '';
          placeholder.textContent = currentLang() === 'bm' ? '— pilih negeri —' : '— select a state —';
          select.appendChild(placeholder);
          rows.forEach(function (row) {
            var name = String(row.state_name || '').trim();
            if (!name) return;
            var option = document.createElement('option');
            option.value = optionValue(row);
            option.textContent = name;
            option.dataset.stateCode = String(row.state_code || '');
            option.dataset.jurisdictionType = String(row.jurisdiction_type || '');
            select.appendChild(option);
          });
          if (previous && Array.prototype.some.call(select.options, function (o) { return o.value === previous; })) select.value = previous;
          select.dataset.source = 'neon:/api/states';
          select.dataset.count = String(rows.length);
        });
        console.info('[Room for Both] Authority state selector populated from /api/states:', rows.length);
        return rows.length;
      })
      .catch(function (err) {
        console.warn('[Room for Both] Could not populate authority state selector from /api/states:', err.message);
        return 0;
      });
  }

  function apply() {
    patchGeneralSpeciesData();
    patchVisibleGeneralHero();
    populateAuthorityStates();
  }

  function init() {
    patchGeneralSpeciesData();
    setTimeout(apply, 0);
    setTimeout(apply, 350);
    document.addEventListener('click', function () { setTimeout(apply, 0); }, true);
    window.addEventListener('hashchange', function () { setTimeout(apply, 0); });
    window.addEventListener('roomforboth:db-ready', function () { setTimeout(apply, 0); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
