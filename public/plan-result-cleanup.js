(function () {
  'use strict';

  var STATE_LABELS = {
    johor: 'Johor', kedah: 'Kedah', kelantan: 'Kelantan', melaka: 'Melaka',
    'negeri-sembilan': 'Negeri Sembilan', pahang: 'Pahang', perak: 'Perak',
    perlis: 'Perlis', penang: 'Pulau Pinang', 'pulau-pinang': 'Pulau Pinang',
    sabah: 'Sabah', sarawak: 'Sarawak', selangor: 'Selangor',
    terengganu: 'Terengganu', kl: 'Kuala Lumpur', 'kuala-lumpur': 'Kuala Lumpur',
    labuan: 'Labuan', putrajaya: 'Putrajaya'
  };

  function normaliseState(value) {
    var raw = String(value || '').trim();
    if (!raw) return '';
    var key = raw.toLowerCase()
      .replace(/^w\.?p\.?\s*/i, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    if (key === 'pulau-pinang') key = 'penang';
    if (key === 'kuala-lumpur') key = 'kl';
    return key;
  }

  function readHomeAnswers() {
    try { return JSON.parse(sessionStorage.getItem('roomForBoth.homeAnswers') || 'null') || {}; }
    catch (e) { return {}; }
  }

  function readState() {
    var candidates = [];
    try {
      if (window.AppNav && AppNav.currentQuery) candidates.push(new URLSearchParams(AppNav.currentQuery).get('state'));
    } catch (e) {}
    try { candidates.push(new URLSearchParams(location.search).get('state')); } catch (e) {}
    try {
      var hash = String(location.hash || '');
      var q = hash.indexOf('?');
      if (q !== -1) candidates.push(new URLSearchParams(hash.slice(q + 1)).get('state'));
    } catch (e) {}
    var answers = readHomeAnswers();
    candidates.push(answers.state);
    try { candidates.push(sessionStorage.getItem('roomForBoth.selectedState')); } catch (e) {}
    for (var i = 0; i < candidates.length; i++) {
      var value = String(candidates[i] || '').trim();
      if (value) return value;
    }
    return '';
  }

  function hideElement(el) {
    if (!el) return;
    el.classList.add('hidden');
    el.setAttribute('aria-hidden', 'true');
    el.style.display = 'none';
  }

  function apply() {
    var heading = document.getElementById('plan-result__stateHeading');
    var notice = document.getElementById('plan-result__dataNotice');
    var encountersBadge = document.getElementById('plan-result__encountersBadge');

    // Hide only the generic demo notice. Leave all Plan Result content,
    // neighbour card, prevention rows and buttons untouched.
    hideElement(notice);

    // Hide the Iteration 3 card while preserving its DOM for the legacy
    // initialiser to write into safely.
    if (encountersBadge) {
      var encountersCard = encountersBadge.closest('.card');
      if (encountersCard) hideElement(encountersCard);
    }

    // Keep the resident's actual selected state visible.
    var rawState = readState();
    var key = normaliseState(rawState);
    var label = rawState ? (STATE_LABELS[key] || rawState) : '';
    if (heading && label && heading.textContent !== label) heading.textContent = label;
  }

  function runSoon() {
    apply();
    setTimeout(apply, 80);
    setTimeout(apply, 300);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', runSoon, { once: true });
  else runSoon();
  window.addEventListener('hashchange', runSoon);
  window.addEventListener('popstate', runSoon);
  document.addEventListener('roomforboth:pageshow', runSoon);
})();
