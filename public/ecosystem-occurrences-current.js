(function(){
  'use strict';
  var CODE_BY_SPECIES={
    'macaca fascicularis':'macaque',
    'sus scrofa':'boar',
    'acridotheres tristis':'myna',
    'malayopython reticulatus':'python',
    'python reticulatus':'python',
    'corvus splendens':'crow',
    'varanus salvator':'monitor',
    'naja sumatrana':'cobra'
  };
  function clean(v){return String(v==null?'':v).replace(/\s+/g,' ').trim();}
  function normState(v){
    var s=clean(v).toLowerCase();
    if(s==='pulau pinang'||s==='penang')return 'penang';
    if(s==='kuala lumpur'||s==='w.p. kuala lumpur')return 'kl';
    if(s==='negeri sembilan')return 'negeri-sembilan';
    if(s==='w.p. labuan')return 'labuan';
    if(s==='w.p. putrajaya')return 'putrajaya';
    return s.replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  }
  function publishAllYears(data){
    if(!Array.isArray(data))return;
    var rows=[],total=0,noMonth=0,noYear=0,years=[];
    data.forEach(function(r){
      var code=CODE_BY_SPECIES[clean(r&&r.species).toLowerCase()];
      var count=Number(r&&r.count)||0;if(!code||count<=0)return;
      var year=Number(r&&r.year),month=Number(r&&r.month);
      if(!(isFinite(year)&&year>0)){year=0;noYear+=count;}else years.push(year);
      if(!(month>=1&&month<=12)){month=0;noMonth+=count;}
      total+=count;
      rows.push([normState(r.state_normalised),code,year,month,count]);
    });
    var meta={generatedBy:'iteration2 2026-09-16 build',sourceFile:'iteration2_map_aggregated.json',totalRecords:total,recordsWithNoMonth:noMonth,recordsWithNoYear:noYear,speciesCodes:['crow','myna','macaque','monitor','python','boar','cobra'],snakeCodes:['python','cobra'],yearRange:years.length?[Math.min.apply(null,years),Math.max.apply(null,years)]:[]};
    // The inline map dataset is deliberately left untouched: it is the
    // 2017–2026, 28,135-record extract. Other pages consume this full-history
    // dataset through its own global, so fetch timing can never replace map data.
    window.OCCURRENCES_ALL_YEARS={meta:meta,rows:rows};
    window.dispatchEvent(new CustomEvent('roomforboth:all-years-occurrence-data-ready',{detail:{rows:rows.length,totalRecords:total,yearRange:meta.yearRange}}));
  }
  fetch('iteration2_map_aggregated.json?v=20260916-1',{cache:'no-store'})
    .then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json();})
    .then(publishAllYears)
    .catch(function(err){console.warn('[ecosystem-occurrences-current] could not load full-history data:',err&&err.message?err.message:err);});
})();
