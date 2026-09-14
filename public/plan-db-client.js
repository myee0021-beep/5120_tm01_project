(function(){
  'use strict';
  var lastFingerprint='';
  var inFlight='';
  var controller=null;
  var SNAPSHOT_KEY='roomForBoth.currentPlanSnapshot';

  function clean(v){return String(v==null?'':v).replace(/\s+/g,' ').trim();}
  function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');}
  function currentPage(){return String(location.hash||'#index').replace(/^#/,'').split('?')[0]||'index';}
  function currentLanguage(){var l=String(document.documentElement.getAttribute('lang')||'').toLowerCase();try{if(!l)l=String(localStorage.getItem('owm-lang')||'').toLowerCase();}catch(e){}return(l==='bm'||l==='ms')?'bm':'en';}
  function readHomeAnswers(){try{return JSON.parse(sessionStorage.getItem('roomForBoth.homeAnswers')||'null')||{};}catch(e){return {};}}
  function readState(a){
    try{if(window.AppNav&&AppNav.currentQuery){var x=new URLSearchParams(AppNav.currentQuery).get('state');if(x)return x;}}catch(e){}
    try{var x2=new URLSearchParams(location.search).get('state');if(x2)return x2;}catch(e){}
    try{var h=String(location.hash||''),q=h.indexOf('?');if(q!==-1){var x3=new URLSearchParams(h.slice(q+1)).get('state');if(x3)return x3;}}catch(e){}
    if(a&&a.state)return String(a.state);
    try{return sessionStorage.getItem('roomForBoth.selectedState')||'';}catch(e){return '';}
  }
  function buildPayload(){var a=readHomeAnswers();var p=Object.assign({},a);p.state=readState(a)||a.state||null;p.language=currentLanguage();return p;}
  function sourceLabel(a){var b=[];var p=clean(a&&a.source_person),i=clean(a&&a.source_institution);if(p)b.push(p);if(i&&b.indexOf(i)===-1)b.push(i);return b.join(' · ');}
  function valid(a){if(!a)return false;var t=clean(a.action_text||a.action_text_en||a.action_text_ms),s=sourceLabel(a)||clean(a.source_url),d=clean(a.date_verified);return!!(t&&s&&d);}
  function clearSnapshot(){try{sessionStorage.removeItem(SNAPSHOT_KEY);}catch(e){}}
  function dispatchEmpty(){window.dispatchEvent(new Event('roomforboth:db-plan-empty'));}

  function writeSnapshot(actions,lang){
    var state=readState(readHomeAnswers());
    var stateHeading=document.getElementById('plan-result__stateHeading');
    var speciesList=document.getElementById('plan-result__speciesList');
    var seasonDescription=document.getElementById('plan-result__seasonDescription');
    var summaryLine=document.getElementById('plan-result__summaryLine');
    var snapshot={version:3,state:state,stateLabel:clean(stateHeading&&stateHeading.textContent)||state,summaryLine:clean(summaryLine&&summaryLine.textContent),language:lang,signalsText:clean(speciesList&&speciesList.innerText),seasonText:clean(seasonDescription&&seasonDescription.innerText),actions:actions.map(function(a){return{prevention_id:clean(a.prevention_id),action_text:clean(a.action_text||a.action_text_en||a.action_text_ms),source_person:clean(a.source_person),source_institution:clean(a.source_institution),source_url:clean(a.source_url),date_verified:clean(a.date_verified)};})};
    try{sessionStorage.setItem(SNAPSHOT_KEY,JSON.stringify(snapshot));}catch(e){}
  }

  function renderFailure(host,progress,lang,message){
    host.setAttribute('data-plan-source','prevention_action-error');
    host.innerHTML='<div class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-slate-700">'+esc(message||(lang==='bm'?'Tiada tindakan pencegahan bersumber dan disahkan yang sepadan ditemui. Tiada panduan pengganti dipaparkan.':'No matching sourced and verified prevention actions were found. No substitute guidance is shown.'))+'</div>';
    if(progress)progress.textContent='0 of 0 done';
    clearSnapshot();dispatchEmpty();
  }

  function renderActions(host,progress,actions,lang,fallbackUsed){
    actions=actions.slice(0,8);
    var checked=actions.map(function(){return false;});
    function draw(){
      host.innerHTML='';
      actions.forEach(function(action,i){
        var textValue=clean(action.action_text||action.action_text_en||action.action_text_ms||'');
        var source=sourceLabel(action),sourceUrl=clean(action.source_url),verified=clean(action.date_verified);
        var row=document.createElement('div');row.className='flex items-start gap-3';row.setAttribute('data-plan-row','database');row.setAttribute('data-prevention-id',clean(action.prevention_id||''));row.setAttribute('data-action-text',textValue);row.setAttribute('data-source-person',clean(action.source_person));row.setAttribute('data-source-institution',clean(action.source_institution));row.setAttribute('data-source-url',sourceUrl);row.setAttribute('data-date-verified',verified);
        var box=document.createElement('button');box.type='button';box.className='checkbox-btn'+(checked[i]?' checked':'');box.setAttribute('aria-pressed',checked[i]?'true':'false');box.setAttribute('aria-label',(lang==='bm'?'Tandakan tindakan: ':'Mark action done: ')+textValue);box.innerHTML=checked[i]?'<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><path d="M20 6 9 17l-5-5"/></svg>':'';box.addEventListener('click',function(){checked[i]=!checked[i];draw();});
        var text=document.createElement('div');text.className='text-sm min-w-0';var sourceHtml=sourceUrl?'<a class="underline underline-offset-2 hover:text-emerald-700" href="'+esc(sourceUrl)+'" target="_blank" rel="noopener">'+esc(source||sourceUrl)+'</a>':esc(source);
        text.innerHTML='<div class="text-forest-950">'+esc((i+1)+'. '+textValue)+'</div><div class="mt-1 text-xs text-slate-400" data-plan-source-line>Source: '+sourceHtml+' · Verified '+esc(verified)+'</div>';
        row.appendChild(box);row.appendChild(text);host.appendChild(row);
      });
      if(progress)progress.textContent=checked.filter(Boolean).length+' of '+actions.length+' done';
      if(fallbackUsed){var note=document.createElement('div');note.className='text-xs text-slate-400 pt-1';note.textContent=lang==='bm'?'Tiada padanan tepat bagi semua jawapan. Hanya tindakan umum bagi spesies/kategori yang masih mempunyai sumber Malaysia dan tarikh pengesahan dipaparkan.':'No exact match was available for every answer. Only general actions for the species/category that still carry a Malaysian source and verified date are shown.';host.appendChild(note);}
    }
    host.setAttribute('data-plan-source','prevention_action');draw();writeSnapshot(actions,lang);
    window.dispatchEvent(new CustomEvent('roomforboth:db-plan-ready',{detail:{count:actions.length,state:readState(readHomeAnswers()),actions:actions}}));
  }

  function loadPlan(){
    if(currentPage()!=='plan-result')return;
    var host=document.getElementById('plan-result__preventionActions'),progress=document.getElementById('plan-result__preventionProgress');if(!host)return;
    var payload=buildPayload(),fp=JSON.stringify(payload);
    if(fp===lastFingerprint&&host.getAttribute('data-plan-source')==='prevention_action')return;
    if(fp===inFlight)return;
    if(controller){controller.abort();controller=null;}
    inFlight=fp;controller=new AbortController();var lang=payload.language;
    fetch('/api/i2/plan',{method:'POST',headers:{'content-type':'application/json','accept':'application/json'},cache:'no-store',body:JSON.stringify(payload),signal:controller.signal})
      .then(function(res){return res.json().then(function(body){return{ok:res.ok,body:body};});})
      .then(function(result){
        if(inFlight!==fp)return;
        var body=result.body||{};
        if(!result.ok||!body.ok){inFlight='';controller=null;lastFingerprint=fp;renderFailure(host,progress,lang,body.error||null);return;}
        var actions=Array.isArray(body.actions)?body.actions.filter(valid):[];
        inFlight='';controller=null;lastFingerprint=fp;
        if(!actions.length){renderFailure(host,progress,lang);return;}
        renderActions(host,progress,actions,lang,!!body.fallback_used);
      })
      .catch(function(error){
        if(error&&error.name==='AbortError')return;
        if(inFlight===fp){inFlight='';controller=null;lastFingerprint=fp;renderFailure(host,progress,lang);}
        console.error('[plan-db-client]',error&&error.message?error.message:error);
      });
  }

  function schedule(){setTimeout(loadPlan,0);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
  window.addEventListener('hashchange',schedule);window.addEventListener('popstate',schedule);document.addEventListener('roomforboth:pageshow',schedule);
})();
