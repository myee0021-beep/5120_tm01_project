(function(){
  'use strict';

  var lastFingerprint = '';
  var controller = null;
  var timer = null;

  function clean(v){ return String(v == null ? '' : v).replace(/\s+/g, ' ').trim(); }
  function esc(v){ return String(v == null ? '' : v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;'); }

  function currentPage(){
    return String(location.hash || '#index').replace(/^#/,'').split('?')[0] || 'index';
  }

  function currentLanguage(){
    var lang = String(document.documentElement.getAttribute('lang') || '').toLowerCase();
    try { if(!lang) lang = String(localStorage.getItem('owm-lang') || '').toLowerCase(); } catch(e) {}
    return (lang === 'bm' || lang === 'ms') ? 'bm' : 'en';
  }

  function readHomeAnswers(){
    try { return JSON.parse(sessionStorage.getItem('roomForBoth.homeAnswers') || 'null') || {}; }
    catch(e){ return {}; }
  }

  function readState(homeAnswers){
    try {
      if(window.AppNav && AppNav.currentQuery){
        var fromRouter = new URLSearchParams(AppNav.currentQuery).get('state');
        if(fromRouter) return fromRouter;
      }
    } catch(e) {}

    try {
      var fromSearch = new URLSearchParams(location.search).get('state');
      if(fromSearch) return fromSearch;
    } catch(e) {}

    try {
      var hash = String(location.hash || '');
      var q = hash.indexOf('?');
      if(q !== -1){
        var fromHash = new URLSearchParams(hash.slice(q + 1)).get('state');
        if(fromHash) return fromHash;
      }
    } catch(e) {}

    if(homeAnswers && homeAnswers.state) return String(homeAnswers.state);

    try {
      var stored = sessionStorage.getItem('roomForBoth.selectedState');
      if(stored) return stored;
    } catch(e) {}

    return '';
  }

  function buildPayload(){
    var answers = readHomeAnswers();
    var payload = Object.assign({}, answers);
    payload.state = readState(answers) || answers.state || null;
    payload.language = currentLanguage();
    return payload;
  }

  function sourceText(action, lang){
    var who = clean(action.source_institution || action.source_person || '');
    var verified = clean(action.date_verified || '');
    if(verified){
      var m = verified.match(/^\d{4}-\d{2}-\d{2}/);
      if(m) verified = m[0];
    }

    if(lang === 'bm'){
      if(who && verified) return 'Sumber: ' + who + ' · Disahkan: ' + verified;
      if(who) return 'Sumber: ' + who;
      if(verified) return 'Disahkan: ' + verified;
      return 'Sumber: pangkalan data prevention_action';
    }

    if(who && verified) return 'Source: ' + who + ' · Verified: ' + verified;
    if(who) return 'Source: ' + who;
    if(verified) return 'Verified: ' + verified;
    return 'Source: prevention_action database';
  }

  function renderFailure(host, progress, lang, message){
    if(!host) return;
    host.setAttribute('data-plan-source', 'prevention_action-error');
    host.innerHTML = '<div class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-slate-700">' +
      esc(message || (lang === 'bm'
        ? 'Pelan daripada pangkalan data tidak dapat dimuatkan. Pelan mock tidak digunakan.'
        : 'The database plan could not be loaded. The mock plan is not being used.')) +
      '</div>';
    if(progress) progress.textContent = '0 of 0 done';
  }

  function renderActions(host, progress, actions, lang){
    var checked = actions.map(function(){ return false; });

    function draw(){
      host.innerHTML = '';

      actions.forEach(function(action, i){
        var textValue = clean(action.action_text || action.action_text_en || action.action_text_ms || '');
        var row = document.createElement('div');
        row.className = 'flex items-start gap-3';
        row.setAttribute('data-plan-row', 'database');
        row.setAttribute('data-prevention-id', clean(action.prevention_id || ''));

        var box = document.createElement('div');
        box.className = 'checkbox-btn' + (checked[i] ? ' checked' : '');
        box.innerHTML = checked[i]
          ? '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>'
          : '';
        box.addEventListener('click', function(){
          checked[i] = !checked[i];
          draw();
        });

        var text = document.createElement('div');
        text.className = 'text-sm';
        var source = sourceText(action, lang);
        var sourceUrl = clean(action.source_url || '');
        var sourceHtml = esc(source);
        if(sourceUrl){
          sourceHtml = '<a href="' + esc(sourceUrl) + '" target="_blank" rel="noopener noreferrer" class="underline underline-offset-2">' + esc(source) + '</a>';
        }
        text.innerHTML =
          '<div class="text-forest-950">' + esc((i + 1) + '. ' + textValue) + '</div>' +
          '<div class="mt-0.5 text-xs text-slate-400">' + sourceHtml + '</div>';

        row.appendChild(box);
        row.appendChild(text);
        host.appendChild(row);
      });

      var done = checked.filter(Boolean).length;
      if(progress) progress.textContent = done + ' of ' + actions.length + ' done';
    }

    host.setAttribute('data-plan-source', 'prevention_action');
    draw();

    window.dispatchEvent(new CustomEvent('roomforboth:db-plan-ready', {
      detail: { count: actions.length, state: readState(readHomeAnswers()) }
    }));
    window.dispatchEvent(new Event('roomforboth:db-ready'));
  }

  function loadPlan(){
    if(currentPage() !== 'plan-result') return;

    var host = document.getElementById('plan-result__preventionActions');
    var progress = document.getElementById('plan-result__preventionProgress');
    if(!host) return;

    var payload = buildPayload();
    var fingerprint = JSON.stringify(payload);
    if(fingerprint === lastFingerprint && host.getAttribute('data-plan-source') === 'prevention_action') return;
    lastFingerprint = fingerprint;

    if(controller) controller.abort();
    controller = new AbortController();
    var lang = payload.language;

    fetch('/api/i2/plan', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'accept': 'application/json'
      },
      cache: 'no-store',
      body: JSON.stringify(payload),
      signal: controller.signal
    })
      .then(function(res){
        return res.json().then(function(body){ return { ok: res.ok, body: body }; });
      })
      .then(function(result){
        var body = result.body || {};
        if(!result.ok || !body.ok){
          throw new Error(body.error || 'Plan API failed');
        }

        var actions = Array.isArray(body.actions)
          ? body.actions.filter(function(action){
              return clean(action && (action.action_text || action.action_text_en || action.action_text_ms));
            })
          : [];

        if(!actions.length){
          renderFailure(
            host,
            progress,
            lang,
            lang === 'bm'
              ? 'Tiada rekod prevention_action yang sepadan ditemui untuk jawapan ini.'
              : 'No matching prevention_action records were found for these answers.'
          );
          return;
        }

        renderActions(host, progress, actions, lang);
      })
      .catch(function(error){
        if(error && error.name === 'AbortError') return;
        renderFailure(host, progress, lang);
        console.error('[plan-db-client]', error && error.message ? error.message : error);
      });
  }

  function schedule(){
    clearTimeout(timer);
    timer = setTimeout(loadPlan, 120);
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', schedule, { once: true });
  else schedule();

  window.addEventListener('hashchange', schedule);
  window.addEventListener('popstate', schedule);
  document.addEventListener('roomforboth:pageshow', schedule);

  new MutationObserver(function(){ schedule(); }).observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['class', 'hidden', 'lang']
  });
})();