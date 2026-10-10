/* How this forecast was made and tested — AC 11.2.2 (Epic 11, Iteration 3). Figma: About the data 01 (no frame for this page yet).
 *
 * AC 11.2.2 says, when it renders, the page shows:
 *   (1) the three data files, each with source, licence and retrieval date
 *   (2) what the model is given, in plain words, including the previous twelve months of records
 *   (3) the training years and the test year
 *   (4) the test results beside the results of the simple baselines
 *   (5) the date the model was trained, and whether the page shows the model or the counted fallback
 * "And no result is shown on this page that is not in the recorded test run."
 *
 * Reads two static files, nothing else, and stores nothing:
 *   forecast_predictions.json  the file the forecast page reads (its metadata block: features, years, date trained, kind)
 *   forecast_evaluation.json   the recorded test run. Results are shown ONLY when it names who ran the test (run_by).
 *                              Until then every result cell says it has not been tested (D50, Safeguards 6.8).
 * Nothing on this page is typed in: facts come from those two files. A fact the files do not hold (a retrieval date, a
 * licence nobody has recorded) is shown as "not recorded yet" and never filled in with a guess.
 */
(function () {
  'use strict';

  var PAGE = 'ecosystem-forecast-method';
  var PRED = 'forecast_predictions.json?v=20261008-1';
  var EVAL = 'forecast_evaluation.json?v=20261010-2';

  var S = { meta: null, evalRun: null, failed: false, loading: false };

  function lang() { return document.documentElement.getAttribute('lang') === 'bm' ? 'bm' : 'en'; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function T(en, bm) { return '<span data-en="">' + en + '</span><span data-bm="">' + (bm == null ? en : bm) + '</span>'; }
  var MONTHS = {
    en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    bm: ['Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun', 'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember']
  };
  function dateText(iso) {
    var m = String(iso || '').match(/^(\d{4})-(\d{2})(?:-(\d{2}))?/);
    if (!m) return '';
    var mo = +m[2] - 1, d = m[3] ? +m[3] : null;
    return T((d ? d + ' ' : '') + MONTHS.en[mo] + ' ' + m[1], (d ? d + ' ' : '') + MONTHS.bm[mo] + ' ' + m[1]);
  }
  var NOT_RECORDED = T('Not recorded yet', 'Belum direkodkan');

  // ------------------------------------------------------------ what the model is given
  // Every feature name in the file is turned into a plain sentence. A name this page does not know is shown as it is, so a new
  // feature can never be hidden from the reader.
  var FEATURE_TEXT = {
    species: ['Which of the seven animals it is.', 'Antara tujuh haiwan, yang mana satu.'],
    state_normalised: ['Which state, one of the sixteen states and federal territories.', 'Negeri mana, satu daripada enam belas negeri dan wilayah persekutuan.'],
    month: ['Which month of the year.', 'Bulan apa dalam tahun.'],
    year: ['The year. When the forecast is made, it is set to the last year the model learned from, so the page never offers a future year.', 'Tahun. Apabila ramalan dibuat, ia ditetapkan kepada tahun terakhir yang dipelajari model, jadi halaman tidak pernah menawarkan tahun hadapan.'],
    pop_2020_k: ['How many people lived in the state in 2020 (DOSM).', 'Berapa ramai orang tinggal di negeri itu pada 2020 (DOSM).'],
    forest_reserve_ha: ['How much permanent forest reserve the state has, in hectares. Values after 2022 reuse the 2022 value.', 'Berapa banyak hutan simpan kekal yang ada di negeri itu, dalam hektar. Nilai selepas 2022 menggunakan nilai 2022.']
  };
  var HISTORY_RE = /(prev|previous|last[_-]?12|twelve|trailing|history|lag)/i;
  var HISTORY_TEXT = ['The records of that animal in that state over the previous twelve months, never any month from the month being predicted onward.', 'Rekod haiwan itu di negeri itu sepanjang dua belas bulan sebelumnya, tidak pernah mana-mana bulan dari bulan yang diramal dan seterusnya.'];

  // ------------------------------------------------------------ page shell
  function buildShell() {
    var el = document.getElementById('page-' + PAGE);
    if (!el || el.getAttribute('data-fm-built')) return el;
    var src = document.getElementById('page-community-how-review-works');
    var header = src && src.querySelector('header'), footer = src && src.querySelector('footer');
    var prefix = 'community-how-review-works__';
    function fix(node) { return node.outerHTML.split(prefix).join(PAGE + '__'); }
    el.innerHTML = (header ? fix(header) : '') + '<main class="pt-28 pb-24"><div class="fc-wrap" id="' + PAGE + '__content"></div></main>' + (footer ? fix(footer) : '');
    el.setAttribute('data-fm-built', '1');
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
    document.getElementById(PAGE + '__content').addEventListener('click', function (e) {
      if (e.target.closest('[data-act="retry"]')) { S.failed = false; load(); }
    });
    return el;
  }

  // ------------------------------------------------------------ pieces
  function card(labelHtml, bodyHtml) { return '<section class="fc-card"><div class="fc-label">' + labelHtml + '</div>' + bodyHtml + '</section>'; }
  function p(html) { return '<p class="fc-text">' + html + '</p>'; }

  function statusCard(meta) {
    var fallback = meta.kind === 'counted' || meta.fallback === true;
    var trained = dateText(meta.date_trained);
    var last = dateText(meta.last_month_of_records_in_training);
    return card(T('What this page is showing', 'Apa yang dipaparkan halaman ini'),
      '<div class="fm-kv">' +
      '<div><dt>' + T('The forecast page shows', 'Halaman ramalan memaparkan') + '</dt><dd><span class="fc-chip ' + (fallback ? 'fc-chip--none' : 'fc-chip--likely') + '">' + (fallback ? T('Counted records, not the model', 'Rekod yang dikira, bukan model') : T('The model', 'Model')) + '</span></dd></div>' +
      '<div><dt>' + T('Date trained', 'Tarikh dilatih') + '</dt><dd>' + (trained || NOT_RECORDED) + '</dd></div>' +
      '<div><dt>' + T('Built from records up to', 'Dibina daripada rekod sehingga') + '</dt><dd>' + (last || NOT_RECORDED) + '</dd></div></div>' +
      p(fallback
        ? T('The model is not being shown. For each animal the page shows its share of the records in that state over the previous twelve months, worked out by counting.', 'Model tidak dipaparkan. Untuk setiap haiwan halaman menunjukkan bahagian rekodnya di negeri itu sepanjang dua belas bulan sebelumnya, dikira dengan membilang.')
        : T('The page shows what a model trained by the team predicts. It is a simple prediction with no accuracy guarantee.', 'Halaman memaparkan apa yang diramal oleh model yang dilatih pasukan. Ia ramalan ringkas tanpa jaminan ketepatan.')) +
      p(T('It predicts how likely each animal is to be recorded by people in a state in a month. A record is one report by a person, not one animal. It is a prediction for the state, not a chance for your home.', 'Ia meramal betapa mungkinnya setiap haiwan direkodkan oleh orang ramai di sesebuah negeri dalam sebulan. Satu rekod ialah satu laporan oleh seseorang, bukan satu haiwan. Ia ramalan untuk negeri, bukan kebarangkalian untuk rumah anda.')));
  }

  function dataCard(meta) {
    var retrieved = (meta.dataset && meta.dataset.retrieved) || {};
    function row(name, gives, source, licence, key) {
      var date = retrieved[key];
      return '<tr><td data-label="File"><b>' + name + '</b></td><td>' + gives + '</td><td>' + source + '</td><td>' + licence + '</td><td>' + (date ? dateText(date) : NOT_RECORDED) + '</td></tr>';
    }
    var head = '<thead><tr><th>' + T('File', 'Fail') + '</th><th>' + T('What it gives', 'Apa yang diberikan') + '</th><th>' + T('Source', 'Sumber') + '</th><th>' + T('Licence', 'Lesen') + '</th><th>' + T('Retrieved', 'Diperoleh') + '</th></tr></thead>';
    var body = '<tbody>' +
      row(T('GBIF occurrence records', 'Rekod kejadian GBIF'), T('Records of the seven animals by state, year and month, 2015 to the latest extract', 'Rekod tujuh haiwan mengikut negeri, tahun dan bulan, 2015 hingga ekstrak terkini'),
        T('GBIF, extract prepared by the team', 'GBIF, ekstrak disediakan oleh pasukan'), T('Each record carries its own licence: CC BY 4.0, CC BY-NC 4.0 or CC0', 'Setiap rekod membawa lesennya sendiri: CC BY 4.0, CC BY-NC 4.0 atau CC0'), 'gbif') +
      row(T('State population', 'Penduduk negeri'), T('How many people lived in each state in 2020', 'Berapa ramai orang tinggal di setiap negeri pada 2020'),
        T('DOSM, <code>population_state</code> on data.gov.my', 'DOSM, <code>population_state</code> di data.gov.my'), T('Not recorded yet', 'Belum direkodkan'), 'population') +
      row(T('Permanent forest reserve area', 'Keluasan hutan simpan kekal'), T('Hectares of permanent forest reserve by state and year; the latest year is 2022 and later years reuse it', 'Hektar hutan simpan kekal mengikut negeri dan tahun; tahun terkini 2022 dan tahun kemudian menggunakannya'),
        T('Forestry Department Peninsular Malaysia and DOSM, <code>forest_reserve_state</code> on data.gov.my', 'Jabatan Perhutanan Semenanjung Malaysia dan DOSM, <code>forest_reserve_state</code> di data.gov.my'), T('CC BY 4.0', 'CC BY 4.0'), 'forest') +
      '</tbody>';
    return card(T('The three data files', 'Tiga fail data'),
      '<div class="fm-scroll"><table class="fm-table">' + head + body + '</table></div>' +
      p(T('A source, licence or retrieval date shown as "Not recorded yet" has not been entered in the Data Management Plan. This page does not fill it in with a guess.', 'Sumber, lesen atau tarikh perolehan yang dipaparkan sebagai "Belum direkodkan" belum dimasukkan dalam Pelan Pengurusan Data. Halaman ini tidak mengisinya dengan andaian.')));
  }

  function inputsCard(meta) {
    var feats = Array.isArray(meta.features) ? meta.features : [];
    var hasHistory = feats.some(function (f) { return HISTORY_RE.test(f); });
    var items = feats.map(function (f) {
      var t = FEATURE_TEXT[f];
      if (HISTORY_RE.test(f)) return '<li>' + T(esc(HISTORY_TEXT[0]), esc(HISTORY_TEXT[1])) + '</li>';
      return '<li>' + (t ? T(esc(t[0]), esc(t[1])) : esc(f)) + '</li>';
    }).join('');
    var historyLine = hasHistory ? '' :
      '<li class="fm-warn">' + T('The previous twelve months of records of that animal in that state: <b>not used by this version of the model.</b>', 'Rekod dua belas bulan sebelumnya bagi haiwan itu di negeri itu: <b>tidak digunakan oleh versi model ini.</b>') + '</li>';
    return card(T('What the model is given', 'Apa yang diberikan kepada model'),
      '<ul class="fm-list">' + items + historyLine + '</ul>' +
      p(T('It is never given the same month\'s number of records, the same month\'s share of the records, or whether the animal was recorded that month. Those are what it is trying to predict.', 'Ia tidak pernah diberi bilangan rekod bagi bulan yang sama, bahagian rekod bulan yang sama, atau sama ada haiwan itu direkodkan bulan itu. Itulah yang cuba diramalnya.')));
  }

  function yearsCard(meta) {
    var years = String(meta.training_years || '').match(/^(\d{4})\D+(\d{4})$/);
    var test = meta.final_test_year;
    var rolling = Array.isArray(meta.rolling_test_years) ? meta.rolling_test_years : [];
    var trainTo = test ? test - 1 : null;
    return card(T('Training years and test year', 'Tahun latihan dan tahun ujian'),
      '<div class="fm-kv">' +
      '<div><dt>' + T('Final model learned from', 'Model akhir belajar daripada') + '</dt><dd>' + (years ? years[1] + ' ' + T('to', 'hingga') + ' ' + years[2] : NOT_RECORDED) + '</dd></div>' +
      '<div><dt>' + T('Tested once on', 'Diuji sekali pada') + '</dt><dd>' + (test || NOT_RECORDED) + (test && years ? ' (' + T('learning only from ' + years[1] + ' to ' + trainTo, 'belajar hanya daripada ' + years[1] + ' hingga ' + trainTo) + ')' : '') + '</dd></div>' +
      '<div><dt>' + T('Earlier check years', 'Tahun semakan terdahulu') + '</dt><dd>' + (rolling.length ? rolling.join(', ') : NOT_RECORDED) + '</dd></div></div>' +
      p(T('The test years are always later than every year the model learned from for that test. There is no random split, so the model never sees a neighbouring year of the state and month it is tested on.', 'Tahun ujian sentiasa lebih lewat daripada setiap tahun yang dipelajari model bagi ujian itu. Tiada pembahagian rawak, jadi model tidak pernah melihat tahun bersebelahan bagi negeri dan bulan yang diujinya.')) +
      p(T('2025 and 2026 are not used for the test: their records are still arriving, so those years are incomplete.', '2025 dan 2026 tidak digunakan untuk ujian: rekodnya masih diterima, jadi tahun itu tidak lengkap.')));
  }

  var BASE_ORDER = ['B1 species only', 'B2 species x state average', 'B3 species x state, last two years'];
  var BASE_TEXT = {
    'B1 species only': ['Species only', 'Spesies sahaja'],
    'B2 species x state average': ['Average for that animal in that state', 'Purata bagi haiwan itu di negeri itu'],
    'B3 species x state, last two years': ['Same average, last two years', 'Purata yang sama, dua tahun terakhir']
  };
  function num(v) { return typeof v === 'number' && isFinite(v) ? v.toFixed(3) : null; }

  function resultsCard() {
    var run = S.evalRun;
    var recorded = !!(run && run.run_by && String(run.run_by).trim());
    var h = '';
    h += p(T('The model is shown next to three simple ways of guessing that need no training. Two measures: <b>AUC</b> says how well the order is right (higher is better); <b>Brier score</b> says how close the numbers are (lower is better).', 'Model dipaparkan bersebelahan tiga cara meneka yang mudah dan tidak perlu latihan. Dua ukuran: <b>AUC</b> menunjukkan betapa tepat susunan (lebih tinggi lebih baik); <b>skor Brier</b> menunjukkan betapa hampir nombor (lebih rendah lebih baik).'));
    var rows = [];
    if (recorded) {
      (run.rolling || []).forEach(function (r) { rows.push(r); });
      var fin = run.final_test_2024 || run.final_test;
      if (fin) rows.push(fin);
    }
    var head = '<thead><tr><th>' + T('Test year', 'Tahun ujian') + '</th><th>' + T('Model', 'Model') + '</th>' +
      BASE_ORDER.map(function (b) { return '<th>' + T(esc(BASE_TEXT[b][0]), esc(BASE_TEXT[b][1])) + '</th>'; }).join('') + '</tr></thead>';
    var body = '<tbody>';
    if (rows.length) {
      rows.forEach(function (r) {
        var y = (r.test_years && r.test_years.join(', ')) || r.label || '';
        var isFinal = /final/i.test(r.label || '');
        body += '<tr' + (isFinal ? ' class="fm-final"' : '') + '><td><b>' + esc(y) + '</b>' + (isFinal ? ' <span class="fc-count">' + T('final test', 'ujian akhir') + '</span>' : '') + '</td>' + cell(r.model) +
          BASE_ORDER.map(function (b) { return cell(r.baselines && r.baselines[b]); }).join('') + '</tr>';
      });
    } else {
      [2021, 2022, 2023, 2024].forEach(function (y) {
        body += '<tr><td><b>' + y + '</b>' + (y === 2024 ? ' <span class="fc-count">' + T('final test', 'ujian akhir') + '</span>' : '') + '</td>' + '<td colspan="4" class="fm-none">' + T('Not tested yet', 'Belum diuji') + '</td></tr>';
      });
    }
    body += '</tbody>';
    h += '<div class="fm-scroll"><table class="fm-table fm-results">' + head + body + '</table></div>';
    if (recorded) {
      h += '<p class="fc-note">' + T('Test run recorded ' + (run.date ? 'on ' + esc(run.date) : '') + ', run by ' + esc(run.run_by) + '. Each cell is AUC / Brier score.', 'Ujian direkodkan ' + (run.date ? 'pada ' + esc(run.date) : '') + ', dijalankan oleh ' + esc(run.run_by) + '. Setiap sel ialah AUC / skor Brier.') + '</p>';
    } else {
      h += '<p class="fc-note fm-warn">' + T('No test has been recorded, so no result is shown. Results appear here only after the test has been run and recorded, with the date and who ran it, by someone other than the person who trained the model.', 'Tiada ujian direkodkan, jadi tiada keputusan dipaparkan. Keputusan muncul di sini hanya selepas ujian dijalankan dan direkodkan, dengan tarikh dan siapa yang menjalankannya, oleh seseorang selain orang yang melatih model.') + '</p>';
    }
    return card(T('Test results beside simple counting', 'Keputusan ujian bersebelahan pengiraan mudah'), h);
  }
  function cell(o) {
    if (!o) return '<td class="fm-none">–</td>';
    var a = num(o.auc), b = num(o.brier);
    return '<td>' + (a && b ? a + ' / ' + b : '–') + '</td>';
  }

  // ------------------------------------------------------------ the area model (By area view)
  // Static text about the area model. It shows no test figure: those wait for the recorded test run (D50, Safeguards 6.8).
  function areaCard() {
    var items = [
      ['What it predicts: if at least one record is made in a square in a month, how likely each animal is to be among the animals recorded. It only counts squares that have a record that month, so it says nothing about whether a place will have any record at all.', 'Apa yang diramalnya: jika sekurang-kurangnya satu rekod dibuat dalam satu petak pada sesuatu bulan, betapa mungkinnya setiap haiwan termasuk dalam haiwan yang direkodkan. Ia hanya mengira petak yang mempunyai rekod pada bulan itu, jadi ia tidak mengatakan sama ada sesuatu tempat akan mempunyai rekod langsung.'],
      ['What it is given: the animal, the state, the position of the middle of the square (latitude and longitude), the month, and how many years the records cover. It is not given counts, totals or shares worked out from the records.', 'Apa yang diberikan kepadanya: haiwan, negeri, kedudukan tengah petak (latitud dan longitud), bulan, dan berapa tahun rekod itu meliputi. Ia tidak diberi bilangan, jumlah atau bahagian yang dikira daripada rekod.'],
      ['What it learned from: GBIF records from 2015 to 2024, placed in squares of 0.25 degree, about 28 km on each side. Population and forest reserve area are not used by this model. It uses the same kind of model and settings as the state forecast.', 'Apa yang dipelajarinya: rekod GBIF dari 2015 hingga 2024, diletakkan dalam petak 0.25 darjah, kira-kira 28 km setiap sisi. Penduduk dan keluasan hutan simpan tidak digunakan oleh model ini. Ia menggunakan jenis model dan tetapan yang sama seperti ramalan negeri.'],
      ['How it is tested: by time only. It learns from earlier years and is tested on a later one, with no random split. The source file has no single years, so there is one final test on 2024 and no earlier check years. 2025 and 2026 are not used because those years are incomplete. The result of this test is not shown here until it has been run and recorded.', 'Bagaimana ia diuji: mengikut masa sahaja. Ia belajar daripada tahun terdahulu dan diuji pada tahun kemudian, tanpa pembahagian rawak. Fail sumber tiada tahun tunggal, jadi ada satu ujian akhir pada 2024 dan tiada tahun semakan terdahulu. 2025 dan 2026 tidak digunakan kerana tahun itu tidak lengkap. Keputusan ujian ini tidak dipaparkan di sini sehingga ia dijalankan dan direkodkan.'],
      ['What it cannot tell you: a square is a wide area, so this is not a chance for your home. A square with fewer than the minimum number of records (the same minimum as everywhere on the site) is shown without a forecast. Values for squares and months that never had a record are extrapolated. A square is counted in one state only, so a square on a border may sit in the state next door. Wild boar and the two snakes have few records, so their results are less stable.', 'Apa yang tidak dapat diberitahunya: satu petak ialah kawasan yang luas, jadi ini bukan kebarangkalian untuk rumah anda. Petak dengan rekod kurang daripada bilangan minimum (minimum yang sama seperti di seluruh laman) dipaparkan tanpa ramalan. Nilai bagi petak dan bulan yang tidak pernah mempunyai rekod adalah anggaran luar julat. Satu petak dikira dalam satu negeri sahaja, jadi petak di sempadan mungkin berada dalam negeri bersebelahan. Babi hutan dan dua ular mempunyai sedikit rekod, jadi keputusannya kurang stabil.']
    ];
    return card(T('The area model (By area view)', 'Model kawasan (paparan Mengikut kawasan)'),
      p(T('The "By area" view on the forecast page uses a second model that works on squares of the map instead of whole states.', 'Paparan "Mengikut kawasan" pada halaman ramalan menggunakan model kedua yang bekerja pada petak peta dan bukan seluruh negeri.')) +
      '<ul class="fm-list">' + items.map(function (i) { return '<li>' + T(esc(i[0]), esc(i[1])) + '</li>'; }).join('') + '</ul>');
  }

  function limitsCard() {
    var items = [
      ['GBIF records show where people reported animals, not where animals are. Busy places and easy-to-see animals have more records.', 'Rekod GBIF menunjukkan di mana orang melaporkan haiwan, bukan di mana haiwan berada. Tempat sibuk dan haiwan yang mudah dilihat mempunyai lebih banyak rekod.'],
      ['The common myna and house crow hold about four in five of all records, so an ordered list puts them first in almost every state.', 'Gembala kerbau dan gagak rumah memegang kira-kira empat daripada lima rekod, jadi senarai tersusun meletakkan mereka dahulu di hampir setiap negeri.'],
      ['Wild boar and the two snakes have few records, so their results are less stable. An animal with too few records in a state gets no band.', 'Babi hutan dan dua ular mempunyai sedikit rekod, jadi keputusannya kurang stabil. Haiwan dengan rekod terlalu sedikit di sesebuah negeri tidak mendapat jalur.'],
      ['The place is the state only, and the month is a monthly total. The order changes little from month to month, so the page does not say an animal is more active in a month.', 'Tempat hanyalah negeri, dan bulan ialah jumlah bulanan. Susunan berubah sedikit dari bulan ke bulan, jadi halaman tidak mengatakan haiwan lebih aktif dalam sesuatu bulan.'],
      ['The forest value is the area of permanent forest reserve, not forest cover.', 'Nilai hutan ialah keluasan hutan simpan kekal, bukan litupan hutan.']
    ];
    return card(T('What it cannot tell you', 'Apa yang tidak dapat diberitahunya'), '<ul class="fm-list">' + items.map(function (i) { return '<li>' + T(esc(i[0]), esc(i[1])) + '</li>'; }).join('') + '</ul>');
  }

  // ------------------------------------------------------------ render
  function hero() {
    return '<a class="fc-back" href="ecosystem-forecast.html"><svg fill="none" height="14" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.4" viewBox="0 0 24 24" width="14"><path d="m15 18-6-6 6-6"></path></svg><span>' + T('Back to the forecast', 'Kembali ke ramalan') + '</span></a>' +
      '<div class="fc-eyebrow">' + T('Ecosystem · Wildlife forecast', 'Ekosistem · Ramalan hidupan liar') + '</div>' +
      '<h1 class="fc-title">' + T('How this forecast was made and tested', 'Bagaimana ramalan ini dibuat dan diuji') + '</h1>' +
      '<p class="fc-lead">' + T('What the model learned from, what it is given, how it was tested, and what it cannot tell you.', 'Apa yang dipelajari model, apa yang diberikan kepadanya, bagaimana ia diuji, dan apa yang tidak dapat diberitahunya.') + '</p>';
  }
  function render() {
    var root = document.getElementById(PAGE + '__content'); if (!root) return;
    var h = hero();
    if (S.failed) {
      root.innerHTML = h + '<div class="fc-card"><p class="fc-text">' + T('The forecast file did not load, so nothing is shown. Nothing is guessed in its place.', 'Fail ramalan tidak dimuat, jadi tiada apa dipaparkan. Tiada apa diteka sebagai ganti.') + '</p><button type="button" class="fc-btn" data-act="retry">' + T('Try again', 'Cuba lagi') + '</button></div>';
      return;
    }
    if (!S.meta) { root.innerHTML = h + '<div class="fc-card"><p class="fc-text">' + T('Loading…', 'Memuatkan…') + '</p></div>'; return; }
    h += statusCard(S.meta) + dataCard(S.meta) + inputsCard(S.meta) + yearsCard(S.meta) + resultsCard() + areaCard() + limitsCard();
    h += '<a class="fc-btn" href="ecosystem-forecast.html">' + T('Back to the forecast', 'Kembali ke ramalan') + '</a><a class="fc-btn" href="about-the-data.html">' + T('About the data', 'Tentang data') + '</a>';
    root.innerHTML = h;
  }

  function load() {
    if (S.loading) return;
    S.loading = true;
    var meta = fetch(PRED, { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (d) { if (!d || !d.metadata) throw new Error('no metadata'); S.meta = d.metadata; S.failed = false; }).catch(function () { S.failed = true; });
    // The recorded test run is optional: no file, or no run_by, means "not tested yet", never an error.
    var evalRun = fetch(EVAL, { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) { S.evalRun = d; }).catch(function () { S.evalRun = null; });
    Promise.all([meta, evalRun]).then(function () { S.loading = false; if (active) render(); });
  }

  var active = false;
  window.PageInit = window.PageInit || {};
  PageInit[PAGE] = function () { buildShell(); };
  document.addEventListener('roomforboth:pageshow', function (e) {
    active = !!(e.detail && e.detail.page === PAGE);
    if (!active) return;
    buildShell();
    render();
    if (!S.meta && !S.failed) load();
  });
  new MutationObserver(function () { if (active) render(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
})();
