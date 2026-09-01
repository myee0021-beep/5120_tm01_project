import baseWorker from './worker.js';

export default {
  async fetch(request, env, ctx) {
    const response = await baseWorker.fetch(request, env, ctx);
    const contentType = response.headers.get('content-type') || '';

    if (!contentType.includes('text/html')) return response;

    const html = await response.text();
    const updatedHtml = html
      .replace(/Step 2 · Authority (?:&amp;|&) Contact/g, 'Step 3 · Authority &amp; Contact')
      .replace(/Langkah 2 · Agensi (?:&amp;|&) Hubungan/g, 'Langkah 3 · Agensi &amp; Hubungan')
      .replace(/<\/body>/i, '<script src="/iteration1-fixes.js"></script></body>');

    const headers = new Headers(response.headers);
    headers.delete('content-length');

    return new Response(updatedHtml, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};
