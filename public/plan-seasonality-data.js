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
  var loaded=false;

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
  function normSpecies(v){return clean(v).toLowerCase();}

  function publish(data){
    if(!Array.isArray(data))return;
    var rows=[];
    data.forEach(function(r){
      var code=CODE_BY_SPECIES[normSpecies(r&&r.species)];
      if(!code)return;
      var year=Number(r&&r.year),month=Number(r&&r.month),count=Number(r&&r.count)||0;
      if(year<2017||year>2026||month<1||month>12||count<=0)return;
      rows.push([normState(r.state_normalised),code,year,month,count]);
    });
    window.ECOSYSTEM_OCCURRENCES={
      meta:{source:'iteration2_map_aggregated_V2.json',yearRange:[2017,2026]},
      rows:rows
    };
    loaded=true;
    window.dispatchEvent(new CustomEvent('roomforboth:occurrence-data-ready',{detail:{rows:rows.length}}));
    document.dispatchEvent(new Event('roomforboth:pageshow'));
  }

  function load(){
    if(loaded)return;
    fetch('/iteration2_map_aggregated_V2.json?v=20260915-2316',{cache:'no-store'})
      .then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json();})
      .then(publish)
      .catch(function(err){console.error('[plan-seasonality-data]',err&&err.message?err.message:err);});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();
  window.addEventListener('hashchange',load);
  document.addEventListener('roomforboth:pageshow',load);
})();
