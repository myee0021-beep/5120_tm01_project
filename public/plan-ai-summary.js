(function(){
  'use strict';

  var last='';
  var controller=null;
  var timer=null;

  function clean(v){return String(v==null?'':v).replace(/\s+/g,' ').trim();}
  function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');}
  function lang(){
    var l=String(document.documentElement.lang||'').toLowerCase();
    try{if(!l)l=String(localStorage.getItem('owm-lang')||'').toLowerCase();}catch(e){}
    return(l==='bm'||l==='ms')?'bm':'en';
  }

  function actionsHost(){return document.getElementById('plan-result__preventionActions');}

  function rowsFromActions(){
    var host=actionsHost();
    if(!host)return[];
    return Array.prototype.map.call(host.querySelectorAll('[data-plan-row="database"]'),function(row){
      var text=clean(row.getAttribute('data-action-text')||'');
      if(!text){
        var first=row.querySelector('.text-forest-950');
        text=clean(first&&first.textContent).replace(/^\d+\.\s*/,'');
      }
      return text?{action:text,prevention_id:row.getAttribute('data-prevention-id')||null}:null;
    }).filter(Boolean).slice(0,20);
  }

  function ensureBox(){
    var host=actionsHost();
    if(!host)return null;
    var b=document.getElementById('i2-plan-ai-summary-worker');
    if(!b){
      b=document.createElement('div');
      b.id='i2-plan-ai-summary-worker';
      b.setAttribute('data-generated-by','minimax');
      b.className='mt-5 mb-5 rounded-2xl border border-emerald-200 bg-emerald-50/70 px-5 py-4 text-sm text-slate-700';
    }
    if(b.parentNode!==host.parentNode||b.previousElementSibling!==host){
      host.insertAdjacentElement('afterend',b);
    }
    return b;
  }

  function title(l){return l==='bm'?'Pelan dalam bahasa mudah · AI':'Plan in plain words · AI';}

  function renderNotice(b,p,l){
    if(!b)return;
    b.innerHTML='<p class="font-semibold text-forest-800">'+esc(title(l))+'</p>'+
      '<p class="mt-2 text-slate-500">'+esc((p&&p.notice)||(l==='bm'?'Ringkasan AI tidak dapat dipaparkan. Gunakan tindakan pencegahan di atas.':'The AI summary could not be displayed. Please use the prevention actions above.'))+'</p>';
  }

  function requestSummary(){
    var rows=rowsFromActions();
    if(!rows.length)return;
    var l=lang();
    var fp=l+':'+JSON.stringify(rows);
    var b=ensureBox();
    if(!b)return;
    if(fp===last&&b.getAttribute('data-ai-complete')==='true')return;
    last=fp;

    if(controller)controller.abort();
    controller=new AbortController();
    b.removeAttribute('data-ai-complete');
    b.innerHTML='<p class="font-semibold text-forest-800">'+esc(title(l))+'</p>'+
      '<p class="mt-2 text-slate-500">'+esc(l==='bm'?'Menjana ringkasan daripada tindakan di atas…':'Summarising the actions above…')+'</p>';

    fetch('/api/i2/plan-summary',{
      method:'POST',
      headers:{'content-type':'application/json','accept':'application/json'},
      cache:'no-store',
      body:JSON.stringify({rows:rows,language:l}),
      signal:controller.signal
    })
      .then(function(res){return res.json().then(function(p){return{ok:res.ok,p:p};});})
      .then(function(x){
        var p=x.p||{};
        b.setAttribute('data-ai-complete','true');
        if(x.ok&&p.ok&&!p.hidden&&p.summary){
          b.innerHTML='<p class="font-semibold text-forest-800">'+esc(title(l))+'</p>'+
            '<p class="mt-2 leading-relaxed">'+esc(p.summary)+'</p>';
        }else{
          renderNotice(b,p,l);
        }
      })
      .catch(function(e){
        if(e&&e.name==='AbortError')return;
        b.setAttribute('data-ai-complete','true');
        renderNotice(b,null,l);
        console.error('[plan-ai-summary]',e&&e.message?e.message:e);
      });
  }

  function scan(){
    clearTimeout(timer);
    timer=setTimeout(requestSummary,150);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',scan,{once:true});
  else scan();

  window.addEventListener('roomforboth:db-ready',scan);
  window.addEventListener('roomforboth:db-plan-ready',scan);
  window.addEventListener('hashchange',scan);
  window.addEventListener('popstate',scan);
  document.addEventListener('roomforboth:pageshow',scan);

  new MutationObserver(function(){
    var host=actionsHost();
    if(host&&host.querySelector('[data-plan-row="database"]'))scan();
  }).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['lang','class','hidden']});
})();
