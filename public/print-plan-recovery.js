(function(){
'use strict';
var KEY='roomForBoth.currentPlanSnapshot';
function clean(v){return String(v==null?'':v).replace(/\s+/g,' ').trim();}
function page(){return String(location.hash||'').replace(/^#/,'').split('?')[0];}
function rowAction(row){var text=clean(row.getAttribute('data-action-text'));if(!text){var el=row.querySelector('.text-forest-950');text=clean(el&&el.textContent).replace(/^\d+\.\s*/,'');}return text;}
function capture(){
 var host=document.getElementById('plan-result__preventionActions');
 if(!host)return false;
 var rows=Array.from(host.querySelectorAll('[data-plan-row="database"]'));
 if(!rows.length)return false;
 var actions=rows.map(function(row){return{
   prevention_id:clean(row.getAttribute('data-prevention-id')),
   action_text:rowAction(row),
   source_person:clean(row.getAttribute('data-source-person')),
   source_institution:clean(row.getAttribute('data-source-institution')),
   source_url:clean(row.getAttribute('data-source-url')),
   date_verified:clean(row.getAttribute('data-date-verified'))
 };}).filter(function(a){return a.action_text&&(a.source_person||a.source_institution||a.source_url)&&a.date_verified;});
 if(!actions.length)return false;
 var state=document.getElementById('plan-result__stateHeading');
 var summary=document.getElementById('plan-result__summaryLine');
 var signals=document.getElementById('plan-result__speciesList');
 var season=document.getElementById('plan-result__seasonDescription');
 var snap={version:6,captured_from:'plan-result-before-print',stateLabel:clean(state&&state.textContent),summaryLine:clean(summary&&summary.textContent),signalsText:clean(signals&&signals.innerText),seasonText:clean(season&&season.innerText),actions:actions};
 try{sessionStorage.setItem(KEY,JSON.stringify(snap));return true;}catch(e){return false;}
}
function onPrintClick(e){var btn=e.target&&e.target.closest?e.target.closest('#plan-result__printPlanBtn'):null;if(btn)capture();}
document.addEventListener('click',onPrintClick,true);
window.addEventListener('roomforboth:db-plan-ready',function(){setTimeout(capture,60);});
window.addEventListener('roomforboth:signals-ready',function(){setTimeout(capture,60);});
window.addEventListener('hashchange',function(){if(page()==='plan-result')setTimeout(capture,100);});
})();