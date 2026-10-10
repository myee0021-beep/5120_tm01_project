/* How this is computed — AC 1.3.1 (Iteration 3, Must). Figma: Plan 10.
 *
 * Shows the band table for each of the three signals, the combined rule and worked
 * examples built from real values, and states that the thresholds are team decisions
 * D34 and D46 held in one table, not calibrated against outcomes, changeable without code.
 *
 * Nothing about the bands is written into this file. Every band, range, score and example
 * result is computed from the rows of the signal_threshold table, so changing a row changes
 * the page. The table is read from /api/i3/signal-thresholds; until that Worker route exists
 * the same rows are read from signal_threshold.json (same shape, one row per signal and band).
 *
 * Real values for the worked examples:
 *   records      window.OCCURRENCES_ALL_YEARS  (GBIF extract shipped with the site)
 *   complaints   /api/i2/complaints            (PERHILITAN Table 29, complaint_series)
 *   attractants  /api/i2/attractants           (attractant_rule)
 * An example whose source did not answer says so; it is never replaced by a made-up number.
 */
(function () {
  'use strict';

  var PAGE = 'plan-how-computed';
    var SIGNALS = ['records', 'complaints', 'attractants'];
  var BANDS = ['low', 'medium', 'high'];

  var STATE_LABELS = { johor: 'Johor', kedah: 'Kedah', kelantan: 'Kelantan', melaka: 'Melaka', 'negeri-sembilan': 'Negeri Sembilan', pahang: 'Pahang', perak: 'Perak', perlis: 'Perlis', penang: 'Pulau Pinang', sabah: 'Sabah', sarawak: 'Sarawak', selangor: 'Selangor', terengganu: 'Terengganu', kl: 'Kuala Lumpur', labuan: 'Labuan', putrajaya: 'Putrajaya' };
  var SPECIES = {
    macaque: { id: 1, en: 'long-tailed macaque', bm: 'kera ekor panjang' },
    boar: { id: 2, en: 'wild boar', bm: 'babi hutan' },
    monitor: { id: 6, en: 'water monitor', bm: 'biawak air' },
    crow: { id: 5, en: 'house crow', bm: 'gagak rumah' }
  };
  // Worked examples. State and species only; every number is read from the data.
  var RECORD_EXAMPLES = [['selangor', 'macaque'], ['selangor', 'crow'], ['perlis', 'boar']];
  var COMPLAINT_EXAMPLES = [['selangor', 'macaque'], ['selangor', 'monitor']];
  var COMBINED_EXAMPLE = ['selangor', 'macaque'];
  var SAMPLE_ATTRACTANT_MATCHES = 2; // a home that matches two documented attractants

  var S = {
    thresholds: null, thresholdSource: '', thresholdError: false,
    complaints: {}, complaintsFailed: false,
    attractantRows: null, attractantsFailed: false,
    built: false
  };

  // -------------------------------------------------------------- helpers
  function lang() { return document.documentElement.getAttribute('lang') === 'bm' ? 'bm' : 'en'; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function T(en, bm) { return '<span data-en="">' + en + '</span><span data-bm="">' + (bm == null ? en : bm) + '</span>'; }
  function norm(v) { return String(v == null ? '' : v).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
  function fmt(n) { return Number(n).toLocaleString('en-US'); }
  function stateName(k) { return STATE_LABELS[k] || k; }
  function speciesName(code, l) { return SPECIES[code][l]; }
  function apiJson(url) {
    return fetch(url, { headers: { accept: 'application/json' }, cache: 'no-store' }).then(function (r) {
      return r.json().then(function (b) { if (!r.ok || (b && b.ok === false)) throw new Error((b && b.error) || ('HTTP ' + r.status)); return b; });
    });
  }

  // ------------------------------------------------- the threshold table
  // The table itself, and the band and score rules, live in signal-thresholds.js so the plan result uses the same rows.
  function signedRows(signal) { return window.SignalThresholds ? SignalThresholds.signedRows(signal) : []; }
  function bandFor(signal, n) { return window.SignalThresholds ? SignalThresholds.bandFor(signal, n) : null; }
  function scoreFor(signal, n) { return window.SignalThresholds ? SignalThresholds.scoreFor(signal, n) : 0; }
  function maxCombined() { return SIGNALS.length * 3; } // three signals, each scored 0 to 3
  var BAND_LABEL = { low: ['Low', 'Rendah'], medium: ['Medium', 'Sederhana'], high: ['High', 'Tinggi'] };
  function chip(row) {
    if (!row) return '<span class="phc-chip phc-chip--none">' + T('None', 'Tiada') + '</span>';
    var b = BAND_LABEL[row.band];
    return '<span class="level-pill level-' + row.band + '">' + T(b[0], b[1]) + '</span>';
  }
  function chipZero(signal) {
    var en = signal === 'records' ? 'Not recorded' : 'None', bm = signal === 'records' ? 'Tiada rekod' : 'Tiada';
    return '<span class="phc-chip phc-chip--none">' + T(en, bm) + '</span>';
  }
  var UNIT = {
    records: [['record', 'records'], ['rekod', 'rekod']],
    complaints: [['complaint', 'complaints'], ['aduan', 'aduan']],
    attractants: [['match', 'matches'], ['padanan', 'padanan']]
  };
  function unit(signal, n) { var u = UNIT[signal]; return T(n === 1 ? u[0][0] : u[0][1], u[1][n === 1 ? 0 : 1]); }
  // "1 to 49", "50 to 499", "500 and above" built only from the lower bounds in the table.
  function rangeText(signal, i) {
    var rows = signedRows(signal), r = rows[i], next = rows[i + 1];
    if (!r) return '';
    if (!next) return T(fmt(r.lower_bound) + ' or more', fmt(r.lower_bound) + ' atau lebih');
    var top = next.lower_bound - 1;
    return top === r.lower_bound ? fmt(r.lower_bound) : T(fmt(r.lower_bound) + ' to ' + fmt(top), fmt(r.lower_bound) + ' hingga ' + fmt(top));
  }
  function combinedRange(i) {
    var rows = signedRows('combined'), r = rows[i], next = rows[i + 1];
    if (!r) return '';
    var top = next ? next.lower_bound - 1 : maxCombined();
    return T(r.lower_bound + ' to ' + top, r.lower_bound + ' hingga ' + top);
  }

  // ----------------------------------------------------------- data access
  function occurrenceTotal(state, code) {
    var d = window.OCCURRENCES_ALL_YEARS;
    if (!d || !Array.isArray(d.rows)) return null;
    var total = 0;
    d.rows.forEach(function (r) { if (norm(r[0]) === state && r[1] === code) total += Number(r[4]) || 0; });
    return total;
  }
  function complaintCount(state, code) {
    var b = S.complaints[state];
    if (!b || !Array.isArray(b.rows)) return null;
    var id = SPECIES[code].id;
    var rows = b.rows.filter(function (r) { return Number(r && r.species_id) === id; });
    if (!rows.length) return null;
    rows.sort(function (a, c) { return (Number(c.year) || 0) - (Number(a.year) || 0); });
    return { cases: Number(rows[0].cases) || 0, year: Number(rows[0].year) || null };
  }
  function attractantRowCount(code) {
    if (!S.attractantRows) return null;
    var id = SPECIES[code].id;
    return S.attractantRows.filter(function (r) { return Number(r && r.species_id) === id; }).length;
  }

  // --------------------------------------------------------- page shell
  function buildShell() {
    var el = document.getElementById('page-' + PAGE);
    if (!el || el.getAttribute('data-phc-built')) return el;
    var src = document.getElementById('page-community-how-review-works');
    var header = src && src.querySelector('header'), footer = src && src.querySelector('footer');
    var prefix = 'community-how-review-works__';
    function fix(node) { return node.outerHTML.split(prefix).join(PAGE + '__'); }
    el.innerHTML = (header ? fix(header) : '') + '<main class="pt-28 pb-24"><div class="phc-wrap" id="' + PAGE + '__content"></div></main>' + (footer ? fix(footer) : '');
    el.setAttribute('data-phc-built', '1');
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
    return el;
  }

  // ------------------------------------------------------------- render
  function bandTable(signal) {
    var rows = signedRows(signal);
    if (!rows.length) {
      return '<p class="phc-text">' + T('No signed value is held for this signal, so no band is shown for it.', 'Tiada nilai yang ditandatangani untuk isyarat ini, jadi tiada jalur dipaparkan.') + '</p>';
    }
    var h = '<div class="phc-rows"><div class="phc-row"><span>0 ' + unit(signal, 0) + '</span>' + chipZero(signal) + '</div>';
    rows.forEach(function (r, i) {
      var top = rows[i + 1] ? rows[i + 1].lower_bound - 1 : Infinity;
      h += '<div class="phc-row"><span>' + rangeText(signal, i) + ' ' + unit(signal, top === r.lower_bound ? r.lower_bound : 2) + '</span>' + chip(r) + '</div>';
    });
    return h + '</div>';
  }
  function resultLine(signal, n) {
    var r = bandFor(signal, n);
    return fmt(n) + ' ' + unit(signal, n) + ', ' + (r ? T(BAND_LABEL[r.band][0], BAND_LABEL[r.band][1]) : (signal === 'records' ? T('Not recorded', 'Tiada rekod') : T('None', 'Tiada')));
  }
  function exampleBox(titleEn, titleBm, linesHtml) {
    return '<div class="phc-ex"><div class="phc-ex__title">' + T(titleEn, titleBm) + '</div>' + linesHtml + '</div>';
  }
  function unavailable(sourceEn, sourceBm) {
    return '<p class="phc-ex__line phc-ex__line--missing">' + T(sourceEn + ' did not answer, so there is no example from it right now.', sourceBm + ' tidak menjawab, jadi tiada contoh daripadanya sekarang.') + '</p>';
  }

  function recordsExamples() {
    var l = lang(), lines = '';
    RECORD_EXAMPLES.forEach(function (ex) {
      var n = occurrenceTotal(ex[0], ex[1]);
      if (n == null) return;
      lines += '<p class="phc-ex__line"><b>' + esc(stateName(ex[0])) + ', ' + T(esc(speciesName(ex[1], 'en')), esc(speciesName(ex[1], 'bm'))) + ':</b> ' + resultLine('records', n) + '.</p>';
    });
    return lines ? exampleBox('Worked examples', 'Contoh kerja', lines) : exampleBox('Worked examples', 'Contoh kerja', unavailable('The GBIF extract', 'Ekstrak GBIF'));
  }
  function complaintExamples() {
    var lines = '', any = false;
    COMPLAINT_EXAMPLES.forEach(function (ex) {
      var c = complaintCount(ex[0], ex[1]);
      if (!c) return;
      any = true;
      lines += '<p class="phc-ex__line"><b>' + esc(stateName(ex[0])) + ', ' + T(esc(speciesName(ex[1], 'en')), esc(speciesName(ex[1], 'bm'))) + ':</b> ' + resultLine('complaints', c.cases) + (c.year ? ' (' + c.year + ')' : '') + '.</p>';
    });
    lines += '<p class="phc-ex__line">' + T('Sabah and Sarawak are not in this table, so the indicator reads "no series" there. Crows and mynas are not in the table at all.', 'Sabah dan Sarawak tiada dalam jadual ini, jadi penunjuk menunjukkan "tiada siri" di sana. Gagak dan tiong tiada dalam jadual sama sekali.') + '</p>';
    if (!any) lines = unavailable('The complaint table', 'Jadual aduan') + lines;
    return exampleBox('Worked examples', 'Contoh kerja', lines);
  }
  function attractantExamples() {
    var n = attractantRowCount('macaque'), rows = signedRows('attractants'), lines = '';
    if (n == null) {
      lines = unavailable('The attractant_rule table', 'Jadual attractant_rule');
    } else {
      var tests = [];
      rows.forEach(function (r) { tests.push(r.lower_bound); });
      lines = '<p class="phc-ex__line">' + T('The table holds ' + n + ' documented attractants for the ' + speciesName('macaque', 'en') + '. Homes by the number of documented attractants their answers match:', 'Jadual ini menyimpan ' + n + ' tarikan yang didokumenkan untuk ' + speciesName('macaque', 'bm') + '. Rumah mengikut bilangan tarikan yang didokumenkan yang sepadan dengan jawapannya:') + '</p>';
      tests.forEach(function (m) { lines += '<p class="phc-ex__line"><b>' + resultLine('attractants', m) + '</b></p>'; });
    }
    return exampleBox('Worked example', 'Contoh kerja', lines);
  }
  function combinedBlock() {
    var rows = signedRows('combined');
    var h = '<div class="phc-rows">';
    if (!rows.length) h = '<p class="phc-text">' + T('No signed value is held for the combined level, so none is shown.', 'Tiada nilai yang ditandatangani untuk tahap gabungan, jadi tiada dipaparkan.') + '</p>';
    else {
      rows.forEach(function (r, i) { h += '<div class="phc-row"><span>' + T('Sum of scores', 'Jumlah markah') + ' ' + combinedRange(i) + '</span>' + chip(r) + '</div>'; });
      h += '</div>';
    }
    var scores = [1, 2, 3].map(function (k) { return k + ' = ' + BAND_LABEL[BANDS[k - 1]][0]; }).join(', ');
    var scoresBm = [1, 2, 3].map(function (k) { return k + ' = ' + BAND_LABEL[BANDS[k - 1]][1]; }).join(', ');
    var rule = '<p class="phc-text">' + T('Each signal gets a band score: none 0, ' + scores + '. The three scores are added, so the sum runs from 0 to ' + maxCombined() + ', and the sum is read against the bands below. The three inputs are always printed beneath the combined chip so the sum can be checked by hand.',
      'Setiap isyarat mendapat markah jalur: tiada 0, ' + scoresBm + '. Tiga markah ditambah, jadi jumlahnya antara 0 dan ' + maxCombined() + ', dan jumlah itu dibaca berdasarkan jalur di bawah. Tiga input sentiasa dicetak di bawah cip gabungan supaya jumlah boleh disemak dengan tangan.') + '</p>';
    // worked example: real records and complaints, and a home that matches a stated number of attractants
    var ex = '';
    var n1 = occurrenceTotal(COMBINED_EXAMPLE[0], COMBINED_EXAMPLE[1]);
    var c = complaintCount(COMBINED_EXAMPLE[0], COMBINED_EXAMPLE[1]);
    if (n1 != null && c && rows.length) {
      var s1 = scoreFor('records', n1), s2 = scoreFor('complaints', c.cases), s3 = scoreFor('attractants', SAMPLE_ATTRACTANT_MATCHES), sum = s1 + s2 + s3;
      var cr = bandFor('combined', sum);
      ex = exampleBox('Worked example', 'Contoh kerja',
        '<p class="phc-ex__line"><b>' + esc(stateName(COMBINED_EXAMPLE[0])) + ', ' + T(esc(speciesName(COMBINED_EXAMPLE[1], 'en')), esc(speciesName(COMBINED_EXAMPLE[1], 'bm'))) + ':</b></p>' +
        '<p class="phc-ex__line">' + T('Records', 'Rekod') + ': ' + resultLine('records', n1) + ' → ' + s1 + '</p>' +
        '<p class="phc-ex__line">' + T('Complaints', 'Aduan') + ': ' + resultLine('complaints', c.cases) + ' → ' + s2 + '</p>' +
        '<p class="phc-ex__line">' + T('Attractants (a home that matches ' + SAMPLE_ATTRACTANT_MATCHES + ')', 'Tarikan (rumah yang sepadan dengan ' + SAMPLE_ATTRACTANT_MATCHES + ')') + ': ' + resultLine('attractants', SAMPLE_ATTRACTANT_MATCHES) + ' → ' + s3 + '</p>' +
        '<p class="phc-ex__line"><b>' + s1 + ' + ' + s2 + ' + ' + s3 + ' = ' + sum + '</b> ' + (cr ? chip(cr) : '') + '</p>');
    } else {
      ex = exampleBox('Worked example', 'Contoh kerja', unavailable('The complaint table', 'Jadual aduan'));
    }
    return h + rule + ex;
  }

  function signedInfo() {
    var rows = (S.thresholds || []).filter(function (r) { return r.signed_date; });
    var decisions = {}, dates = [];
    rows.forEach(function (r) { decisions[r.decision] = 1; dates.push(r.signed_date); });
    dates.sort();
    return { decisions: Object.keys(decisions).sort(), last: dates.length ? dates[dates.length - 1] : '' };
  }
  function dateText(iso) {
    var m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return esc(iso);
    var en = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    var bm = ['Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun', 'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember'];
    var d = Number(m[3]), mo = Number(m[2]) - 1;
    return T(d + ' ' + en[mo] + ' ' + m[1], d + ' ' + bm[mo] + ' ' + m[1]);
  }

  function render() {
    var root = document.getElementById(PAGE + '__content');
    if (!root) return;
    if (S.thresholdError) {
      root.innerHTML = hero() + '<div class="phc-card"><p class="phc-text">' + T('The threshold table did not load, so the bands cannot be shown. Nothing is guessed in its place. Try again in a moment.', 'Jadual ambang tidak dimuat, jadi jalur tidak dapat dipaparkan. Tiada apa diteka sebagai ganti. Cuba lagi sebentar nanti.') + '</p></div>';
      return;
    }
    if (!S.thresholds) { root.innerHTML = hero() + '<div class="phc-card"><p class="phc-text">' + T('Loading the threshold table…', 'Memuatkan jadual ambang…') + '</p></div>'; return; }
    var occ = window.OCCURRENCES_ALL_YEARS, info = signedInfo();
    var occLine = occ && occ.meta && occ.meta.yearRange && occ.meta.yearRange.length
      ? T('All years in the extract, ' + occ.meta.yearRange[0] + ' to ' + occ.meta.yearRange[1] + '; ' + fmt(occ.meta.totalRecords) + ' records in all.', 'Semua tahun dalam ekstrak, ' + occ.meta.yearRange[0] + ' hingga ' + occ.meta.yearRange[1] + '; ' + fmt(occ.meta.totalRecords) + ' rekod keseluruhan.') : '';
    var h = hero();
    h += card('1 · ' + 'Records in your state', '1 · Rekod di negeri anda',
      '<p class="phc-text">' + T('Count of GBIF occurrence records for the species that carry your state name. ', 'Kiraan rekod kejadian GBIF untuk spesies yang membawa nama negeri anda. ') + occLine + '</p>' +
      bandTable('records') + recordsExamples() +
      '<p class="phc-note">' + T('Observations by people, mostly eBird and iNaturalist. They show where people look as much as where animals are.', 'Pemerhatian oleh orang ramai, kebanyakannya eBird dan iNaturalist. Ia menunjukkan tempat orang melihat sama seperti tempat haiwan berada.') + '</p>');
    h += card('2 · Complaints in your state', '2 · Aduan di negeri anda',
      '<p class="phc-text">' + T('PERHILITAN Laporan Tahunan 2020, Table 29. Peninsular Malaysia only. The row for the species and state you pick is used; the all-species total is never substituted.', 'PERHILITAN Laporan Tahunan 2020, Jadual 29. Semenanjung Malaysia sahaja. Baris untuk spesies dan negeri yang anda pilih digunakan; jumlah semua spesies tidak pernah digunakan sebagai ganti.') + '</p>' +
      bandTable('complaints') + complaintExamples());
    h += card('3 · Attractants at your home', '3 · Tarikan di rumah anda',
      '<p class="phc-text">' + T('Each questionnaire answer that matches a documented attractant for the species counts once (attractant_rule table, one Malaysian source per row).', 'Setiap jawapan soal selidik yang sepadan dengan tarikan yang didokumenkan untuk spesies dikira sekali (jadual attractant_rule, satu sumber Malaysia setiap baris).') + '</p>' +
      bandTable('attractants') + attractantExamples());
    h += card('Combined level', 'Tahap gabungan', combinedBlock() +
      '<div class="phc-review"><div class="phc-review__title">' + T('Open to review', 'Terbuka untuk semakan') + '</div><p>' +
      // Team decisions D34 and D46 (the bands, signed 26 September 2026); the numbers are kept here, not on the page.
      T('These thresholds are recorded team decisions, held in one table (signal_threshold) and changeable without changing code, so a mentor can ask for a change. They are not calibrated against outcomes, and the page says so.',
        'Ambang ini ialah keputusan pasukan yang direkodkan, disimpan dalam satu jadual (signal_threshold) dan boleh diubah tanpa menukar kod, supaya mentor boleh meminta perubahan. Ia tidak ditentukur berdasarkan hasil, dan halaman ini menyatakannya.') +
      (info.last ? ' ' + T('Values signed ', 'Nilai ditandatangani ') + dateText(info.last) + '.' : '') + ' ' + T('No value changes without a new recorded team decision.', 'Tiada nilai berubah tanpa keputusan pasukan baharu yang direkodkan.') + '</p></div>');
    h += card('Sources on this page', 'Sumber pada halaman ini',
      '<ul class="phc-list"><li>' + T('GBIF occurrence extract, 7 species, Malaysia (CC BY 4.0, CC BY-NC 4.0, CC0)', 'Ekstrak kejadian GBIF, 7 spesies, Malaysia (CC BY 4.0, CC BY-NC 4.0, CC0)') + '</li>' +
      '<li>' + T('PERHILITAN Laporan Tahunan 2020, Jadual 29 (transcribed, PDF)', 'PERHILITAN Laporan Tahunan 2020, Jadual 29 (disalin, PDF)') + '</li>' +
      '<li>' + T('attractant_rule: Room for Both table, every row sourced and dated', 'attractant_rule: jadual Room for Both, setiap baris bersumber dan bertarikh') + '</li>' +
      '<li>' + T('signal_threshold: the bands on this page, read from ' + (S.thresholdSource === 'api' ? 'the database' : 'the shipped file signal_threshold.json until the database route is available'), 'signal_threshold: jalur pada halaman ini, dibaca daripada ' + (S.thresholdSource === 'api' ? 'pangkalan data' : 'fail signal_threshold.json sehingga laluan pangkalan data tersedia')) + '</li></ul>');
    h += '<a class="phc-btn" href="plan-result.html">' + T('Back to my plan', 'Kembali ke pelan saya') + '</a>';
    root.innerHTML = h;
  }
  function hero() {
    return '<a class="phc-back" href="plan-result.html"><svg fill="none" height="14" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.4" viewBox="0 0 24 24" width="14"><path d="m15 18-6-6 6-6"></path></svg><span>' + T('Back to my plan', 'Kembali ke pelan saya') + '</span></a>' +
      '<div class="phc-eyebrow">' + T('Plan · How this is computed', 'Pelan · Cara ini dikira') + '</div>' +
      '<h1 class="phc-title">' + T('How your signals are computed', 'Cara isyarat anda dikira') + '</h1>' +
      '<p class="phc-lead">' + T('Three indicators, each from a named source, shown side by side. They are never merged into one score for your address, and none of them is a probability.',
        'Tiga penunjuk, masing-masing daripada sumber yang dinamakan, dipaparkan bersebelahan. Ia tidak pernah digabungkan menjadi satu markah untuk alamat anda, dan tiada satu pun ialah kebarangkalian.') + '</p>';
  }
  function card(titleEn, titleBm, body) {
    return '<section class="phc-card"><div class="phc-label">' + T(esc(titleEn), esc(titleBm)) + '</div>' + body + '</section>';
  }

  // ------------------------------------------------------------- loading
  function loadThresholds() {
    S.thresholdError = false;
    if (!window.SignalThresholds) { S.thresholdError = true; return Promise.resolve(); }
    return SignalThresholds.load().then(function (st) {
      if (st.failed || !st.rows) { S.thresholdError = true; return; }
      S.thresholds = st.rows; S.thresholdSource = st.source;
    });
  }
  function loadExamples() {
    var states = {};
    COMPLAINT_EXAMPLES.concat([COMBINED_EXAMPLE]).forEach(function (e) { states[e[0]] = 1; });
    var jobs = Object.keys(states).map(function (st) {
      return apiJson('/api/i2/complaints?state=' + encodeURIComponent(st)).then(function (b) { S.complaints[st] = b; }).catch(function () { S.complaintsFailed = true; });
    });
    jobs.push(apiJson('/api/i2/attractants').then(function (b) { S.attractantRows = Array.isArray(b.rows) ? b.rows : []; }).catch(function () { S.attractantsFailed = true; }));
    return Promise.all(jobs);
  }

  var active = false, started = false;
  function start() {
    if (started) { render(); return; }
    started = true;
    render();
    loadThresholds().then(function () { if (active) render(); });
    loadExamples().then(function () { if (active) render(); });
  }

  window.PageInit = window.PageInit || {};
  PageInit[PAGE] = function () { buildShell(); };
  document.addEventListener('roomforboth:pageshow', function (e) {
    active = !!(e.detail && e.detail.page === PAGE);
    if (!active) return;
    buildShell();
    start();
  });
  // Records arrive from a separate file; redraw when they do.
  window.addEventListener('roomforboth:all-years-occurrence-data-ready', function () { if (active) render(); });
  new MutationObserver(function () { if (active) render(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
})();
