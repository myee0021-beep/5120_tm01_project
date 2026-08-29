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

  window.RoomForBothDB = {
    cache: cache,
    ready: loadBaseData(),
    reload: loadBaseData,
    speciesById: speciesById,
    speciesByName: speciesByName,
    getSpeciesDetail: getSpeciesDetail,
    getSpeciesMedia: getSpeciesMedia,
    getSpeciesBehaviour: getSpeciesBehaviour,
    getImmediateActions: getImmediateActions,
    getPreventionActions: getPreventionActions,
    getAuthorities: getAuthorities
  };
})();
