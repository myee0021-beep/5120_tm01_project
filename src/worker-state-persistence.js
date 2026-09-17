import planSummaryWorker from './worker-plan-summary.js';
import { handleIdentifyDescribe } from './identify-describe.js';
import { handlePlanRequest } from './plan-db-route.js';

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
<script src="/plan-db-client.js?v=20260916-1"></script>
<script src="/plan-snapshot-sync.js?v=20260914-1"></script>
<script src="/home-live-data.js?v=20260915-4"></script>
<script src="/plan-ai-summary.js?v=20260914-2"></script>
<script src="/plan-result-cleanup.js?v=20260914-1"></script>
<script src="/plan-result-consistency.js?v=20260916-1"></script>
<script src="/print-plan-recovery.js?v=20260915-2"></script>
<script src="/ac-compliance.js?v=20260916-1"></script>
<script src="/print-selected-actions.js?v=20260915-1759"></script>
<script src="/print-ac-fixes.js?v=20260916-1"></script>
<script src="/emergency-flow-ac.js?v=20260915-1759"></script>
<script src="/about-ai-routes.js?v=20260914-1"></script>
<script id="home-d42-prototype-alignment">
(function(){
  'use strict';
  var TARGETS={
    eyebrow:'SDG 15 · LIFE ON LAND · COEXISTENCE PLANNING',
    title:'Wild animals visit Malaysian homes. Which situation is yours?',
    standfirst:'Seven animals, sixteen states, every figure from a public record. Nothing here tells you to catch, trap or harm an animal.',
    emergencyTitle:'An animal is here now',
    emergencyBody:'Snake question first. Then the safe steps, keep it findable, and who to call.',
    emergencyCta:'Open Emergency →',
    planTitle:'One keeps coming back',
    planBody:'Five questions about your home. Three counted signals for each animal and a plan with a source on every line.',
    planCta:'Start my plan →',
    moveTitle:'I am moving somewhere new',
    moveBody:'See which of the seven are recorded in that state and what each is drawn to, before you unpack.',
    moveCta:'See what lives there →',
    privacy:'No account. No location detection. You choose a state inside the plan. Your answers are never stored.'
  };
  function norm(s){return String(s||'').replace(/\s+/g,' ').trim();}
  function onHome(){var p=String(location.hash||'#index').replace(/^#/,'').split('?')[0]||'index';return p==='index'||p==='index0914';}
  function findElement(match){
    var all=document.querySelectorAll('h1,h2,h3,p,span,a,button,div');
    for(var i=0;i<all.length;i++){if(match(norm(all[i].textContent),all[i]))return all[i];}
    return null;
  }
  function setText(el,text){if(!el)return;var span=el.matches&&el.matches('[data-en]')?el:el.querySelector&&el.querySelector('[data-en]');if(span)span.textContent=text;else el.textContent=text;}
  function closestCard(el){
    var n=el;
    for(var i=0;n&&i<5;i++,n=n.parentElement){
      if(n.querySelector&&n.querySelector('a,button')&&n.querySelectorAll('h2,h3').length===1)return n;
    }
    return el&&el.parentElement;
  }
  function ensureStyle(){
    if(document.getElementById('home-d42-prototype-style'))return;
    var st=document.createElement('style');st.id='home-d42-prototype-style';
    st.textContent='@media (min-width:900px){.home-d42-hero-block{max-width:820px!important;text-align:left!important}.home-d42-eyebrow{display:block!important;margin:0 0 22px!important;text-align:left!important}.home-d42-title{max-width:790px!important;margin:0 0 18px!important;text-align:left!important;line-height:1.08!important}.home-d42-standfirst{max-width:690px!important;margin:0!important;text-align:left!important;line-height:1.35!important}.home-d42-card-row{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:24px!important;align-items:stretch!important}.home-d42-card{height:100%!important;min-height:180px!important;box-sizing:border-box!important;text-align:left!important}.home-d42-card h2,.home-d42-card h3,.home-d42-card p,.home-d42-card a,.home-d42-card button{text-align:left!important}.home-d42-quiet-row{display:flex!important;align-items:center!important;justify-content:flex-start!important;gap:10px!important;flex-wrap:wrap!important}.home-d42-privacy{text-align:left!important;width:100%!important;box-sizing:border-box!important}}';
    document.head.appendChild(st);
  }
  function apply(){
    if(!onHome())return;
    ensureStyle();
    var eyebrow=findElement(function(t){return t===TARGETS.eyebrow||t==='SDG 15 · Life on Land · Coexistence planning'||t==='Coexistence planning for Malaysian homes';});
    var title=findElement(function(t,e){return /^Wild animals visit Malaysian homes\./i.test(t)&&(!e.tagName||/^H1$/i.test(e.tagName));});
    if(!title)title=findElement(function(t){return /^Wild animals visit Malaysian homes\./i.test(t);});
    var stand=findElement(function(t){return t===TARGETS.standfirst||t==='Clear, practical next steps for people and wildlife to share space safely.';});
    setText(eyebrow,TARGETS.eyebrow);setText(title,TARGETS.title);setText(stand,TARGETS.standfirst);
    if(eyebrow)eyebrow.classList.add('home-d42-eyebrow');
    if(title){title.classList.add('home-d42-title');var hb=title.parentElement;if(hb)hb.classList.add('home-d42-hero-block');}
    if(stand)stand.classList.add('home-d42-standfirst');

    var eTitle=findElement(function(t){return t===TARGETS.emergencyTitle;});
    var pTitle=findElement(function(t){return t===TARGETS.planTitle;});
    var mTitle=findElement(function(t){return t===TARGETS.moveTitle||/^I am moving/i.test(t)||/^Moving somewhere/i.test(t);});
    setText(mTitle,TARGETS.moveTitle);
    var cards=[closestCard(eTitle),closestCard(pTitle),closestCard(mTitle)].filter(Boolean);
    for(var c=0;c<cards.length;c++)cards[c].classList.add('home-d42-card');
    if(cards.length===3&&cards[0].parentElement===cards[1].parentElement&&cards[1].parentElement===cards[2].parentElement)cards[0].parentElement.classList.add('home-d42-card-row');

    function replaceWithin(card,tests,text){if(!card)return;var els=card.querySelectorAll('p,span,a,button');for(var i=0;i<els.length;i++){var t=norm(els[i].textContent);for(var j=0;j<tests.length;j++){if(tests[j](t)){setText(els[i],text);return els[i];}}}}
    replaceWithin(cards[0],[function(t){return /^Snake question first\./i.test(t)||/^Snake/i.test(t)&&/safe steps|who to call/i.test(t);}],TARGETS.emergencyBody);
    replaceWithin(cards[0],[function(t){return /^Open Emergency/i.test(t);}],TARGETS.emergencyCta);
    replaceWithin(cards[1],[function(t){return /^Five questions about your home\./i.test(t)||/Three counted signals/i.test(t);}],TARGETS.planBody);
    replaceWithin(cards[1],[function(t){return /^Start my plan/i.test(t);}],TARGETS.planCta);
    replaceWithin(cards[2],[function(t){return /^See which of the seven/i.test(t)||/recorded in that state/i.test(t);}],TARGETS.moveBody);
    replaceWithin(cards[2],[function(t){return /^See what lives there/i.test(t)||/^See the ecosystem map/i.test(t);}],TARGETS.moveCta);

    var quiet=[];var qlabels=['Map','Red List and status','Community','About the data'];
    for(var q=0;q<qlabels.length;q++){var qe=findElement(function(t){return t===qlabels[q];});if(qe)quiet.push(qe);}
    if(quiet.length>=3){var qp=quiet[0].parentElement;if(qp&&quiet.every(function(x){return x.parentElement===qp;}))qp.classList.add('home-d42-quiet-row');}
    var privacy=findElement(function(t){return t===TARGETS.privacy||/^No account\. No location detection\./i.test(t);});
    setText(privacy,TARGETS.privacy);if(privacy)privacy.classList.add('home-d42-privacy');
  }
  function schedule(){setTimeout(apply,0);setTimeout(apply,150);setTimeout(apply,500);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
  window.addEventListener('hashchange',schedule);document.addEventListener('roomforboth:pageshow',schedule);
})();
</script>`;

class BodyInjector{element(el){el.append(STATE_PERSISTENCE_CLIENT,{html:true});}}

class HomeCopyText {
  text(chunk) {
    const replacements = new Map([
      ['Coexistence planning for Malaysian homes','SDG 15 · LIFE ON LAND · COEXISTENCE PLANNING'],
      ['SDG 15 · Life on Land · Coexistence planning','SDG 15 · LIFE ON LAND · COEXISTENCE PLANNING'],
      ['Perancangan kewujudan bersama untuk rumah di Malaysia','SDG 15 · Kehidupan di Darat · Perancangan kewujudan bersama'],
      ['Clear, practical next steps for people and wildlife to share space safely.','Seven animals, sixteen states, every figure from a public record. Nothing here tells you to catch, trap or harm an animal.'],
      ['Langkah seterusnya yang jelas dan praktikal agar manusia serta hidupan liar dapat berkongsi ruang dengan selamat.','Tujuh haiwan, enam belas negeri, setiap angka daripada rekod awam. Tiada apa-apa di sini yang menyuruh anda menangkap, memerangkap atau mencederakan haiwan.'],
      ['See the ecosystem map','See what lives there →'],
      ['See what lives there','See what lives there →'],
      ['Lihat peta ekosistem','Lihat apa yang hidup di sana']
    ]);
    const next = replacements.get(chunk.text);
    if (next) chunk.replace(next);
  }
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(request.method==='POST'&&url.pathname==='/api/identify-describe')return handleIdentifyDescribe(request,env);
    if(request.method==='POST'&&url.pathname==='/api/i2/plan')return handlePlanRequest(request,env);
    let upstreamRequest=request;
    if(request.method==='GET'&&SPA_ROUTES.has(url.pathname)&&url.pathname!=='/index.html'){
      const rewritten=new URL(request.url);rewritten.pathname='/index0914.html';upstreamRequest=new Request(rewritten.toString(),request);
    }
    const response=await planSummaryWorker.fetch(upstreamRequest,env,ctx);
    const type=response.headers.get('content-type')||'';
    if(!type.toLowerCase().includes('text/html'))return response;
    return new HTMLRewriter()
      .on('body',new BodyInjector())
      .on('span[data-en]',new HomeCopyText())
      .on('span[data-bm]',new HomeCopyText())
      .transform(response);
  }
};
