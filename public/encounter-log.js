/* Encounter log — Epic 2, User Story 2.3 (Iteration 3). Figma: Plan 12 (empty), Plan 13 (new entry), Plan 14 (pattern).
 *
 * AC 2.3.1  six fixed-option questions and one optional short note; no photo, address, name or contact
 * AC 2.3.2  saved in this browser only; export and delete-all offered; the empty state says there is no account
 * AC 2.3.3  with three or more entries: counts by animal, time of day and place, and a chart of the entries over time
 * AC 2.3.4  with three or more entries: the plan row matching the most frequent logged place moves to the top,
 *           a line says which row moved and why, and the original order is available on request
 *
 * Nothing here makes a network request. The log is a plain JSON array in localStorage (key below):
 * animal, date, time band, place, what it did, what the resident did, note. Nothing else is recorded.
 * If the browser refuses storage, the log lives in memory for this tab and says so.
 *
 * Styling reuses the shared cm-* classes from community.css (chips, cards, buttons).
 */
(function () {
  'use strict';

  var KEY = 'roomForBoth.encounterLog';
  var NOTE_MAX = 140;
  var MIN_FOR_PATTERN = 3;
  var P_LOG = 'plan-log', P_NEW = 'plan-log-new';
  var SNAPSHOT_KEY = 'roomForBoth.currentPlanSnapshot';

  var ANIMALS = [
    { id: 'macaque', en: 'Long-tailed macaque', bm: 'Kera ekor panjang' },
    { id: 'monitor', en: 'Water monitor', bm: 'Biawak air' },
    { id: 'boar', en: 'Wild boar', bm: 'Babi hutan' },
    { id: 'crow', en: 'House crow', bm: 'Gagak rumah' },
    { id: 'myna', en: 'Common myna', bm: 'Gembala kerbau' },
    { id: 'snake', en: 'A snake', bm: 'Seekor ular' },
    { id: 'unsure', en: 'Not sure', bm: 'Tidak pasti' }
  ];
  var WHEN = [
    { id: 'today', en: 'Today', bm: 'Hari ini' },
    { id: 'yesterday', en: 'Yesterday', bm: 'Semalam' },
    { id: 'week', en: 'Earlier this week', bm: 'Awal minggu ini' },
    { id: 'pick', en: 'Pick a date', bm: 'Pilih tarikh' }
  ];
  var TIME = [
    { id: 'early-morning', en: 'Early morning', bm: 'Awal pagi' },
    { id: 'late-morning', en: 'Late morning', bm: 'Lewat pagi' },
    { id: 'midday', en: 'Midday', bm: 'Tengah hari' },
    { id: 'afternoon', en: 'Afternoon', bm: 'Petang' },
    { id: 'evening', en: 'Evening', bm: 'Senja' },
    { id: 'night', en: 'Night', bm: 'Malam' }
  ];
  var PLACE = [
    { id: 'fruit-tree', en: 'Fruit tree', bm: 'Pokok buah' },
    { id: 'bins', en: 'Bins', bm: 'Tong sampah' },
    { id: 'kitchen', en: 'Kitchen', bm: 'Dapur' },
    { id: 'roof', en: 'Roof', bm: 'Bumbung' },
    { id: 'garden', en: 'Garden', bm: 'Taman' },
    { id: 'drain', en: 'Drain', bm: 'Longkang' },
    { id: 'balcony', en: 'Balcony', bm: 'Balkoni' },
    { id: 'other', en: 'Other', bm: 'Lain-lain' }
  ];
  var DID = [
    { id: 'took-food', en: 'Took food', bm: 'Mengambil makanan' },
    { id: 'came-inside', en: 'Came inside', bm: 'Masuk ke dalam' },
    { id: 'damaged', en: 'Damaged something', bm: 'Merosakkan sesuatu' },
    { id: 'passed-through', en: 'Passed through', bm: 'Lalu sahaja' },
    { id: 'stayed-nearby', en: 'Stayed nearby', bm: 'Kekal berdekatan' }
  ];
  var RESP = [
    { id: 'nothing', en: 'Nothing', bm: 'Tiada' },
    { id: 'noise', en: 'Made noise from a distance', bm: 'Membuat bising dari jauh' },
    { id: 'closed', en: 'Closed doors and windows', bm: 'Menutup pintu dan tingkap' },
    { id: 'responder', en: 'Called a responder', bm: 'Menghubungi responden' }
  ];
  // Which cause group of the prevention plan answers a place on the property (AC 2.3.4: "matches the most
  // frequent logged place"). A mapping the team can change in one place; "other" matches nothing.
  var PLACE_CAUSE = {
    'fruit-tree': 'fruit-trees', 'bins': 'food-waste-and-bins', 'kitchen': 'food-waste-and-bins',
    'roof': 'clutter-and-shelter', 'garden': 'clutter-and-shelter', 'drain': 'clutter-and-shelter', 'balcony': 'open-doors-windows'
  };
  var MONTHS = { en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], bm: ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogo', 'Sep', 'Okt', 'Nov', 'Dis'] };

  // ---------------------------------------------------------------- helpers
  function lang() { return document.documentElement.getAttribute('lang') === 'bm' ? 'bm' : 'en'; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function T(en, bm) { return '<span data-en="">' + en + '</span><span data-bm="">' + (bm == null ? en : bm) + '</span>'; }
  function TE(en, bm) { return T(esc(en), esc(bm == null ? en : bm)); }
  function opt(list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; }
  function lab(list, id) { var o = opt(list, id); return o ? TE(o.en, o.bm) : esc(id); }
  function labLow(list, id) { var o = opt(list, id); return o ? T(esc(o.en.toLowerCase()), esc(o.bm.toLowerCase())) : esc(id); }
  function labs(list, ids, sep) { return ids.map(function (id) { return lab(list, id); }).join(sep); }
  function labsLow(list, ids) { return ids.map(function (id) { return labLow(list, id); }).join(', '); }
  function pad(n) { return String(n).padStart(2, '0'); }
  function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parse(s) { var m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; }
  function today() { return iso(new Date()); }
  function addDays(s, n) { var d = parse(s); d.setDate(d.getDate() + n); return iso(d); }
  function mondayOf(s) { var d = parse(s); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return iso(d); }
  function dayText(s) { var d = parse(s); return d ? T(d.getDate() + ' ' + MONTHS.en[d.getMonth()], d.getDate() + ' ' + MONTHS.bm[d.getMonth()]) : esc(s); }
  function dayPlain(s) { var d = parse(s); return d ? d.getDate() + ' ' + MONTHS[lang()][d.getMonth()] : s; }
  function norm(v) { return String(v == null ? '' : v).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
  function query() { return new URLSearchParams((window.AppNav && AppNav.currentQuery) || ''); }
  function go(page, params) {
    var q = new URLSearchParams();
    Object.keys(params || {}).forEach(function (k) { if (params[k]) q.set(k, params[k]); });
    AppNav.go(page, q.toString());
  }

  // ---------------------------------------------------------------- storage
  var memory = null; // used only if the browser refuses localStorage
  var FIELDS = { animal: ANIMALS, time: TIME, place: PLACE, did: DID, response: RESP };
  function arr(v) { return Array.isArray(v) ? v : (v ? [v] : []); }
  function fixEntry(e) {
    if (!e || typeof e !== 'object') return null;
    var o = Object.assign({}, e);
    Object.keys(FIELDS).forEach(function (k) { o[k] = arr(o[k]).filter(function (id, i, a) { return opt(FIELDS[k], id) && a.indexOf(id) === i; }); });
    return o;
  }
  function valid(e) {
    return e && typeof e.id === 'string' && parse(e.date) && Object.keys(FIELDS).every(function (k) { return e[k].length > 0; });
  }
  function load() {
    if (memory) return memory.slice();
    try {
      var raw = localStorage.getItem(KEY);
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr.map(fixEntry).filter(valid) : [];
    } catch (e) { memory = memory || []; return memory.slice(); }
  }
  function save(list) {
    if (memory) { memory = list.slice(); return false; }
    try { localStorage.setItem(KEY, JSON.stringify(list)); return true; }
    catch (e) { memory = list.slice(); return false; }
  }
  function storageOk() {
    if (memory) return false;
    try { localStorage.setItem(KEY + '.probe', '1'); localStorage.removeItem(KEY + '.probe'); return true; } catch (e) { return false; }
  }
  function sorted(list) { return list.slice().sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : (a.created < b.created ? 1 : -1); }); }
  function newId() { return 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  // ---------------------------------------------------------------- patterns (AC 2.3.3, 2.3.4)
  function tally(list, field) {
    var c = {};
    list.forEach(function (e) { arr(e[field]).forEach(function (id) { c[id] = (c[id] || 0) + 1; }); });
    return Object.keys(c).map(function (k) { return [k, c[k]]; }).sort(function (a, b) { return b[1] - a[1]; });
  }
  // The most frequent place; a tie goes to the place of the most recent entry among the tied places.
  function topPlace(list) {
    var t = tally(list, 'place');
    if (!t.length) return null;
    var best = t[0][1], tied = t.filter(function (x) { return x[1] === best; }).map(function (x) { return x[0]; });
    if (tied.length === 1) return { id: tied[0], count: best };
    var recent = sorted(list).filter(function (e) { return e.place.some(function (p) { return tied.indexOf(p) !== -1; }); })[0];
    return { id: recent.place.filter(function (p) { return tied.indexOf(p) !== -1; })[0], count: best };
  }

  // ---------------------------------------------------------------- shells
  function buildShell(page) {
    var el = document.getElementById('page-' + page);
    if (!el || el.getAttribute('data-el-built')) return el;
    var src = document.getElementById('page-community-how-review-works');
    var header = src && src.querySelector('header'), footer = src && src.querySelector('footer');
    var prefix = 'community-how-review-works__';
    function fix(node) { return node.outerHTML.split(prefix).join(page + '__'); }
    el.innerHTML = (header ? fix(header) : '') + '<main class="pt-28 pb-24"><div class="cm-wrap" id="' + page + '__content"></div></main>' + (footer ? fix(footer) : '');
    el.setAttribute('data-el-built', '1');
    var toggle = document.getElementById(page + '__mobileNavToggle'), panel = document.getElementById(page + '__mobileNavPanel');
    var iOpen = document.getElementById(page + '__mobileNavIconOpen'), iClose = document.getElementById(page + '__mobileNavIconClose');
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
    var c = document.getElementById(page + '__content');
    c.addEventListener('click', onClick);
    c.addEventListener('input', onInput);
    c.addEventListener('change', onInput);
    return el;
  }
  function content(page) { return document.getElementById(page + '__content'); }
  var ICON_BACK = '<svg fill="none" height="14" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.4" viewBox="0 0 24 24" width="14"><path d="m15 18-6-6 6-6"></path></svg>';
  function hero(backAct, backLabel, eyebrow, title, lead) {
    return '<button type="button" class="cm-back" data-act="' + backAct + '">' + ICON_BACK + '<span>' + backLabel + '</span></button>' +
      '<div class="cm-eyebrow">' + eyebrow + '</div><h1 class="cm-title">' + title + '</h1>' + (lead ? '<p class="cm-lead">' + lead + '</p>' : '');
  }
  var DEVICE_NOTE = '<div class="cm-alert cm-alert--amber cm-alert--plain" style="margin-top:1rem"><b>' + T('On your device only', 'Pada peranti anda sahaja') + '</b>' +
    T('Clearing browser data clears the log. Private browsing keeps nothing after the tab closes. There is no account to recover it from, by design.',
      'Mengosongkan data pelayar mengosongkan log. Pelayaran peribadi tidak menyimpan apa-apa selepas tab ditutup. Tiada akaun untuk memulihkannya, secara reka bentuk.') + '</div>';

  // ---------------------------------------------------------------- the log page (Plan 12, Plan 14)
  var confirmDelete = false;
  function renderLog() {
    var root = content(P_LOG); if (!root) return;
    var list = sorted(load());
    var n = list.length;
    var h;
    if (!n) {
      h = hero('back-plan', T('Back to my plan', 'Kembali ke pelan saya'), T('Your encounter log', 'Log pertemuan anda'), T('Nothing logged yet', 'Belum ada yang direkodkan'),
        T('Log each visit in under a minute. Entries stay in this browser on this device. They are never uploaded and nothing here reaches Community.',
          'Rekodkan setiap lawatan dalam masa kurang seminit. Catatan kekal dalam pelayar ini pada peranti ini. Ia tidak pernah dimuat naik dan tiada apa di sini sampai ke Komuniti.'));
      h += '<div class="cm-card" style="margin-top:1.2rem"><span class="cm-empty__zero">0</span><h2 class="font-display" style="margin-top:.75rem;font-size:1.25rem;font-weight:800;color:#0b130e">' + T('What a log gives you', 'Apa yang log berikan') + '</h2>' +
        '<ul class="el-bullets"><li>' + T('Which animal, how often, what time of day and where on the property.', 'Haiwan mana, berapa kerap, pada waktu apa dan di mana dalam kawasan rumah.') + '</li>' +
        '<li>' + T('After three entries the plan re-orders itself: the action that matches your most common visit moves to the top.', 'Selepas tiga catatan pelan menyusun semula: tindakan yang sepadan dengan lawatan paling kerap anda dialihkan ke atas.') + '</li>' +
        '<li>' + T('An export as CSV if you want to show it to the management office or a responder.', 'Eksport sebagai CSV jika anda mahu menunjukkannya kepada pejabat pengurusan atau responden.') + '</li></ul></div>';
      h += '<div style="margin-top:1rem"><button type="button" class="cm-btn cm-btn--primary" data-act="new">' + T('Log an encounter', 'Rekod pertemuan') + '</button>' +
        '<button type="button" class="cm-btn cm-btn--ghost" data-act="back-plan">' + T('Back to my plan', 'Kembali ke pelan saya') + '</button></div>' + DEVICE_NOTE;
      root.innerHTML = h; return;
    }
    var first = list.slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; })[0].date;
    h = hero('back-plan', T('Back to my plan', 'Kembali ke pelan saya'), T('Your encounter log', 'Log pertemuan anda'),
      T(n + (n === 1 ? ' encounter' : ' encounters') + ' since ' + esc(dayPlain(first).replace(/^(\d+) (\w+)$/, '$1 $2')), n + ' pertemuan sejak ' + esc(dayPlain(first))),
      T('Entries stay in this browser on this device. They are never uploaded and nothing here reaches Community.', 'Catatan kekal dalam pelayar ini pada peranti ini. Ia tidak pernah dimuat naik dan tiada apa di sini sampai ke Komuniti.'));
    if (!storageOk()) h += '<div class="cm-alert cm-alert--amber cm-alert--plain" style="margin-top:1rem" role="alert"><b>' + T('This browser is not keeping the log', 'Pelayar ini tidak menyimpan log') + '</b>' + T('Entries are held for this tab only and are lost when it closes.', 'Catatan hanya disimpan untuk tab ini dan hilang apabila ia ditutup.') + '</div>';
    if (n >= MIN_FOR_PATTERN) h += patternCard(list);
    else h += '<div class="cm-card" style="margin-top:1.2rem"><p class="cm-text" style="margin:0;font-size:.9375rem;color:#334155">' + T('After three entries the log shows counts by animal, time of day and place, and your plan re-orders itself. You have ' + n + '.', 'Selepas tiga catatan log menunjukkan kiraan mengikut haiwan, waktu dan tempat, dan pelan anda menyusun semula. Anda ada ' + n + '.') + '</p></div>';
    h += '<div class="cm-card" style="margin-top:1rem"><div class="cm-label">' + T('Entries', 'Catatan') + '</div><ul class="el-entries">';
    list.forEach(function (e) {
      h += '<li class="el-entry"><div><div class="el-entry__title">' + labs(ANIMALS, e.animal, ' · ') + '</div><div class="el-entry__meta">' +
        (e.approx ? T('week of ', 'minggu ') : '') + dayText(e.date) + ' · ' + labsLow(TIME, e.time) + ' · ' + labsLow(PLACE, e.place) + ' · ' + labsLow(DID, e.did) + ' · ' + labsLow(RESP, e.response) + '</div>' +
        (e.note ? '<div class="el-entry__note">' + esc(e.note) + '</div>' : '') + '</div><button type="button" class="cm-link" data-act="edit" data-id="' + esc(e.id) + '">' + T('Edit', 'Sunting') + '</button></li>';
    });
    h += '</ul></div>';
    h += '<div style="margin-top:1rem"><button type="button" class="cm-btn cm-btn--primary" data-act="new">' + T('Log another encounter', 'Rekod pertemuan lain') + '</button>' +
      '<div class="el-two"><button type="button" class="cm-btn cm-btn--ghost" data-act="export">' + T('Export CSV', 'Eksport CSV') + '</button>' +
      '<button type="button" class="cm-btn cm-btn--ghost" data-act="delete-all">' + T('Delete all', 'Padam semua') + '</button></div></div>';
    if (confirmDelete) {
      h += '<div class="cm-alert cm-alert--red cm-alert--plain" role="alertdialog" style="margin-top:1rem"><b>' + T('Delete all ' + n + (n === 1 ? ' entry' : ' entries') + ' from this browser?', 'Padam semua ' + n + ' catatan daripada pelayar ini?') + '</b>' +
        T('This cannot be undone. There is no account to recover them from.', 'Ini tidak boleh dibatalkan. Tiada akaun untuk memulihkannya.') +
        '<div class="cm-actions"><button type="button" class="cm-btn cm-btn--sm cm-btn--danger" data-act="delete-confirm">' + T('Delete all', 'Padam semua') + '</button><button type="button" class="cm-btn cm-btn--sm cm-btn--outline" data-act="delete-cancel">' + T('Keep them', 'Simpan') + '</button></div></div>';
    }
    h += '<p class="cm-note cm-note--panel" style="margin-top:1rem">' + T('Delete all asks once, then removes every entry from this browser. Export writes a CSV to your downloads; it is the only way the log leaves the device, and only when you choose it.',
      'Padam semua bertanya sekali, kemudian membuang setiap catatan daripada pelayar ini. Eksport menulis CSV ke muat turun anda; itu satu-satunya cara log meninggalkan peranti, dan hanya apabila anda memilihnya.') + '</p>';
    root.innerHTML = h;
  }

  function patternCard(list) {
    var n = list.length, byA = tally(list, 'animal'), byT = tally(list, 'time'), byP = tally(list, 'place');
    function tiles(t, l) { return '<div class="cm-stats el-tiles">' + t.map(function (x) { return '<div class="cm-stat"><b>' + x[1] + '</b><span>' + labLow(l, x[0]) + '</span></div>'; }).join('') + '</div>'; }
    var h = '<div class="cm-card" style="margin-top:1.2rem"><div class="cm-label cm-label--green">' + T('What the log shows', 'Apa yang ditunjukkan log') + '</div>' +
      '<div class="el-group">' + T('By animal', 'Mengikut haiwan') + '</div>' + tiles(byA, ANIMALS) +
      '<div class="el-group">' + T('By time of day', 'Mengikut waktu') + '</div>' + tiles(byT, TIME) +
      '<div class="el-group">' + T('By place on the property', 'Mengikut tempat dalam kawasan rumah') + '</div>' + tiles(byP, PLACE) +
      '<p class="cm-note" style="margin-top:.7rem">' + T('An entry counts once under every option you ticked.', 'Satu catatan dikira sekali di bawah setiap pilihan yang anda tanda.') + '</p>';
    var tp = topPlace(list);
    var note = reorderSummary(list, tp);
    if (note) h += '<div class="el-green" role="status"><b>' + T('Your plan changed', 'Pelan anda berubah') + '</b>' + note + '</div>';
    h += chart(list) + '</div>';
    return h;
  }
  function chart(list) {
    // A fixed run of days (at least 28) so a few entries never turn into a few huge bars: the window ends today
    // (or on the latest entry if that is later) and starts at least 27 days earlier, or at the first entry.
    var dates = list.map(function (e) { return e.date; }).sort();
    var first = dates[0], latest = dates[dates.length - 1], t = today();
    var b = latest > t ? latest : t;
    var a = addDays(b, -27);
    if (first < a) a = first;
    var span = Math.round((parse(b) - parse(a)) / 86400000) + 1;
    var byWeek = span > 84, counts = {}, keys = [], k;
    list.forEach(function (e) { k = byWeek ? mondayOf(e.date) : e.date; counts[k] = (counts[k] || 0) + 1; });
    for (var d = byWeek ? mondayOf(a) : a; d <= b; d = addDays(d, byWeek ? 7 : 1)) keys.push(d);
    var max = Math.max.apply(null, keys.map(function (x) { return counts[x] || 0; }));
    var bars = keys.map(function (x) {
      var c = counts[x] || 0;
      return '<span class="el-bar' + (c ? ' on' : '') + '" style="' + (c ? 'height:' + Math.round(30 + 70 * c / max) + '%' : '') + '" title="' + esc(dayPlain(x)) + ': ' + c + '"></span>';
    }).join('');
    return '<div class="el-chart" style="grid-template-columns:repeat(' + keys.length + ',1fr)" role="img" aria-label="' + esc(lang() === 'bm' ? 'Catatan anda mengikut ' + (byWeek ? 'minggu' : 'hari') : 'Your entries by ' + (byWeek ? 'week' : 'day')) + '">' + bars + '</div>' +
      '<p class="cm-note" style="margin-top:.5rem">' + T('Entries by ' + (byWeek ? 'week' : 'day') + ', ' + esc(dayPlain(a)) + ' to ' + esc(dayPlain(b)) + '. Not a chart of animals, a chart of your entries.',
        'Catatan mengikut ' + (byWeek ? 'minggu' : 'hari') + ', ' + esc(dayPlain(a)) + ' hingga ' + esc(dayPlain(b)) + '. Bukan carta haiwan, carta catatan anda.') + '</p>';
  }

  // ---------------------------------------------------------------- plan re-order (AC 2.3.4)
  var lastActions = null;
  function planActions() {
    if (lastActions && lastActions.length) return lastActions;
    try { var s = JSON.parse(sessionStorage.getItem(SNAPSHOT_KEY) || 'null'); if (s && Array.isArray(s.actions)) return s.actions; } catch (e) {}
    return null;
  }
  function pick(list) {
    var tp = topPlace(list);
    if (!tp || list.length < MIN_FOR_PATTERN) return null;
    var cause = PLACE_CAUSE[tp.id];
    if (!cause) return { place: tp, cause: null, action: null };
    var acts = planActions() || [];
    var idx = -1;
    for (var i = 0; i < acts.length; i++) if (norm(acts[i].cause_group) === cause && acts[i].prevention_id != null) { idx = i; break; }
    return { place: tp, cause: cause, action: idx >= 0 ? acts[idx] : null, index: idx };
  }
  function actionText(a) { return String((a && (a.action_text || a.action_text_en || a.action_text_ms)) || '').replace(/\s+/g, ' ').trim(); }
  function reorderSummary(list, tp) {
    var p = pick(list); if (!p || !p.cause) return '';
    var k = p.place.count, n = list.length;
    if (p.action) {
      return T('"' + esc(actionText(p.action)) + '" has moved to the top of your plan. The re-order is explained on the plan page, not silent.', '"' + esc(actionText(p.action)) + '" telah dialihkan ke atas pelan anda. Penyusunan semula dijelaskan pada halaman pelan, bukan senyap.');
    }
    return T(k + ' of your ' + n + ' entries were at the ' + esc(opt(PLACE, p.place.id).en.toLowerCase()) + '. The matching action moves to the top of your plan when you open it.', k + ' daripada ' + n + ' catatan anda di ' + esc(opt(PLACE, p.place.id).bm.toLowerCase()) + '. Tindakan yang sepadan dialihkan ke atas pelan anda apabila anda membukanya.');
  }

  var showOriginal = false, reordering = false, observed = null, obs = null;
  function applyReorder() {
    var host = document.getElementById('plan-result__preventionActions');
    if (!host || reordering) return;
    var rows = Array.prototype.slice.call(host.querySelectorAll('[data-plan-row="database"]'));
    var noteEl = document.getElementById('plan-result__reorderNote');
    if (!noteEl) {
      noteEl = document.createElement('div'); noteEl.id = 'plan-result__reorderNote'; noteEl.className = 'hidden';
      host.parentNode.insertBefore(noteEl, host);
      noteEl.addEventListener('click', function (e) { if (e.target.closest('[data-act="toggle-order"]')) { showOriginal = !showOriginal; applyReorder(); } });
    }
    if (!rows.length) { noteEl.className = 'hidden'; return; }
    reordering = true;
    try {
      rows.forEach(function (r, i) { if (!r.hasAttribute('data-orig')) r.setAttribute('data-orig', String(i)); });
      rows.sort(function (a, b) { return +a.getAttribute('data-orig') - +b.getAttribute('data-orig'); });
      var list = load(), p = pick(list), target = null;
      if (p && p.action) target = rows.filter(function (r) { return r.getAttribute('data-prevention-id') === String(p.action.prevention_id); })[0] || null;
      var order = rows.slice();
      var moved = false;
      if (target && !showOriginal && order[0] !== target) { order.splice(order.indexOf(target), 1); order.unshift(target); moved = true; }
      var same = order.every(function (r, i) { return host.children[i] === r; });
      if (!same) order.forEach(function (r) { host.appendChild(r); });
      order.forEach(function (r, i) {
        var t = r.querySelector('.text-forest-950'); if (t) t.textContent = t.textContent.replace(/^\d+\.\s/, (i + 1) + '. ');
      });
      if (target && p) {
        var al = lang(), k = p.place.count, n = list.length, pl = opt(PLACE, p.place.id)[al].toLowerCase(), at = esc(actionText(p.action));
        var already = rows[0] === target;
        var line = showOriginal
          ? (al === 'bm' ? 'Menunjukkan susunan asal mengikut tahap bahaya.' : 'Showing the original order, by harm.')
          : already
            ? (al === 'bm' ? k + ' daripada ' + n + ' catatan anda di ' + pl + '. Tindakan yang sepadan, "' + at + '", sudah berada di atas.' : k + ' of your ' + n + ' logged visits were at the ' + pl + '. The matching action, "' + at + '", is already at the top.')
            : (al === 'bm' ? 'Dialihkan ke atas kerana ' + k + ' daripada ' + n + ' lawatan yang anda catat di ' + pl + ': "' + at + '". Susunan asal mengikut tahap bahaya.' : 'Moved to the top because ' + k + ' of your ' + n + ' logged visits were at the ' + pl + ': "' + at + '". The original order is by harm.');
        noteEl.className = 'mt-4 rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3 text-xs text-emerald-900 leading-relaxed';
        noteEl.innerHTML = '<b>' + (al === 'bm' ? 'Berdasarkan log anda' : 'From your log') + '.</b> ' + line + ' ' +
          (already ? '' : '<button type="button" class="underline font-semibold" data-act="toggle-order">' + (showOriginal ? (al === 'bm' ? 'Tunjuk susunan berdasarkan log' : 'Show the order from my log') : (al === 'bm' ? 'Tunjuk susunan asal' : 'Show the original order')) + '</button>');
      } else {
        noteEl.className = 'hidden'; noteEl.innerHTML = '';
      }
    } finally { if (obs) obs.takeRecords(); reordering = false; }
    if (observed !== host) {
      observed = host;
      obs = new MutationObserver(function () { if (!reordering) applyReorder(); });
      obs.observe(host, { childList: true });
    }
  }
  window.addEventListener('roomforboth:db-plan-ready', function (e) {
    lastActions = (e.detail && e.detail.actions) || null;
    setTimeout(function () { applyReorder(); ensureCard(); }, 0);
  });

  // ---------------------------------------------------------------- entry on the plan page
  function ensureCard() {
    var prevention = document.getElementById('plan-result__preventionActions');
    var anchor = prevention && prevention.closest('.card');
    if (!anchor) return;
    var card = document.getElementById('plan-result__encounterLogCard');
    if (!card) {
      card = document.createElement('div'); card.id = 'plan-result__encounterLogCard'; card.className = 'card mt-6 px-6 py-6 md:px-7';
      anchor.parentNode.insertBefore(card, anchor.nextSibling);
      card.addEventListener('click', function (e) { if (e.target.closest('[data-act="open-log"]')) go(P_LOG); if (e.target.closest('[data-act="new-from-plan"]')) go(P_NEW); });
    }
    var n = load().length;
    card.innerHTML = '<div class="flex items-start justify-between gap-4"><h2 class="font-display font-bold text-forest-950">' + T('Your encounter log', 'Log pertemuan anda') + '</h2>' +
      '<span class="info-pill info-pill--warn shrink-0">' + T('This device only', 'Peranti ini sahaja') + '</span></div>' +
      '<p class="mt-2 text-xs text-slate-500 leading-relaxed max-w-2xl">' +
      (n ? T('You have logged ' + n + (n === 1 ? ' visit' : ' visits') + ' on this device. ' + (n >= MIN_FOR_PATTERN ? 'Your plan above is ordered using your log.' : 'From three entries your plan re-orders itself.'),
        'Anda telah merekodkan ' + n + ' lawatan pada peranti ini. ' + (n >= MIN_FOR_PATTERN ? 'Pelan di atas disusun menggunakan log anda.' : 'Mulai tiga catatan pelan anda menyusun semula.'))
        : T('Log each animal visit on this device. Nothing is uploaded and nothing reaches Community. From three entries your plan re-orders itself.', 'Rekodkan setiap lawatan haiwan pada peranti ini. Tiada apa dimuat naik dan tiada apa sampai ke Komuniti. Mulai tiga catatan pelan anda menyusun semula.')) + '</p>' +
      '<button type="button" class="mt-5 w-full rounded-full bg-forest-700 hover:bg-forest-600 transition-colors text-white text-sm font-semibold py-3.5" data-act="' + (n ? 'open-log' : 'new-from-plan') + '">' + (n ? T('Open your log', 'Buka log anda') : T('Log an encounter', 'Rekod pertemuan')) + '</button>';
  }

  // ---------------------------------------------------------------- the entry form (Plan 13)
  var F = null;
  function blankForm() { return { id: '', animal: [], whenKind: '', date: '', approx: false, time: [], place: [], did: [], response: [], note: '', err: {} }; }
  function formFromEntry(e) {
    var f = blankForm();
    f.id = e.id; f.animal = e.animal.slice(); f.time = e.time.slice(); f.place = e.place.slice(); f.did = e.did.slice(); f.response = e.response.slice(); f.note = e.note || ''; f.date = e.date; f.approx = !!e.approx;
    f.whenKind = e.approx ? 'week' : e.date === today() ? 'today' : e.date === addDays(today(), -1) ? 'yesterday' : 'pick';
    return f;
  }
  // single: one answer (When). Otherwise any number may be ticked.
  function chips(group, list, val, single) {
    return '<div class="cm-chips" role="group" data-group="' + group + '">' + list.map(function (o) {
      var on = single ? o.id === val : val.indexOf(o.id) !== -1;
      return '<button type="button" class="cm-chip" aria-pressed="' + on + '" data-act="chip" data-group="' + group + '" data-val="' + o.id + '">' + TE(o.en, o.bm) + '</button>';
    }).join('') + '</div>';
  }
  function q(n, title, body, err) {
    return '<div class="cm-q"><div class="cm-q__head"><span class="cm-q__badge">' + n + '</span><span class="cm-q__title">' + title + '</span></div><div style="margin-left:2.1rem;margin-top:.5rem">' + body +
      (err ? '<div class="cm-errmsg" style="margin-left:0" role="alert">' + (err === 2 ? T('Choose one.', 'Pilih satu.') : T('Choose at least one.', 'Pilih sekurang-kurangnya satu.')) + '</div>' : '') + '</div></div>';
  }
  function renderForm() {
    var root = content(P_NEW); if (!root) return;
    if (!F) {
      var id = query().get('id'), found = id && load().filter(function (e) { return e.id === id; })[0];
      F = found ? formFromEntry(found) : blankForm();
    }
    var editing = !!F.id, e = F.err;
    var h = hero('back-log', T('Back to the log', 'Kembali ke log'), T('Your encounter log · ' + (editing ? 'Edit entry' : 'New entry'), 'Log pertemuan anda · ' + (editing ? 'Sunting catatan' : 'Catatan baharu')),
      editing ? T('Edit an encounter', 'Sunting pertemuan') : T('Log an encounter', 'Rekod pertemuan'), T('Six taps. No photos, no address, no names.', 'Enam ketikan. Tiada foto, tiada alamat, tiada nama.'));
    h += '<p class="cm-note cm-note--panel" style="margin-top:1rem">' + T('Tick all that apply to each question, except When.', 'Tanda semua yang berkenaan untuk setiap soalan, kecuali Bila.') + '</p>';
    h += '<div class="cm-card" style="margin-top:1rem">';
    h += q(1, T('Which animal', 'Haiwan mana'), chips('animal', ANIMALS, F.animal), e.animal);
    var pickDate = F.whenKind === 'pick' ? '<div style="margin-top:.6rem"><label class="cm-muted" for="el-date">' + T('Date', 'Tarikh') + '</label> <input id="el-date" type="date" class="cm-input" style="max-width:12rem;display:inline-block;margin-left:.4rem" max="' + today() + '" value="' + esc(F.date) + '" data-field="date"></div>' : '';
    h += q(2, T('When', 'Bila'), chips('when', WHEN, F.whenKind, true) + pickDate, e.when ? 2 : 0);
    h += q(3, T('Time of day', 'Waktu dalam hari'), chips('time', TIME, F.time), e.time);
    h += q(4, T('Where on the property', 'Di mana dalam kawasan rumah'), chips('place', PLACE, F.place), e.place);
    h += q(5, T('What it did', 'Apa yang dilakukannya'), chips('did', DID, F.did), e.did);
    h += q(6, T('What you did', 'Apa yang anda lakukan'), chips('response', RESP, F.response), e.response);
    h += '<div class="cm-q"><label class="cm-q__title" for="el-note" style="display:block;margin-bottom:.4rem">' + T('Anything else (optional, ' + NOTE_MAX + ' characters)', 'Apa-apa lagi (pilihan, ' + NOTE_MAX + ' aksara)') + '</label>' +
      '<textarea id="el-note" class="cm-textarea" maxlength="' + NOTE_MAX + '" data-field="note">' + esc(F.note) + '</textarea><div class="cm-count"><span id="el-count">' + F.note.length + '</span>/' + NOTE_MAX + '</div></div></div>';
    h += '<div style="margin-top:1rem"><button type="button" class="cm-btn cm-btn--primary" data-act="save">' + T('Save to this device', 'Simpan pada peranti ini') + '</button>' +
      '<button type="button" class="cm-btn cm-btn--ghost" data-act="back-log">' + T('Cancel', 'Batal') + '</button></div>';
    h += '<p class="cm-note cm-note--panel" style="margin-top:1rem">' + T('Saved entries are plain text in local storage: animal, date, time band, place, behaviour, your response, note. Nothing else is recorded.',
      'Catatan yang disimpan ialah teks biasa dalam storan setempat: haiwan, tarikh, waktu, tempat, tingkah laku, tindak balas anda, nota. Tiada apa lagi direkodkan.') + '</p>';
    root.innerHTML = h;
  }
  function resolveDate() {
    var t = today();
    if (F.whenKind === 'today') return { date: t, approx: false };
    if (F.whenKind === 'yesterday') return { date: addDays(t, -1), approx: false };
    if (F.whenKind === 'week') return { date: mondayOf(t), approx: true };
    if (F.whenKind === 'pick' && parse(F.date) && F.date <= t) return { date: F.date, approx: false };
    return null;
  }
  function saveForm() {
    var err = {}, d = resolveDate();
    if (!F.animal.length) err.animal = 1;
    if (!d) err.when = 1;
    if (!F.time.length) err.time = 1;
    if (!F.place.length) err.place = 1;
    if (!F.did.length) err.did = 1;
    if (!F.response.length) err.response = 1;
    F.err = err;
    if (Object.keys(err).length) { renderForm(); var el = document.querySelector('#' + P_NEW + '__content .cm-errmsg'); if (el && el.scrollIntoView) el.scrollIntoView({ block: 'center', behavior: 'smooth' }); return; }
    var list = load();
    var entry = { id: F.id || newId(), animal: F.animal.slice(), date: d.date, time: F.time.slice(), place: F.place.slice(), did: F.did.slice(), response: F.response.slice(), note: F.note.trim().slice(0, NOTE_MAX), created: new Date().toISOString() };
    if (d.approx) entry.approx = true;
    if (F.id) { list = list.map(function (e) { return e.id === F.id ? Object.assign(e, entry, { created: e.created }) : e; }); if (!d.approx) list.forEach(function (e) { if (e.id === F.id) delete e.approx; }); }
    else list.push(entry);
    save(list);
    F = null;
    go(P_LOG);
  }

  // ---------------------------------------------------------------- export (AC 2.3.2)
  function csvCell(v) {
    var s = String(v == null ? '' : v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // keep a spreadsheet from running a note as a formula
    return '"' + s.replace(/"/g, '""') + '"';
  }
  function names(list, ids) { return ids.map(function (id) { return opt(list, id).en; }).join('; '); }
  function exportCsv() {
    var rows = [['date', 'week_of', 'animal', 'time_of_day', 'place', 'what_it_did', 'what_i_did', 'note']];
    sorted(load()).reverse().forEach(function (e) {
      rows.push([e.date, e.approx ? 'yes' : '', names(ANIMALS, e.animal), names(TIME, e.time), names(PLACE, e.place), names(DID, e.did), names(RESP, e.response), e.note || '']);
    });
    var blob = new Blob(['﻿' + rows.map(function (r) { return r.map(csvCell).join(','); }).join('\r\n') + '\r\n'], { type: 'text/csv;charset=utf-8' });
    var url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = 'encounter-log-' + today() + '.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  // ---------------------------------------------------------------- events
  function onClick(e) {
    var el = e.target.closest('[data-act]'); if (!el) return;
    var act = el.getAttribute('data-act');
    switch (act) {
      case 'back-plan': go('plan-result'); break;
      case 'back-log': F = null; go(P_LOG); break;
      case 'new': F = null; go(P_NEW); break;
      case 'edit': F = null; go(P_NEW, { id: el.getAttribute('data-id') }); break;
      case 'export': exportCsv(); break;
      case 'delete-all': confirmDelete = true; renderLog(); break;
      case 'delete-cancel': confirmDelete = false; renderLog(); break;
      case 'delete-confirm': save([]); try { localStorage.removeItem(KEY); } catch (x) {} memory = memory ? [] : null; confirmDelete = false; renderLog(); break;
      case 'chip': {
        var g = el.getAttribute('data-group'), v = el.getAttribute('data-val');
        if (g === 'when') { F.whenKind = v; delete F.err.when; if (v !== 'pick') F.date = ''; }
        else {
          var cur = F[g], at = cur.indexOf(v);
          if (at !== -1) cur.splice(at, 1);
          else if (v === 'unsure' || v === 'nothing') F[g] = [v];          // "Not sure" and "Nothing" are answers on their own
          else { cur.push(v); F[g] = cur.filter(function (x) { return x !== 'unsure' && x !== 'nothing'; }); }
          delete F.err[g];
        }
        renderForm(); break;
      }
      case 'save': saveForm(); break;
    }
  }
  function onInput(e) {
    var t = e.target, f = t.getAttribute && t.getAttribute('data-field');
    if (f === 'note' && F) { F.note = t.value.slice(0, NOTE_MAX); var c = document.getElementById('el-count'); if (c) c.textContent = F.note.length; }
    if (f === 'date' && F) { F.date = t.value; delete F.err.when; }
  }

  // ---------------------------------------------------------------- wiring
  window.PageInit = window.PageInit || {};
  [P_LOG, P_NEW].forEach(function (p) { PageInit[p] = function () { buildShell(p); }; });
  var current = '';
  document.addEventListener('roomforboth:pageshow', function (e) {
    var page = e.detail && e.detail.page;
    current = (page === P_LOG || page === P_NEW) ? page : '';
    if (page !== P_NEW) F = null;
    if (page !== P_LOG) confirmDelete = false;
    if (page === 'plan-result') { ensureCard(); setTimeout(function () { ensureCard(); applyReorder(); }, 150); }
    if (!current) return;
    buildShell(current);
    if (current === P_LOG) renderLog(); else renderForm();
    window.scrollTo(0, 0);
  });
  new MutationObserver(function () { if (current === P_LOG) renderLog(); else if (current === P_NEW) renderForm(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
})();
