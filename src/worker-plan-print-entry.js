import baseWorker from './worker-state-persistence.js';
import { handlePlanRequest } from './plan-db-route.js';

class ScriptVersionFix {
  element(el) {
    const src = el.getAttribute('src') || '';
    if (src.startsWith('/plan-db-client.js')) {
      el.setAttribute('src', '/plan-db-client.js?v=20260915-1410');
      return;
    }
    if (src.startsWith('/print-selected-actions.js')) {
      el.setAttribute('src', '/print-selected-actions.js?v=20260915-1410');
    }
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Keep the Plan DB path isolated from the rest of the merged worker.
    if (request.method === 'POST' && url.pathname === '/api/i2/plan') {
      return handlePlanRequest(request, env);
    }

    const response = await baseWorker.fetch(request, env, ctx);
    const type = response.headers.get('content-type') || '';
    if (!type.toLowerCase().includes('text/html')) return response;

    // Do not inject another copy. Only upgrade the two existing scripts.
    return new HTMLRewriter()
      .on('script[src^="/plan-db-client.js"]', new ScriptVersionFix())
      .on('script[src^="/print-selected-actions.js"]', new ScriptVersionFix())
      .transform(response);
  }
};
