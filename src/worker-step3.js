import baseWorker from './worker.js';

export default {
  async fetch(request, env, ctx) {
    const response = await baseWorker.fetch(request, env, ctx);
    const contentType = response.headers.get('content-type') || '';

    if (!contentType.includes('text/html')) return response;

    // Keep HTML delivery non-blocking. The homepage state dropdown is populated
    // asynchronously by iteration1-fixes.js from /api/states after the page renders.
    // Do not make the initial HTML response wait on Neon.
    const html = await response.text();

    let updatedHtml = html
      .replace(/Step 2 · Authority (?:&amp;|&) Contact/g, 'Step 3 · Authority &amp; Contact')
      .replace(/Langkah 2 · Agensi (?:&amp;|&) Hubungan/g, 'Langkah 3 · Agensi &amp; Hubungan');

    updatedHtml = updatedHtml.replace(
      /<\/body>/i,
      '<script src="/iteration1-fixes.js"></script><script src="/bilingual-fallback.js"></script><script src="/provenance-links.js"></script><script src="/hide-prevention-source-summary.js"></script><script src="/state-occurrence-data.js"></script><script src="/species-state-occurrence.js"></script></body>'
    );

    const headers = new Headers(response.headers);
    headers.delete('content-length');

    return new Response(updatedHtml, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};
