(function(){
  'use strict';

  var lastFingerprint = '';
  var controller = null;
  var timer = null;
  var SNAPSHOT_KEY = 'roomForBoth.currentPlanSnapshot';

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

  function sourceLabel(action){
    var bits = [];
    var person = clean(action && action.source_person);
    var institution = clean(action && action.source_institution);
    if(person) bits.push(person);
    if(institution && bits.indexOf(institution) === -1) bits.push(institution);
    return bits.join(' · ');
  }

  function validSourcedAction(action){
    if(!action) return false;
    var text = clean(action.action_text || action.action_text_en || action.action_text_ms);
    var source = sourceLabel(action) || clean(action.source_url);
    var verified = clean(action.date_verified);
    return !!(text && source && verified);
  }

  function clearSnapshot(){
    try { sessionStorage.removeItem(SNAPSHOT_KEY); } catch(e) {}
  }

  function writeSnapshot(actions, lang){
    var state = readState(readHomeAnswers());
    var stateHeading = document.getElementById('plan-result__stateHeading');
    var speciesList = document.getElementById('plan-result__speciesList');
    var seasonDescription = document.getElementById('plan-result__seasonDescription');
    var summaryLine = document.getElementById('plan-result__summaryLine');
    var snapshot = {
      version: 2,
      state: state,
      stateLabel: clean(stateHeading && stateHeading.textContent) || state,
      summaryLine: clean(summaryLine && summaryLine.textContent),
      language: lang,
      signalsText: clean(speciesList && speciesList.innerText),
      seasonText: clean(seasonDescription && seasonDescription.innerText),
      actions: actions.map(function(a){
        return {
          prevention_id: clean(a.prevention_id),
          action_text: clean(a.action_text || a.action_text_en || a.action_text_ms),
          source_person: clean(a.source_person),
          source_institution: clean(a.source_institution),
          source_url: clean(a.source_url),
          date_verified: clean(a.date_verified)
        };
      })
    };
    try { sessionStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot)); } catch(e) {}
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
    clearSnapshot();
  }

  function renderActions(host, progress, actions, lang, fallbackUsed){
    var checked = actions.map(function(){ return false; });

    function draw(){
      host.innerHTML = '';
      actions.forEach(function(action, i){
        var textValue = clean(action.action_text || action.action_text_en || action.action_text_ms || '');
        var source = sourceLabel(action);
        var sourceUrl = clean(action.source_url);
        var verified = clean(action.date_verified);

        var row = document.createElement('div');
        row.className = 'flex items-start gap-3';
        row.setAttribute('data-plan-row', 'database');
        row.setAttribute('data-prevention-id', clean(action.prevention_id || ''));
        row.setAttribute('data-action-text', textValue);
        row.setAttribute('data-source-person', clean(action.source_person));
        row.setAttribute('data-source-institution', clean(action.source_institution));
        row.setAttribute('data-source-url', sourceUrl);
        row.setAttribute('data-date-verified', verified);

        var box = document.createElement('div');
        box.className = 'checkbox-btn' + (checked[i] ? ' checked' : '');
        box.innerHTML = checked[i]
          ? '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>'
          : '';
        box.addEventListener('click', function(){ checked[i] = !checked[i]; draw(); });

        var text = document.createElement('div');
        text.className = 'text-sm min-w-0';
        var sourceHtml = sourceUrl
          ? '<a class="underline underline-offset-2 hover:text-emerald-700" href="' + esc(sourceUrl) + '" target="_blank" rel="noopener">' + esc(source || sourceUrl) + '</a>'
          : esc(source);
        text.innerHTML = '<div class="text-forest-950">' + esc((i + 1) + '. ' + textValue) + '</div>' +
          '<div class="mt-1 text-xs text-slate-400" data-plan-source-line>Source: ' + sourceHtml + ' · Verified ' + esc(verified) + '</div>';

        row.appendChild(box);
        row.appendChild(text);
        host.appendChild(row);
      });

      var done = checked.filter(Boolean).length;
      if(progress) progress.textContent = done + ' of ' + actions.length + ' done';

      if(fallbackUsed){
        var note = document.createElement('div');
        note.className = 'text-xs text-slate-400 pt-1';
        note.setAttribute('data-plan-fallback-note', '');
        note.textContent = lang === 'bm'
          ? 'Tiada padanan tepat untuk jawapan ini; ini ialah panduan umum bagi spesies/kategori berkenaan daripada pangkalan data.'
          : 'No exact match for these answers; these are general prevention actions for that species/category from the database.';
        host.appendChild(note);
      }
    }

    host.setAttribute('data-plan-source', 'prevention_action');
    draw();
    writeSnapshot(actions, lang);

    window.dispatchEvent(new CustomEvent('roomforboth:db-plan-ready', {
      detail: { count: actions.length, state: readState(readHomeAnswers()), actions: actions }
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
      headers: { 'content-type': 'application/json', 'accept': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify(payload),
      signal: controller.signal
    })
      .then(function(res){ return res.json().then(function(body){ return { ok: res.ok, body: body }; }); })
      .then(function(result){
        var body = result.body || {};
        if(!result.ok || !body.ok) throw new Error(body.error || 'Plan API failed');

        var actions = Array.isArray(body.actions)
          ? body.actions.filter(validSourcedAction)
          : [];

        if(!actions.length){
          renderFailure(host, progress, lang,
            lang === 'bm'
              ? 'Tiada rekod prevention_action bersumber dan disahkan yang sepadan ditemui untuk jawapan ini.'
              : 'No matching sourced and verified prevention_action records were found for these answers.');
          return;
        }

        renderActions(host, progress, actions, lang, !!body.fallback_used);
      })
      .catch(function(error){
        if(error && error.name === 'AbortError') return;
        renderFailure(host, progress, lang);
        console.error('[plan-db-client]', error && error.message ? error.message : error);
      });
  }

  function schedule(){ clearTimeout(timer); timer = setTimeout(loadPlan, 120); }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', schedule, { once: true });
  else schedule();
  window.addEventListener('hashchange', schedule);
  window.addEventListener('popstate', schedule);
  document.addEventListener('roomforboth:pageshow', schedule);
  new MutationObserver(function(){ schedule(); }).observe(document.documentElement, {
    subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'hidden', 'lang']
  });
})();
