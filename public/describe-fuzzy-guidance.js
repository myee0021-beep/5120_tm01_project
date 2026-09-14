(function () {
  'use strict';

  function lang() {
    return document.documentElement.lang === 'bm' ? 'bm' : 'en';
  }

  function ensureNotice(status, matches) {
    var box = document.getElementById('id_describeMatches');
    var grid = document.getElementById('id_describeMatchGrid');
    if (!box || !grid) return;

    var old = document.getElementById('id_fuzzyNotice');
    if (old) old.remove();

    if (status !== 'needs_clarification' || !Array.isArray(matches) || !matches.length) return;

    var notice = document.createElement('div');
    notice.id = 'id_fuzzyNotice';
    notice.className = 'mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800';
    notice.textContent = lang() === 'bm'
      ? 'Padanan ini berkemungkinan sahaja kerana penerangan masih umum. Pilih calon jika ia kelihatan betul, atau gunakan Soal Jawab Berpandu untuk mengecilkan pilihan.'
      : 'These are possible low-confidence matches because the description is still broad. Choose a candidate if it looks right, or use Guided Q&A to narrow it down.';
    grid.parentNode.insertBefore(notice, grid);
  }

  function patchFetch() {
    if (window.__describeFuzzyFetchPatched) return;
    window.__describeFuzzyFetchPatched = true;

    var originalFetch = window.fetch;
    window.fetch = function () {
      var args = arguments;
      return originalFetch.apply(this, args).then(function (response) {
        try {
          var url = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url) || '';
          if (String(url).indexOf('/api/identify-describe') === -1) return response;

          var clone = response.clone();
          clone.json().then(function (data) {
            if (!data || !data.ok) return;
            setTimeout(function () {
              ensureNotice(data.status, data.matches);
            }, 0);
          }).catch(function () {});
        } catch (_) {}
        return response;
      });
    };
  }

  function init() {
    patchFetch();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
