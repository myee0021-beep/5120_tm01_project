(function () {
  'use strict';

  function setHtml(el, html) {
    if (el) el.innerHTML = html;
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
    // Older deployed markup nests prevention inside the "no longer visible"
    // disclosure. V1.2 presents it as a standalone verified-data section.
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
      authorityNext.onclick = function (e) { if (e) e.preventDefault(); goTo('species'); };
      setHtml(authorityNext.querySelector('span[data-en]'), 'Next: Species information');
      setHtml(authorityNext.querySelector('span[data-bm]'), 'Seterusnya: Maklumat spesies');
    }

    var findableBack = document.getElementById('kif_backToAuthority');
    if (findableBack) {
      findableBack.id = 'kif_backToWhatToDo';
      findableBack.onclick = function (e) {
        if (e) e.preventDefault();
        goTo(APP.speciesId === 'snake' ? 'snakewhattodo' : 'whattodo');
      };
      setHtml(findableBack.querySelector('span[data-en]'), 'Back to what to do now');
      setHtml(findableBack.querySelector('span[data-bm]'), 'Kembali ke apa perlu dibuat');
    }

    var done = document.getElementById('kif_doneLink');
    if (done) {
      done.onclick = function (e) { if (e) e.preventDefault(); goTo('species'); };
      setHtml(done.querySelector('span[data-en]'), 'Next: Species information');
      setHtml(done.querySelector('span[data-bm]'), 'Seterusnya: Maklumat spesies');
    }

    var stop = document.getElementById('kif_stopComingBackLink');
    if (stop) stop.classList.add('hidden');

    var backSpecies = document.getElementById('wtd_backToSpecies');
    if (backSpecies) {
      backSpecies.onclick = function (e) { if (e) e.preventDefault(); goTo('identify'); };
      setHtml(backSpecies.querySelector('span[data-en]'), 'Back to identify');
      setHtml(backSpecies.querySelector('span[data-bm]'), 'Kembali ke kenal pasti');
    }
  }

  function upgradeBreadcrumbs() {
    var authSpecies = document.getElementById('auth_crumbSpecies');
    if (authSpecies) {
      authSpecies.id = 'auth_crumbWhatToDo';
      authSpecies.onclick = function (e) { if (e) e.preventDefault(); goTo(APP.speciesId === 'snake' ? 'snakewhattodo' : 'whattodo'); };
      authSpecies.innerHTML = '<span data-en>What to do now</span><span data-bm>Apa Perlu Dibuat</span>';
    }
    var kifSpecies = document.getElementById('kif_crumbSpecies');
    if (kifSpecies) {
      kifSpecies.id = 'kif_crumbWhatToDo';
      kifSpecies.onclick = function (e) { if (e) e.preventDefault(); goTo(APP.speciesId === 'snake' ? 'snakewhattodo' : 'whattodo'); };
      kifSpecies.innerHTML = '<span data-en>What to do now</span><span data-bm>Apa Perlu Dibuat</span>';
    }
  }

  function wrapGoToForStates() {
    if (typeof window.goTo !== 'function' || window.goTo.__v12Wrapped) return;
    var original = window.goTo;
    window.goTo = function (page, opts) {
      var result = original.apply(this, arguments);
      if (page === 'states' && window.RoomForBothDB) {
        RoomForBothDB.renderStatesFromDb();
      }
      return result;
    };
    window.goTo.__v12Wrapped = true;
  }

  function prepare() {
    populateHomeStates();
    upgradePreventionSection();
    upgradeNavigation();
    upgradeBreadcrumbs();
    wrapGoToForStates();
    if (typeof window.setLang === 'function') setLang(localStorage.getItem('owm-lang') || 'en');
  }

  window.RoomForBothV12 = { prepare: prepare };
})();
