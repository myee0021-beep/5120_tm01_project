(function () {
  'use strict';

  var cache = {
    species: [],
    categories: [],
    states: [],
    mediaBySpecies: {},
    loaded: false,
    error: null
  };

  var ID_TO_ROUTE = {
    1: 'macaque',
    2: 'wild-boar',
    3: 'common-myna',
    4: 'reticulated-python',
    5: 'house-crow',
    6: 'water-monitor',
    7: 'equatorial-spitting-cobra'
  };

  var ROUTE_TO_ID = {
    macaque: 1, monkey: 1,
    boar: 2, wildboar: 2, 'wild-boar': 2,
    myna: 3, commonmyna: 3, 'common-myna': 3,
    python: 4, reticulatedpython: 4, 'reticulated-python': 4,
    crow: 5, housecrow: 5, 'house-crow': 5,
    monitor: 6, watermonitor: 6, 'water-monitor': 6,
    cobra: 7, spittingcobra: 7, 'spitting-cobra': 7,
    'equatorial-spitting-cobra': 7
  };

  function getJson(url) {
    return fetch(url, { method: 'GET', headers: { Accept: 'application/json' } }).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status + ' for ' + url);
      return res.json();
    });
  }

  function empty(value) {
    if (value === null || value === undefined) return true;
    var text = String(value).trim();
    return text === '' || text.toUpperCase() === 'NA' || text.toUpperCase() === 'N/A';
  }

  function text(value) { return empty(value) ? '' : String(value).trim(); }

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function slug(value) {
    return String(value || '').trim().toLowerCase()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  function titleCase(value) {
    return String(value || '').replace(/[_-]+/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }

  function routeForSpecies(row) {
    return ID_TO_ROUTE[Number(row.species_id)] || slug(row.english_name || ('species-' + row.species_id));
  }

  function iconForCategory(category) {
    var c = String(category || '').toLowerCase();
    if (c === 'monkey') return 'macaque';
    if (c === 'bird') return 'crow';
    if (c === 'snake') return 'snake';
    if (c === 'pig') return 'boar';
    if (c === 'lizard') return 'monitor';
    return 'general';
  }

  function coveringForCategory(category) {
    var c = String(category || '').toLowerCase();
    if (c === 'bird') return 'feathers';
    if (c === 'monkey' || c === 'pig') return 'fur';
    if (c === 'snake' || c === 'lizard') return 'scales';
    return null;
  }

  function sizeForCategory(category) {
    var c = String(category || '').toLowerCase();
    if (c === 'bird') return 'small';
    if (c === 'monkey' || c === 'lizard') return 'medium';
    if (c === 'pig') return 'large';
    return 'medium';
  }

  function statusType(row) {
    if (String(row.introduced_status || '').toLowerCase() === 'invasive') return 'invasive';
    if (String(row.protected_status || '').toLowerCase() !== 'not listed') return 'protected';
    return 'council';
  }

  function mediaToPhoto(media) {
    if (!media || empty(media.image_url)) return null;
    var attribution = [text(media.photographer), text(media.licence)].filter(Boolean).join(' · ');
    return {
      dataUri: text(media.image_url),
      creditEn: attribution || 'Media attribution recorded in the project database.',
      creditBm: attribution || 'Atribusi media direkod dalam pangkalan data projek.',
      sourceUrl: media.gbif_occurrence_id
        ? 'https://www.gbif.org/occurrence/' + encodeURIComponent(media.gbif_occurrence_id)
        : text(media.image_url),
      photographer: text(media.photographer),
      licence: text(media.licence),
      gbifOccurrenceId: text(media.gbif_occurrence_id)
    };
  }

  function uiSpecies(row) {
    var mediaRows = cache.mediaBySpecies[Number(row.species_id)] || [];
    var keywords = text(row.id_keywords).toLowerCase().split(',').map(function (v) { return v.trim(); }).filter(Boolean);
    var category = text(row.category_name);
    var origin = text(row.introduced_status);
    var protectedStatus = text(row.protected_status);
    var facts = [];
    if (protectedStatus) facts.push({ labelEn: 'Protected status', labelBm: 'Status perlindungan', valueEn: protectedStatus, valueBm: protectedStatus, sub: 'species' });
    if (origin) facts.push({ labelEn: 'Origin status', labelBm: 'Status asal', valueEn: titleCase(origin), valueBm: titleCase(origin), sub: 'species' });
    if (category) facts.push({ labelEn: 'Category', labelBm: 'Kategori', valueEn: titleCase(category), valueBm: titleCase(category), sub: 'animal_category' });
    if (!empty(row.taxonKey)) facts.push({ labelEn: 'GBIF taxon key', labelBm: 'Kunci takson GBIF', valueEn: String(row.taxonKey), valueBm: String(row.taxonKey), sub: 'species' });

    return {
      id: routeForSpecies(row),
      dbSpeciesId: Number(row.species_id),
      categoryId: Number(row.category_id),
      categoryName: category,
      en: text(row.english_name), bm: text(row.malay_name), sci: text(row.scientific_name),
      statusType: statusType(row),
      statusEn: protectedStatus || titleCase(origin) || 'Recorded',
      statusBm: protectedStatus || titleCase(origin) || 'Direkod',
      icon: iconForCategory(category),
      keys: keywords,
      covering: coveringForCategory(category),
      sizeCat: sizeForCategory(category),
      blurbEn: text(row.category_description), blurbBm: text(row.category_description),
      photo: mediaToPhoto(mediaRows[0]),
      facts: facts,
      topStates: [], why: { en: '', bm: '' },
      safetySteps: [], safetySource: null,
      observation: null,
      findable: { whereEn: '', whereBm: '', tips: [], ifGoneEn: '', ifGoneBm: '' },
      checklist: [], checklistSource: { en: '', bm: '' },
      script: [], sla: null,
      willDo: { en: '', bm: '' }, wontDo: { en: '', bm: '' },
      authority: { name: '', phone: '', descEn: '', descBm: '', verifiedEn: '', verifiedBm: '' }
    };
  }

  function syntheticSnake() {
    return {
      id: 'snake', dbSpeciesId: null, categoryId: 3, categoryName: 'snake',
      en: 'Snake', bm: 'Ular', sci: '', icon: 'snake', statusType: 'protected',
      statusEn: 'Snake safety route', statusBm: 'Laluan keselamatan ular',
      keys: ['snake', 'ular', 'cobra'], covering: 'scales', sizeCat: 'medium',
      photo: null, facts: [], topStates: [], why: { en: '', bm: '' }, safetySteps: [],
      safetySource: null, observation: null,
      findable: { whereEn: '', whereBm: '', tips: [], ifGoneEn: '', ifGoneBm: '' },
      checklist: [], checklistSource: { en: '', bm: '' }, script: [], sla: null,
      willDo: { en: '', bm: '' }, wontDo: { en: '', bm: '' },
      authority: { name: '', phone: '', descEn: '', descBm: '', verifiedEn: '', verifiedBm: '' }
    };
  }

  function syntheticGeneral() {
    return {
      id: 'general', dbSpeciesId: null, categoryId: null, categoryName: '',
      en: 'Species not confirmed', bm: 'Spesies belum disahkan', sci: '', icon: 'general', statusType: 'council',
      statusEn: 'No confirmed database species', statusBm: 'Tiada spesies pangkalan data disahkan',
      keys: [], covering: null, sizeCat: null, photo: null, facts: [], topStates: [],
      why: { en: '', bm: '' }, safetySteps: [], safetySource: null, observation: null,
      findable: { whereEn: '', whereBm: '', tips: [], ifGoneEn: '', ifGoneBm: '' },
      checklist: [], checklistSource: { en: '', bm: '' }, script: [], sla: null,
      willDo: { en: '', bm: '' }, wontDo: { en: '', bm: '' },
      authority: { name: '', phone: '', descEn: '', descBm: '', verifiedEn: '', verifiedBm: '' }
    };
  }

  function publishGlobals() {
    window.SPECIES = cache.species.filter(function (row) { return row.is_snake !== true; }).map(uiSpecies);
    window.SPECIES.push(syntheticSnake());
    window.SPECIES.push(syntheticGeneral());

    window.STATES = cache.states.map(function (row) {
      return {
        id: slug(row.state_name),
        stateCode: Number(row.state_code),
        name: text(row.state_name),
        en: text(row.state_name),
        jurisdictionType: text(row.jurisdiction_type)
      };
    });
    window.AUTHORITY_TABLE = {};
  }

  function loadBaseData() {
    return Promise.all([getJson('/api/species'), getJson('/api/categories'), getJson('/api/states')])
      .then(function (results) {
        cache.species = results[0].species || [];
        cache.categories = results[1].categories || [];
        cache.states = results[2].states || [];
        return Promise.all(cache.species.map(function (row) {
          return getJson('/api/species-media?species_id=' + encodeURIComponent(row.species_id))
            .then(function (data) { cache.mediaBySpecies[Number(row.species_id)] = data.media || []; })
            .catch(function () { cache.mediaBySpecies[Number(row.species_id)] = []; });
        }));
      })
      .then(function () {
        cache.loaded = true;
        cache.error = null;
        publishGlobals();
        window.dispatchEvent(new CustomEvent('roomforboth:db-ready', { detail: cache }));
        return cache;
      })
      .catch(function (err) {
        cache.error = err;
        cache.loaded = false;
        console.error('[Room for Both] Database loading failed. Business data is not falling back to embedded content.', err);
        throw err;
      });
  }

  function speciesById(id) {
    return cache.species.find(function (row) { return Number(row.species_id) === Number(id); }) || null;
  }

  function resolveSpeciesId(value) {
    var n = Number(value);
    if (Number.isInteger(n) && n > 0) return n;
    var k = String(value || '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    return ROUTE_TO_ID[k] || null;
  }

  function currentUiSpecies() {
    var id = window.APP && APP.speciesId ? APP.speciesId : 'general';
    return (window.SPECIES || []).find(function (s) { return s.id === id; }) || syntheticGeneral();
  }

  function currentDbSpecies() {
    var ui = currentUiSpecies();
    return ui.dbSpeciesId ? speciesById(ui.dbSpeciesId) : null;
  }

  function getSpeciesDetail(id) { return getJson('/api/species?id=' + encodeURIComponent(resolveSpeciesId(id) || id)); }
  function getSpeciesMedia(id) { return getJson('/api/species-media?species_id=' + encodeURIComponent(resolveSpeciesId(id) || id)); }
  function getSpeciesBehaviour(id) { return getJson('/api/species-behaviour?species_id=' + encodeURIComponent(resolveSpeciesId(id) || id)); }
  function getImmediateActions(id) { return getJson('/api/immediate-actions?species_id=' + encodeURIComponent(resolveSpeciesId(id) || id)); }
  function getImmediateActionsByCategory(categoryId) { return getJson('/api/immediate-actions?category_id=' + encodeURIComponent(categoryId)); }
  function getPreventionActions(id) { return getJson('/api/prevention-actions?species_id=' + encodeURIComponent(resolveSpeciesId(id) || id)); }
  function getPreventionByCategory(categoryId) { return getJson('/api/prevention-actions?category_id=' + encodeURIComponent(categoryId)); }
  function getAuthorities(categoryId, jurisdiction) {
    var p = new URLSearchParams({ category_id: String(categoryId) });
    if (jurisdiction) p.set('jurisdiction', jurisdiction);
    return getJson('/api/authority?' + p.toString());
  }

  function sourceLabel(row) {
    var parts = [];
    if (text(row && row.source_institution)) parts.push(text(row.source_institution));
    else if (text(row && row.source_person)) parts.push(text(row.source_person));
    if (text(row && row.date_verified)) parts.push('verified ' + text(row.date_verified));
    return parts.length ? 'Source: ' + parts.join(', ') : '';
  }

  function sourceHtml(row) {
    var label = sourceLabel(row);
    if (!label) return '';
    var url = text(row && row.source_url);
    return url
      ? '<a href="' + esc(url) + '" target="_blank" rel="noopener" class="mt-1 inline-block text-[11px] text-slate-400 hover:text-forest-700 underline underline-offset-2">' + esc(label) + ' ↗</a>'
      : '<span class="mt-1 inline-block text-[11px] text-slate-400">' + esc(label) + '</span>';
  }

  function dbEmptyHtml(message) {
    return '<div class="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">' + esc(message) + '</div>';
  }

  function renderImmediateRows(list, rows) {
    var usable = (rows || []).filter(function (r) { return !empty(r.action_text_en) || !empty(r.action_text_ms); });
    if (!usable.length) {
      list.innerHTML = dbEmptyHtml('No verified immediate-action guidance is recorded in the database for this selection.');
      list.setAttribute('data-source', 'neon:immediate_action:empty');
      return;
    }
    list.innerHTML = usable.map(function (row, index) {
      var step = Number(row.step_order) > 0 ? Number(row.step_order) : index + 1;
      return '<div class="flex gap-3 rounded-xl bg-white border border-slate-200 border-l-4 border-l-rose-600 px-4 py-3">' +
        '<span class="shrink-0 w-5 h-5 rounded-full bg-rose-600 text-white text-[11px] font-bold flex items-center justify-center mt-0.5">' + step + '</span>' +
        '<div><p class="text-sm text-slate-800 font-medium leading-relaxed">' +
        (!empty(row.action_text_en) ? '<span data-en>' + esc(text(row.action_text_en)) + '</span>' : '') +
        (!empty(row.action_text_ms) ? '<span data-bm>' + esc(text(row.action_text_ms)) + '</span>' : '') +
        '</p>' + sourceHtml(row) + '</div></div>';
    }).join('');
    list.setAttribute('data-source', 'neon:immediate_action');
  }

  function renderImmediateActionsFromDb() {
    var list = document.getElementById('wtd_safetyList');
    var ui = currentUiSpecies();
    if (!list) return Promise.resolve();
    list.innerHTML = dbEmptyHtml('Loading verified guidance from the database…');
    if (!ui.dbSpeciesId) {
      list.innerHTML = dbEmptyHtml('Select a confirmed species to view verified immediate-action guidance.');
      return Promise.resolve();
    }
    return getImmediateActions(ui.dbSpeciesId).then(function (data) { renderImmediateRows(list, data.actions || []); setLang(document.documentElement.lang || 'en'); })
      .catch(function () { list.innerHTML = dbEmptyHtml('Verified immediate-action guidance is temporarily unavailable.'); });
  }

  function renderSnakeImmediateFromDb() {
    var list = document.getElementById('snake_safetyList');
    if (!list) return Promise.resolve();
    list.innerHTML = dbEmptyHtml('Loading verified snake guidance from the database…');
    return getImmediateActionsByCategory(3).then(function (data) { renderImmediateRows(list, data.actions || []); setLang(document.documentElement.lang || 'en'); })
      .catch(function () { list.innerHTML = dbEmptyHtml('Verified snake guidance is temporarily unavailable.'); });
  }

  function preventionTagsHtml(row) {
    var tags = [];
    if (!empty(row.housing_type)) tags.push(titleCase(row.housing_type));
    if (!empty(row.cause_group)) tags.push(titleCase(row.cause_group));
    if (!empty(row.action_kind)) tags.push(titleCase(row.action_kind));
    if (row.costs_money === true || row.costs_money === 't' || row.costs_money === 'true') tags.push('Costs money');
    else if (row.costs_money === false || row.costs_money === 'f' || row.costs_money === 'false') tags.push('No cost');
    return tags.map(function (tag) { return '<span class="inline-flex items-center rounded-full bg-white border border-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-500">' + esc(tag) + '</span>'; }).join('');
  }

  function renderPreventionRows(rows) {
    var wrap = document.getElementById('kif_preventionWrap');
    var list = document.getElementById('kif_preventionList');
    var src = document.getElementById('kif_preventionSource');
    var emptyEl = document.getElementById('kif_preventionEmpty');
    if (!wrap || !list) return;
    var usable = (rows || []).filter(function (r) { return !empty(r.action_text_en) || !empty(r.action_text_ms); });
    if (!usable.length) {
      list.innerHTML = '';
      if (src) { src.textContent = ''; src.classList.add('hidden'); }
      if (emptyEl) emptyEl.classList.remove('hidden');
      wrap.classList.remove('hidden');
      list.setAttribute('data-source', 'neon:prevention_action:empty');
      return;
    }
    list.innerHTML = usable.map(function (row) {
      var tags = preventionTagsHtml(row);
      return '<div class="flex gap-3 rounded-xl bg-slate-50 border border-slate-200/60 px-4 py-3">' +
        '<span class="text-emerald-800 font-bold">✓</span><div class="min-w-0"><p class="text-sm text-slate-700 leading-relaxed">' +
        (!empty(row.action_text_en) ? '<span data-en>' + esc(text(row.action_text_en)) + '</span>' : '') +
        (!empty(row.action_text_ms) ? '<span data-bm>' + esc(text(row.action_text_ms)) + '</span>' : '') + '</p>' +
        (tags ? '<div class="mt-1.5 flex flex-wrap gap-1.5">' + tags + '</div>' : '') + sourceHtml(row) + '</div></div>';
    }).join('');
    if (src) { src.textContent = ''; src.classList.add('hidden'); }
    if (emptyEl) emptyEl.classList.add('hidden');
    wrap.classList.remove('hidden');
    list.setAttribute('data-source', 'neon:prevention_action');
  }

  function renderBehaviourAndPreventionFromDb() {
    var ui = currentUiSpecies();
    var whereEl = document.getElementById('kif_whereText');
    var observeEl = document.getElementById('kif_observeDistanceText');
    var tips = document.getElementById('kif_tipsList');
    if (whereEl) whereEl.textContent = '';
    if (observeEl) observeEl.textContent = '';
    if (tips) tips.innerHTML = '';

    if (ui.id === 'snake') {
      if (whereEl) whereEl.textContent = 'Species-specific behaviour is not shown because the snake route intentionally skips species identification.';
      return getPreventionByCategory(3).then(function (p) { renderPreventionRows(p.actions || []); });
    }
    if (!ui.dbSpeciesId) {
      if (whereEl) whereEl.textContent = 'Select a confirmed species to view verified behaviour guidance.';
      renderPreventionRows([]);
      return Promise.resolve();
    }

    return Promise.all([getSpeciesBehaviour(ui.dbSpeciesId), getPreventionActions(ui.dbSpeciesId)]).then(function (results) {
      var b = (results[0].behaviour || [])[0];
      if (b) {
        if (whereEl) whereEl.textContent = text(b.likely_location) || 'No verified likely-location note is recorded.';
        if (observeEl) observeEl.textContent = text(b.safe_distance_note);
        if (tips) {
          var move = text(b.what_moves_it);
          tips.innerHTML = move ? '<div class="flex gap-3 rounded-xl bg-slate-50 border border-slate-200/60 px-4 py-3"><span class="shrink-0 w-5 h-5 rounded-full bg-forest-700 text-white text-[11px] font-bold flex items-center justify-center mt-0.5">1</span><p class="text-sm text-slate-700 leading-relaxed">' + esc(move) + '</p></div>' : '';
        }
        var behaviourContainer = whereEl && whereEl.parentElement;
        if (behaviourContainer) behaviourContainer.setAttribute('data-source', 'neon:species_behaviour');
      } else {
        if (whereEl) whereEl.textContent = 'No verified behaviour guidance is recorded in the database for this species.';
      }
      renderPreventionRows(results[1].actions || []);
      setLang(document.documentElement.lang || 'en');
    }).catch(function () {
      if (whereEl) whereEl.textContent = 'Verified behaviour guidance is temporarily unavailable.';
      renderPreventionRows([]);
    });
  }

  function renderSpeciesDbOnly() {
    var ui = currentUiSpecies();
    if (!ui.dbSpeciesId) return;
    var row = speciesById(ui.dbSpeciesId);
    if (!row) return;
    var facts = document.getElementById('sp_factsGrid');
    if (facts) facts.setAttribute('data-source', 'neon:species');
    var why = document.getElementById('sp_whyText');
    if (why && why.parentElement) why.parentElement.classList.add('hidden');
    var bars = document.getElementById('sp_stateBars');
    if (bars && bars.parentElement) bars.parentElement.classList.add('hidden');
  }

  function stateFromRoute(route) {
    return (window.STATES || []).find(function (s) { return s.id === route; }) || null;
  }

  function renderAuthorityFromDb() {
    var ui = currentUiSpecies();
    var stateSelect = document.getElementById('auth_stateSelect');
    var contact = document.getElementById('auth_contactBlock');
    var noContact = document.getElementById('auth_noContactBlock');
    var script = document.getElementById('auth_scriptList');
    var wont = document.getElementById('auth_wontDo');
    if (script && script.parentElement) script.parentElement.classList.add('hidden');
    if (wont && wont.parentElement) wont.parentElement.classList.add('hidden');

    if (stateSelect) {
      stateSelect.innerHTML = '<option value="">Select state…</option>' + (window.STATES || []).map(function (s) {
        return '<option value="' + esc(s.id) + '">' + esc(s.name) + '</option>';
      }).join('');
      stateSelect.value = (window.APP && APP.stateId) || '';
      if (!stateSelect.dataset.dbBound) {
        stateSelect.addEventListener('change', function () { goTo('authority', { state: stateSelect.value || null }); });
        stateSelect.dataset.dbBound = '1';
      }
    }

    if (!ui.categoryId) {
      if (contact) contact.classList.add('hidden');
      if (noContact) { noContact.classList.remove('hidden'); noContact.querySelector('p').textContent = 'Select a confirmed species before requesting authority information.'; }
      return Promise.resolve();
    }
    if (!APP.stateId) {
      if (contact) contact.classList.add('hidden');
      if (noContact) { noContact.classList.remove('hidden'); noContact.querySelector('p').textContent = 'Select your state above to load the verified authority record from the database.'; }
      return Promise.resolve();
    }
    var st = stateFromRoute(APP.stateId);
    if (!st) return Promise.resolve();

    return getAuthorities(ui.categoryId, st.name).then(function (data) {
      var row = (data.authorities || [])[0];
      if (!row) {
        if (contact) contact.classList.add('hidden');
        if (noContact) { noContact.classList.remove('hidden'); noContact.querySelector('p').textContent = 'No verified authority record is stored in the database for this category and jurisdiction.'; }
        return;
      }
      if (contact) { contact.classList.remove('hidden'); contact.setAttribute('data-source', 'neon:authority'); }
      if (noContact) noContact.classList.add('hidden');
      var set = function (id, value) { var el = document.getElementById(id); if (el) el.textContent = text(value); };
      set('auth_authorityName', row.agency_name);
      set('auth_authorityDesc', row.what_they_do);
      set('auth_callNumber', row.contact_value);
      set('auth_willDo', row.what_they_do);
      var call = document.getElementById('auth_callBtn');
      if (call) {
        var route = String(row.contact_route || '').toLowerCase();
        call.href = route.indexOf('phone') >= 0 || /^[+\d\s()-]+$/.test(String(row.contact_value || ''))
          ? 'tel:' + String(row.contact_value || '').replace(/[^0-9+]/g, '')
          : '#';
      }
      var verified = document.querySelector('#auth_authorityVerified span');
      if (verified) verified.textContent = text(row.last_verified) ? 'Verified: ' + text(row.last_verified) : '';
      var source = document.getElementById('auth_authoritySource');
      if (source) source.innerHTML = text(row.source_url) ? '<a href="' + esc(row.source_url) + '" target="_blank" rel="noopener" class="underline underline-offset-2">Source ↗</a>' : '';
      var sla = document.getElementById('auth_slaBox');
      var slaText = document.getElementById('auth_slaText');
      if (sla && slaText && !empty(row.response_standard)) { slaText.textContent = text(row.response_standard); sla.classList.remove('hidden'); sla.classList.add('flex'); }
      else if (sla) sla.classList.add('hidden');
    }).catch(function () {
      if (contact) contact.classList.add('hidden');
      if (noContact) { noContact.classList.remove('hidden'); noContact.querySelector('p').textContent = 'Verified authority data is temporarily unavailable.'; }
    });
  }

  function renderStatesFromDb() {
    var grid = document.getElementById('states_dbGrid') || document.querySelector('#page-states .grid.grid-cols-1.sm\\:grid-cols-2.lg\\:grid-cols-3');
    if (!grid) return;
    grid.innerHTML = (window.STATES || []).map(function (st) {
      return '<a href="#" onclick="goTo(\'statedetail\',{state:\'' + esc(st.id) + '\'});return false;" class="reveal group rounded-2xl bg-slate-50/70 hover:bg-white hover:shadow-[0_20px_50px_-20px_rgba(15,23,42,0.15)] transition-all p-5 flex flex-col">' +
        '<div class="flex items-start justify-between"><span class="font-display font-bold text-lg text-forest-950">' + esc(st.name) + '</span></div>' +
        '<p class="mt-2 text-xs text-slate-400">' + esc(st.jurisdictionType || 'Jurisdiction recorded in database') + '</p>' +
        '<div class="mt-4 pt-4 border-t border-slate-100 text-xs text-forest-600 font-semibold">View →</div></a>';
    }).join('');
    grid.setAttribute('data-source', 'neon:state');
    if (typeof primeScrollReveal === 'function') primeScrollReveal(document.getElementById('page-states'));
  }

  function renderStateDetailFromDb() {
    var st = stateFromRoute(APP.stateId);
    if (!st) return;
    document.title = st.name + ' — State Profile | Room for Both';
    ['sd_crumbState','sd_stateName'].forEach(function (id) { var el = document.getElementById(id); if (el) el.textContent = st.name; });
    var intro = document.getElementById('sd_stateIntro');
    if (intro) intro.textContent = st.jurisdictionType || 'State record loaded from the project database.';
    ['sd_statRecords','sd_statForest','sd_statCouncils'].forEach(function (id) { var el = document.getElementById(id); if (el) el.textContent = '—'; });
    var label = document.getElementById('sd_statRecordsLabel'); if (label) label.textContent = 'Not represented in the current database schema';
    var why = document.getElementById('sd_whyParagraph'); if (why && why.parentElement) why.parentElement.classList.add('hidden');
    var heading = document.getElementById('sd_topSpeciesHeading'); if (heading && heading.parentElement) heading.parentElement.classList.add('hidden');
    var grid = document.getElementById('sd_topSpeciesGrid'); if (grid) { grid.innerHTML = ''; grid.setAttribute('data-source', 'neon:state'); }
  }

  function renderStopBackFromDb() {
    var ui = currentUiSpecies();
    var checklist = document.getElementById('sicb_checklist');
    if (!checklist) return Promise.resolve();
    var promise = ui.id === 'snake' ? getPreventionByCategory(3) : (ui.dbSpeciesId ? getPreventionActions(ui.dbSpeciesId) : Promise.resolve({ actions: [] }));
    return promise.then(function (data) {
      var rows = data.actions || [];
      checklist.innerHTML = rows.length ? rows.map(function (row) {
        return '<li class="check-item rounded-xl border border-slate-200 bg-white px-4 py-3"><p class="text-sm text-slate-700">' + esc(text(row.action_text_en) || text(row.action_text_ms)) + '</p></li>';
      }).join('') : '<li>' + dbEmptyHtml('No verified prevention guidance is recorded in the database for this selection.') + '</li>';
      checklist.setAttribute('data-source', 'neon:prevention_action');
    });
  }

  function renderAboutFromDb() {
    var photoList = document.getElementById('about_photoList');
    if (photoList) {
      var rows = [];
      cache.species.forEach(function (sp) {
        (cache.mediaBySpecies[Number(sp.species_id)] || []).forEach(function (m) { rows.push({ sp: sp, m: m }); });
      });
      photoList.innerHTML = rows.length ? rows.map(function (x) {
        var p = mediaToPhoto(x.m);
        return '<div class="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3"><div class="w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-slate-200 bg-white"><img src="' + esc(p.dataUri) + '" alt="" class="w-full h-full object-cover"></div><div class="min-w-0 flex-1"><div class="font-display font-bold text-sm text-slate-900">' + esc(text(x.sp.english_name)) + ' <span class="font-normal italic text-slate-400">/ ' + esc(text(x.sp.malay_name)) + '</span></div><div class="text-xs text-slate-500 mt-0.5">' + esc(p.creditEn) + '</div></div><a href="' + esc(p.sourceUrl) + '" target="_blank" rel="noopener" class="shrink-0 text-forest-600 hover:text-forest-800 text-xs font-bold">View source ↗</a></div>';
      }).join('') : dbEmptyHtml('No species media rows are currently recorded in the database.');
      photoList.setAttribute('data-source', 'neon:species_media');
    }
  }

  function installRenderHooks() {
    if (typeof window.render_species === 'function' && !window.render_species.__dbOnly) {
      var oldSpecies = window.render_species;
      window.render_species = function () { var r = oldSpecies.apply(this, arguments); renderSpeciesDbOnly(); return r; };
      window.render_species.__dbOnly = true;
    }
    if (typeof window.render_whattodo === 'function' && !window.render_whattodo.__dbOnly) {
      var oldWhat = window.render_whattodo;
      window.render_whattodo = function () { var r = oldWhat.apply(this, arguments); renderImmediateActionsFromDb(); return r; };
      window.render_whattodo.__dbOnly = true;
    }
    if (typeof window.render_snakewhattodo === 'function' && !window.render_snakewhattodo.__dbOnly) {
      var oldSnake = window.render_snakewhattodo;
      window.render_snakewhattodo = function () { var r = oldSnake.apply(this, arguments); renderSnakeImmediateFromDb(); return r; };
      window.render_snakewhattodo.__dbOnly = true;
    }
    if (typeof window.render_findable === 'function' && !window.render_findable.__dbOnly) {
      var oldFindable = window.render_findable;
      window.render_findable = function () { var r = oldFindable.apply(this, arguments); renderBehaviourAndPreventionFromDb(); return r; };
      window.render_findable.__dbOnly = true;
    }
    if (typeof window.render_authority === 'function' && !window.render_authority.__dbOnly) {
      var oldAuthority = window.render_authority;
      window.render_authority = function () { var r = oldAuthority.apply(this, arguments); renderAuthorityFromDb(); return r; };
      window.render_authority.__dbOnly = true;
    }
    if (typeof window.render_stopback === 'function' && !window.render_stopback.__dbOnly) {
      window.render_stopback = function () { return renderStopBackFromDb(); };
      window.render_stopback.__dbOnly = true;
    }
    if (typeof window.render_statedetail === 'function') {
      window.render_statedetail = renderStateDetailFromDb;
    }
    window.render_states = renderStatesFromDb;
    if (typeof window.render_about === 'function' && !window.render_about.__dbOnly) {
      var oldAbout = window.render_about;
      window.render_about = function () { var r = oldAbout.apply(this, arguments); renderAboutFromDb(); return r; };
      window.render_about.__dbOnly = true;
    }
  }

  window.RoomForBothDB = {
    cache: cache,
    ready: null,
    isEmptyValue: empty,
    resolveSpeciesId: resolveSpeciesId,
    currentDbSpecies: currentDbSpecies,
    getSpeciesDetail: getSpeciesDetail,
    getSpeciesMedia: getSpeciesMedia,
    getSpeciesBehaviour: getSpeciesBehaviour,
    getImmediateActions: getImmediateActions,
    getPreventionActions: getPreventionActions,
    getAuthorities: getAuthorities,
    renderStatesFromDb: renderStatesFromDb,
    installRenderHooks: installRenderHooks
  };

  window.RoomForBothDB.ready = loadBaseData().then(function (result) {
    installRenderHooks();
    return result;
  });
})();
