/* signal_threshold, read once and shared (D34, D46).
 * Used by "How this is computed" (AC 1.3.1) and by the signals on the plan result (Draft AC 1.3.2),
 * so both pages always show the same bands from the same rows.
 *
 * Rows: { signal, band, lower_bound, score, decision, signed_date }.
 *   signal  records | complaints | attractants | combined
 *   band    low | medium | high   (score 1, 2, 3)
 *   A row with no signed_date is ignored: no band is shown from it.
 * Read from /api/i3/signal-thresholds; until that Worker route exists, from signal_threshold.json
 * (same shape). Nothing about the bands is written anywhere else in the front end.
 */
(function () {
  'use strict';
  var ROUTE = '/api/i3/signal-thresholds';
  var FILE = 'signal_threshold.json?v=20260930-1';
  var SIGNALS = ['records', 'complaints', 'attractants'];
  var ST = { rows: null, source: '', failed: false, _p: null };

  function json(url) {
    return fetch(url, { headers: { accept: 'application/json' }, cache: 'no-store' }).then(function (r) {
      return r.json().then(function (b) { if (!r.ok || (b && b.ok === false)) throw new Error((b && b.error) || ('HTTP ' + r.status)); return b; });
    });
  }
  ST.load = function () {
    if (ST._p) return ST._p;
    ST._p = json(ROUTE).then(function (b) { ST.rows = b.rows || b.thresholds || []; ST.source = 'api'; })
      .catch(function () {
        return fetch(FILE, { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
          .then(function (b) { ST.rows = b.rows || []; ST.source = 'file'; });
      })
      .catch(function () { ST.failed = true; ST.rows = null; ST._p = null; })
      .then(function () {
        try { window.dispatchEvent(new CustomEvent('roomforboth:thresholds-ready')); } catch (e) {}
        return ST;
      });
    return ST._p;
  };
  ST.signedRows = function (signal) {
    if (!ST.rows) return [];
    return ST.rows.filter(function (r) { return r.signal === signal && r.signed_date; })
      .sort(function (a, b) { return a.lower_bound - b.lower_bound; });
  };
  ST.hasSigned = function (signal) { return ST.signedRows(signal).length > 0; };
  // The row a value reaches, or null when it is below every band (a count of 0).
  ST.bandFor = function (signal, n) {
    var hit = null;
    ST.signedRows(signal).forEach(function (r) { if (n >= r.lower_bound) hit = r; });
    return hit;
  };
  ST.scoreFor = function (signal, n) { var r = ST.bandFor(signal, n); return r ? r.score : 0; };
  // Combined level for the three counts: the sum of the three band scores read against the combined rows.
  // Returns null unless every signal and the combined rule hold signed values and all three counts are known.
  ST.combine = function (counts) {
    for (var i = 0; i < SIGNALS.length; i++) {
      var s = SIGNALS[i];
      if (!ST.hasSigned(s) || counts[s] == null || isNaN(Number(counts[s]))) return null;
    }
    if (!ST.hasSigned('combined')) return null;
    var scores = {}, sum = 0;
    SIGNALS.forEach(function (s) { scores[s] = ST.scoreFor(s, Number(counts[s])); sum += scores[s]; });
    return { sum: sum, scores: scores, row: ST.bandFor('combined', sum) };
  };
  ST.maxSum = function () { return SIGNALS.length * 3; };
  ST.decisions = function () {
    var d = {}, last = '';
    (ST.rows || []).forEach(function (r) { if (r.signed_date) { d[r.decision] = 1; if (r.signed_date > last) last = r.signed_date; } });
    return { list: Object.keys(d).sort(), last: last };
  };
  window.SignalThresholds = ST;
})();
