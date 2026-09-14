(function () {
  'use strict';

  var ROUTE_TO_DB_ID = {
    'macaque': 1,
    'wild-boar': 2,
    'boar': 2,
    'common-myna': 3,
    'myna': 3,
    'python': 4,
    'reticulated-python': 4,
    'house-crow': 5,
    'crow': 5,
    'water-monitor': 6,
    'monitor': 6,
    'spitting-cobra': 7,
    'cobra': 7,
    'snake': 7
  };

  function norm(v) {
    return String(v == null ? '' : v).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  function clean(v) {
    var t = String(v == null ? '' : v).trim();
    return (!t || /^(NA|N\/A)$/i.test(t)) ? '' : t;
  }

  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function getJson(url) {
    return fetch(url, { headers: { Accept: 'application/json' }, cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); });
  }

  function postJson(url, body) {
    return fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', Accept: 'application/json' },
      cache: 'no-store',
      body: JSON.stringify(body || {})
    }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); });
  }

  function currentStateId() {
    try {
      if (window.APP && window.APP.stateId) return String(window.APP.stateId);
    } catch (e) {}
    return '';
  }

  function stateNameFromId(id) {
    var key = norm(id);
    if (Array.isArray(window.STATES)) {
      var found = window.STATES.filter(function (s) {
        return norm(s.id) === key || norm(s.name) === key || norm(s.en) === key;
      })[0];
      if (found) return found.name || found.en || found.id;
    }
    return id;
  }

  function rowState(row) {
    return row && (row.state_key || row.state || row.state_name || row.statecode || row.state_code || row.jurisdiction || row.region);
  }

  function rowSpecies(row) {
    return row && (row.species_key || row.species || row.species_name || row.common_name || row.english_name || row.animal || row.animal_name || row.category);
  }

  function rowCount(row) {
    var keys = ['complaint_count','complaints','record_count','records','count','total','value','n'];
    for (var i = 0; i < keys.length; i++) {
      var n = Number(row && row[keys[i]]);
      if (Number.isFinite(n) && n >= 0) return n;
    }
    return 1;
  }

  function speciesRouteFromName(name) {
    var n = norm(name);
    var aliases = {
      'long-tailed-macaque': 'macaque',
      'macaque': 'macaque',
      'wild-boar': 'wild-boar',
      'common-myna': 'common-myna',
      'common-mynah': 'common-myna',
      'house-crow': 'house-crow',
      'water-monitor-lizard': 'water-monitor',
      'water-monitor': 'water-monitor',
      'reticulated-python': 'python',
      'python': 'python',
      'spitting-cobra': 'spitting-cobra',
      'cobra': 'spitting-cobra',
      'snake': 'snake'
    };
    return aliases[n] || n;
  }

  function syncStateFromComplaints(stateId) {
    if (!stateId) return Promise.resolve(false);
    var stateName = stateNameFromId(stateId);
    return getJson('/api/i2/complaints?state=' + encodeURIComponent(stateName)).then(function (payload) {
      var rows = (payload && payload.rows) || [];
      if (!rows.length || !Array.isArray(window.STATES)) return false;

      var total = rows.reduce(function (sum, row) { return sum + rowCount(row); }, 0);
      var speciesTotals = {};
      rows.forEach(function (row) {
        var species = clean(rowSpecies(row));
        if (!species) return;
        var route = speciesRouteFromName(species);
        speciesTotals[route] = (speciesTotals[route] || 0) + rowCount(row);
      });
      var topSpeciesId = Object.keys(speciesTotals).sort(function (a, b) {
        return speciesTotals[b] - speciesTotals[a];
      })[0];

      var target = window.STATES.filter(function (s) {
        return norm(s.id) === norm(stateId) || norm(s.name) === norm(stateName) || norm(s.en) === norm(stateName);
      })[0];
      if (!target) return false;

      target.records = total.toLocaleString('en-MY');
      if (topSpeciesId) target.topSpeciesId = topSpeciesId;
      target.__dbComplaints = rows;
      target.__dbSource = payload.table || 'complaints';

      try {
        if (window.APP && window.APP.currentPage === 'statedetail' && typeof window.render_statedetail === 'function') {
          window.render_statedetail();
        }
      } catch (e) {}
      return true;
    }).catch(function (err) {
      console.warn('[RoomForBoth] state -> complaints sync failed', err && err.message ? err.message : err);
      return false;
    });
  }

  function collectHomeAnswers() {
    var out = {};
    try {
      if (window.homeAnswers && typeof window.homeAnswers === 'object') Object.assign(out, window.homeAnswers);
    } catch (e) {}
    ['homeAnswers','home-answers','roomforboth-home-answers'].forEach(function (key) {
      try {
        var raw = localStorage.getItem(key) || sessionStorage.getItem(key);
        if (!raw) return;
        var parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') Object.assign(out, parsed);
      } catch (e) {}
    });
    return out;
  }

  function currentSpeciesContext() {
    var route = '';
    try { route = String((window.APP && window.APP.speciesId) || '').trim().toLowerCase(); } catch (e) {}
    var speciesId = ROUTE_TO_DB_ID[route] || null;
    var speciesName = '';
    try {
      if (typeof window.getSpecies === 'function') {
        var s = window.getSpecies(route || 'macaque');
        speciesName = s && (s.en || s.english_name || s.name) || '';
      }
    } catch (e) {}
    return { route: route, species_id: speciesId, species_name: speciesName };
  }

  function renderPlanRows(rows) {
    var list = document.getElementById('sicb_checklist') || document.getElementById('sicb_checklistList') || document.querySelector('#page-stopback .space-y-3');
    if (!list || !rows || !rows.length) return false;

    list.innerHTML = rows.map(function (row, index) {
      var en = clean(row.action_text_en);
      var bm = clean(row.action_text_ms);
      var source = clean(row.source_institution) || clean(row.source_person);
      var verified = clean(row.date_verified);
      var sourceUrl = clean(row.source_url);
      var sourceText = source ? ('Source: ' + source + (verified ? ', verified ' + verified : '')) : '';
      var sourceHtml = sourceText ? (sourceUrl
        ? '<a href="' + esc(sourceUrl) + '" target="_blank" rel="noopener" class="mt-1 inline-block text-[11px] text-slate-400 underline underline-offset-2">' + esc(sourceText) + '</a>'
        : '<span class="mt-1 inline-block text-[11px] text-slate-400">' + esc(sourceText) + '</span>') : '';
      return '<div class="check-item rounded-xl border border-slate-200 bg-white px-4 py-3.5" data-db-prevention-id="' + esc(row.prevention_id || index + 1) + '">' +
        '<div class="flex gap-3"><span class="shrink-0 w-6 h-6 rounded-full bg-forest-700 text-white text-xs font-bold flex items-center justify-center">' + (index + 1) + '</span>' +
        '<div class="min-w-0"><p class="text-sm font-semibold text-slate-700 leading-relaxed">' +
        (en ? '<span data-en>' + esc(en) + '</span>' : '') + (bm ? '<span data-bm>' + esc(bm) + '</span>' : '') +
        '</p>' + sourceHtml + '</div></div></div>';
    }).join('');
    list.setAttribute('data-source', 'neon:prevention_action:/api/i2/plan');
    if (typeof window.setLang === 'function') window.setLang(localStorage.getItem('owm-lang') || 'en');
    return true;
  }

  function syncPlan() {
    var page = '';
    try { page = String((window.APP && window.APP.currentPage) || ''); } catch (e) {}
    if (page !== 'stopback' && page !== 'plan' && page !== 'planresult') return Promise.resolve(false);

    var species = currentSpeciesContext();
    var payload = {
      homeAnswers: collectHomeAnswers(),
      state: currentStateId() ? stateNameFromId(currentStateId()) : null,
      species_id: species.species_id,
      species: species.route,
      species_name: species.species_name
    };

    return postJson('/api/i2/plan', payload).then(function (data) {
      var rows = data && (data.actions || data.rows) || [];
      if (!rows.length) throw new Error('No prevention_action rows returned');
      renderPlanRows(rows);
      return true;
    }).catch(function (err) {
      console.warn('[RoomForBoth] homeAnswers -> prevention_action sync failed', err && err.message ? err.message : err);
      return false;
    });
  }

  function scheduleSync() {
    setTimeout(function () { syncStateFromComplaints(currentStateId()); syncPlan(); }, 0);
    setTimeout(function () { syncStateFromComplaints(currentStateId()); syncPlan(); }, 120);
  }

  function install() {
    if (typeof window.goTo === 'function' && !window.goTo.__i2RealDataClient) {
      var originalGoTo = window.goTo;
      window.goTo = function () {
        var result = originalGoTo.apply(this, arguments);
        scheduleSync();
        return result;
      };
      window.goTo.__i2RealDataClient = true;
    }
    scheduleSync();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();

  window.RoomForBothI2 = {
    refreshState: function () { return syncStateFromComplaints(currentStateId()); },
    refreshPlan: syncPlan
  };
})();
