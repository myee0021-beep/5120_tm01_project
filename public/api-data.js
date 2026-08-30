(function () {
  'use strict';

  var cache = {
    species: [],
    categories: [],
    states: [],
    loaded: false,
    error: null
  };

  // Frontend route IDs are human-friendly strings, while Neon uses integer species_id values.
  // Keep the mapping in one place so every database-backed component uses the same identity.
  var ROUTE_TO_SPECIES_ID = {
    macaque: 1,
    monkey: 1,
    boar: 2,
    wildboar: 2,
    'wild-boar': 2,
    myna: 3,
    commonmyna: 3,
    'common-myna': 3,
    python: 4,
    reticulatedpython: 4,
    'reticulated-python': 4,
    crow: 5,
    housecrow: 5,
    'house-crow': 5,
    monitor: 6,
    watermonitor: 6,
    'water-monitor': 6,
    cobra: 7,
    spittingcobra: 7,
    'spitting-cobra': 7
  };

  function getJson(url) {
    return fetch(url, { method: 'GET', headers: { 'Accept': 'application/json' } })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status + ' for ' + url);
        return res.json();
      });
  }

  function isEmptyValue(value) {
    if (value === null || value === undefined) return true;
    var text = String(value).trim();
    return text === '' || text.toUpperCase() === 'NA' || text.toUpperCase() === 'N/A';
  }

  function visibleText(value) {
    return isEmptyValue(value) ? '' : String(value).trim();
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function normalizeKey(value) {
    return String(value || '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
  }

  function loadBaseData() {
    return Promise.all([
      getJson('/api/species'),
      getJson('/api/categories'),
      getJson('/api/states')
    ]).then(function (results) {
      cache.species = results[0].species || [];
      cache.categories = results[1].categories || [];
      cache.states = results[2].states || [];
      cache.loaded = true;
      cache.error = null;
      window.dispatchEvent(new CustomEvent('roomforboth:db-ready', { detail: cache }));
      return cache;
    }).catch(function (err) {
      cache.error = err;
      console.warn('[Room for Both] Database data unavailable; keeping embedded fallback data.', err.message);
      return cache;
    });
  }

  function speciesById(id) {
    var numericId = Number(id);
    return cache.species.find(function (row) { return Number(row.species_id) === numericId; }) || null;
  }

  function speciesByName(name) {
    var key = String(name || '').trim().toLowerCase();
    if (!key) return null;
    return cache.species.find(function (row) {
      return [row.english_name, row.malay_name, row.scientific_name]
        .filter(Boolean)
        .some(function (value) { return String(value).trim().toLowerCase() === key; });
    }) || null;
  }

  function resolveSpeciesId(value) {
    var numeric = Number(value);
    if (Number.isInteger(numeric) && numeric > 0) return numeric;

    var key = normalizeKey(value);
    if (ROUTE_TO_SPECIES_ID[key]) return ROUTE_TO_SPECIES_ID[key];

    // A generic "snake" route deliberately does not resolve to a specific snake species.
    if (key === 'snake') return null;

    var row = speciesByName(value);
    return row ? Number(row.species_id) : null;
  }

  function currentDbSpecies() {
    var routeId = '';
    try { routeId = (window.APP && window.APP.speciesId) || ''; } catch (e) {}

    var mappedId = resolveSpeciesId(routeId);
    if (mappedId) {
      var mapped = speciesById(mappedId);
      if (mapped) return mapped;
    }

    try {
      var front = typeof window.getSpecies === 'function' ? window.getSpecies(routeId || 'macaque') : null;
      if (front) {
        var found = speciesByName(front.en) || speciesByName(front.bm) || speciesByName(front.scientific);
        if (found) return found;
      }
    } catch (e) {}

    return null;
  }

  function requireSpeciesId(value) {
    var id = resolveSpeciesId(value);
    if (!id) return Promise.reject(new Error('No database species_id mapping for ' + value));
    return Promise.resolve(id);
  }

  function getSpeciesDetail(speciesId) {
    return requireSpeciesId(speciesId).then(function (id) {
      return getJson('/api/species?id=' + encodeURIComponent(id));
    });
  }

  function getSpeciesMedia(speciesId) {
    return requireSpeciesId(speciesId).then(function (id) {
      return getJson('/api/species-media?species_id=' + encodeURIComponent(id));
    });
  }

  function getSpeciesBehaviour(speciesId) {
    return requireSpeciesId(speciesId).then(function (id) {
      return getJson('/api/species-behaviour?species_id=' + encodeURIComponent(id));
    });
  }

  function getImmediateActions(speciesId) {
    return requireSpeciesId(speciesId).then(function (id) {
      return getJson('/api/immediate-actions?species_id=' + encodeURIComponent(id));
    });
  }

  function getPreventionActions(speciesId, options) {
    options = options || {};
    return requireSpeciesId(speciesId).then(function (id) {
      var params = new URLSearchParams({ species_id: String(id) });
      if (options.category_id) params.set('category_id', options.category_id);
      if (options.housing_type) params.set('housing_type', options.housing_type);
      if (options.cause_group) params.set('cause_group', options.cause_group);
      return getJson('/api/prevention-actions?' + params.toString());
    });
  }

  function getAuthorities(categoryId, jurisdiction) {
    var params = new URLSearchParams({ category_id: String(categoryId) });
    if (jurisdiction) params.set('jurisdiction', jurisdiction);
    return getJson('/api/authority?' + params.toString());
  }

  function sourceLabel(row) {
    var institution = visibleText(row && row.source_institution);
    var person = visibleText(row && row.source_person);
    var verified = visibleText(row && row.date_verified);
    var parts = [];
    if (institution) parts.push(institution);
    else if (person) parts.push(person);
    if (verified) parts.push('verified ' + verified);
    return parts.length ? 'Source: ' + parts.join(', ') : '';
  }

  function renderImmediateActionsFromDb() {
    var dbSpecies = currentDbSpecies();
    var list = document.getElementById('wtd_safetyList');
    if (!dbSpecies || !list) return Promise.resolve(false);

    return getImmediateActions(dbSpecies.species_id).then(function (data) {
      var rows = (data.actions || []).filter(function (row) {
        return !isEmptyValue(row.action_text_en) || !isEmptyValue(row.action_text_ms);
      });
      if (!rows.length) return false;

      // Database rows are ordered by step_order in the API. Use step_order for the visible number where present.
      list.innerHTML = rows.map(function (row, index) {
        var en = visibleText(row.action_text_en);
        var bm = visibleText(row.action_text_ms);
        var source = sourceLabel(row);
        var step = Number(row.step_order) > 0 ? Number(row.step_order) : (index + 1);
        return '<div class="rounded-xl border border-rose-200 bg-white px-4 py-3.5 border-l-4 border-l-rose-500">' +
          '<div class="flex gap-3">' +
          '<span class="shrink-0 w-6 h-6 rounded-full bg-rose-600 text-white text-xs font-bold flex items-center justify-center">' + step + '</span>' +
          '<div class="min-w-0">' +
          '<p class="text-sm font-semibold text-slate-700 leading-relaxed">' +
          (en ? '<span data-en>' + escapeHtml(en) + '</span>' : '') +
          (bm ? '<span data-bm>' + escapeHtml(bm) + '</span>' : '') +
          '</p>' +
          (source ? '<p class="mt-1 text-[11px] text-slate-400">' + escapeHtml(source) + '</p>' : '') +
          '</div></div></div>';
      }).join('');
      list.setAttribute('data-source', 'neon:immediate_action');
      return true;
    }).catch(function (err) {
      console.warn('[Room for Both] Immediate actions API unavailable; using embedded fallback.', err.message);
      return false;
    });
  }

  function renderBehaviourAndPreventionFromDb() {
    var dbSpecies = currentDbSpecies();
    if (!dbSpecies) return Promise.resolve(false);

    return Promise.all([
      getSpeciesBehaviour(dbSpecies.species_id),
      getPreventionActions(dbSpecies.species_id)
    ]).then(function (results) {
      var behaviourRows = results[0].behaviour || [];
      var preventionRows = results[1].actions || [];
      var behaviour = behaviourRows[0] || null;

      if (behaviour) {
        var where = visibleText(behaviour.likely_location);
        var safeDistance = visibleText(behaviour.safe_distance_note);
        var lostSight = visibleText(behaviour.lost_sight_note);
        var movesIt = visibleText(behaviour.what_moves_it);
        var whereEl = document.getElementById('kif_whereText');
        var observeEl = document.getElementById('kif_observeDistanceText');
        var lostSightContent = document.getElementById('kif_lostSightContent');

        if (whereEl && where) whereEl.textContent = where;
        if (observeEl) {
          if (safeDistance) {
            observeEl.textContent = safeDistance;
          } else {
            var observationBlock = observeEl.closest ? observeEl.closest('.rounded-2xl, .rounded-xl') : null;
            if (observationBlock) observationBlock.classList.add('hidden');
          }
        }

        if (lostSightContent) {
          var paragraph = lostSightContent.querySelector('p.text-xs');
          if (paragraph) {
            if (lostSight) paragraph.textContent = lostSight;
            else paragraph.classList.add('hidden');
          }
        }

        if (movesIt) {
          var tips = document.getElementById('kif_tipsList');
          if (tips) {
            tips.innerHTML = '<div class="flex gap-3 rounded-xl bg-slate-50 border border-slate-200/60 px-4 py-3">' +
              '<span class="shrink-0 w-5 h-5 rounded-full bg-forest-700 text-white text-[11px] font-bold flex items-center justify-center mt-0.5">1</span>' +
              '<p class="text-sm text-slate-600 leading-relaxed">' + escapeHtml(movesIt) + '</p></div>';
          }
        }
      }

      var wrap = document.getElementById('kif_lostSightPreventionWrap');
      var list = document.getElementById('kif_lostSightPreventionList');
      var source = document.getElementById('kif_lostSightPreventionSource');
      var usable = preventionRows.filter(function (row) {
        return !isEmptyValue(row.action_text_en) || !isEmptyValue(row.action_text_ms);
      });

      if (wrap && list && usable.length) {
        list.innerHTML = usable.map(function (row) {
          var en = visibleText(row.action_text_en);
          var bm = visibleText(row.action_text_ms);
          return '<div class="flex gap-3 rounded-xl bg-slate-50 border border-slate-200/60 px-4 py-3">' +
            '<span class="text-emerald-800 font-bold">✓</span>' +
            '<p class="text-sm text-slate-700 leading-relaxed">' +
            (en ? '<span data-en>' + escapeHtml(en) + '</span>' : '') +
            (bm ? '<span data-bm>' + escapeHtml(bm) + '</span>' : '') +
            '</p></div>';
        }).join('');
        list.setAttribute('data-source', 'neon:prevention_action');

        var firstSource = usable.map(sourceLabel).filter(Boolean)[0] || '';
        if (source) {
          if (firstSource) {
            source.textContent = firstSource;
            source.classList.remove('hidden');
          } else {
            source.textContent = '';
            source.classList.add('hidden');
          }
        }
        wrap.classList.remove('hidden');
      } else if (wrap) {
        wrap.classList.add('hidden');
      }

      return true;
    }).catch(function (err) {
      console.warn('[Room for Both] Behaviour/prevention API unavailable; using embedded fallback.', err.message);
      return false;
    });
  }

  function installRenderHooks() {
    if (typeof window.render_whattodo === 'function' && !window.render_whattodo.__dbWrapped) {
      var originalWhatToDo = window.render_whattodo;
      window.render_whattodo = function () {
        var result = originalWhatToDo.apply(this, arguments);
        Promise.resolve(window.RoomForBothDB.ready).then(renderImmediateActionsFromDb);
        return result;
      };
      window.render_whattodo.__dbWrapped = true;
    }

    if (typeof window.render_findable === 'function' && !window.render_findable.__dbWrapped) {
      var originalFindable = window.render_findable;
      window.render_findable = function () {
        var result = originalFindable.apply(this, arguments);
        Promise.resolve(window.RoomForBothDB.ready).then(renderBehaviourAndPreventionFromDb);
        return result;
      };
      window.render_findable.__dbWrapped = true;
    }
  }

  window.RoomForBothDB = {
    cache: cache,
    ready: loadBaseData(),
    reload: loadBaseData,
    isEmptyValue: isEmptyValue,
    speciesById: speciesById,
    speciesByName: speciesByName,
    resolveSpeciesId: resolveSpeciesId,
    currentDbSpecies: currentDbSpecies,
    getSpeciesDetail: getSpeciesDetail,
    getSpeciesMedia: getSpeciesMedia,
    getSpeciesBehaviour: getSpeciesBehaviour,
    getImmediateActions: getImmediateActions,
    getPreventionActions: getPreventionActions,
    getAuthorities: getAuthorities,
    renderImmediateActionsFromDb: renderImmediateActionsFromDb,
    renderBehaviourAndPreventionFromDb: renderBehaviourAndPreventionFromDb
  };

  installRenderHooks();
  window.addEventListener('DOMContentLoaded', installRenderHooks);
})();
