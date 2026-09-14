(function(){
  'use strict';

  var lastComplete='';
  var inFlight='';
  var controller=null;

  function clean(v){return String(v==null?'':v).replace(/\s+/g,' ').trim();}
  function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');}
  function lang(){var l=String(document.documentElement.lang||'').toLowerCase();try{if(!l)l=String(localStorage.getItem('owm-lang')||'').toLowerCase();}catch(e){}return(l==='bm'||l==='ms')?'bm':'en';}
  function currentPage(){return String(location.hash||'#index').replace(/^#/,'').split('?')[0]||'index';}
  function host(){return document.getElementById('plan-result__preventionActions');}

  function removeBox(){var b=document.getElementById('i2-plan-ai-summary-worker');if(b)b.remove();lastComplete='';inFlight='';if(controller){controller.abort();controller=null;}}
  function rows(){
    var h=host();
    if(!h||h.getAttribute('data-plan-source')!=='prevention_action')return[];
    return Array.prototype.map.call(h.querySelectorAll('[data-plan-row="database"]'),function(row){
      var action=clean(row.getAttribute('data-action-text')||'');
      return action?{action:action,prevention_id:row.getAttribute('data-prevention-id')||null}:null;
    }).filter(Boolean).slice(0,20);
  }
  function ensureBox(){
    var h=host();if(!h)return null;
    var b=document.getElementById('i2-plan-ai-summary-worker');
    if(!b){b=document.createElement('div');b.id='i2-plan-ai-summary-worker';b.setAttribute('data-generated-by','minimax');b.className='mt-5 mb-5 rounded-2xl border border-emerald-200 bg-emerald-50/70 px-5 py-4 text-sm text-slate-700';}
    if(b.parentNode!==h.parentNode||b.nextElementSibling!==h) h.insertAdjacentElement('beforebegin',b);
    return b;
  }
  function readTableLink(l){return '<a href="#plan-result__preventionActions" class="underline underline-offset-2 font-semibold text-emerald-800">'+(l==='bm'?'Baca jadual sebaliknya':'Read the table instead')+'</a>';}
  function disclaimer(l){return l==='bm'?'Ringkasan ini hanya menyusun semula baris yang telah dipaparkan. Gunakan jadual dan sumber sebagai rekod utama.':'This summary only rephrases rows already displayed. Use the table and sources as the primary record.';}
  function renderNotice(b,p,l){
    if(!b)return;
    b.innerHTML='<p class="font-semibold text-forest-800">'+(l==='bm'?'Pelan dalam bahasa mudah · AI':'Plan in plain words · AI')+'</p>'+
      '<p class="mt-2 text-slate-500">'+esc((p&&p.notice)||(l==='bm'?'Ringkasan AI tidak dapat dipaparkan. Gunakan jadual di bawah.':'The AI summary could not be displayed. Use the table below.'))+'</p>'+
      '<p class="mt-3">'+readTableLink(l)+'</p>';
  }
  function requestSummary(){
    if(currentPage()!=='plan-result'){removeBox();return;}
    var r=rows();
    if(!r.length){removeBox();return;}
    var l=lang();
    var fp=l+':'+JSON.stringify(r);
    if(fp===lastComplete||fp===inFlight)return;
    if(controller){controller.abort();controller=null;}
    inFlight=fp;
    controller=new AbortController();
    var b=ensureBox();if(!b){inFlight='';return;}
    b.innerHTML='<p class="font-semibold text-forest-800">'+(l==='bm'?'Pelan dalam bahasa mudah · AI':'Plan in plain words · AI')+'</p><p class="mt-2 text-slate-500">'+(l==='bm'?'Menjana ringkasan daripada baris di halaman ini…':'Summarising the rows already on this page…')+'</p>';
    fetch('/api/i2/plan-summary',{method:'POST',headers:{'content-type':'application/json','accept':'application/json'},cache:'no-store',body:JSON.stringify({rows:r,language:l}),signal:controller.signal})
      .then(function(res){return res.json().then(function(p){return{ok:res.ok,p:p};});})
      .then(function(x){
        if(inFlight!==fp)return;
        inFlight='';controller=null;lastComplete=fp;
        var p=x.p||{};
        if(x.ok&&p.ok&&!p.hidden&&p.summary){
          b.innerHTML='<p class="font-semibold text-forest-800">'+(l==='bm'?'Pelan dalam bahasa mudah · AI':'Plan in plain words · AI')+'</p>'+
            '<p class="mt-2 leading-relaxed">'+esc(p.summary)+'</p>'+
            '<p class="mt-3">'+readTableLink(l)+'</p>'+
            '<p class="mt-2 text-xs text-slate-500">'+esc(disclaimer(l))+'</p>';
        }else renderNotice(b,p,l);
      })
      .catch(function(e){
        if(e&&e.name==='AbortError')return;
        if(inFlight===fp){inFlight='';controller=null;lastComplete=fp;renderNotice(b,null,l);}
        console.error('[plan-ai-summary]',e&&e.message?e.message:e);
      });
  }

  window.addEventListener('roomforboth:db-plan-ready',requestSummary);
  window.addEventListener('roomforboth:db-plan-empty',removeBox);
  window.addEventListener('hashchange',function(){setTimeout(requestSummary,0);});
  window.addEventListener('popstate',function(){setTimeout(requestSummary,0);});
  document.addEventListener('roomforboth:pageshow',function(){setTimeout(requestSummary,0);});
})();
