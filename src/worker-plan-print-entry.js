import baseWorker from './worker-state-persistence.js';
import { handlePlanRequest } from './plan-db-route.js';
import { handleIteration3Request, runIteration3Scheduled } from './iteration3-backend.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    const i3 = await handleIteration3Request(request, env);
    if (i3) return i3;

    // Keep the Plan DB path isolated from the rest of the merged worker.
    if (request.method === 'POST' && url.pathname === '/api/i2/plan') {
      return handlePlanRequest(request, env);
    }

    return baseWorker.fetch(request, env, ctx);
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(runIteration3Scheduled(env));
  }
};
