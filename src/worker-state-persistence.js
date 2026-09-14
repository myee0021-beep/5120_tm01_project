import planSummaryWorker from './worker-plan-summary.js';
import legacyWorker from './worker.js';

const STATE_PERSISTENCE_CLIENT = String.raw`
<script id="room-for-both-state-persistence">
(function(){
  'use strict';
  var KEY = 'roomForBoth.selectedState';

  function readAnswersState(){
    try {
      var a = JSON.parse(sessionStorage.getItem('roomForBoth.homeAnswers') || 'null');
      return a && a.state ? String(a.state) : '';
    } catch (e) { return ''; }
  }

  function readStoredState(){
    try { return String(sessionStorage.getItem(KEY) || ''); }
    catch (e) { return ''; }
  }

  function readQueryState(){
    try {
      if (window.AppNav && AppNav.currentQuery) {
        var s = new URLSearchParams(AppNav.currentQuery).get('state');
        if (s) return s;
      }
    } catch (e) {}
    try {
      var direct = new URLSearchParams(location.search).get('state');
      if (direct) return direct;
    } catch (e) {}
    try {
      var hash = String(location.hash || '');
      var q = hash.indexOf('?');
      if (q !== -1) {
        var fromHash = new URLSearchParams(hash.slice(q + 1)).get('state');
        if (fromHash) return fromHash;
      }
    } catch (e) {}
    return '';
  }

  function persist(state){
    state = String(state || '').trim();
    if (!state) return;
    try { sessionStorage.setItem(KEY, state); } catch (e) {}
  }

  function currentPage(){
    return String(location.hash || '#index').replace(/^#/, '').split('?')[0] || 'index';
  }

  function resolveState(){
    var query = readQueryState();
    if (query) return query;
    var stored = readStoredState();
    if (stored) return stored;
    var page = currentPage();
    if (page === 'plan-result' || page === 'plan-print' || page === 'plan-how-computed') return readAnswersState() || '';
    return '';
  }

  function syncSelect(){
    var state = resolveState();
    if (!state) return;
    persist(state);
    var sel = document.getElementById('plan__plan_stateSelect');
    if (sel && !sel.value && Array.prototype.some.call(sel.options, function(o){ return o.value === state; })) {
      sel.value = state;
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  function restoreRouterState(){
    var page = currentPage();
    if (page !== 'plan' && page !== 'plan-result' && page !== 'plan-print' && page !== 'plan-how-computed') return;
    var state = resolveState();
    if (!state) return;
    persist(state);
    try {
      var queryState = window.AppNav && AppNav.currentQuery ? new URLSearchParams(AppNav.currentQuery).get('state') : '';
      if (!queryState && window.AppNav && typeof AppNav.goToUrl === 'function') {
        AppNav.goToUrl(page + '.html?state=' + encodeURIComponent(state));
      }
    } catch (e) {}
  }

  document.addEventListener('change', function(e){
    var t = e.target;
    if (!t) return;
    if (t.id === 'index__home_stateSelect' || t.id === 'plan__plan_stateSelect') persist(t.value);
  }, true);

  document.addEventListener('click', function(e){
    var home = document.getElementById('index__home_stateSelect');
    var plan = document.getElementById('plan__plan_stateSelect');
    var target = e.target && e.target.closest ? e.target.closest('#index__home_goBtn,#plan__planSeeBtn') : null;
    if (!target) return;
    if (target.id === 'index__home_goBtn' && home) persist(home.value);
    if (target.id === 'plan__planSeeBtn' && plan) persist(plan.value);
  }, true);

  function run(){
    restoreRouterState();
    setTimeout(syncSelect, 0);
    setTimeout(syncSelect, 120);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true });
  else run();
  window.addEventListener('hashchange', run);
  document.addEventListener('roomforboth:pageshow', run);
})();
</script>
<script src="/plan-db-client.js?v=20260914-4"></script>
<script src="/plan-ai-summary.js?v=20260914-1"></script>
<script src="/plan-result-cleanup.js?v=20260914-1"></script>
<script src="/ac-compliance.js?v=20260914-2"></script>
<script src="/print-selected-actions.js?v=20260914-1"></script>`;

class BodyInjector {
  element(el) {
    el.append(STATE_PERSISTENCE_CLIENT, { html: true });
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // The merged Iteration 2 entry point used to bypass the existing
    // MiniMax-powered Describe-it identification endpoint in worker.js.
    // Route only that endpoint back through the original handler so the
    // existing MINIMAX_API_KEY secret is used without exposing it client-side.
    if (request.method === 'POST' && url.pathname === '/api/identify-describe') {
      return legacyWorker.fetch(request, env, ctx);
    }

    const response = await planSummaryWorker.fetch(request, env, ctx);
    const type = response.headers.get('content-type') || '';
    if (!type.toLowerCase().includes('text/html')) return response;
    return new HTMLRewriter().on('body', new BodyInjector()).transform(response);
  }
};
