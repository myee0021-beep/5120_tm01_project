(function () {
  'use strict';

  var cache = {
    species: [],
    categories: [],
    states: [],
    loaded: false,
    error: null
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

  function getSpeciesDetail(speciesId) {
    return getJson('/api/species?id=' + encodeURIComponent(speciesId));
  }

  function getSpeciesMedia(speciesId) {
    return getJson('/api/species-media?species_id=' + encodeURIComponent(speciesId));
  }

  function getSpeciesBehaviour(speciesId) {
    return getJson('/api/species-behaviour?species_id=' + encodeURIComponent(speciesId));
  }

  function getImmediateActions(speciesId) {
    return getJson('/api/immediate-actions?species_id=' + encodeURIComponent(speciesId));
  }

  function getPreventionActions(speciesId, options) {
    options = options || {};
    var params = new URLSearchParams({ species_id: String(speciesId) });
    if (options.category_id) params.set('category_id', options.category_id);
    if (options.housing_type) params.set('housing_type', options.housing_type);
    if (options.cause_group) params.set('cause_group', options.cause_group);
    return getJson('/api/prevention-actions?' + params.toString());
  }

  function getAuthorities(categoryId, jurisdiction) {
    var params = new URLSearchParams({ category_id: String(categoryId) });
    if (jurisdiction) params.set('jurisdiction', jurisdiction);
    return getJson('/api/authority?' + params.toString());
  }

  function currentDbSpecies() {
    var current = null;
    try {
      var front = typeof window.getSpecies === 'function' ? window.getSpecies((window.APP && APP.speciesId) || 'macaque') : null;
      if (front) current = speciesByName(front.en) || speciesByName(front.bm) || speciesByName(front.scientific);
    } catch (e) {}
    return current;
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

      list.innerHTML = rows.map(function (row, index) {
        var en = visibleText(row.action_text_en);
        var bm = visibleText(row.action_text_ms);
        var source = sourceLabel(row);
        return '<div class="rounded-xl border border-rose-200 bg-white px-4 py-3.5 border-l-4 border-l-rose-500">' +
          '<div class="flex gap-3">' +
          '<span class="shrink-0 w-6 h-6 rounded-full bg-rose-600 text-white text-xs font-bold flex items-center justify-center">' + (index + 1) + '</span>' +
          '<div class="min-w-0">' +
          '<p class="text-sm font-semibold text-slate-700 leading-relaxed">' +
          (en ? '<span data-en>' + escapeHtml(en) + '</span>' : '') +
          (bm ? '<span data-bm>' + escapeHtml(bm) + '</span>' : '') +
          '</p>' +
          (source ? '<p class="mt-1 text-[11px] text-slate-400">' + escapeHtml(source) + '</p>' : '') +
          '</div></div></div>';
      }).join('');
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
            observeEl.closest && observeEl.closest('div');
          } else {
            var observationBlock = observeEl.closest ? observeEl.closest('.rounded-2xl, .rounded-xl') : null;
            if (observationBlock) observationBlock.classList.add('hidden');
          }
        }

        // If the database has no usable lost-sight text (including NA), do not print it.
        if (lostSightContent) {
          var paragraph = lostSightContent.querySelector('p.text-xs');
          if (paragraph) {
            if (lostSight) paragraph.textContent = lostSight;
            else paragraph.classList.add('hidden');
          }
        }

        // Use what_moves_it as the first database-backed observation tip where available.
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
