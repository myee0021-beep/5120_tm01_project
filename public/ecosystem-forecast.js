/* Wildlife forecast — Epic 11 (Iteration 3). Figma: Ecosystem 12 (result), Ecosystem 13 (not enough records).
 *
 * AC 11.1.1  state and month, seven animals in order, a word band each, no percentages, snakes as one group
 * AC 11.1.2  too few records: no band, the count is shown, the animal is not ranked last
 * AC 11.2.1  what the forecast is and is not, beside the result
 * AC 11.3.2  reads one static file shipped with the site; nothing is run online and nothing chosen is stored
 *
 * File: forecast_predictions.json (copy of ml/output/predictions.json), one row per state, month and species:
 *   { state, month, species (Latin name), probability 0..1, records_species_state, groups_state } and a metadata block.
 * The probability is only used to order the animals and pick a word band. It is never printed.
 * "Too few records" counts records (2015 to the last training year), with the minimum read from the
 * signal_threshold table (row min_records), the same value the monthly profile on the plan uses (AC 1.2.4).
 *
 * BAND_CUTS: very likely at 0.80 or more, likely at 0.40 up to 0.80, unlikely below 0.40. The same cut-offs apply to every
 * state and month (AC 11.1.1(2)). They are read from the spread of the 1,344 exported probabilities (about 80% and 40% of
 * months with a record), not tuned on test scores. Change them in one place only, and in the Epic with them.
 * The page shows no number from them.
 *
 * Area view (mentor review, 6 October): the same page can also read forecast_grid_predictions.json (copy of
 * ml/output/grid_predictions.json, the area model trained on "Iteration 3 Data for ML (grid cell, smoothed).csv").
 * One entry per 0.25 degree square (about 28 km): { id, lat, lon, state, records, p[84] }, p = month 1..12 and,
 * within each month, the species in metadata.species order. It answers: if anything is recorded in this square in
 * this month, how likely each animal is to be among it. Same word bands and the same minimum of records (judged on
 * the square's total, as the file has no count per species). The state view is unchanged.
 */
(function () {
  'use strict';

  var PAGE = 'ecosystem-forecast';
  var FILE = 'forecast_predictions.json?v=20261010-1';
  var GRID_FILE = 'forecast_grid_predictions.json?v=20261008-1';
  var HALF = 0.125; // half the side of a square, in degrees
  var DEFAULT_MIN_RECORDS = 30; // only used if the threshold table cannot be read; AC 1.2.4 states thirty
  var BAND_CUTS = { veryLikely: 0.80, likely: 0.40 }; // AC 11.1.1(2), see header

  var STATES = [
    ['johor', 'Johor', 'Johor'], ['kedah', 'Kedah', 'Kedah'], ['kelantan', 'Kelantan', 'Kelantan'], ['melaka', 'Melaka', 'Melaka'],
    ['negeri-sembilan', 'Negeri Sembilan', 'Negeri Sembilan'], ['pahang', 'Pahang', 'Pahang'], ['perak', 'Perak', 'Perak'], ['perlis', 'Perlis', 'Perlis'],
    ['penang', 'Pulau Pinang', 'Pulau Pinang'], ['sabah', 'Sabah', 'Sabah'], ['sarawak', 'Sarawak', 'Sarawak'], ['selangor', 'Selangor', 'Selangor'],
    ['terengganu', 'Terengganu', 'Terengganu'], ['kl', 'Kuala Lumpur', 'Kuala Lumpur'], ['labuan', 'Labuan', 'Labuan'], ['putrajaya', 'Putrajaya', 'Putrajaya']
  ];
  var FILE_STATE = { 'Pulau Pinang': 'penang', 'Kuala Lumpur': 'kl' }; // names in the file that differ from the site keys
  var STATE_TO_FILE = { penang: 'Pulau Pinang', kl: 'Kuala Lumpur' };
  var NEARBY = { johor: 'melaka', kedah: 'penang', kelantan: 'terengganu', melaka: 'negeri-sembilan', 'negeri-sembilan': 'selangor', pahang: 'selangor', perak: 'selangor', perlis: 'kedah', penang: 'kedah', sabah: 'sarawak', sarawak: 'sabah', selangor: 'kl', terengganu: 'pahang', kl: 'selangor', putrajaya: 'selangor' };
  var NEARBY_FIRST = { labuan: 'sabah' }; // a federal territory off Sabah
  var MONTHS = {
    en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    bm: ['Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun', 'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember']
  };
  // Latin name in the file -> site species code and names
  var SPECIES = {
    'Acridotheres tristis': { code: 'myna', en: 'Common myna', bm: 'Tiong biasa' },
    'Corvus splendens': { code: 'crow', en: 'House crow', bm: 'Gagak rumah' },
    'Macaca fascicularis': { code: 'macaque', en: 'Long-tailed macaque', bm: 'Kera ekor panjang' },
    'Malayopython reticulatus': { code: 'python', en: 'Reticulated python', bm: 'Ular sawa batik', snake: true },
    'Naja sumatrana': { code: 'cobra', en: 'Equatorial spitting cobra', bm: 'Ular senduk sembur', snake: true },
    'Sus scrofa': { code: 'boar', en: 'Wild boar', bm: 'Babi hutan' },
    'Varanus salvator': { code: 'monitor', en: 'Asian water monitor', bm: 'Biawak air' }
  };
  var BAND = {
    very: { en: 'Very likely', bm: 'Sangat mungkin' },
    likely: { en: 'Likely', bm: 'Mungkin' },
    unlikely: { en: 'Unlikely', bm: 'Tidak mungkin' }
  };

  var S = { data: null, failed: false, loading: false, state: '', month: new Date().getMonth() + 1, snakesOpen: false, built: false,
    view: 'state', cell: '', grid: null, gridFailed: false, gridLoading: false, gridMap: null, mapView: null };

  // ---------------------------------------------------------------- helpers
  function lang() { return document.documentElement.getAttribute('lang') === 'bm' ? 'bm' : 'en'; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function T(en, bm) { return '<span data-en="">' + en + '</span><span data-bm="">' + (bm == null ? en : bm) + '</span>'; }
  function fmt(n) { return Number(n).toLocaleString('en-US'); }
  function stateRow(key) { for (var i = 0; i < STATES.length; i++) if (STATES[i][0] === key) return STATES[i]; return null; }
  function fileState(key) { return STATE_TO_FILE[key] || (stateRow(key) || [])[1] || key; }
  function minRecords() {
    var t = window.SignalThresholds;
    if (t && t.rows) { var r = t.signedRows('min_records')[0]; if (r) return r.lower_bound; }
    return DEFAULT_MIN_RECORDS;
  }
  function bandFor(p) { return p >= BAND_CUTS.veryLikely ? 'very' : p >= BAND_CUTS.likely ? 'likely' : 'unlikely'; }
  function query() { return new URLSearchParams((window.AppNav && AppNav.currentQuery) || ''); }
  function monthText(m) { return T(MONTHS.en[m - 1], MONTHS.bm[m - 1]); }
  function lastMonthText() {
    var m = S.data && S.data.metadata && String(S.data.metadata.last_month_of_records_in_training || '').match(/^(\d{4})-(\d{2})/);
    if (!m) return '';
    return T(MONTHS.en[+m[2] - 1] + ' ' + m[1], MONTHS.bm[+m[2] - 1] + ' ' + m[1]);
  }
  function yearsText() {
    var y = S.data && S.data.metadata && String(S.data.metadata.training_years || '').match(/^(\d{4})\D+(\d{4})$/);
    return y ? [y[1], y[2]] : null;
  }

  // ---------------------------------------------------------------- the data
  // Rows for one state and month, joined into one list of animals; the two snakes become one entry.
  function forecastFor(stateKey, month) {
    var name = fileState(stateKey);
    var rows = S.data.predictions.filter(function (r) { return r.state === name && r.month === month; });
    var stateRecords = 0, groups = 0;
    var items = [], snakes = [];
    rows.forEach(function (r) {
      var sp = SPECIES[r.species];
      if (!sp) return;
      stateRecords += r.records_species_state; groups = r.groups_state;
      var it = { code: sp.code, en: sp.en, bm: sp.bm, p: r.probability, records: r.records_species_state, snake: !!sp.snake };
      (sp.snake ? snakes : items).push(it);
    });
    if (snakes.length) {
      // The group is as likely to be recorded as its likeliest member (no independence is assumed);
      // the records are the sum of both, and the group is judged on that sum.
      items.push({ code: 'snakes', en: 'Snakes', bm: 'Ular', group: snakes, p: Math.max.apply(null, snakes.map(function (s) { return s.p; })), records: snakes.reduce(function (a, s) { return a + s.records; }, 0) });
    }
    return { items: items, stateRecords: stateRecords, groups: groups };
  }
  function enough(rec) { return rec >= minRecords(); }

  // ---------------------------------------------------------------- shell
  function buildShell() {
    var el = document.getElementById('page-' + PAGE);
    if (!el || el.getAttribute('data-fc-built')) return el;
    var src = document.getElementById('page-community-how-review-works');
    var header = src && src.querySelector('header'), footer = src && src.querySelector('footer');
    var prefix = 'community-how-review-works__';
    function fix(node) { return node.outerHTML.split(prefix).join(PAGE + '__'); }
    el.innerHTML = (header ? fix(header) : '') + '<main class="pt-28 pb-24"><div class="fc-wrap" id="' + PAGE + '__content"></div></main>' + (footer ? fix(footer) : '');
    el.setAttribute('data-fc-built', '1');
    var toggle = document.getElementById(PAGE + '__mobileNavToggle'), panel = document.getElementById(PAGE + '__mobileNavPanel');
    var iOpen = document.getElementById(PAGE + '__mobileNavIconOpen'), iClose = document.getElementById(PAGE + '__mobileNavIconClose');
    if (toggle && panel) toggle.addEventListener('click', function () {
      var hidden = panel.classList.contains('hidden');
      panel.classList.toggle('hidden');
      if (iOpen) iOpen.classList.toggle('hidden', hidden);
      if (iClose) iClose.classList.toggle('hidden', !hidden);
      toggle.setAttribute('aria-expanded', String(hidden));
    });
    var cur = lang();
    el.querySelectorAll('.lang-toggle button').forEach(function (b) {
      var on = b.getAttribute('data-lang') === cur;
      b.classList.toggle('bg-white', on); b.classList.toggle('text-forest-950', on); b.classList.toggle('text-slate-300', !on);
    });
    var c = document.getElementById(PAGE + '__content');
    c.addEventListener('change', function (e) {
      var sel = e.target.getAttribute && e.target.getAttribute('data-sel');
      if (sel === 'state') { S.state = e.target.value; S.cell = ''; S.snakesOpen = false; syncUrl(); render(); }
      if (sel === 'month') { S.month = parseInt(e.target.value, 10) || S.month; syncUrl(); render(); }
      if (sel === 'cell') { S.cell = e.target.value; syncUrl(); render(); }
    });
    c.addEventListener('click', function (e) {
      var el2 = e.target.closest('[data-act]');
      if (!el2) return;
      var act = el2.getAttribute('data-act');
      if (act === 'snakes') { S.snakesOpen = !S.snakesOpen; render(); }
      if (act === 'state') { S.state = el2.getAttribute('data-val'); S.snakesOpen = false; syncUrl(); render(); window.scrollTo(0, 0); }
      if (act === 'retry') { S.failed = false; load(); }
      if (act === 'view') { setView(el2.getAttribute('data-val')); }
      if (act === 'retry-grid') { S.gridFailed = false; loadGrid(); }
    });
    return el;
  }
  function syncUrl() {
    var q = new URLSearchParams();
    if (S.state) q.set('state', S.state);
    q.set('month', String(S.month));
    if (S.view === 'area') { q.set('view', 'area'); if (S.cell) q.set('cell', S.cell); }
    history.replaceState(null, '', '#' + PAGE + '?' + q.toString());
  }

  // ---------------------------------------------------------------- render
  function hero(titleHtml) {
    return '<a class="fc-back" href="ecosystem.html' + (S.state ? '?state=' + encodeURIComponent(S.state) : '') + '"><svg fill="none" height="14" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.4" viewBox="0 0 24 24" width="14"><path d="m15 18-6-6 6-6"></path></svg><span>' + T('Back to the map', 'Kembali ke peta') + '</span></a>' +
      '<div class="fc-eyebrow">' + T('Ecosystem · Wildlife forecast', 'Ekosistem · Ramalan hidupan liar') + '</div>' +
      '<h1 class="fc-title">' + titleHtml + '</h1>' +
      '<p class="fc-lead">' + T('Which of the seven animals are most likely to be recorded in your state this month. A forecast from past records, not a count of animals.', 'Antara tujuh haiwan, yang manakah paling mungkin direkodkan di negeri anda bulan ini. Ramalan daripada rekod lalu, bukan bilangan haiwan.') + '</p>';
  }
  function selects() {
    var l = lang();
    var so = '<option value=""' + (S.state ? '' : ' selected') + ' disabled>' + esc(l === 'bm' ? 'Pilih negeri' : 'Choose your state') + '</option>';
    STATES.forEach(function (s) { so += '<option value="' + s[0] + '"' + (s[0] === S.state ? ' selected' : '') + '>' + esc(s[1]) + '</option>'; });
    var mo = '';
    MONTHS[l].forEach(function (m, i) { mo += '<option value="' + (i + 1) + '"' + (i + 1 === S.month ? ' selected' : '') + '>' + esc(m) + '</option>'; });
    return '<div class="fc-selects"><select class="fc-select" data-sel="state" aria-label="' + esc(l === 'bm' ? 'Negeri' : 'State') + '">' + so + '</select>' +
      '<select class="fc-select" data-sel="month" aria-label="' + esc(l === 'bm' ? 'Bulan' : 'Month') + '">' + mo + '</select></div>';
  }
  function actions() {
    var q = S.state ? '?state=' + encodeURIComponent(S.state) : '';
    var name = S.state ? stateRow(S.state)[1] : '';
    return '<a class="fc-btn" href="ecosystem-forecast-method.html">' + T('How this forecast was made and tested', 'Bagaimana ramalan ini dibuat dan diuji') + '</a>' +
      '<a class="fc-btn" href="ecosystem.html' + q + '">' + (name ? T('See where the seven are recorded in ' + esc(name), 'Lihat di mana tujuh haiwan direkodkan di ' + esc(name)) : T('See where the seven are recorded', 'Lihat di mana tujuh haiwan direkodkan')) + '</a>' +
      (name ? '<a class="fc-btn" href="plan.html' + q + '">' + T('Plan for a home in ' + esc(name), 'Rancang untuk rumah di ' + esc(name)) + '</a>' : '');
  }
  function chip(band) { return '<span class="fc-chip fc-chip--' + band + '">' + T(BAND[band].en, BAND[band].bm) + '</span>'; }
  function notEnough(rec) { return '<span class="fc-chip fc-chip--none">' + T('Not enough records', 'Rekod tidak mencukupi') + '</span><span class="fc-count">' + fmt(rec) + ' ' + T(rec === 1 ? 'record' : 'records', 'rekod') + '</span>'; }
  // U2-14: every named animal also links to the "Is it invasive?" check.
  function invasiveLink(code) {
    return ' <a class="fc-inv" style="font-size:11px;font-weight:600;color:#047857;text-decoration:underline;text-underline-offset:2px;margin-left:6px;white-space:nowrap" href="invasive.html?species=' + (code === 'snakes' ? 'snake' : code) + '">' + T('Invasive?', 'Invasif?') + '</a>';
  }
  function nameLink(it) {
    var n = T(esc(it.en), esc(it.bm));
    if (it.code === 'snakes') return n + invasiveLink(it.code);
    return '<a class="fc-name" href="species.html?species=' + it.code + (S.state ? '&state=' + encodeURIComponent(S.state) : '') + '">' + n + '</a>' + invasiveLink(it.code);
  }

  function render() {
    var root = document.getElementById(PAGE + '__content');
    if (!root) return;
    var st = S.state ? stateRow(S.state) : null;
    var title = st ? T(esc(st[1]) + ' in ' + MONTHS.en[S.month - 1], esc(st[2]) + ' pada ' + MONTHS.bm[S.month - 1]) : T('Wildlife forecast', 'Ramalan hidupan liar');
    var h = hero(title) + selects() + viewToggle();
    if (S.view === 'area') { renderArea(root, h, st); return; }
    dropGridMap();
    if (S.failed) {
      root.innerHTML = h + '<div class="fc-card"><p class="fc-text">' + T('The forecast file did not load, so nothing is shown. Nothing is guessed in its place.', 'Fail ramalan tidak dimuat, jadi tiada apa dipaparkan. Tiada apa diteka sebagai ganti.') + '</p><button type="button" class="fc-btn" data-act="retry">' + T('Try again', 'Cuba lagi') + '</button></div>' + actions();
      return;
    }
    if (!S.data) { root.innerHTML = h + '<div class="fc-card"><p class="fc-text">' + T('Loading the forecast…', 'Memuatkan ramalan…') + '</p></div>'; return; }
    if (!st) {
      root.innerHTML = h + '<div class="fc-card"><p class="fc-text">' + T('Choose your state and a month to see the forecast. Nothing else is asked.', 'Pilih negeri dan bulan anda untuk melihat ramalan. Tiada apa lagi ditanya.') + '</p></div>' + actions();
      return;
    }
    var f = forecastFor(S.state, S.month);
    var yrs = yearsText();
    // The whole state is below the minimum (AC 11.1.2): no list at all, the count, and ways forward.
    if (!f.items.length || !enough(f.stateRecords)) {
      var near = NEARBY_FIRST[S.state] || NEARBY[S.state];
      if (near && !enough(forecastFor(near, S.month).stateRecords)) near = null;
      h += '<div class="fc-card"><div class="fc-label">' + T('Not enough records to forecast', 'Rekod tidak mencukupi untuk meramal') + '</div>' +
        '<p class="fc-big">' + T(esc(st[1]) + ' has ' + fmt(f.stateRecords) + ' ' + (f.stateRecords === 1 ? 'record' : 'records') + ' of the seven animals' + (yrs ? ' from ' + yrs[0] + ' to ' + yrs[1] : '') + '.', esc(st[2]) + ' mempunyai ' + fmt(f.stateRecords) + ' rekod tujuh haiwan' + (yrs ? ' dari ' + yrs[0] + ' hingga ' + yrs[1] : '') + '.') + '</p>' +
        '<p class="fc-text">' + T('That is fewer than we need to make a forecast, so none is shown (at least ' + minRecords() + ' records are needed). The same minimum is used on every page of the site.', 'Itu kurang daripada yang kami perlukan untuk membuat ramalan, jadi tiada dipaparkan (sekurang-kurangnya ' + minRecords() + ' rekod diperlukan). Minimum yang sama digunakan pada setiap halaman tapak.') + '</p>' +
        '<p class="fc-text">' + T('Few records does not mean few animals. It means few people have reported them here.', 'Rekod yang sedikit tidak bermakna haiwan yang sedikit. Ia bermakna sedikit orang melaporkannya di sini.') + '</p></div>';
      h += '<div class="fc-card"><div class="fc-label">' + T('What you can do instead', 'Apa yang boleh anda lakukan') + '</div><div class="fc-list-links">' +
        (near ? '<button type="button" class="fc-link" data-act="state" data-val="' + near + '">' + T('See the forecast for a nearby state, ' + esc(stateRow(near)[1]) + '.', 'Lihat ramalan untuk negeri berdekatan, ' + esc(stateRow(near)[2]) + '.') + '</button>' : '') +
        '<a class="fc-link" href="ecosystem.html?state=' + encodeURIComponent(S.state) + '">' + T('See where the seven animals are recorded on the map.', 'Lihat di mana tujuh haiwan direkodkan pada peta.') + '</a>' +
        '<a class="fc-link" href="plan.html?state=' + encodeURIComponent(S.state) + '">' + T('Start your plan. It does not need a forecast.', 'Mulakan pelan anda. Ia tidak memerlukan ramalan.') + '</a></div></div>';
      root.innerHTML = h + actions();
      return;
    }
    // Ranked: enough records, most likely first. Those with too few records are listed below, unranked.
    var ranked = f.items.filter(function (i) { return enough(i.records); }).sort(function (a, b) { return b.p - a.p; });
    var thin = f.items.filter(function (i) { return !enough(i.records); }).sort(function (a, b) { return b.records - a.records; });
    var label = T('Most likely to be recorded · ' + esc(st[1]) + ' · ' + MONTHS.en[S.month - 1], 'Paling mungkin direkodkan · ' + esc(st[2]) + ' · ' + MONTHS.bm[S.month - 1]);
    var list = '<div class="fc-label">' + label + '</div><ol class="fc-rank">';
    ranked.forEach(function (it, i) {
      var isSnakes = it.code === 'snakes';
      list += '<li class="fc-row"><span class="fc-n">' + (i + 1) + '</span><span class="fc-who">' +
        (isSnakes ? '<button type="button" class="fc-name fc-name--btn" data-act="snakes" aria-expanded="' + S.snakesOpen + '">' + nameLink(it) + '</button>' : nameLink(it)) + '</span>' + chip(bandFor(it.p)) + '</li>';
      if (isSnakes && S.snakesOpen) list += snakeRows(it);
    });
    thin.forEach(function (it) {
      var isSnakes = it.code === 'snakes';
      list += '<li class="fc-row fc-row--thin"><span class="fc-n">·</span><span class="fc-who">' +
        (isSnakes ? '<button type="button" class="fc-name fc-name--btn" data-act="snakes" aria-expanded="' + S.snakesOpen + '">' + nameLink(it) + '</button>' : nameLink(it)) + '</span><span class="fc-thin">' + notEnough(it.records) + '</span></li>';
      if (isSnakes && S.snakesOpen) list += snakeRows(it);
    });
    list += '</ol>';
    var hasSnakes = f.items.some(function (i) { return i.code === 'snakes'; });
    if (thin.length) list += '<p class="fc-note">' + T('Animals with fewer than ' + minRecords() + ' records here are listed without a place in the order, because few records does not mean the animal is rarely present.', 'Haiwan dengan kurang daripada ' + minRecords() + ' rekod di sini disenaraikan tanpa kedudukan dalam susunan, kerana rekod yang sedikit tidak bermakna haiwan itu jarang ada.') + '</p>';
    if (hasSnakes) list += '<p class="fc-note">' + T('Snakes are shown as one group. Tap to open it.', 'Ular dipaparkan sebagai satu kumpulan. Ketik untuk membukanya.') + '</p>';
    list += '<p class="fc-note">' + T('Built from records up to ' + lastMonthText() + '. The order changes little from month to month.', 'Dibina daripada rekod sehingga ' + lastMonthText() + '. Susunan berubah sedikit dari bulan ke bulan.') + '</p>';
    h += '<div class="fc-card">' + list + '</div>';
    h += '<div class="fc-card"><div class="fc-label">' + T('What this means', 'Maksudnya') + '</div>' +
      '<p class="fc-text">' + T('This predicts how likely each animal is to be recorded by people in ' + esc(st[1]) + ' in ' + MONTHS.en[S.month - 1] + ', from records of earlier months and years' + (yrs ? ' (' + yrs[0] + ' to ' + yrs[1] + ')' : '') + '.', 'Ini meramal betapa mungkinnya setiap haiwan direkodkan oleh orang ramai di ' + esc(st[2]) + ' pada ' + MONTHS.bm[S.month - 1] + ', daripada rekod bulan dan tahun terdahulu' + (yrs ? ' (' + yrs[0] + ' hingga ' + yrs[1] + ')' : '') + '.') + '</p>' +
      '<p class="fc-text">' + T('A record is one report by a person, not one animal. Unlikely to be recorded does not mean the animal is absent.', 'Satu rekod ialah satu laporan oleh seseorang, bukan satu haiwan. Tidak mungkin direkodkan tidak bermakna haiwan itu tiada.') + '</p>' +
      '<p class="fc-text">' + T('It is a prediction for the state. It is not a chance for your home.', 'Ia ramalan untuk negeri. Ia bukan kebarangkalian untuk rumah anda.') + '</p></div>';
    root.innerHTML = h + actions();
  }
  // ---------------------------------------------------------------- area view (grid model)
  function setView(v) {
    S.view = v === 'area' ? 'area' : 'state';
    S.cell = ''; S.snakesOpen = false;
    syncUrl(); render();
    if (S.view === 'area' && !S.grid && !S.gridFailed) loadGrid();
  }
  function viewToggle() {
    function pill(k, en, bm) {
      var on = S.view === k;
      return '<button type="button" class="fc-pill' + (on ? ' fc-pill--on' : '') + '" data-act="view" data-val="' + k + '" aria-pressed="' + on + '">' + T(en, bm) + '</button>';
    }
    return '<div class="fc-views" role="group">' + pill('state', 'Whole state', 'Seluruh negeri') + pill('area', 'By area (28 km squares)', 'Mengikut kawasan (petak 28 km)') + '</div>';
  }
  function cellName(c) {
    return Math.abs(c.lat).toFixed(2) + '°' + (c.lat >= 0 ? 'N' : 'S') + ' ' + c.lon.toFixed(2) + '°E';
  }
  function cellsFor(stateKey) {
    var name = fileState(stateKey);
    return S.grid.cells.filter(function (c) { return c.state === name; });
  }
  function areaItems(c, month) {
    var sp = S.grid.metadata.species, n = sp.length, items = [], snakes = [];
    sp.forEach(function (latin, i) {
      var meta = SPECIES[latin];
      if (!meta) return;
      var it = { code: meta.code, en: meta.en, bm: meta.bm, p: c.p[(month - 1) * n + i], snake: !!meta.snake };
      (meta.snake ? snakes : items).push(it);
    });
    if (snakes.length) items.push({ code: 'snakes', en: 'Snakes', bm: 'Ular', group: snakes, p: Math.max.apply(null, snakes.map(function (s) { return s.p; })) });
    return items.sort(function (a, b) { return b.p - a.p; });
  }
  function renderArea(root, h, st) {
    if (S.gridFailed) {
      root.innerHTML = h + '<div class="fc-card"><p class="fc-text">' + T('The area forecast file did not load, so nothing is shown. Nothing is guessed in its place.', 'Fail ramalan kawasan tidak dimuat, jadi tiada apa dipaparkan. Tiada apa diteka sebagai ganti.') + '</p><button type="button" class="fc-btn" data-act="retry-grid">' + T('Try again', 'Cuba lagi') + '</button></div>' + actions();
      dropGridMap(); return;
    }
    if (!S.grid) { root.innerHTML = h + '<div class="fc-card"><p class="fc-text">' + T('Loading the area forecast…', 'Memuatkan ramalan kawasan…') + '</p></div>'; dropGridMap(); return; }
    if (!st) {
      root.innerHTML = h + '<div class="fc-card"><p class="fc-text">' + T('Choose your state and a month, then tap a square on the map.', 'Pilih negeri dan bulan anda, kemudian ketik satu petak pada peta.') + '</p></div>' + actions();
      dropGridMap(); return;
    }
    var cells = cellsFor(S.state);
    if (!cells.length) {
      root.innerHTML = h + '<div class="fc-card"><p class="fc-text">' + T('The area data has no squares for ' + esc(st[1]) + '. Its records are counted with a neighbouring state. Use the whole-state forecast instead.', 'Data kawasan tiada petak untuk ' + esc(st[2]) + '. Rekodnya dikira bersama negeri berjiran. Gunakan ramalan seluruh negeri.') + '</p><button type="button" class="fc-btn" data-act="view" data-val="state">' + T('See the whole-state forecast', 'Lihat ramalan seluruh negeri') + '</button></div>' + actions();
      dropGridMap(); return;
    }
    var cell = null;
    cells.forEach(function (c) { if (c.id === S.cell) cell = c; });
    if (!cell) { cell = cells.slice().sort(function (a, b) { return b.records - a.records; })[0]; S.cell = cell.id; }
    var min = minRecords();
    var opts = cells.slice().sort(function (a, b) { return b.records - a.records; }).map(function (c) {
      return '<option value="' + esc(c.id) + '"' + (c.id === cell.id ? ' selected' : '') + '>' + esc(cellName(c)) + ' · ' + fmt(c.records) + ' ' + (lang() === 'bm' ? 'rekod' : (c.records === 1 ? 'record' : 'records')) + '</option>';
    }).join('');
    h += '<div class="fc-card"><div class="fc-label">' + T('Choose a square in ' + esc(st[1]), 'Pilih satu petak di ' + esc(st[2])) + '</div>' +
      '<div class="fc-map" id="' + PAGE + '__gridMap"></div>' +
      '<div class="fc-legend"><span><i class="fc-sw fc-sw--ok"></i>' + T('Enough records (darker = more)', 'Rekod mencukupi (lebih gelap = lebih banyak)') + '</span><span><i class="fc-sw fc-sw--few"></i>' + T('Fewer than ' + min + ' records', 'Kurang daripada ' + min + ' rekod') + '</span></div>' +
      '<select class="fc-select fc-cellsel" data-sel="cell" aria-label="' + esc(lang() === 'bm' ? 'Petak' : 'Square') + '">' + opts + '</select></div>';
    var where = T('Square ' + esc(cellName(cell)) + ' · ' + MONTHS.en[S.month - 1], 'Petak ' + esc(cellName(cell)) + ' · ' + MONTHS.bm[S.month - 1]);
    if (cell.records < min) {
      h += '<div class="fc-card"><div class="fc-label">' + where + '</div>' +
        '<p class="fc-big">' + T('This square has ' + fmt(cell.records) + ' ' + (cell.records === 1 ? 'record' : 'records') + ' of the seven animals from 2015 to 2024.', 'Petak ini mempunyai ' + fmt(cell.records) + ' rekod tujuh haiwan dari 2015 hingga 2024.') + '</p>' +
        '<p class="fc-text">' + T('That is fewer than we need, so no forecast is shown (at least ' + min + ' records are needed, the same minimum as everywhere on the site). Few records does not mean few animals.', 'Itu kurang daripada yang diperlukan, jadi tiada ramalan dipaparkan (sekurang-kurangnya ' + min + ' rekod diperlukan, minimum yang sama di seluruh tapak). Rekod yang sedikit tidak bermakna haiwan yang sedikit.') + '</p>' +
        '<div class="fc-list-links"><button type="button" class="fc-link" data-act="view" data-val="state">' + T('See the whole-state forecast for ' + esc(st[1]) + '.', 'Lihat ramalan seluruh negeri untuk ' + esc(st[2]) + '.') + '</button></div></div>';
    } else {
      var items = areaItems(cell, S.month);
      var list = '<div class="fc-label">' + T('Most likely to be recorded · ', 'Paling mungkin direkodkan · ') + where + '</div><ol class="fc-rank">';
      items.forEach(function (it, i) {
        var isSnakes = it.code === 'snakes';
        list += '<li class="fc-row"><span class="fc-n">' + (i + 1) + '</span><span class="fc-who">' +
          (isSnakes ? '<button type="button" class="fc-name fc-name--btn" data-act="snakes" aria-expanded="' + S.snakesOpen + '">' + nameLink(it) + '</button>' : nameLink(it)) + '</span>' + chip(bandFor(it.p)) + '</li>';
        if (isSnakes && S.snakesOpen) it.group.slice().sort(function (a, b) { return b.p - a.p; }).forEach(function (s) {
          list += '<li class="fc-row fc-row--sub"><span class="fc-n"></span><span class="fc-who">' + nameLink(s) + '</span>' + chip(bandFor(s.p)) + '</li>';
        });
      });
      list += '</ol><p class="fc-note">' + T('Snakes are shown as one group. Tap to open it.', 'Ular dipaparkan sebagai satu kumpulan. Ketik untuk membukanya.') + '</p>' +
        '<p class="fc-note">' + T(fmt(cell.records) + ' records in this square from 2015 to 2024.', fmt(cell.records) + ' rekod di petak ini dari 2015 hingga 2024.') + '</p>';
      h += '<div class="fc-card">' + list + '</div>';
    }
    h += '<div class="fc-card"><div class="fc-label">' + T('What this means', 'Maksudnya') + '</div>' +
      '<p class="fc-text">' + T('If anything is recorded in this square in ' + MONTHS.en[S.month - 1] + ', this is how likely each animal is to be among what is recorded. It comes from the area model, trained on records from 2015 to 2024 placed in squares of about 28 km.', 'Jika ada apa-apa direkodkan di petak ini pada ' + MONTHS.bm[S.month - 1] + ', ini betapa mungkinnya setiap haiwan termasuk dalam rekod itu. Ia daripada model kawasan, dilatih dengan rekod 2015 hingga 2024 yang diletakkan dalam petak kira-kira 28 km.') + '</p>' +
      '<p class="fc-text">' + T('A record is one report by a person, not one animal. A square is a wide area, so this is not a chance for your home.', 'Satu rekod ialah satu laporan oleh seseorang, bukan satu haiwan. Satu petak ialah kawasan yang luas, jadi ini bukan kebarangkalian untuk rumah anda.') + '</p></div>';
    root.innerHTML = h + actions();
    drawGridMap(cells, cell);
  }
  function dropGridMap() {
    if (!S.gridMap) return;
    S.gridMap.remove(); S.gridMap = null;
  }
  function drawGridMap(cells, sel) {
    var el = document.getElementById(PAGE + '__gridMap');
    if (S.gridMap) { S.mapView = { state: S.state, center: S.gridMap.getCenter(), zoom: S.gridMap.getZoom() }; dropGridMap(); }
    if (!el || typeof L === 'undefined') { if (el) el.style.display = 'none'; return; }
    var map = L.map(el, { scrollWheelZoom: false });
    map.attributionControl.setPrefix(false);
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19, attribution: 'Tiles &copy; Esri' }).addTo(map);
    var min = minRecords(), max = 1, group = L.featureGroup();
    cells.forEach(function (c) { if (c.records > max) max = c.records; });
    cells.forEach(function (c) {
      var ok = c.records >= min, t = Math.log(1 + c.records) / Math.log(1 + max), on = c.id === sel.id;
      var fill = ok ? 'rgb(' + [Math.round(167 - 140 * t), Math.round(220 - 140 * t), Math.round(190 - 130 * t)].join(',') + ')' : '#cbd5e1';
      var r = L.rectangle([[c.lat - HALF, c.lon - HALF], [c.lat + HALF, c.lon + HALF]], {
        color: on ? '#0b130e' : (ok ? '#14532d' : '#94a3b8'), weight: on ? 3 : 1, dashArray: ok ? null : '3', fillColor: fill, fillOpacity: ok ? 0.55 : 0.3
      });
      r.bindTooltip(cellName(c) + ' · ' + fmt(c.records) + ' ' + (lang() === 'bm' ? 'rekod' : (c.records === 1 ? 'record' : 'records')));
      r.on('click', function () { S.cell = c.id; S.snakesOpen = false; syncUrl(); render(); });
      group.addLayer(r);
    });
    group.addTo(map);
    if (S.mapView && S.mapView.state === S.state) map.setView(S.mapView.center, S.mapView.zoom);
    else map.fitBounds(group.getBounds(), { padding: [12, 12], maxZoom: 10 });
    S.gridMap = map;
    setTimeout(function () { if (S.gridMap === map) map.invalidateSize(); }, 0);
  }
  function loadGrid() {
    if (S.gridLoading) return;
    S.gridLoading = true;
    var thresholds = window.SignalThresholds ? SignalThresholds.load() : Promise.resolve();
    fetch(GRID_FILE, { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (d) {
        if (!d || !Array.isArray(d.cells) || !d.cells.length || !d.metadata || !Array.isArray(d.metadata.species)) throw new Error('empty');
        S.grid = d; S.gridFailed = false;
      }).catch(function () { S.gridFailed = true; })
      .then(function () { return thresholds; })
      .then(function () { S.gridLoading = false; if (active) render(); });
  }

  function snakeRows(group) {
    var out = '';
    group.group.slice().sort(function (a, b) { return b.records - a.records; }).forEach(function (s) {
      var ok = enough(s.records);
      out += '<li class="fc-row fc-row--sub"><span class="fc-n"></span><span class="fc-who">' + nameLink(s) + '</span>' + (ok ? chip(bandFor(s.p)) : '<span class="fc-thin">' + notEnough(s.records) + '</span>') + '</li>';
    });
    return out;
  }

  // ---------------------------------------------------------------- loading
  function load() {
    if (S.loading) return;
    S.loading = true;
    var thresholds = window.SignalThresholds ? SignalThresholds.load() : Promise.resolve();
    fetch(FILE, { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (d) {
        if (!d || !Array.isArray(d.predictions) || !d.predictions.length) throw new Error('empty');
        S.data = d; S.failed = false;
      }).catch(function () { S.failed = true; })
      .then(function () { return thresholds; })
      .then(function () { S.loading = false; if (active) render(); });
  }

  var active = false;
  window.PageInit = window.PageInit || {};
  PageInit[PAGE] = function () { buildShell(); };
  document.addEventListener('roomforboth:pageshow', function (e) {
    active = !!(e.detail && e.detail.page === PAGE);
    if (!active) { dropGridMap(); return; }
    buildShell();
    var q = query(), st = q.get('state'), mo = parseInt(q.get('month'), 10);
    if (!st) { try { st = sessionStorage.getItem('roomForBoth.selectedState') || ''; } catch (x) {} }
    S.state = stateRow(st) ? st : (S.state || '');
    if (mo >= 1 && mo <= 12) S.month = mo;
    S.view = q.get('view') === 'area' ? 'area' : 'state';
    if (q.get('cell')) S.cell = q.get('cell');
    render();
    if (!S.data && !S.failed) load();
    if (S.view === 'area' && !S.grid && !S.gridFailed) loadGrid();
  });
  new MutationObserver(function () { if (active) render(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
})();
