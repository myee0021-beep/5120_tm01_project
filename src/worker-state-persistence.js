import planSummaryWorker from './worker-plan-summary.js';
import { handleIdentifyDescribe } from './identify-describe.js';
import { handlePlanRequest } from './plan-db-route.js';

const SPA_ROUTES = new Set([
  '/index.html','/plan.html','/plan-result.html','/plan-how-computed.html',
  '/emergency.html','/ecosystem.html','/ecosystem-redlist.html','/invasive.html',
  '/ecosystem-forecast.html','/ecosystem-forecast-method.html',
  '/community.html','/community-report.html','/community-share.html','/community-sent.html',
  '/community-review.html','/community-how-review-works.html',
  '/plan-log.html','/plan-log-new.html','/about-the-data.html'
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
<script src="/print-species-consistency.js?v=20261005-1"></script>
<script src="/ac-compliance.js?v=20260916-1"></script>
<script src="/print-selected-actions.js?v=20260915-1759"></script>
<script src="/print-ac-fixes.js?v=20260916-1"></script>
<script src="/emergency-flow-ac.js?v=20260915-1759"></script>
<script src="/about-ai-routes.js?v=20260914-1"></script>
<style id="ecosystem-related-links-unified">
.r4b-ecosystem-card{position:relative!important}
.r4b-overlay-arrow{
  position:absolute!important;
  right:28px!important;
  transform:translateY(-50%)!important;
  width:18px!important;
  height:18px!important;
  display:flex!important;
  align-items:center!important;
  justify-content:center!important;
  color:#166534!important;
  opacity:1!important;
  visibility:visible!important;
  font-size:18px!important;
  line-height:18px!important;
  font-weight:400!important;
  pointer-events:none!important;
  z-index:20!important;
}
.r4b-hide-native-arrow{
  opacity:0!important;
  visibility:hidden!important;
}
</style>
<script id="ecosystem-related-links-unifier">
(function(){
  'use strict';
  var TITLES=['Wildlife forecast','Red List and status','Is it invasive?'];
  var observer=null;

  function page(){
    return String(location.hash||'').replace(/^#/,'').split('?')[0] ||
      String(location.pathname||'').replace(/^\//,'').replace(/\.html$/,'');
  }
  function leafByText(text){
    return Array.prototype.find.call(document.querySelectorAll('h1,h2,h3,h4,p,span,div,strong'),function(el){
      return el.children.length===0 && String(el.textContent||'').trim()===text;
    });
  }
  function findCard(){
    var head=leafByText('ALSO IN ECOSYSTEM')||leafByText('Also in Ecosystem');
    if(!head)return null;
    var el=head;
    for(var i=0;i<8&&el;i++,el=el.parentElement){
      if(!el.getBoundingClientRect)continue;
      var r=el.getBoundingClientRect();
      if(r.width>900&&r.height>250&&r.height<700)return el;
    }
    return head.parentElement;
  }
  function isArrowLike(el){
    if(!el||el.classList&&el.classList.contains('r4b-overlay-arrow'))return false;
    var t=String(el.textContent||'').replace(/\s+/g,'').trim();
    var cls=String((el.className&&el.className.baseVal)||el.className||'');
    return t==='→'||t==='›'||t==='>'||t==='❯'||t==='➜'||
      el.tagName.toLowerCase()==='svg'||/arrow|chevron/i.test(cls);
  }
  function hideNative(card){
    var cr=card.getBoundingClientRect();
    Array.from(card.querySelectorAll('*')).forEach(function(el){
      if(el.classList&&el.classList.contains('r4b-overlay-arrow'))return;
      if(!el.getBoundingClientRect)return;
      var r=el.getBoundingClientRect();
      var nearRight=r.left>cr.right-120;
      if(nearRight&&isArrowLike(el))el.classList.add('r4b-hide-native-arrow');
    });
  }
  function ensureOverlay(card,title,index){
    var titleEl=leafByText(title);if(!titleEl)return;
    var cr=card.getBoundingClientRect();
    var tr=titleEl.getBoundingClientRect();
    var centerY=(tr.top+tr.height/2)-cr.top;
    var id='r4b-overlay-arrow-'+index;
    var arrow=card.querySelector('#'+id);
    if(!arrow){
      arrow=document.createElement('span');
      arrow.id=id;
      arrow.className='r4b-overlay-arrow';
      arrow.setAttribute('aria-hidden','true');
      arrow.textContent='→';
      card.appendChild(arrow);
    }
    arrow.style.top=centerY+'px';
  }
  function run(){
    if(page()!=='ecosystem')return;
    var card=findCard();if(!card)return;
    card.classList.add('r4b-ecosystem-card');
    hideNative(card);
    TITLES.forEach(function(t,i){ensureOverlay(card,t,i);});
  }
  function boot(){
    run();setTimeout(run,80);setTimeout(run,250);setTimeout(run,700);
    if(observer)observer.disconnect();
    observer=new MutationObserver(function(){setTimeout(run,0);});
    observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style','hidden']});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  window.addEventListener('hashchange',function(){setTimeout(boot,40);});
  window.addEventListener('resize',function(){setTimeout(run,40);});
  document.addEventListener('roomforboth:pageshow',function(){setTimeout(boot,40);});
})();
</script>`;

const ITERATION3_HEAD = String.raw`<script src="/community-api.js?v=20261004-2"></script>`;
class HeadInjector{element(el){el.append(ITERATION3_HEAD,{html:true});}}
class BodyInjector{element(el){el.append(STATE_PERSISTENCE_CLIENT,{html:true});}}

class HomeHeroContainerShift {
  element(el) {
    const current = el.getAttribute('style') || '';
    el.setAttribute('style', current + ';transform:translateX(76px) !important;');
  }
}

class FooterPlaceholderLinkHider {
  element(el) {
    el.setAttribute('style', 'display:none !important;');
    el.setAttribute('aria-hidden', 'true');
    el.setAttribute('tabindex', '-1');
  }
}

class HomeCopyText {
  text(chunk) {
    const replacements = new Map([
      ['Coexistence planning for Malaysian homes','SDG 15 · LIFE ON LAND · COEXISTENCE PLANNING'],
      ['SDG 15 · Life on Land · Coexistence planning','SDG 15 · LIFE ON LAND · COEXISTENCE PLANNING'],
      ['Perancangan kewujudan bersama untuk rumah di Malaysia','SDG 15 · Kehidupan di Darat · Perancangan kewujudan bersama'],
      ['Clear, practical next steps for people and wildlife to share space safely.','Seven animals, sixteen states, every figure from a public record. Nothing here tells you to catch, trap or harm an animal.'],
      ['Langkah seterusnya yang jelas dan praktikal agar manusia serta hidupan liar dapat berkongsi ruang dengan selamat.','Tujuh haiwan, enam belas negeri, setiap angka daripada rekod awam. Tiada apa-apa di sini yang menyuruh anda menangkap, memerangkap atau mencederakan haiwan.'],
      ['Safety steps first, then keep it findable and know who to call.','Snake question first. Then the safe steps, keep it findable, and who to call.'],
      ['A few questions about your home, then a practical plan with a source on every line.','Five questions about your home. Three counted signals for each animal and a plan with a source on every line.'],
      ['Explore the ecosystem map, then choose a state to see what is recorded there.','See which of the seven are recorded in that state and what each is drawn to, before you unpack.'],
      ['See the ecosystem map','See what lives there'],
      ['See what lives there','See what lives there'],
      ['Open Emergency','Open Emergency'],
      ['Start my plan','Start my plan'],
      ['Open data: PERHILITAN, APM, GBIF occurrence records, IUCN, GRIIS, Global Forest Watch.','Open data: PERHILITAN, GBIF occurrence records, IUCN, GRIIS Malaysia. About the data · Monash FIT5120 · TM01'],
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
      .on('head',new HeadInjector())
      .on('body',new BodyInjector())
      .on('div.relative.z-20.max-w-5xl.mx-auto.px-6.text-left',new HomeHeroContainerShift())
      .on('footer a[href="#"]',new FooterPlaceholderLinkHider())
      .on('span[data-en]',new HomeCopyText())
      .on('span[data-bm]',new HomeCopyText())
      .transform(response);
  }
};
