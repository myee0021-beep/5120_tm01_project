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

  function titleCase(value) {
    return String(value).replace(/[_-]+/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }

  // prevention_action carries extra classification columns beyond the
  // action text itself (see README's ERD notes) — surface them as small
  // tags rather than dropping them, so the housing/cause/cost context a
  // caseworker filtered on stays visible next to the recommendation.
  function preventionTagsHtml(row) {
    var tags = [];
    if (!isEmptyValue(row.housing_type)) tags.push(titleCase(row.housing_type));
    if (!isEmptyValue(row.cause_group)) tags.push(titleCase(row.cause_group));
    if (!isEmptyValue(row.action_type)) tags.push(titleCase(row.action_type));
    if (row.costs_money === true || row.costs_money === 't' || row.costs_money === 'true') tags.push('Costs money');
    else if (row.costs_money === false || row.costs_money === 'f' || row.costs_money === 'false') tags.push('No cost');
    return tags.map(function (tag) {
      return '<span class="inline-flex items-center rounded-full bg-white border border-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-500">' + escapeHtml(tag) + '</span>';
    }).join('');
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
          (source ? '<a href="#" onclick="goTo(\'about\');return false;" class="mt-1 inline-block text-[11px] text-slate-400 hover:text-forest-700 underline underline-offset-2">' + escapeHtml(source) + '</a>' : '') +
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
        var movesIt = visibleText(behaviour.what_moves_it);
        var whereEl = document.getElementById('kif_whereText');
        var observeEl = document.getElementById('kif_observeDistanceText');

        if (whereEl && where) whereEl.textContent = where;
        if (observeEl) {
          if (safeDistance) {
            observeEl.textContent = safeDistance;
          } else {
            var observationBlock = observeEl.closest ? observeEl.closest('.rounded-2xl, .rounded-xl') : null;
            if (observationBlock) observationBlock.classList.add('hidden');
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

      var wrap = document.getElementById('kif_preventionWrap');
      var list = document.getElementById('kif_preventionList');
      var source = document.getElementById('kif_preventionSource');
      var empty = document.getElementById('kif_preventionEmpty');
      var usable = preventionRows.filter(function (row) {
        return !isEmptyValue(row.action_text_en) || !isEmptyValue(row.action_text_ms);
      });

      if (wrap && list && usable.length) {
        list.innerHTML = usable.map(function (row) {
          var en = visibleText(row.action_text_en);
          var bm = visibleText(row.action_text_ms);
          var tags = preventionTagsHtml(row);
          return '<div class="flex gap-3 rounded-xl bg-slate-50 border border-slate-200/60 px-4 py-3">' +
            '<span class="text-emerald-800 font-bold">✓</span>' +
            '<div class="min-w-0">' +
            '<p class="text-sm text-slate-700 leading-relaxed">' +
            (en ? '<span data-en>' + escapeHtml(en) + '</span>' : '') +
            (bm ? '<span data-bm>' + escapeHtml(bm) + '</span>' : '') +
            '</p>' +
            (tags ? '<div class="mt-1.5 flex flex-wrap gap-1.5">' + tags + '</div>' : '') +
            '</div></div>';
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
        if (empty) empty.classList.add('hidden');
      } else if (wrap) {
        wrap.classList.add('hidden');
        if (empty) empty.classList.remove('hidden');
      }

      return true;
    }).catch(function (err) {
      console.warn('[Room for Both] Behaviour/prevention API unavailable; using embedded fallback.', err.message);
      return false;
    });
  }

  // Same "Source: X, verified Y" text the other DB-backed sections already
  // build via sourceLabel(), but as a full <a>/<span> element with the REAL
  // source_url from the row — replacing the old About-page table's
  // institutionSourceLink(), which guessed a URL by regex-matching the
  // institution NAME ("PERHILITAN" -> wildlife.gov.my, "Bomba" ->
  // bomba.gov.my) and silently produced no link at all for anything else
  // (MBPJ's House Crow/Common Myna rows had no outbound link for exactly
  // this reason — the regex simply didn't recognise "MBPJ").
  function uniqueSourceRows(rows) {
    var seen = {};
    return (rows || []).filter(function (row) {
      if (!row) return false;
      var key = [
        visibleText(row.source_url),
        visibleText(row.source_institution),
        visibleText(row.source_person),
        visibleText(row.date_verified)
      ].join('|');
      if (!key.replace(/\|/g, '')) return false;
      if (seen[key]) return false;
      seen[key] = true;
      return true;
    });
  }

  function sourceLinksHtml(rows) {
    var unique = uniqueSourceRows(rows);
    if (!unique.length) return '<span class="text-slate-300">—</span>';
    return '<div class="space-y-1.5">' + unique.map(function (row) {
      return '<div>' + sourceLinkHtml(row) + '</div>';
    }).join('') + '</div>';
  }

  function sourceLinkHtml(row) {
    var label = sourceLabel(row);
    if (!label) return '<span class="text-slate-300">—</span>';
    var url = visibleText(row && row.source_url);
    if (!url) return '<span class="text-slate-500">' + escapeHtml(label) + '</span>';
    return '<a href="' + escapeHtml(url) + '" target="_blank" rel="noopener" class="text-forest-600 hover:text-forest-800 font-semibold inline-flex items-start gap-1">' +
      '<span>' + escapeHtml(label) + '</span>' +
      '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="shrink-0 mt-0.5"><path d="M7 17 17 7"/><path d="M7 7h10v10"/></svg>' +
    '</a>';
  }

  // Populates the About page's "Safety step & prevention sources" table
  // (#about_actionSourceBody) with each species' REAL immediate_action /
  // prevention_action source row instead of the frontend's static
  // safetySource/checklistSource text. Species with no database species_id
  // mapping (the generic "snake" route — AC 1.1.2 deliberately never
  // resolves a specific snake species) keep their existing static text,
  // since there is no single species_id to query for a combined path.
  function renderActionSourcesFromDb() {
    var body = document.getElementById('about_actionSourceBody');
    if (!body) return Promise.resolve(false);
    var speciesList = (window.SPECIES || []).filter(function (a) { return a.id !== 'general'; });
    if (!speciesList.length) return Promise.resolve(false);

    return Promise.all(speciesList.map(function (a) {
      var dbId = resolveSpeciesId(a.id);
      if (!dbId) {
        return Promise.resolve({
          en: a.en,
          actionHtml: institutionSourceLinkFallback(a.safetySource && a.safetySource.en),
          preventionHtml: institutionSourceLinkFallback(a.checklistSource && a.checklistSource.en),
        });
      }
      return Promise.all([getImmediateActions(dbId), getPreventionActions(dbId)])
        .then(function (results) {
          var actionRows = results[0].actions || [];
          var preventionRows = results[1].actions || [];
          return {
            en: a.en,
            actionHtml: sourceLinksHtml(actionRows),
            preventionHtml: sourceLinksHtml(preventionRows)
          };
        })
        .catch(function () {
          return {
            en: a.en,
            actionHtml: institutionSourceLinkFallback(a.safetySource && a.safetySource.en),
            preventionHtml: institutionSourceLinkFallback(a.checklistSource && a.checklistSource.en),
          };
        });
    })).then(function (rows) {
      body.innerHTML = rows.map(function (r) {
        return '<tr>' +
          '<td class="py-3 pr-4 font-display font-bold text-forest-950 whitespace-nowrap align-top">' + escapeHtml(r.en) + '</td>' +
          '<td class="py-3 pr-4 align-top">' + r.actionHtml + '</td>' +
          '<td class="py-3 align-top">' + r.preventionHtml + '</td>' +
        '</tr>';
      }).join('');
      body.setAttribute('data-source', 'neon:immediate_action+prevention_action');
      return true;
    }).catch(function (err) {
      console.warn('[Room for Both] Action-sources table could not load from the database.', err.message);
      return false;
    });
  }

  // Same regex-based fallback the page used before, only reached for the
  // generic snake route (no species_id) or if the DB calls above fail.
  function institutionSourceLinkFallback(text) {
    if (!text) return '<span class="text-slate-300">—</span>';
    var url = /PERHILITAN/i.test(text) ? 'https://www.wildlife.gov.my/'
      : /Bomba/i.test(text) ? 'https://www.bomba.gov.my/'
      : /MBPJ/i.test(text) ? 'https://www.mbpj.gov.my/'
      : null;
    if (!url) return '<span class="text-slate-500">' + escapeHtml(text) + '</span>';
    return '<a href="' + url + '" target="_blank" rel="noopener" class="text-forest-600 hover:text-forest-800 font-semibold inline-flex items-start gap-1">' +
      '<span>' + escapeHtml(text) + '</span>' +
      '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="shrink-0 mt-0.5"><path d="M7 17 17 7"/><path d="M7 7h10v10"/></svg>' +
    '</a>';
  }

  function refreshCurrentDbPage() {
    var page = '';
    try { page = (window.APP && window.APP.currentPage) || ''; } catch (e) {}

    if (page === 'whattodo') return renderImmediateActionsFromDb();
    if (page === 'findable') return renderBehaviourAndPreventionFromDb();
    if (page === 'about') return renderActionSourcesFromDb();
    return Promise.resolve(false);
  }

  function scheduleDbRefresh() {
    setTimeout(function () {
      Promise.resolve(window.RoomForBothDB && window.RoomForBothDB.ready)
        .then(refreshCurrentDbPage)
        .catch(function (err) {
          console.warn('[Room for Both] DB refresh after navigation failed.', err && err.message ? err.message : err);
        });
    }, 0);
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

    if (typeof window.render_about === 'function' && !window.render_about.__dbWrapped) {
      var originalAbout = window.render_about;
      window.render_about = function () {
        var result = originalAbout.apply(this, arguments);
        Promise.resolve(window.RoomForBothDB.ready).then(renderActionSourcesFromDb);
        return result;
      };
      window.render_about.__dbWrapped = true;
    }

    if (typeof window.goTo === 'function' && !window.goTo.__dbWrapped) {
      var originalGoTo = window.goTo;
      window.goTo = function () {
        var result = originalGoTo.apply(this, arguments);
        scheduleDbRefresh();
        return result;
      };
      window.goTo.__dbWrapped = true;
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
    renderBehaviourAndPreventionFromDb: renderBehaviourAndPreventionFromDb,
    renderActionSourcesFromDb: renderActionSourcesFromDb
  };

  installRenderHooks();
  window.addEventListener('DOMContentLoaded', function () {
    installRenderHooks();
    scheduleDbRefresh();
  });
  window.addEventListener('roomforboth:db-ready', scheduleDbRefresh);
})();
