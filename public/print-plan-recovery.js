(function(){
'use strict';
var KEY='roomForBoth.currentPlanSnapshot';
var rebuilding=false;
function clean(v){return String(v==null?'':v).replace(/\s+/g,' ').trim();}
function page(){return String(location.hash||'').replace(/^#/,'').split('?')[0];}
function readSnapshot(){try{var x=JSON.parse(sessionStorage.getItem(KEY)||'null');return x&&Array.isArray(x.actions)&&x.actions.length?x:null;}catch(e){return null;}}
function readAnswers(){try{return JSON.parse(sessionStorage.getItem('roomForBoth.homeAnswers')||'null')||{};}catch(e){return {};}}
function readState(a){
 try{if(window.AppNav&&AppNav.currentQuery){var x=new URLSearchParams(AppNav.currentQuery).get('state');if(x)return x;}}catch(e){}
 try{var h=String(location.hash||''),i=h.indexOf('?');if(i!==-1){var y=new URLSearchParams(h.slice(i+1)).get('state');if(y)return y;}}catch(e){}
 try{var z=sessionStorage.getItem('roomForBoth.selectedState');if(z)return z;}catch(e){}
 return a&&a.state?String(a.state):'';
}
function rowAction(row){var text=clean(row.getAttribute('data-action-text'));if(!text){var el=row.querySelector('.text-forest-950');text=clean(el&&el.textContent).replace(/^\d+\.\s*/,'');}return text;}
function domSnapshot(){
 var host=document.getElementById('plan-result__preventionActions');if(!host)return null;
 var rows=Array.from(host.querySelectorAll('[data-plan-row="database"]'));if(!rows.length)return null;
 var actions=rows.map(function(row){return{
  prevention_id:clean(row.getAttribute('data-prevention-id')),
  action_text:rowAction(row),
  source_person:clean(row.getAttribute('data-source-person')),
  source_institution:clean(row.getAttribute('data-source-institution')),
  source_url:clean(row.getAttribute('data-source-url')),
  date_verified:clean(row.getAttribute('data-date-verified'))
 };}).filter(function(a){return a.action_text&&(a.source_person||a.source_institution||a.source_url)&&a.date_verified;});
 if(!actions.length)return null;
 var state=document.getElementById('plan-result__stateHeading');
 var summary=document.getElementById('plan-result__summaryLine');
 var signals=document.getElementById('plan-result__speciesList');
 var season=document.getElementById('plan-result__seasonDescription');
 return{version:7,captured_from:'plan-result-dom',stateLabel:clean(state&&state.textContent),summaryLine:clean(summary&&summary.textContent),signalsText:clean(signals&&signals.innerText),seasonText:clean(season&&season.innerText),actions:actions};
}
function save(snap){if(!snap||!Array.isArray(snap.actions)||!snap.actions.length)return false;try{sessionStorage.setItem(KEY,JSON.stringify(snap));return true;}catch(e){return false;}}
function capture(){var snap=domSnapshot();return snap?save(snap):false;}
function currentLanguage(){var l=String(document.documentElement.lang||'').toLowerCase();try{if(!l)l=String(localStorage.getItem('owm-lang')||'').toLowerCase();}catch(e){}return(l==='bm'||l==='ms')?'bm':'en';}
function sourceOk(a){return !!(clean(a&&a.action_text||a&&a.action_text_en||a&&a.action_text_ms)&&(clean(a&&a.source_person)||clean(a&&a.source_institution)||clean(a&&a.source_url))&&clean(a&&a.date_verified));}
function rebuildFromApi(){
 if(page()!=='plan-print'||readSnapshot()||rebuilding)return;
 var answers=readAnswers();var state=readState(answers);if(!state)return;
 rebuilding=true;
 var payload=Object.assign({},answers,{state:state,language:currentLanguage()});
 fetch('/api/i2/plan',{method:'POST',headers:{'content-type':'application/json','accept':'application/json'},cache:'no-store',body:JSON.stringify(payload)})
  .then(function(r){return r.json().then(function(body){return{ok:r.ok,body:body};});})
  .then(function(result){
   rebuilding=false;
   var actions=result.ok&&result.body&&Array.isArray(result.body.actions)?result.body.actions.filter(sourceOk).slice(0,8):[];
   if(!actions.length)return;
   var stateEl=document.getElementById('plan-result__stateHeading');
   var summary=document.getElementById('plan-result__summaryLine');
   var signals=document.getElementById('plan-result__speciesList');
   var season=document.getElementById('plan-result__seasonDescription');
   var snap={version:8,captured_from:'plan-api-recovery',state:state,stateLabel:clean(stateEl&&stateEl.textContent)||state,summaryLine:clean(summary&&summary.textContent),signalsText:clean(signals&&signals.innerText),seasonText:clean(season&&season.innerText),actions:actions.map(function(a){return{prevention_id:clean(a.prevention_id),action_text:clean(a.action_text||a.action_text_en||a.action_text_ms),source_person:clean(a.source_person),source_institution:clean(a.source_institution),source_url:clean(a.source_url),date_verified:clean(a.date_verified)};})};
   if(save(snap)){
    document.dispatchEvent(new CustomEvent('roomforboth:pageshow',{detail:{page:'plan-print',recovered:true}}));
    window.dispatchEvent(new Event('roomforboth:print-snapshot-ready'));
   }
  })
  .catch(function(e){rebuilding=false;console.warn('[print-plan-recovery]',e&&e.message?e.message:e);});
}
function run(){
 if(page()==='plan-result'){capture();return;}
 if(page()==='plan-print'){
  if(readSnapshot())return;
  if(capture())document.dispatchEvent(new CustomEvent('roomforboth:pageshow',{detail:{page:'plan-print',recovered:true}}));
  else rebuildFromApi();
 }
}
document.addEventListener('click',function(){if(page()==='plan-result')capture();},true);
window.addEventListener('roomforboth:db-plan-ready',function(){setTimeout(capture,40);});
window.addEventListener('roomforboth:signals-ready',function(){setTimeout(capture,40);});
window.addEventListener('hashchange',function(){setTimeout(run,60);});
document.addEventListener('roomforboth:pageshow',function(){setTimeout(run,60);});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(run,60);},{once:true});else setTimeout(run,60);
})();