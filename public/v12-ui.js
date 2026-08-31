(function () {
  'use strict';

  function syncAppBridge() {
    // The original page declares APP as a global lexical binding in some builds.
    // Such bindings are readable as APP but are not guaranteed to appear on window.
    // api-data.js reads window.APP, so keep a shared reference here.
    try {
      if (typeof APP !== 'undefined' && APP) window.APP = APP;
    } catch (e) {}
    return window.APP || null;
  }

  function setHtml(el, html) {
    if (el) el.innerHTML = html;
  }

  function safeSpecies() {
    var app = syncAppBridge();
    var speciesId = app && app.speciesId ? app.speciesId : 'general';
    if (typeof window.getSpecies === 'function') {
      return getSpecies(speciesId);
    }
    return (window.SPECIES || []).find(function (s) {
      return s.id === speciesId;
    }) || { id: 'general', en: 'Species', bm: 'Spesies', icon: 'general', statusEn: '', statusBm: '' };
  }

  function safeLink(id, page) {
    var el = document.getElementById(id);
    if (!el) return;
    el.onclick = function (e) {
      if (e) e.preventDefault();
      syncAppBridge();
      goTo(page, {});
    };
  }

  function installDbOnlyPageSkeletons() {
    window.render_authority = function () {
      syncAppBridge();
      var s = safeSpecies();
      document.title = (s.id === 'snake' ? 'Who deals with this' : 'Who deals with this — ' + (s.en || '')) + ' | Room for Both';

      if (typeof window.renderCrumb === 'function') renderCrumb('auth', s, 'Immediate safety', 'Keselamatan segera');
      if (typeof window.renderIdentityHeader === 'function') renderIdentityHeader('auth', s, 'Who Deals With This', 'Siapa Mengendalikannya');

      safeLink('auth_crumbWhatToDo', s.id === 'snake' ? 'snakewhattodo' : 'whattodo');
      safeLink('auth_backToWhatToDo', s.id === 'snake' ? 'snakewhattodo' : 'whattodo');

      var status = document.getElementById('auth_statusText');
      if (status) status.innerHTML = '<span data-en>' + (s.statusEn || '') + '</span><span data-bm>' + (s.statusBm || '') + '</span>';

      var speciesName = document.getElementById('auth_checklistSpeciesName');
      if (speciesName) {
        speciesName.textContent = s.id === 'snake'
          ? 'Describe what you saw, in your own words'
          : [s.en, s.bm].filter(Boolean).join(' / ');
      }

      ['auth_categoryNote'].forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.classList.add('hidden');
      });

      var script = document.getElementById('auth_scriptList');
      if (script) script.innerHTML = '';
      var willDo = document.getElementById('auth_willDo');
      if (willDo) willDo.textContent = '';
      var wontDo = document.getElementById('auth_wontDo');
      if (wontDo) wontDo.textContent = '';

      var print = document.getElementById('auth_printBtn');
      if (print) print.onclick = function () { window.print(); };
      if (typeof window.setLang === 'function') setLang(localStorage.getItem('owm-lang') || 'en');
    };

    window.render_findable = function () {
      syncAppBridge();
      var s = safeSpecies();
      document.title = (s.id === 'snake' ? 'Keep it findable' : 'Keep it findable — ' + (s.en || '')) + ' | Room for Both';

      if (typeof window.renderCrumb === 'function') renderCrumb('kif', s, 'Immediate safety', 'Keselamatan segera');
      if (typeof window.renderIdentityHeader === 'function') renderIdentityHeader('kif', s, 'Keep It Findable', 'Kekalkan Boleh Dijumpai');

      safeLink('kif_backToWhatToDo', s.id === 'snake' ? 'snakewhattodo' : 'whattodo');

      var where = document.getElementById('kif_whereText');
      if (where) where.textContent = '';
      var observe = document.getElementById('kif_observeDistanceText');
      if (observe) observe.textContent = '';
      var tips = document.getElementById('kif_tipsList');
      if (tips) tips.innerHTML = '';

      var oldLostSight = document.getElementById('kif_lostSightContent');
      if (oldLostSight && oldLostSight.parentElement) oldLostSight.parentElement.classList.add('hidden');

      var stop = document.getElementById('kif_stopComingBackLink');
      if (stop) stop.classList.add('hidden');

      if (typeof window.setLang === 'function') setLang(localStorage.getItem('owm-lang') || 'en');
    };
  }

  function populateHomeStates() {
    var select = document.getElementById('home_stateSelect');
    if (!select || !window.STATES) return;
    select.innerHTML = '<option value="">Select state…</option>' + STATES.map(function (st) {
      return '<option value="' + st.id + '">' + st.name + '</option>';
    }).join('');
    select.setAttribute('data-source', 'neon:state');
  }

  function upgradePreventionSection() {
    var oldWrap = document.getElementById('kif_lostSightPreventionWrap');
    if (oldWrap && !document.getElementById('kif_preventionWrap')) {
      var card = oldWrap.closest('#kif_lostSightContent') && oldWrap.closest('#kif_lostSightContent').parentElement;
      var host = card && card.parentElement;
      var section = document.createElement('div');
      section.id = 'kif_preventionWrap';
      section.className = 'rounded-xl border border-slate-200 bg-white px-4 py-4';
      section.innerHTML =
        '<h4 class="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3">' +
          '<span data-en>Prevent this happening again</span><span data-bm>Cegah perkara ini berulang</span>' +
        '</h4>' +
        '<div id="kif_preventionList" class="space-y-2"></div>' +
        '<p id="kif_preventionSource" class="hidden mt-2 text-[11px] text-slate-400"></p>' +
        '<p id="kif_preventionEmpty" class="hidden text-sm text-slate-400">' +
          '<span data-en>No verified prevention guidance recorded for this species yet.</span>' +
          '<span data-bm>Belum ada panduan pencegahan yang disahkan untuk spesies ini.</span>' +
        '</p>';
      if (host && card) host.insertBefore(section, card.nextSibling);
      oldWrap.remove();
      if (card) card.classList.add('hidden');
    }
  }

  function upgradeNavigation() {
    var authorityNext = document.getElementById('auth_findableLink');
    if (authorityNext) {
      authorityNext.classList.remove('hidden');
      authorityNext.onclick = function (e) { if (e) e.preventDefault(); syncAppBridge(); goTo('species'); };
      setHtml(authorityNext.querySelector('span[data-en]'), 'Next: Species information');
      setHtml(authorityNext.querySelector('span[data-bm]'), 'Seterusnya: Maklumat spesies');
    }

    var findableBack = document.getElementById('kif_backToAuthority');
    if (findableBack) {
      findableBack.id = 'kif_backToWhatToDo';
      findableBack.onclick = function (e) {
        if (e) e.preventDefault();
        var app = syncAppBridge();
        goTo(app && app.speciesId === 'snake' ? 'snakewhattodo' : 'whattodo');
      };
      setHtml(findableBack.querySelector('span[data-en]'), 'Back to what to do now');
      setHtml(findableBack.querySelector('span[data-bm]'), 'Kembali ke apa perlu dibuat');
    }

    var done = document.getElementById('kif_doneLink');
    if (done) {
      done.onclick = function (e) { if (e) e.preventDefault(); syncAppBridge(); goTo('species'); };
      setHtml(done.querySelector('span[data-en]'), 'Next: Species information');
      setHtml(done.querySelector('span[data-bm]'), 'Seterusnya: Maklumat spesies');
    }

    var stop = document.getElementById('kif_stopComingBackLink');
    if (stop) stop.classList.add('hidden');

    var backSpecies = document.getElementById('wtd_backToSpecies');
    if (backSpecies) {
      backSpecies.onclick = function (e) { if (e) e.preventDefault(); syncAppBridge(); goTo('identify'); };
      setHtml(backSpecies.querySelector('span[data-en]'), 'Back to identify');
      setHtml(backSpecies.querySelector('span[data-bm]'), 'Kembali ke kenal pasti');
    }
  }

  function upgradeBreadcrumbs() {
    var authSpecies = document.getElementById('auth_crumbSpecies');
    if (authSpecies) {
      authSpecies.id = 'auth_crumbWhatToDo';
      authSpecies.onclick = function (e) {
        if (e) e.preventDefault();
        var app = syncAppBridge();
        goTo(app && app.speciesId === 'snake' ? 'snakewhattodo' : 'whattodo');
      };
      authSpecies.innerHTML = '<span data-en>What to do now</span><span data-bm>Apa Perlu Dibuat</span>';
    }
    var kifSpecies = document.getElementById('kif_crumbSpecies');
    if (kifSpecies) {
      kifSpecies.id = 'kif_crumbWhatToDo';
      kifSpecies.onclick = function (e) {
        if (e) e.preventDefault();
        var app = syncAppBridge();
        goTo(app && app.speciesId === 'snake' ? 'snakewhattodo' : 'whattodo');
      };
      kifSpecies.innerHTML = '<span data-en>What to do now</span><span data-bm>Apa Perlu Dibuat</span>';
    }
  }

  function wrapGoToForStates() {
    if (typeof window.goTo !== 'function' || window.goTo.__v12Wrapped) return;
    var original = window.goTo;
    window.goTo = function (page, opts) {
      syncAppBridge();
      var result = original.apply(this, arguments);
      syncAppBridge();
      if (page === 'states' && window.RoomForBothDB) RoomForBothDB.renderStatesFromDb();
      return result;
    };
    window.goTo.__v12Wrapped = true;
  }

  function prepare() {
    syncAppBridge();
    populateHomeStates();
    upgradePreventionSection();
    upgradeNavigation();
    upgradeBreadcrumbs();
    installDbOnlyPageSkeletons();
    wrapGoToForStates();
    syncAppBridge();
    if (typeof window.setLang === 'function') setLang(localStorage.getItem('owm-lang') || 'en');
  }

  window.RoomForBothV12 = { prepare: prepare, syncAppBridge: syncAppBridge };
})();
