(function () {
  'use strict';

  var STATE_LABELS = {
    johor: 'Johor',
    kedah: 'Kedah',
    kelantan: 'Kelantan',
    melaka: 'Melaka',
    'negeri-sembilan': 'Negeri Sembilan',
    pahang: 'Pahang',
    perak: 'Perak',
    perlis: 'Perlis',
    penang: 'Pulau Pinang',
    'pulau-pinang': 'Pulau Pinang',
    sabah: 'Sabah',
    sarawak: 'Sarawak',
    selangor: 'Selangor',
    terengganu: 'Terengganu',
    kl: 'Kuala Lumpur',
    'kuala-lumpur': 'Kuala Lumpur',
    labuan: 'Labuan',
    putrajaya: 'Putrajaya'
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
      if (window.AppNav && AppNav.currentQuery) {
        candidates.push(new URLSearchParams(AppNav.currentQuery).get('state'));
      }
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

  function removeCardFromChild(id) {
    var child = document.getElementById(id);
    if (!child) return;
    var card = child.closest('.card');
    if (card) card.remove();
  }

  function cleanPlanResult() {
    // Do not depend on the SPA hash format. If Plan Result DOM is present,
    // clean it. This also makes the patch resilient to future router changes.
    var heading = document.getElementById('plan-result__stateHeading');
    var notice = document.getElementById('plan-result__dataNotice');
    var neighbour = document.getElementById('plan-result__neighbourCard');
    var encountersBadge = document.getElementById('plan-result__encountersBadge');
    if (!heading && !notice && !neighbour && !encountersBadge) return;

    if (notice) {
      notice.classList.add('hidden');
      notice.setAttribute('aria-hidden', 'true');
      notice.style.display = 'none';
    }

    var rawState = readState();
    var key = normaliseState(rawState);
    if (heading && rawState) {
      heading.textContent = STATE_LABELS[key] || rawState;
      heading.dataset.liveState = key || rawState;
    }

    if (neighbour) neighbour.remove();

    // Remove the full Iteration 3 card as soon as any of its known children
    // exists in the DOM.
    removeCardFromChild('plan-result__encountersBadge');
    removeCardFromChild('plan-result__encountersDescription');
    removeCardFromChild('plan-result__encountersBtn');
  }

  function runSoon() {
    cleanPlanResult();
    setTimeout(cleanPlanResult, 0);
    setTimeout(cleanPlanResult, 120);
    setTimeout(cleanPlanResult, 500);
    setTimeout(cleanPlanResult, 1200);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runSoon, { once: true });
  } else {
    runSoon();
  }

  window.addEventListener('hashchange', runSoon);
  window.addEventListener('popstate', runSoon);
  document.addEventListener('roomforboth:pageshow', runSoon);

  var observer = new MutationObserver(function () {
    cleanPlanResult();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
