(function(){
  'use strict';
  var KEY='roomForBoth.currentPlanSnapshot';
  function clean(v){return String(v==null?'':v).replace(/\s+/g,' ').trim();}
  function sync(){
    var list=document.getElementById('plan-result__speciesList');
    if(!list)return;
    try{
      var snap=JSON.parse(sessionStorage.getItem(KEY)||'null');
      if(!snap||!Array.isArray(snap.actions))return;
      var season=document.getElementById('plan-result__seasonDescription');
      var summary=document.getElementById('plan-result__summaryLine');
      var state=document.getElementById('plan-result__stateHeading');
      snap.signalsText=clean(list.innerText);
      snap.seasonText=clean(season&&season.innerText);
      snap.summaryLine=clean(summary&&summary.innerText);
      snap.stateLabel=clean(state&&state.innerText)||snap.stateLabel;
      snap.version=4;
      sessionStorage.setItem(KEY,JSON.stringify(snap));
    }catch(e){console.warn('[plan-snapshot-sync]',e&&e.message?e.message:e);}
  }
  window.addEventListener('roomforboth:signals-ready',sync);
  window.addEventListener('roomforboth:db-plan-ready',function(){setTimeout(sync,80);});
})();
