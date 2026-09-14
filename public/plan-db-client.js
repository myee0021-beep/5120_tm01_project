(function(){
  'use strict';

  var lastFingerprint = '';
  var controller = null;
  var timer = null;

  function clean(v){ return String(v == null ? '' : v).replace(/\s+/g,' ').trim(); }
  function esc(v){ return String(v == null ? '' : v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;'); }
  function currentPage(){ return String(location.hash || '#index').replace(/^#/,'').split('?')[0] || 'index'; }
  function language(){
    var l = String(document.documentElement.lang || '').toLowerCase();
    try { if(!l) l = String(localStorage.getItem('owm-lang') || '').toLowerCase(); } catch(e) {}
    return (l === 'bm' || l === 'ms') ? 'bm' : 'en';
  }
  function readAnswers(){
    try { return JSON.parse(sessionStorage.getItem('roomForBoth.homeAnswers') || 'null') || null; }
    catch(e){ return null; }
  }
  function readState(){
    try {
      if(window.AppNav && AppNav.currentQuery){
        var q = new URLSearchParams(AppNav.currentQuery).get('state');
        if(q) return q;
      }
    } catch(e) {}
    try {
      var direct = new URLSearchParams(location.search).get('state');
      if(direct) return direct;
    } catch(e) {}
    try {
      var hash = String(location.hash || '');
      var i = hash.indexOf('?');
      if(i !== -1){
        var hs = new URLSearchParams(hash.slice(i + 1)).get('state');
        if(hs) return hs;
      }
    } catch(e) {}
    try {
      var stored = sessionStorage.getItem('roomForBoth.selectedState');
      if(stored) return stored;
    } catch(e) {}
    var a = readAnswers();
    return a && a.state ? String(a.state) : '';
  }
  function visible(el){
    if(!el) return false;
    var s = getComputedStyle(el);
    return s.display !== 'none' && s.visibility !== 'hidden' && el.getClientRects().length > 0;
  }
  function pageRoot(){ return document.querySelector('.page:not(.hidden)') || document.body; }

  function findPlanHeading(){
    var root = pageRoot();
    var els = root.querySelectorAll('h1,h2,h3,h4,h5,h6,[role="heading"],p,div,span');
    for(var i=0;i<els.length;i++){
      var el = els[i];
      if(!visible(el)) continue;
      var t = clean(el.innerText).toLowerCase();
      if(t === 'your prevention plan' || t === 'pelan pencegahan anda') return el;
    }
    return null;
  }

  function findPlanCard(){
    var heading = findPlanHeading();
    if(!heading) return null;
    return heading.closest('section,article,[class*="rounded"],[class*="card"]') || heading.parentElement;
  }

  function findRowsHost(card){
    if(!card) return null;
    var controls = card.querySelectorAll('input[type="checkbox"],button[role="checkbox"],[role="checkbox"],.checkbox-btn');
    if(controls.length){
      var holders = [];
      Array.prototype.forEach.call(controls,function(ctrl){
        var h = ctrl.closest('li,label,[data-plan-row],[class*="flex"],div');
        if(h && holders.indexOf(h) === -1) holders.push(h);
      });
      if(holders.length){
        var p = holders[0].parentElement;
        if(p && holders.every(function(h){ return h.parentElement === p; })) return p;
      }
    }
    var list = card.querySelector('ul,ol,[data-plan-list],[data-prevention-list]');
    if(list) return list;
    return null;
  }

  function formatDate(v){
    if(!v) return '';
    var s = String(v);
    var m = s.match(/^\d{4}-\d{2}-\d{2}/);
    return m ? m[0] : s;
  }

  function sourceText(a,l){
    var source = clean(a.source_institution || a.source_person || '');
    var date = formatDate(a.date_verified);
    if(l === 'bm'){
      if(source && date) return 'Sumber: ' + source + ' · Disahkan: ' + date;
      if(source) return 'Sumber: ' + source;
      if(date) return 'Disahkan: ' + date;
      return '';
    }
    if(source && date) return 'Source: ' + source + ' · Verified: ' + date;
    if(source) return 'Source: ' + source;
    if(date) return 'Verified: ' + date;
    return '';
  }

  function actionHtml(a,index,l){
    var action = clean(a.action_text || a.action_text_en || a.action_text_ms || '');
    var source = sourceText(a,l);
    var sourceLink = clean(a.source_url || '');
    var sourceHtml = source ? '<div class="mt-1 text-xs text-slate-500">' + esc(source) + '</div>' : '';
    if(source && sourceLink){
      sourceHtml = '<div class="mt-1 text-xs text-slate-500"><a href="' + esc(sourceLink) + '" target="_blank" rel="noopener noreferrer" class="underline underline-offset-2">' + esc(source) + '</a></div>';
    }
    return '<label data-plan-row data-prevention-id="' + esc(a.prevention_id || '') + '" class="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">'
      + '<input type="checkbox" class="mt-1 h-4 w-4" data-db-plan-checkbox="1" />'
      + '<span class="min-w-0 flex-1">'
      + '<span class="block font-medium text-slate-800">' + esc((index + 1) + '. ' + action) + '</span>'
      + sourceHtml
      + '</span></label>';
  }

  function renderActions(card,actions,l){
    var host = findRowsHost(card);
    if(!host){
      var heading = findPlanHeading();
      host = document.createElement('div');
      host.setAttribute('data-plan-list','database');
      host.className = 'mt-4 space-y-3';
      if(heading && heading.parentNode) heading.parentNode.insertBefore(host, heading.nextSibling);
      else card.appendChild(host);
    }
    host.setAttribute('data-plan-list','database');
    host.setAttribute('data-plan-source','prevention_action');
    host.classList.add('space-y-3');
    host.innerHTML = actions.map(function(a,i){ return actionHtml(a,i,l); }).join('');

    var oldStatus = card.querySelector('[data-db-plan-status]');
    if(oldStatus) oldStatus.remove();
    var status = document.createElement('p');
    status.setAttribute('data-db-plan-status','loaded');
    status.className = 'mt-3 text-xs text-slate-500';
    status.textContent = l === 'bm'
      ? 'Pelan ini dimuatkan daripada rekod prevention_action yang sepadan dengan jawapan anda.'
      : 'This plan is loaded from prevention_action records matched to your answers.';
    host.insertAdjacentElement('afterend',status);

    window.dispatchEvent(new CustomEvent('roomforboth:db-plan-ready',{detail:{count:actions.length}}));
    window.dispatchEvent(new Event('roomforboth:db-ready'));
  }

  function renderFailure(card,message,l){
    if(!card) return;
    var host = findRowsHost(card);
    if(!host){
      host = document.createElement('div');
      host.className = 'mt-4';
      card.appendChild(host);
    }
    host.setAttribute('data-plan-list','database-error');
    host.innerHTML = '<div class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-slate-700">'
      + esc(message || (l === 'bm'
        ? 'Pelan pangkalan data tidak dapat dimuatkan. Tiada pelan mock digunakan.'
        : 'The database plan could not be loaded. No mock plan is being used.'))
      + '</div>';
  }

  function buildPayload(){
    var a = readAnswers() || {};
    return {
      state: readState() || a.state || null,
      speciesSeen: a.speciesSeen || [],
      foodSources: a.foodSources || [],
      wasteStorage: a.wasteStorage || null,
      neighboursFeed: a.neighboursFeed || null,
      housingType: a.housingType || a.housing_type || null,
      language: language()
    };
  }

  function load(){
    var page = currentPage();
    if(page !== 'plan-result' && page !== 'plan-print' && page !== 'plan-how-computed') return;
    var card = findPlanCard();
    if(!card) return;
    var payload = buildPayload();
    var fp = JSON.stringify(payload);
    if(fp === lastFingerprint && card.querySelector('[data-plan-source="prevention_action"]')) return;
    lastFingerprint = fp;

    if(controller) controller.abort();
    controller = new AbortController();
    var l = payload.language;

    fetch('/api/i2/plan',{
      method:'POST',
      headers:{'content-type':'application/json','accept':'application/json'},
      cache:'no-store',
      body:JSON.stringify(payload),
      signal:controller.signal
    }).then(function(res){
      return res.json().then(function(body){ return {ok:res.ok,body:body}; });
    }).then(function(x){
      if(!x.ok || !x.body || !x.body.ok) throw new Error((x.body && x.body.error) || 'Plan API failed');
      var actions = Array.isArray(x.body.actions) ? x.body.actions.filter(function(a){ return clean(a.action_text || a.action_text_en || a.action_text_ms); }) : [];
      if(!actions.length){
        renderFailure(card,l === 'bm'
          ? 'Tiada rekod prevention_action yang sepadan ditemui untuk jawapan ini.'
          : 'No matching prevention_action records were found for these answers.',l);
        return;
      }
      renderActions(card,actions,l);
    }).catch(function(e){
      if(e && e.name === 'AbortError') return;
      renderFailure(card,null,l);
      console.error('[plan-db-client]',e && e.message ? e.message : e);
    });
  }

  function schedule(){ clearTimeout(timer); timer = setTimeout(load,160); }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',schedule,{once:true});
  else schedule();
  window.addEventListener('hashchange',schedule);
  window.addEventListener('popstate',schedule);
  document.addEventListener('roomforboth:pageshow',schedule);
  new MutationObserver(function(){ schedule(); }).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class','hidden','lang']});
})();
