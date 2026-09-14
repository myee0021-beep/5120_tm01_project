import planSummaryWorker from './worker-plan-summary.js';
import { handleIdentifyDescribe } from './identify-describe.js';

const SPA_ROUTES = new Set([
  '/index.html','/plan.html','/plan-result.html','/plan-how-computed.html',
  '/emergency.html','/ecosystem.html','/ecosystem-redlist.html','/invasive.html',
  '/community-how-review-works.html','/about-the-data.html'
]);

const STATE_PERSISTENCE_CLIENT = String.raw`
<script id="room-for-both-state-persistence">
(function(){
  'use strict';
  var KEY='roomForBoth.selectedState';
  var route=String(location.pathname||'').replace(/^\//,'').replace(/\.html$/,'');
  if(route && route!=='index0914' && route!=='index' && !location.hash){
    var q=location.search?location.search.slice(1):'';
    location.hash='#'+route+(q?'?'+q:'');
  }
  function readAnswersState(){try{var a=JSON.parse(sessionStorage.getItem('roomForBoth.homeAnswers')||'null');return a&&a.state?String(a.state):'';}catch(e){return '';}}
  function readStoredState(){try{return String(sessionStorage.getItem(KEY)||'');}catch(e){return '';}}
  function readQueryState(){
    try{if(window.AppNav&&AppNav.currentQuery){var s=new URLSearchParams(AppNav.currentQuery).get('state');if(s)return s;}}catch(e){}
    try{var direct=new URLSearchParams(location.search).get('state');if(direct)return direct;}catch(e){}
    try{var hash=String(location.hash||''),q=hash.indexOf('?');if(q!==-1){var h=new URLSearchParams(hash.slice(q+1)).get('state');if(h)return h;}}catch(e){}
    return '';
  }
  function persist(state){state=String(state||'').trim();if(!state)return;try{sessionStorage.setItem(KEY,state);}catch(e){}}
  function currentPage(){return String(location.hash||'#index').replace(/^#/,'').split('?')[0]||'index';}
  function resolveState(){var q=readQueryState();if(q)return q;var s=readStoredState();if(s)return s;var p=currentPage();if(p==='plan-result'||p==='plan-print'||p==='plan-how-computed')return readAnswersState()||'';return '';}
  function syncSelect(){var state=resolveState();if(!state)return;persist(state);var sel=document.getElementById('plan__plan_stateSelect');if(sel&&!sel.value&&Array.prototype.some.call(sel.options,function(o){return o.value===state;})){sel.value=state;sel.dispatchEvent(new Event('change',{bubbles:true}));}}
  document.addEventListener('change',function(e){var t=e.target;if(t&&(t.id==='index__home_stateSelect'||t.id==='plan__plan_stateSelect'))persist(t.value);},true);
  document.addEventListener('click',function(e){var target=e.target&&e.target.closest?e.target.closest('#index__home_goBtn,#plan__planSeeBtn'):null;if(!target)return;var sel=document.getElementById(target.id==='index__home_goBtn'?'index__home_stateSelect':'plan__plan_stateSelect');if(sel)persist(sel.value);},true);
  function run(){setTimeout(syncSelect,0);setTimeout(syncSelect,120);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();window.addEventListener('hashchange',run);document.addEventListener('roomforboth:pageshow',run);
})();
</script>
<script src="/plan-db-client.js?v=20260914-6"></script>
<script src="/plan-signals-client.js?v=20260914-1"></script>
<script src="/plan-snapshot-sync.js?v=20260914-1"></script>
<script src="/home-live-data.js?v=20260914-1"></script>
<script src="/plan-ai-summary.js?v=20260914-2"></script>
<script src="/plan-result-cleanup.js?v=20260914-1"></script>
<script src="/print-plan-recovery.js?v=20260915-2"></script>
<script src="/ac-compliance.js?v=20260914-3"></script>
<script src="/print-selected-actions.js?v=20260914-3"></script>
<script src="/emergency-flow-ac.js?v=20260915-3"></script>
<script src="/about-ai-routes.js?v=20260914-1"></script>`;

const EMERGENCY_INLINE_RUNTIME = String.raw`
<script id="iteration2-identify-inline-fix">
(function(){
'use strict';
var SPEC={
 macaque:{en:'Long-tailed Macaque',sci:'Macaca fascicularis',size:['medium'],cover:['fur'],loc:['roof','ground']},
 'wild-boar':{en:'Wild Boar',sci:'Sus scrofa',size:['large'],cover:['fur'],loc:['ground']},
 'common-myna':{en:'Common Myna',sci:'Acridotheres tristis',size:['small'],cover:['feathers'],loc:['roof','ground']},
 'house-crow':{en:'House Crow',sci:'Corvus splendens',size:['medium'],cover:['feathers'],loc:['roof','ground']},
 'water-monitor':{en:'Water Monitor Lizard',sci:'Varanus salvator',size:['medium','large'],cover:['scales'],loc:['water','ground']}
};
var NUM={'1':'macaque','2':'wild-boar','3':'common-myna','5':'house-crow','6':'water-monitor'};
function q(id){return document.getElementById(id)}
function show(x){if(x)x.classList.remove('hidden')}
function hide(x){if(x)x.classList.add('hidden')}
function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
function norm(id){return NUM[String(id)]||String(id||'')}
function nav(id){try{if(typeof goTo==='function')goTo('whattodo',{id:id})}catch(e){}}
function card(id,matched){var a=SPEC[id];if(!a)return'';return '<div class="id-card flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3.5" data-i2-card="'+id+'"><div><div class="font-display font-bold text-sm text-forest-950">'+esc(a.en)+'</div><div class="text-xs italic text-slate-400">'+esc(a.sci)+'</div><div class="text-[11px] text-slate-500 mt-1"><strong>Matched on:</strong> '+esc(matched)+'</div></div><button type="button" data-i2-confirm="'+id+'" class="rounded-full bg-forest-950 text-white text-xs font-bold px-4 py-2">Confirm / Sahkan</button></div>'}
function wire(root){if(!root)return;root.querySelectorAll('[data-i2-confirm]').forEach(function(b){b.addEventListener('click',function(e){e.preventDefault();e.stopImmediatePropagation();nav(b.getAttribute('data-i2-confirm'))},true)})}
window.__i2guided={size:null,cover:null,loc:null};
function renderGuided(){var a=window.__i2guided;var ranked=Object.keys(SPEC).map(function(id){var s=SPEC[id],score=0;if(s.cover.indexOf(a.cover)<0)return{id:id,score:-1};if(s.size.indexOf(a.size)>=0)score+=3;if(s.loc.indexOf(a.loc)>=0)score+=2;score+=4;return{id:id,score:score}}).filter(function(x){return x.score>=0}).sort(function(x,y){return y.score-x.score}).slice(0,3);var g=q('id_guidedResultGrid');if(!g)return;g.innerHTML=ranked.length?ranked.map(function(x){return card(x.id,[a.size,a.cover,a.loc].filter(Boolean).join(', '))}).join(''):'<p class="text-sm text-slate-400 text-center py-4">No close match in our species table.</p>';wire(g);document.querySelectorAll('.guided-step').forEach(function(s){s.classList.add('hidden')});show(q('id_guidedResult'))}
document.addEventListener('click',function(e){var b=e.target&&e.target.closest?e.target.closest('.guided-opt-size,.guided-opt-covering,.guided-opt-location'):null;if(!b)return;if(b.classList.contains('guided-opt-size')){e.preventDefault();e.stopImmediatePropagation();window.__i2guided.size=b.dataset.answer;hide(q('id_guidedStep0'));show(q('id_guidedStep1'));return}if(b.classList.contains('guided-opt-covering')){e.preventDefault();e.stopImmediatePropagation();window.__i2guided.cover=b.dataset.answer;hide(q('id_guidedStep1'));show(q('id_guidedStep2'));return}if(b.classList.contains('guided-opt-location')){e.preventDefault();e.stopImmediatePropagation();window.__i2guided.loc=b.dataset.answer;hide(q('id_guidedStep2'));renderGuided()}},true);
function describeMsg(t){var g=q('id_describeMatchGrid'),box=q('id_describeMatches');if(g)g.innerHTML='<p class="text-sm text-slate-400 text-center py-4">'+esc(t)+'</p>';show(box)}
function renderDescribe(ids,text){var g=q('id_describeMatchGrid'),box=q('id_describeMatches');if(!g)return;ids=(ids||[]).map(norm).filter(function(id,i,a){return SPEC[id]&&a.indexOf(id)===i}).slice(0,3);g.innerHTML=ids.length?ids.map(function(id){return card(id,'your description')}).join(''):'<p class="text-sm text-slate-400 text-center py-4">No match — try the guided questions instead.</p>';wire(g);show(box)}
document.addEventListener('click',function(e){var b=e.target&&e.target.closest?e.target.closest('#id_describeBtn'):null;if(!b)return;e.preventDefault();e.stopImmediatePropagation();var input=q('id_describeInput'),text=String(input&&input.value||'').trim();if(!text)return;describeMsg('AI is looking for matches…');fetch('/api/identify-describe',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({text:text})}).then(function(r){return r.json()}).then(function(d){console.log('[I2 inline Describe]',d);if(!d||!d.ok||!Array.isArray(d.species_ids))throw new Error(d&&d.error||'bad response');renderDescribe(d.species_ids,text)}).catch(function(err){console.error('[I2 inline Describe]',err);describeMsg('AI matching could not be completed — try Guided Q&A instead.')})},true);
document.documentElement.dataset.i2IdentifyInline='1';
console.log('[I2 inline Identify] ready');
})();
</script>`;

class BodyInjector{element(el){el.append(STATE_PERSISTENCE_CLIENT,{html:true});}}
class EmergencySrcdocInjector{
  element(el){
    const srcdoc=el.getAttribute('srcdoc');
    if(!srcdoc||srcdoc.includes('iteration2-identify-inline-fix'))return;
    const patched=srcdoc.includes('</body>')
      ? srcdoc.replace('</body>',EMERGENCY_INLINE_RUNTIME+'</body>')
      : srcdoc+EMERGENCY_INLINE_RUNTIME;
    el.setAttribute('srcdoc',patched);
  }
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(request.method==='POST'&&url.pathname==='/api/identify-describe')return handleIdentifyDescribe(request,env);
    let upstreamRequest=request;
    if(request.method==='GET'&&SPA_ROUTES.has(url.pathname)&&url.pathname!=='/index.html'){
      const rewritten=new URL(request.url);rewritten.pathname='/index0914.html';upstreamRequest=new Request(rewritten.toString(),request);
    }
    const response=await planSummaryWorker.fetch(upstreamRequest,env,ctx);
    const type=response.headers.get('content-type')||'';
    if(!type.toLowerCase().includes('text/html'))return response;
    return new HTMLRewriter().on('iframe#emergency__frame',new EmergencySrcdocInjector()).on('body',new BodyInjector()).transform(response);
  }
};
