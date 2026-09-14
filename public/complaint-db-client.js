(function(){
  'use strict';

  var ID_TO_CODE = {1:'macaque',2:'boar',3:'myna',4:'python',5:'crow',6:'monitor',7:'cobra'};
  var CODE_TO_ID = {macaque:1,boar:2,myna:3,python:4,crow:5,monitor:6,cobra:7};
  var cache = {};

  function apiBase(){ return (typeof window.API_BASE === 'string' && window.API_BASE) ? window.API_BASE : '/api'; }

  function fallbackSummary(rows){
    rows = Array.isArray(rows) ? rows : [];
    var years = rows.map(function(r){ return Number(r && r.year); }).filter(function(y){ return Number.isFinite(y); });
    if(!years.length) return {total:0,topCode:null,year:null,sourceUrl:null,verified:null};
    var year = Math.max.apply(null, years);
    var scoped = rows.filter(function(r){ return Number(r && r.year) === year; });
    var totals = scoped.filter(function(r){ return r && r.species_id == null; });
    var speciesRows = scoped.filter(function(r){ return r && r.species_id != null; });
    var total = totals.length
      ? Math.max.apply(null, totals.map(function(r){ return Number(r.cases)||0; }))
      : speciesRows.reduce(function(sum,r){ return sum + (Number(r.cases)||0); },0);
    var top = null;
    speciesRows.forEach(function(r){ if(!top || (Number(r.cases)||0) > (Number(top.cases)||0)) top = r; });
    var source = totals[0] || top || scoped[0] || {};
    return {total:total,topCode:top?ID_TO_CODE[Number(top.species_id)]||null:null,year:year,sourceUrl:source.source_url||null,verified:source.date_verified||null};
  }

  window.fetchStateComplaints = function(stateKey){
    if(cache[stateKey]) return cache[stateKey];
    cache[stateKey] = fetch(apiBase() + '/i2/complaints?state=' + encodeURIComponent(stateKey), {headers:{accept:'application/json'},cache:'no-store'})
      .then(function(r){ return r.json().then(function(body){ return {ok:r.ok,body:body}; }); })
      .then(function(result){
        var body = result.body || {};
        if(!result.ok || body.ok === false || !Array.isArray(body.rows)) throw new Error(body.error || 'complaints request failed');
        if(body.summary){
          return {
            total:Number(body.summary.total_cases)||0,
            topCode:body.summary.top_species_id!=null ? (ID_TO_CODE[Number(body.summary.top_species_id)]||null) : null,
            year:body.summary.year||null,
            sourceUrl:body.summary.source_url||null,
            verified:body.summary.date_verified||null
          };
        }
        return fallbackSummary(body.rows);
      })
      .catch(function(err){ console.error('[complaint-db-client]',stateKey,err); return null; });
    return cache[stateKey];
  };

  window.fetchStateGlance = async function(stateKey){
    if(!stateKey || !window.STATE_DATA || !window.STATE_DATA[stateKey]) return null;
    var base = window.STATE_DATA[stateKey];
    var live = await window.fetchStateComplaints(stateKey);
    var haveLive = !!(live && live.total > 0);
    return {
      observations:base.observations,
      mostRecorded:base.mostRecorded,
      topComplaintSpeciesId:haveLive && live.topCode ? CODE_TO_ID[live.topCode] : null,
      complaints:haveLive ? live.total : base.complaints,
      complaintYear:haveLive ? live.year : base.complaintYear,
      complaintSource:haveLive ? 'PERHILITAN complaint database' : base.complaintSource,
      complaintSourceUrl:haveLive ? live.sourceUrl : null
    };
  };

  window.complaintsLabelText = function(data){
    var isBm = (typeof window.currentLang === 'function' ? window.currentLang() : 'en') === 'bm';
    if(data && data.topComplaintSpeciesId != null){
      var code = ID_TO_CODE[data.topComplaintSpeciesId];
      var meta = code && window.SPECIES_META ? window.SPECIES_META[code] : null;
      var species = isBm ? (meta && meta.local || '') : (meta && meta.name || '');
      var year = data.complaintYear ? String(data.complaintYear) : '';
      return isBm
        ? 'jumlah aduan hidupan liar' + (year ? ', ' + year : '') + (species ? ' · paling banyak: ' + species : '')
        : 'total wildlife complaints' + (year ? ', ' + year : '') + (species ? ' · most reported: ' + species : '');
    }
    var fallbackSpecies = isBm ? 'monyet' : 'macaque';
    return isBm
      ? 'aduan ' + fallbackSpecies + ', ' + data.complaintYear + ', ' + data.complaintSource
      : fallbackSpecies + ' complaints, ' + data.complaintYear + ', ' + data.complaintSource;
  };

  window.dispatchEvent(new Event('roomforboth:complaint-db-client-ready'));
})();
