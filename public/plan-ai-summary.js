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

  function stripMeta(text){
    text=clean(text).replace(/^\d+\.\s*/,'');
    // Legacy rows put the citation after the action in the same text block.
    // Keep only the resident-facing action as AI input.
    text=text.replace(/\s+Source:\s+.*$/i,'');
    text=text.replace(/\s+(?:Verified|Disahkan)\s+\d{4}[-/]\d{1,2}[-/]\d{1,2}.*$/i,'');
    return clean(text);
  }

  function rowsFromDatabase(host){
    return Array.prototype.map.call(host.querySelectorAll('[data-plan-row="database"]'),function(row){
      var text=clean(row.getAttribute('data-action-text')||'');
      if(!text){
        var first=row.querySelector('.text-forest-950');
        text=clean(first&&first.textContent);
      }
      text=stripMeta(text);
      return text?{action:text,prevention_id:row.getAttribute('data-prevention-id')||null}:null;
    }).filter(Boolean);
  }

  function rowsFromVisiblePlan(host){
    var seen={};
    var rows=[];
    var controls=host.querySelectorAll('input[type="checkbox"],button[role="checkbox"],[role="checkbox"],.checkbox-btn');
    Array.prototype.forEach.call(controls,function(control,index){
      var row=control.closest('[data-plan-row],.flex,.action-row,li');
      if(!row || !host.contains(row)) return;
      var clone=row.cloneNode(true);
      clone.querySelectorAll('[data-plan-source-line],a,.text-slate-400,.text-slate-500,.text-slate-600').forEach(function(el){
        var t=clean(el.textContent);
        if(/^Source:/i.test(t)||/Verified/i.test(t)||/^Disahkan/i.test(t))el.remove();
      });
      var text=stripMeta(clone.innerText||clone.textContent||'');
      if(!text || seen[text]) return;
      seen[text]=true;
      rows.push({action:text,prevention_id:row.getAttribute('data-prevention-id')||String(index+1)});
    });
    return rows;
  }

  function rowsFromActions(){
    var host=actionsHost();
    if(!host)return[];
    var rows=rowsFromDatabase(host);
    if(!rows.length)rows=rowsFromVisiblePlan(host);
    return rows.slice(0,20);
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

  // The Plan page can be rendered by either the DB client or the legacy merged
  // renderer. Watch only the prevention-action host and retry when its rows
  // change; do not require DB-specific data attributes.
  var observer=new MutationObserver(function(){
    var host=actionsHost();
    if(host&&host.querySelector('input[type="checkbox"],button[role="checkbox"],[role="checkbox"],.checkbox-btn,[data-plan-row]'))scan();
  });
  observer.observe(document.documentElement,{subtree:true,childList:true});
})();
