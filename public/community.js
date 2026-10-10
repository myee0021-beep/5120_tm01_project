/* Community section — Epic 5, Iteration 3 (front end).
 *
 * Pages (all are <section class="app-page"> containers declared in index0914.html;
 * this file fills them on first show, so the big HTML file stays untouched otherwise):
 *   community           district list + filters           AC 5.2.1   Figma Community 01-03
 *   community-report    one reviewed report               AC 5.2.1   Figma Community 04
 *   community-share     three-step share form             AC 5.3.1   Figma Community 05-07, 10
 *   community-sent      sent for review                   AC 5.3.1   Figma Community 08
 *   community-review    review queue, team only           AC 5.6.1   Figma Community 11-12
 *
 * AI 3 "Report from your words" (AC 5.4.1) is the sentence box at the top of step 1. It can fill every option on the form
 * (what, kind, when, time of day, what it did, what worked) but never the state and district, which the resident chooses. It asks
 * CommunityAPI.parse (or POST /api/community/parse) for option ids, keeps only ids that exist
 * in DID and WORKED, leaves the rest blank, and never stores or submits the sentence.
 *
 * DATA LAYER. Everything goes through `CommunityAPI`. Until the Worker routes exist this
 * file uses the in-memory MockAPI below. To switch to the real routes, define
 * `window.CommunityAPI` (same method names, each returning a Promise) before this
 * script loads. Nothing here writes to localStorage or sessionStorage except reading the
 * state chosen on Home; the draft, the photo and the reviewer key live in memory only.
 *
 *   listPublished({state,district})    -> Report[]            GET  /api/community/reports
 *   getReport(id)                      -> Report|null         GET  /api/community/reports/:id
 *   submit(report, photoBlob|null)     -> {ref}               POST /api/community/reports
 *   verifyKey(key)                     -> boolean             POST /api/community/review/session
 *   listQueue(key)                     -> Report[] (all statuses)
 *   decide(key, id, decision, reason)  -> Report              POST /api/community/review/:id
 *   listLog(key)                       -> LogRow[]
 *   parse(sentence)                    -> {species?, kind?, when?, time?, did?:[], worked?:[], blank_reasons?:{field:[en,bm]}}
 *                                         every value is an option id of the form; anything not stated is left out
 *                                                         POST /api/community/parse  (AI 3, AC 5.4.1)
 *   stateRecordSummary(state)          -> {total, top, topCount}|null   (from the occurrence data)
 */
(function () {
  'use strict';

  // ---------------------------------------------------------------- constants
  var PAGES = ['community', 'community-report', 'community-share', 'community-sent', 'community-review'];
  var NOTE_MAX = 140;
  var SNAKE_TERMS = /(\bsnakes?\b|\bular\b|\bsawa\b|\btedung\b|\bsenduk\b|\bpython\b|\bcobra\b|\bviper\b|\bkrait\b|\bkingcobra\b)/i; // placeholder for the is_snake table
  var AI_MAX = 300;          // characters of the one sentence
  var AI_TIMEOUT_MS = 8000;  // as AC 6.3.2: never leave the resident waiting
  var PHOTO_MAX_BYTES = 5 * 1024 * 1024;
  var HOLD_DAYS = 15; // AC 5.6.1 and AC 5.1.1: the stated period, D49 (15 days); also shown on How review works
  var PAGE_SIZE = 4;

  var STATES = [
    ['johor', 'Johor'], ['kedah', 'Kedah'], ['kelantan', 'Kelantan'], ['melaka', 'Melaka'],
    ['negeri-sembilan', 'Negeri Sembilan'], ['pahang', 'Pahang'], ['perak', 'Perak'], ['perlis', 'Perlis'],
    ['penang', 'Pulau Pinang'], ['sabah', 'Sabah'], ['sarawak', 'Sarawak'], ['selangor', 'Selangor'],
    ['terengganu', 'Terengganu'], ['kl', 'W.P. Kuala Lumpur'], ['labuan', 'W.P. Labuan'], ['putrajaya', 'W.P. Putrajaya']
  ];
  var DISTRICTS = {
    'johor': ['Batu Pahat', 'Johor Bahru', 'Kluang', 'Kota Tinggi', 'Kulai', 'Ledang', 'Mersing', 'Muar', 'Pontian', 'Segamat', 'Tangkak'],
    'kedah': ['Baling', 'Bandar Baharu', 'Kota Setar', 'Kuala Muda', 'Kubang Pasu', 'Kulim', 'Langkawi', 'Padang Terap', 'Pendang', 'Pokok Sena', 'Sik', 'Yan'],
    'kelantan': ['Bachok', 'Gua Musang', 'Jeli', 'Kota Bharu', 'Kuala Krai', 'Lojing', 'Machang', 'Pasir Mas', 'Pasir Puteh', 'Tanah Merah', 'Tumpat'],
    'melaka': ['Alor Gajah', 'Jasin', 'Melaka Tengah'],
    'negeri-sembilan': ['Jelebu', 'Jempol', 'Kuala Pilah', 'Port Dickson', 'Rembau', 'Seremban', 'Tampin'],
    'pahang': ['Bentong', 'Bera', 'Cameron Highlands', 'Jerantut', 'Kuantan', 'Lipis', 'Maran', 'Pekan', 'Raub', 'Rompin', 'Temerloh'],
    'perak': ['Bagan Datuk', 'Batang Padang', 'Hilir Perak', 'Hulu Perak', 'Kampar', 'Kerian', 'Kinta', 'Kuala Kangsar', 'Larut, Matang dan Selama', 'Manjung', 'Muallim', 'Perak Tengah'],
    'perlis': ['Arau', 'Kangar', 'Padang Besar'],
    'penang': ['Barat Daya', 'Seberang Perai Selatan', 'Seberang Perai Tengah', 'Seberang Perai Utara', 'Timur Laut'],
    'sabah': ['Beaufort', 'Beluran', 'Keningau', 'Kinabatangan', 'Kota Belud', 'Kota Kinabalu', 'Kota Marudu', 'Kuala Penyu', 'Kudat', 'Kunak', 'Lahad Datu', 'Nabawan', 'Papar', 'Penampang', 'Pitas', 'Putatan', 'Ranau', 'Sandakan', 'Semporna', 'Sipitang', 'Tambunan', 'Tawau', 'Telupid', 'Tenom', 'Tongod'],
    'sarawak': ['Bintulu', 'Betong', 'Kapit', 'Kuching', 'Lawas', 'Limbang', 'Miri', 'Mukah', 'Samarahan', 'Sarikei', 'Serian', 'Sibu', 'Sri Aman'],
    'selangor': ['Gombak', 'Hulu Langat', 'Hulu Selangor', 'Klang', 'Kuala Langat', 'Kuala Selangor', 'Petaling', 'Sabak Bernam', 'Sepang'],
    'terengganu': ['Besut', 'Dungun', 'Hulu Terengganu', 'Kemaman', 'Kuala Nerus', 'Kuala Terengganu', 'Marang', 'Setiu'],
    'kl': ['Kuala Lumpur'],
    'labuan': ['Labuan'],
    'putrajaya': ['Putrajaya']
  };

  // id, English, Malay (Malay lines are marked for review by a Malay speaker on the review sheet)
  var SPECIES = [
    { id: 'macaque', en: 'Long-tailed macaque', bm: 'Monyet ekor panjang', tag: ['Long-tailed macaque', 'Monyet ekor panjang'] },
    { id: 'wild-boar', en: 'Wild boar', bm: 'Babi hutan', tag: ['Wild boar', 'Babi hutan'] },
    { id: 'water-monitor', en: 'Water monitor', bm: 'Biawak air', tag: ['Water monitor', 'Biawak air'] },
    { id: 'house-crow', en: 'House crow', bm: 'Gagak rumah', tag: ['House crow', 'Gagak rumah'] },
    { id: 'common-myna', en: 'Common myna', bm: 'Gembala kerbau', tag: ['Common myna', 'Gembala kerbau'] },
    { id: 'snake', en: 'A snake', bm: 'Seekor ular', tag: ['Snake', 'Ular'] },
    { id: 'not-sure', en: 'Not sure', bm: 'Tidak pasti', tag: ['Not sure', 'Tidak pasti'] }
  ];
  var INVASIVE_CHECK_CODE = { macaque: 'macaque', 'wild-boar': 'boar', 'water-monitor': 'monitor', 'house-crow': 'crow', 'common-myna': 'myna', snake: 'snake' };
  var INVASIVE_SPECIES = ['house-crow', 'common-myna']; // the two listed as introduced in GRIIS Malaysia
  var KINDS = [
    { id: 'turned-up', en: 'What turned up', bm: 'Apa yang muncul' },
    { id: 'worked', en: 'What worked', bm: 'Apa yang berkesan' },
    { id: 'invasive', en: 'Invasive sighting', bm: 'Penampakan invasif' }
  ];
  var WHEN = [
    { id: 'this-week', en: 'This week', bm: 'Minggu ini' },
    { id: 'last-week', en: 'Last week', bm: 'Minggu lepas' },
    { id: 'earlier-month', en: 'Earlier this month', bm: 'Awal bulan ini' },
    { id: 'longer-ago', en: 'Longer ago', bm: 'Lebih lama dahulu' }
  ];
  var TIME = [
    { id: 'early-morning', en: 'Early morning', bm: 'Awal pagi' },
    { id: 'late-morning', en: 'Late morning', bm: 'Lewat pagi' },
    { id: 'midday', en: 'Midday', bm: 'Tengah hari' },
    { id: 'afternoon', en: 'Afternoon', bm: 'Petang' },
    { id: 'evening', en: 'Evening', bm: 'Senja' },
    { id: 'night', en: 'Night', bm: 'Malam' }
  ];
  var DID = [
    { id: 'took-food', en: 'Took food', bm: 'Mengambil makanan' },
    { id: 'came-inside', en: 'Came inside', bm: 'Masuk ke dalam rumah' },
    { id: 'onto-roof', en: 'Onto the roof', bm: 'Naik ke bumbung' },
    { id: 'damaged', en: 'Damaged something', bm: 'Merosakkan sesuatu' },
    { id: 'passed-through', en: 'Passed through', bm: 'Lalu sahaja' },
    { id: 'stayed-nearby', en: 'Stayed nearby', bm: 'Kekal berdekatan' }
  ];
  // Mirrors the prevention_action table so every "what worked" maps to a sourced Plan row.
  var WORKED = [
    { id: 'latching-lid', en: 'Latching bin lid', bm: 'Penutup tong berkunci', plan: ['Use a bin with a latching lid', 'Gunakan tong sampah dengan penutup berkunci'] },
    { id: 'picked-fruit', en: 'Picked fruit early', bm: 'Memetik buah awal', plan: ['Harvest ripe fruit early', 'Tuai buah masak lebih awal'] },
    { id: 'screens', en: 'Screens on windows', bm: 'Jaring pada tingkap', plan: ['Screen windows and vents', 'Pasang jaring pada tingkap dan lubang udara'] },
    { id: 'cleared-undergrowth', en: 'Cleared undergrowth', bm: 'Membersihkan semak', plan: ['Clear undergrowth near the fence', 'Bersihkan semak berhampiran pagar'] },
    { id: 'stopped-feeding', en: 'Stopped feeding', bm: 'Berhenti memberi makan', plan: ['Stop feeding wildlife', 'Berhenti memberi makan hidupan liar'] },
    { id: 'pet-food-indoors', en: 'Kept pet food indoors', bm: 'Simpan makanan haiwan peliharaan di dalam', plan: ['Keep pet food indoors', 'Simpan makanan haiwan peliharaan di dalam rumah'] },
    { id: 'nothing-yet', en: 'Nothing yet', bm: 'Belum ada' }
  ];
  // Fixed list for the reviewer (AC 5.6.1). One is required for every decision.
  var REASONS = [
    { id: 'published', en: 'Published as submitted', bm: 'Diterbitkan seperti dihantar', for: ['publish'] },
    { id: 'personal-detail', en: 'Personal detail in the note', bm: 'Butiran peribadi dalam nota', for: ['hold', 'delete'] },
    { id: 'photo-identifying', en: 'Photo shows a person, a plate or a house', bm: 'Foto menunjukkan orang, plat atau rumah', for: ['hold', 'delete'] },
    { id: 'exact-location', en: 'Exact location given', bm: 'Lokasi tepat diberikan', for: ['hold', 'delete'] },
    { id: 'outside-seven', en: 'Species outside the seven, not a snake', bm: 'Spesies di luar tujuh, bukan ular', for: ['hold', 'delete'] },
    { id: 'harmful-advice', en: 'Advice to trap, poison, feed or relocate', bm: 'Nasihat untuk memerangkap, meracun, memberi makan atau memindahkan', for: ['hold', 'delete'] },
    { id: 'duplicate', en: 'Duplicate of a report already shown', bm: 'Pendua laporan yang telah dipaparkan', for: ['hold', 'delete'] },
    { id: 'abuse', en: 'Abuse or a complaint about a named person', bm: 'Penyalahgunaan atau aduan tentang orang yang dinamakan', for: ['hold', 'delete'] },
    { id: 'test', en: 'Test report from the team', bm: 'Laporan ujian daripada pasukan', for: ['publish', 'hold', 'delete'] }
  ];
  var MONTHS = [
    ['Jan', 'Jan'], ['Feb', 'Feb'], ['Mar', 'Mac'], ['Apr', 'Apr'], ['May', 'Mei'], ['Jun', 'Jun'],
    ['Jul', 'Jul'], ['Aug', 'Ogo'], ['Sep', 'Sep'], ['Oct', 'Okt'], ['Nov', 'Nov'], ['Dec', 'Dis']
  ];

  // ------------------------------------------------------------------ helpers
  function lang() { return document.documentElement.getAttribute('lang') === 'bm' ? 'bm' : 'en'; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  // Site pattern: both languages in the DOM, CSS shows one.
  function T(en, bm) { return '<span data-en="">' + en + '</span><span data-bm="">' + (bm == null ? en : bm) + '</span>'; }
  function TE(en, bm) { return T(esc(en), esc(bm == null ? en : bm)); }
  function opt(list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; }
  function label(list, id) { var o = opt(list, id); return o ? TE(o.en, o.bm) : esc(id); }
  function labelText(list, id) { var o = opt(list, id); return o ? o[lang()] : id; }
  function joinLabels(list, ids) { return ids.map(function (i) { return label(list, i); }).join(' · '); }
  function stateName(key) { for (var i = 0; i < STATES.length; i++) if (STATES[i][0] === key) return STATES[i][1]; return ''; }
  function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
  function districtList(state) { return (DISTRICTS[state] || []).map(function (n) { return [slug(n), n]; }); }
  function districtName(state, key) { var l = districtList(state); for (var i = 0; i < l.length; i++) if (l[i][0] === key) return l[i][1]; return ''; }
  function placeText(state, district) { var d = districtName(state, district), s = stateName(state); return d && s ? d + ', ' + s : (s || ''); }
  function weekOf(iso) { return T('Week of ' + esc(fmtDayEn(iso)), 'Minggu ' + esc(fmtDayBm(iso))); }
  function fmtDayEn(iso) { var d = new Date(iso + 'T00:00:00'); return d.getDate() + ' ' + MONTHS[d.getMonth()][0]; }
  function fmtDayBm(iso) { var d = new Date(iso + 'T00:00:00'); return d.getDate() + ' ' + MONTHS[d.getMonth()][1]; }
  function isoDate(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function addDays(iso, n) { var d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); return isoDate(d); }
  function mondayOf(d) { var x = new Date(d); var day = (x.getDay() + 6) % 7; x.setDate(x.getDate() - day); return isoDate(x); }
  function query() { return new URLSearchParams((window.AppNav && AppNav.currentQuery) || ''); }
  function go(page, params) {
    var q = new URLSearchParams();
    Object.keys(params || {}).forEach(function (k) { if (params[k]) q.set(k, params[k]); });
    AppNav.go(page, q.toString());
  }
  function toast(en, bm) {
    var el = document.createElement('div');
    el.className = 'cm-toast';
    el.setAttribute('role', 'status');
    el.innerHTML = T(esc(en), esc(bm));
    document.body.appendChild(el);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 3200);
  }
  var ICON_BACK = '<svg fill="none" height="14" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.4" viewBox="0 0 24 24" width="14"><path d="m15 18-6-6 6-6"></path></svg>';
  var ICON_TICK = '<svg fill="none" height="14" stroke="#059669" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.6" viewBox="0 0 24 24" width="14"><path d="M20 6 9 17l-5-5"></path></svg>';
  var ICON_TICK_BIG = '<svg fill="none" height="26" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.6" viewBox="0 0 24 24" width="26"><path d="M20 6 9 17l-5-5"></path></svg>';

  // -------------------------------------------------------- note check (AC 5.5.1)
  // The check can only ADD a hold or a warning. It never publishes, approves or clears.
  // Words that are capitalised but are not a person: places, animals, months, agencies, apps.
  var NAME_STOP = null;
  function nameStop() {
    if (NAME_STOP) return NAME_STOP;
    var words = ['Malaysia', 'Perhilitan', 'Bomba', 'Polis', 'Police', 'Jabatan', 'Majlis', 'Council', 'Facebook', 'Whatsapp', 'Instagram', 'Google', 'Grab', 'Emergency', 'Community', 'Plan', 'Ecosystem', 'Room', 'Both', 'English', 'Malay', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu', 'Ahad', 'Hospital', 'School', 'Sekolah', 'Mosque', 'Masjid', 'Market', 'Pasar', 'Park', 'Taman', 'Forest', 'Hutan', 'Reserve', 'Road', 'River', 'Sungai', 'Bukit', 'Pulau', 'Kampung', 'Felda'];
    MONTHS.forEach(function (m) { words.push(m[0], m[1]); });
    STATES.forEach(function (st) { words.push(st[1]); });
    Object.keys(DISTRICTS).forEach(function (k) { DISTRICTS[k].forEach(function (d) { words.push(d); }); });
    SPECIES.forEach(function (sp) { words.push(sp.en, sp.bm); });
    NAME_STOP = {};
    words.forEach(function (w) { String(w).split(/[\s,]+/).forEach(function (p) { if (p) NAME_STOP[p.toLowerCase()] = 1; }); });
    return NAME_STOP;
  }
  function looksLikeName(n) {
    var stop = nameStop(), m, re, w;
    // 1. a title followed by a capitalised word: Mr Tan, Encik Ali, Dr Lim
    re = /\b(?:Mr|Mrs|Ms|Miss|Encik|En|Puan|Pn|Cik|Datuk|Dato|Datin|Dr|Tuan|Haji|Hajjah|Pak|Abang|Kak|Kakak|Cikgu|Ustaz|Ustazah|Pakcik|Makcik)\.?\s+([A-Z][a-z]{2,})/g;
    while ((m = re.exec(n))) if (!stop[m[1].toLowerCase()]) return true;
    // 2. Malay name particles: Ahmad bin Ali, Siti binti Hassan, a/l, a/p
    if (/\b[A-Z][a-z]{2,}\s+(?:bin|binti|a\/l|a\/p)\s+[A-Z][a-z]+/.test(n) || /\b(?:bin|binti|a\/l|a\/p)\s+[A-Z][a-z]+/.test(n)) return true;
    // 3. the resident introducing themselves or someone else: my name is Sara, I am Ali, nama saya Aminah, called Ravi
    re = /\b(?:my name is|nama saya|nama aku|i am|i'm|saya|named|called|bernama|dipanggil)\s+([A-Za-z]{3,})/gi;
    while ((m = re.exec(n))) { w = m[1]; if (/^[A-Z]/.test(w) && !stop[w.toLowerCase()]) return true; if (/^(?:my name is|nama saya|nama aku)$/i.test(m[0].replace(/\s+[A-Za-z]{3,}$/, ''))) return true; }
    // 4. a relative, neighbour or friend followed by a capitalised word: my neighbour Ahmad, jiran saya Ali, friend Lim
    re = /\b(?:neighbou?r|friend|uncle|auntie|aunty|brother|sister|mother|father|mum|mom|dad|wife|husband|son|daughter|landlord|boss|jiran(?: saya)?|kawan|abang|kakak|ayah|ibu|suami|isteri|anak|pakcik|makcik|cikgu)\s+(?:(?:is|called|named|bernama)\s+)?([A-Za-z]{3,})/gi;
    while ((m = re.exec(n))) { w = m[1]; if (/^[A-Z]/.test(w) && !stop[w.toLowerCase()]) return true; }
    // 5. a named person's property: Ahmad's house, Lim's shop
    re = /\b([A-Z][a-z]{2,})'s\s+(?:house|home|shop|car|dog|cat|garden|yard|farm|stall|store|place|fence|gate|flat|unit)\b/g;
    while ((m = re.exec(n))) if (!stop[m[1].toLowerCase()]) return true;
    // 6. two or more capitalised words in a row (a full name), unless they are a place, animal or agency
    re = /\b[A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,})+\b/g;
    while ((m = re.exec(n))) {
      var parts = m[0].split(/\s+/);
      if (!parts.some(function (p) { return stop[p.toLowerCase()]; })) return true;
    }
    return false;
  }
  function noteIssues(note) {
    var n = String(note || '');
    var found = [];
    var phone = /(?:\+?\d[\s-]?){8,}/.test(n);
    if (phone) found.push('phone');
    if (/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/.test(n) || /https?:\/\/|www\./i.test(n) || /(?:^|\s)@[A-Za-z0-9_]{3,}/.test(n)) found.push('contact');
    if (!phone && /\b\d{5}\b/.test(n)) found.push('postcode');
    if (/\b(?:no|nombor|lot|unit|blok|block)\.?\s*#?\s*\d+[a-z]?\b/i.test(n) || /\b\d{1,4}[a-z]?,?\s+(?:jalan|jln|lorong|lrg|persiaran|lebuh|taman|street|st|road|rd|lane|avenue|ave)\b/i.test(n)) found.push('house');
    if (/\b(?:jalan|jln|lorong|lrg|persiaran|lebuhraya|lebuh|street|road|lane|avenue)\s+[a-z0-9]{2,}/i.test(n) ||
        /\b(?:Taman|Kampung|Kg\.?|Bandar|Seksyen|Section|Pangsapuri|Apartment|Condo|Residensi|Flat)\s+[A-Z0-9][A-Za-z0-9]+/.test(n)) found.push('street');
    if (looksLikeName(n)) found.push('name');
    return found;
  }
  var ISSUE_TEXT = {
    phone: ['a telephone number', 'nombor telefon'],
    contact: ['an email address, link or social handle', 'alamat e-mel, pautan atau akaun media sosial'],
    postcode: ['a postcode', 'poskod'],
    house: ['a house number', 'nombor rumah'],
    street: ['a street name', 'nama jalan'],
    name: ['a name', 'nama']
  };

  // ------------------------------------------------------------------- MockAPI
  var MockAPI = (function () {
    var reports = [];
    var log = [];
    var seq = 4000;
    function rep(id, o) {
      var r = {
        id: id, species: o.species, kind: o.kind, state: o.state, district: o.district, week: o.week, time: o.time || '',
        did: o.did || [], worked: o.worked || [], note: o.note || '', photo: false,
        status: o.status || 'published', submitted: o.submitted || o.week, decidedAt: o.decidedAt || null,
        holdUntil: o.holdUntil || null, reason: o.reason || null
      };
      reports.push(r);
      if (r.status !== 'submitted') log.push({ ref: id, decision: r.status, reason: r.reason || 'published', at: r.decidedAt || r.submitted, role: 'Reviewer' });
      return r;
    }
    var HL = { state: 'selangor', district: 'hulu-langat' };
    function hl(id, o) { o.state = HL.state; o.district = HL.district; o.decidedAt = o.decidedAt || addDays(o.week, 6); return rep(id, o); }
    hl('R-2026-0884', { species: 'macaque', kind: 'turned-up', week: '2026-08-24', time: 'early-morning', did: ['took-food', 'onto-roof'], worked: ['latching-lid', 'picked-fruit'], note: 'Troop of about eight on the roof line at breakfast time, took fruit from the tree by the fence.', reason: 'published' });
    hl('R-2026-0879', { species: 'house-crow', kind: 'invasive', week: '2026-08-17', time: 'evening', did: ['stayed-nearby'], note: 'Twenty or more roosting in the roadside trees every evening, loud from 6 pm.', reason: 'published' });
    hl('R-2026-0868', { species: 'water-monitor', kind: 'turned-up', week: '2026-08-10', time: 'afternoon', did: ['passed-through'], worked: ['pet-food-indoors'], note: 'Large one in the monsoon drain behind the row, most afternoons.', reason: 'published' });
    hl('R-2026-0861', { species: 'wild-boar', kind: 'worked', week: '2026-08-03', time: 'night', did: ['damaged'], worked: ['cleared-undergrowth', 'stopped-feeding'], note: 'Dug up the flower bed twice in a week.', reason: 'published' });
    hl('R-2026-0850', { species: 'common-myna', kind: 'invasive', week: '2026-07-27', time: 'early-morning', did: ['stayed-nearby'], worked: ['screens'], note: 'Pair nesting in the roof vent of the corner shoplot, second year running.', reason: 'published' });
    hl('R-2026-0842', { species: 'macaque', kind: 'turned-up', week: '2026-07-20', time: 'midday', did: ['came-inside', 'took-food'], worked: ['latching-lid'], note: 'Came in through the kitchen window while it was open.', reason: 'published' });
    hl('R-2026-0836', { species: 'house-crow', kind: 'invasive', week: '2026-07-13', time: 'early-morning', did: ['took-food'], worked: ['latching-lid'], note: 'Raiding the open bin behind the food court every morning.', reason: 'published' });
    hl('R-2026-0829', { species: 'macaque', kind: 'turned-up', week: '2026-07-06', time: 'late-morning', did: ['onto-roof'], note: 'Three on the power line near the reserve edge, gone within the hour.', reason: 'published' });
    hl('R-2026-0821', { species: 'water-monitor', kind: 'worked', week: '2026-06-29', time: 'afternoon', did: ['stayed-nearby'], worked: ['cleared-undergrowth'], note: 'Cleared the drain edge; it stopped sunning on our back wall.', reason: 'published' });
    rep('R-2026-0833', { species: 'macaque', kind: 'turned-up', state: 'selangor', district: 'petaling', week: '2026-07-13', time: 'early-morning', did: ['took-food'], note: 'Opened the bin at the end of the lane.', reason: 'published', decidedAt: '2026-07-19' });
    rep('R-2026-0815', { species: 'common-myna', kind: 'invasive', state: 'selangor', district: 'petaling', week: '2026-06-22', time: 'evening', did: ['stayed-nearby'], note: 'Flock roosting above the covered walkway.', reason: 'published', decidedAt: '2026-06-28' });
    // Queue samples (team view): a fresh one, one held for a personal detail, one older.
    rep('R-2026-0912', { species: 'macaque', kind: 'turned-up', state: 'selangor', district: 'hulu-langat', week: '2026-08-24', time: 'early-morning', did: ['took-food'], worked: ['latching-lid', 'picked-fruit'], note: 'Troop of about eight on the roof line at breakfast time, took fruit from the tree by the fence.', status: 'submitted', submitted: '2026-09-12' });
    rep('R-2026-0908', { species: 'house-crow', kind: 'invasive', state: 'selangor', district: 'hulu-langat', week: '2026-08-17', time: 'evening', did: ['stayed-nearby'], note: 'Twenty or more roosting in the roadside trees every evening, loud from 6pm, right in front of No. 14 on our road.', status: 'held', submitted: '2026-09-08', decidedAt: '2026-09-08', holdUntil: addDays('2026-09-08', HOLD_DAYS), reason: 'personal-detail' });
    rep('R-2026-0901', { species: 'water-monitor', kind: 'turned-up', state: 'selangor', district: 'petaling', week: '2026-08-10', time: 'afternoon', did: ['passed-through'], worked: ['pet-food-indoors'], note: 'Large one in the monsoon drain behind the row, most afternoons.', status: 'submitted', submitted: '2026-09-01' });
    rep('R-2026-0915', { species: 'common-myna', kind: 'turned-up', state: 'selangor', district: 'petaling', week: '2026-09-07', time: 'early-morning', did: ['stayed-nearby'], note: 'Nesting under the eaves of the shoplot row.', status: 'submitted', submitted: '2026-09-13' });

    // Generated sample data so every district can be opened and the layout checked.
    // Perlis stays empty on purpose (empty state) and about one district in nine is empty too.
    (function seedRest() {
      var POOL = {
        'macaque': { notes: ['Troop crossing the roof line mid-morning.', 'Raided the fruit tree behind the house.', 'Came to the back door when it was left open.', 'A mother with a baby on the power line.', 'Opened the rubbish bin at the end of the lane.'], did: [['took-food'], ['onto-roof', 'took-food'], ['came-inside'], ['passed-through']], worked: [['latching-lid'], ['picked-fruit'], ['screens'], []] },
        'wild-boar': { notes: ['Rooted up the lawn near the fence overnight.', 'Family of five crossing the road at night.', 'Dug under the vegetable bed twice this week.'], did: [['damaged'], ['passed-through'], ['stayed-nearby', 'damaged']], worked: [['cleared-undergrowth'], ['stopped-feeding'], []] },
        'water-monitor': { notes: ['Large one sunning on the drain wall.', 'Swam along the canal behind the row.', 'Seen near the chicken coop in the afternoon.'], did: [['passed-through'], ['stayed-nearby'], ['took-food']], worked: [['pet-food-indoors'], ['cleared-undergrowth'], []] },
        'house-crow': { notes: ['Large flock roosting in the roadside trees.', 'Raiding open bins behind the food stalls.', 'Noisy at dawn on the roof of the shoplots.'], did: [['stayed-nearby'], ['took-food']], worked: [['latching-lid'], []] },
        'common-myna': { notes: ['Nesting in the roof vent again this season.', 'Flock gathering at the market car park.', 'Pair nesting under the eaves.'], did: [['stayed-nearby'], ['took-food']], worked: [['screens'], []] },
        'snake': { notes: ['Seen in the drain after heavy rain.', 'Found near the back steps in the evening.'], did: [['passed-through'], ['stayed-nearby']], worked: [[]] },
        'not-sure': { notes: ['Heard something large in the undergrowth at night.', 'Saw a shape on the fence, could not tell what it was.'], did: [['passed-through']], worked: [[]] }
      };
      var SP = ['macaque', 'macaque', 'wild-boar', 'water-monitor', 'house-crow', 'common-myna', 'snake', 'not-sure'];
      var TIMES = ['early-morning', 'late-morning', 'midday', 'afternoon', 'evening', 'night'];
      function hash(str) { var h = 2166136261; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
      function rng(seed) { return function () { seed = (seed + 0x6D2B79F5) >>> 0; var t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
      var n = 0;
      Object.keys(DISTRICTS).forEach(function (state) {
        if (state === 'perlis') return;
        DISTRICTS[state].forEach(function (dn) {
          var dk = slug(dn);
          if (state === 'selangor' && (dk === 'hulu-langat' || dk === 'petaling')) return;
          var r = rng(hash(state + '/' + dk));
          if (r() < 0.11) return; // leave some districts empty
          var count = 1 + Math.floor(r() * 7);
          var day = '2026-09-21';
          for (var i = 0; i < count; i++) {
            var sp = SP[Math.floor(r() * SP.length)];
            var p = POOL[sp];
            var did = p.did[Math.floor(r() * p.did.length)];
            var worked = p.worked[Math.floor(r() * p.worked.length)];
            var kind = INVASIVE_SPECIES.indexOf(sp) !== -1 && r() < 0.6 ? 'invasive' : (worked.length && r() < 0.5 ? 'worked' : 'turned-up');
            day = addDays(day, -(5 + Math.floor(r() * 9)));
            n += 1;
            rep('R-2026-1' + String(n).padStart(3, '0'), { species: sp, kind: kind, state: state, district: dk, week: mondayOf(new Date(day + 'T00:00:00')), time: TIMES[Math.floor(r() * TIMES.length)], did: did, worked: worked, note: r() < 0.8 ? p.notes[Math.floor(r() * p.notes.length)] : '', decidedAt: addDays(day, 5), reason: 'published' });
          }
        });
      });
      // A few more items waiting in the review queue, in different districts.
      [['kelantan', 'kota-bharu', 'house-crow', 'invasive', 'Roosting on the shoplot signboards every evening.'], ['johor', 'johor-bahru', 'macaque', 'turned-up', 'Troop at the playground next to the flats.'], ['sabah', 'kota-kinabalu', 'water-monitor', 'turned-up', 'Seen crossing the road by the drain at dusk.'], ['penang', 'timur-laut', 'common-myna', 'invasive', 'Flock gathering at the hawker centre.']].forEach(function (q, i) {
        rep('R-2026-09' + (30 + i), { species: q[2], kind: q[3], state: q[0], district: q[1], week: '2026-09-14', time: 'evening', did: ['stayed-nearby'], note: q[4], status: 'submitted', submitted: '2026-09-' + (20 + i) });
      });
    })();

    function delay(v) { return new Promise(function (res) { setTimeout(function () { res(v); }, 120); }); }
    function clone(o) { return JSON.parse(JSON.stringify(o)); }
    function byWeekDesc(a, b) { return a.week < b.week ? 1 : -1; }
    return {
      isMock: true,
      listPublished: function (q) {
        return delay(clone(reports.filter(function (r) {
          return r.status === 'published' && r.state === q.state && r.district === q.district;
        }).sort(byWeekDesc)));
      },
      getReport: function (id) {
        var r = reports.filter(function (x) { return x.id === id && x.status === 'published'; })[0];
        return delay(r ? clone(r) : null);
      },
      submit: function (rep0, photoBlob) {
        seq += 1;
        var id = 'R-2026-' + String(seq).padStart(4, '0');
        var today = isoDate(new Date());
        var held = noteIssues(rep0.note).length > 0; // the check can only add a hold
        var r = {
          id: id, species: rep0.species, kind: rep0.kind, state: rep0.state, district: rep0.district, week: rep0.week, time: rep0.time,
          did: rep0.did.slice(), worked: rep0.worked.slice(), note: rep0.note, photo: !!photoBlob,
          status: held ? 'held' : 'submitted', submitted: today, decidedAt: held ? today : null,
          holdUntil: held ? addDays(today, HOLD_DAYS) : null, reason: held ? 'personal-detail' : null
        };
        reports.push(r);
        if (held) log.push({ ref: id, decision: 'held', reason: 'personal-detail', at: today, role: 'Rule check' });
        return delay({ ref: id });
      },
      verifyKey: function (key) { return delay(!!String(key || '').trim()); }, // real check happens on the server
      listQueue: function () { return delay(clone(reports.slice().sort(function (a, b) { return a.submitted < b.submitted ? 1 : -1; }))); },
      decide: function (key, id, decision, reason) {
        var r = reports.filter(function (x) { return x.id === id; })[0];
        if (!r) return Promise.reject(new Error('not found'));
        var today = isoDate(new Date());
        r.status = decision === 'publish' ? 'published' : decision === 'hold' ? 'held' : 'deleted';
        r.reason = reason;
        r.decidedAt = today;
        r.holdUntil = decision === 'hold' ? addDays(today, HOLD_DAYS) : null;
        if (decision === 'delete') { r.note = ''; r.did = []; r.worked = []; }
        log.push({ ref: id, decision: r.status, reason: reason, at: today, role: 'Reviewer' });
        return delay(clone(r));
      },
      listLog: function () { return delay(clone(log).sort(function (a, b) { return a.at < b.at ? 1 : -1; })); },
      // MOCK ONLY: a keyword stand-in for the language model route, so the page can be used and checked.
      // Like the real route it returns option ids only; anything it is unsure of it leaves out.
      parse: function (sentence) {
        var t = String(sentence || '').toLowerCase();
        var out = { did: [], worked: [], blank_reasons: {} };
        var SPR = [
          ['macaque', /(macaque|monkey|monyet|kera\b)/], ['wild-boar', /(\bboar|\bpig\b|babi)/], ['water-monitor', /(monitor|biawak)/],
          ['house-crow', /(crow|gagak)/], ['common-myna', /(myna|mynah|tiong|gembala)/]
        ];
        var sp = SPR.filter(function (x) { return x[1].test(t); });
        if (sp.length === 1) out.species = sp[0][0]; // two animals named: left for the resident to choose
        else if (sp.length > 1) out.blank_reasons.species = ['more than one animal is named', 'lebih daripada satu haiwan disebut'];
        var WH = [['last-week', /(last week|minggu lepas|minggu lalu)/], ['this-week', /(today|yesterday|this week|tonight|this morning|hari ini|semalam|minggu ini|tadi)/],
          ['earlier-month', /(earlier this month|few weeks ago|awal bulan|beberapa minggu)/], ['longer-ago', /(months? ago|last year|bulan lepas|tahun lepas)/]];
        for (var i = 0; i < WH.length; i++) if (WH[i][1].test(t)) { out.when = WH[i][0]; break; }
        var TM = [['early-morning', /(dawn|sunrise|early morning|breakfast|subuh|awal pagi|7 ?am|6 ?am|5 ?am)/], ['late-morning', /(late morning|10 ?am|11 ?am|lewat pagi)/],
          ['midday', /(midday|noon|lunch|tengah hari|12 ?pm|1 ?pm)/], ['afternoon', /(afternoon|petang|2 ?pm|3 ?pm|4 ?pm)/], ['evening', /(evening|dusk|sunset|senja|maghrib|6 ?pm|7 ?pm)/], ['night', /(night|midnight|malam|dinihari)/]];
        for (var j = 0; j < TM.length; j++) if (TM[j][1].test(t)) { out.time = TM[j][0]; break; }
        var DIDR = {
          'took-food': /(took|stole|raid|ate\b|eating|fruit|food|rubbish|\bbin\b|ambil|makan|curi|buah|sampah)/,
          'came-inside': /(came in|got in|inside|entered|kitchen|masuk|dalam rumah|dapur)/,
          'onto-roof': /(roof|bumbung|atap)/,
          'damaged': /(damag|\bdug\b|destroy|broke|tore|rosak|gali|musnah)/,
          'passed-through': /(passed|crossed|crossing|walked through|ran through|lalu|melintas)/,
          'stayed-nearby': /(stay|nearby|roost|nest|lingered|hung around|kekal|berdekatan|bertenggek)/
        };
        out.did = DID.filter(function (o) { return DIDR[o.id].test(t); }).map(function (o) { return o.id; });
        // Only treat something as "what worked" when the sentence says it worked.
        var cue = /(worked|helped|stopped coming|no more visits|no visits|solved|since we|berkesan|membantu|sejak)/.test(t);
        if (cue) {
          var WR = {
            'latching-lid': /(latch|\blid\b|penutup)/,
            'picked-fruit': /(picked (the )?fruit|harvest|petik)/,
            'screens': /(screen|mesh|jaring)/,
            'cleared-undergrowth': /(cleared (the )?(grass|bush|undergrowth)|semak|rumput)/,
            'stopped-feeding': /(stopped feeding|no longer feed|berhenti memberi)/,
            'pet-food-indoors': /(pet food|pet bowl|makanan kucing|makanan anjing)/
          };
          out.worked = WORKED.filter(function (o) { return WR[o.id] && WR[o.id].test(t); }).map(function (o) { return o.id; });
        }
        if (!out.worked.length && /(shut|closed|close|lock|tutup|kunci)/.test(t) && /(window|door|tingkap|pintu)/.test(t)) {
          out.blank_reasons.worked = ['shutting windows or doors is not one of the options', 'menutup tingkap atau pintu bukan salah satu pilihan'];
        }
        // The kind of report is only filled when the sentence says which: it worked, or it is an invasive sighting.
        if (cue && out.worked.length) out.kind = 'worked';
        else if (/(invasive|pendatang|invasif)/.test(t) && (out.species === 'house-crow' || out.species === 'common-myna')) out.kind = 'invasive';
        else if (out.species && out.did.length) out.kind = 'turned-up';
        return delay(out);
      },
      // TODO: wire to the occurrence data already shipped for the Ecosystem map.
      stateRecordSummary: function (state) {
        if (state === 'perlis') return { total: 402, top: 'common myna', topCount: 375 };
        return null;
      }
    };
  })();
  var API = window.CommunityAPI || MockAPI;

  // ------------------------------------------------------------ page shells
  // The header and footer are cloned from the existing How review works page so the
  // navigation, language toggle and photo background stay identical to the other pages.
  function buildShell(page) {
    var el = document.getElementById('page-' + page);
    if (!el || el.getAttribute('data-cm-built')) return el;
    var src = document.getElementById('page-community-how-review-works');
    var header = src && src.querySelector('header');
    var footer = src && src.querySelector('footer');
    var html = '';
    var prefix = 'community-how-review-works__';
    function fix(node) { return node.outerHTML.split(prefix).join(page + '__'); }
    html += header ? fix(header) : '';
    html += '<main class="pt-28 pb-24"><div class="cm-wrap' + (page === 'community-review' ? ' cm-wrap--wide' : '') + '" id="' + page + '__content"></div></main>';
    html += footer ? fix(footer) : '';
    el.innerHTML = html;
    el.setAttribute('data-cm-built', '1');
    var toggle = document.getElementById(page + '__mobileNavToggle');
    var panel = document.getElementById(page + '__mobileNavPanel');
    var iOpen = document.getElementById(page + '__mobileNavIconOpen');
    var iClose = document.getElementById(page + '__mobileNavIconClose');
    if (toggle && panel) {
      toggle.addEventListener('click', function () {
        var hidden = panel.classList.contains('hidden');
        panel.classList.toggle('hidden');
        if (iOpen) iOpen.classList.toggle('hidden', hidden);
        if (iClose) iClose.classList.toggle('hidden', !hidden);
        toggle.setAttribute('aria-expanded', String(hidden));
      });
    }
    var cur = lang();
    el.querySelectorAll('.lang-toggle button').forEach(function (b) {
      var on = b.getAttribute('data-lang') === cur;
      b.classList.toggle('bg-white', on); b.classList.toggle('text-forest-950', on); b.classList.toggle('text-slate-300', !on);
    });
    var content = document.getElementById(page + '__content');
    content.addEventListener('click', onClick);
    content.addEventListener('change', onChange);
    content.addEventListener('input', onInput);
    content.addEventListener('submit', function (e) { e.preventDefault(); });
    return el;
  }
  function content(page) { return document.getElementById(page + '__content'); }

  // -------------------------------------------------------------- UI pieces
  function hero(opts) {
    return (opts.back ? '<button type="button" class="cm-back" data-act="' + opts.back.act + '"' + (opts.back.data || '') + '>' + ICON_BACK + '<span>' + opts.back.label + '</span></button>' : '') +
      '<div class="cm-eyebrow">' + opts.eyebrow + '</div>' +
      '<h1 class="cm-title">' + opts.title + '</h1>' +
      (opts.lead ? '<p class="cm-lead">' + opts.lead + '</p>' : '');
  }
  function selectHtml(name, options, value, placeholderEn, placeholderBm, extraClass) {
    var h = '<select class="cm-select' + (extraClass ? ' ' + extraClass : '') + '" data-sel="' + name + '" aria-label="' + esc(placeholderEn) + '">';
    h += '<option value=""' + (value ? '' : ' selected') +'>' + esc(lang() === 'bm' ? placeholderBm : placeholderEn) + '</option>';
    options.forEach(function (o) { h += '<option value="' + esc(o[0]) + '"' + (o[0] === value ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; });
    return h + '</select>';
  }
  function stateSelect(name, value) { return selectHtml(name, STATES, value, 'Select state', 'Pilih negeri'); }
  function districtSelect(name, state, value) { return selectHtml(name, districtList(state), value, 'Select district', 'Pilih daerah'); }
  function chips(group, list, selected, multi, role) {
    var sel = Array.isArray(selected) ? selected : [selected];
    return '<div class="cm-chips" role="' + (multi ? 'group' : 'radiogroup') + '" data-group="' + group + '">' + list.map(function (o) {
      var on = sel.indexOf(o.id) !== -1;
      return '<button type="button" class="cm-chip" data-act="chip" data-group="' + group + '" data-val="' + o.id + '" ' +
        (multi ? 'aria-pressed="' + on + '"' : 'role="radio" aria-checked="' + on + '"') + '>' + TE(o.en, o.bm) + '</button>';
    }).join('') + '</div>';
  }
  function reportCardText(r) {
    if (r.note) return esc(r.note);
    return r.did.length ? joinLabels(DID, r.did) : '';
  }
  function speciesTag(id) { var s = opt(SPECIES, id); return '<span class="cm-tag cm-tag--species">' + (s ? TE(s.tag[0], s.tag[1]) : esc(id)) + '</span>'; }
  function kindTag(kind) {
    if (kind === 'invasive') return '<span class="cm-tag cm-tag--invasive">' + label(KINDS, 'invasive') + '</span>';
    return '<span class="cm-tag">' + label(KINDS, kind) + '</span>';
  }
  function reportCard(r) {
    var fix = r.worked.length && r.worked.join() !== 'nothing-yet'
      ? '<div class="cm-report__fix">' + ICON_TICK + '<span>' + joinLabels(WORKED, r.worked.filter(function (w) { return w !== 'nothing-yet'; })) + '</span></div>' : '';
    return '<article class="cm-report">' +
      '<div class="cm-report__top"><div class="cm-report__tags">' + speciesTag(r.species) + kindTag(r.kind) + '</div><span class="cm-report__week">' + weekOf(r.week) + '</span></div>' +
      '<p class="cm-report__text">' + reportCardText(r) + '</p>' + fix +
      '<div class="cm-report__foot"><span>' + esc(districtName(r.state, r.district)) + ' · ' + T('reviewed', 'disemak') + '</span>' +
      '<button type="button" class="cm-link" data-act="open-report" data-id="' + esc(r.id) + '">' + T('Open', 'Buka') + '</button></div></article>';
  }

  // ================================================================== LIST
  var L = { state: '', district: '', kind: 'all', limit: PAGE_SIZE, token: 0 };

  function loadListFromQuery() {
    var q = query();
    var s = q.get('state'), d = q.get('district'), k = q.get('kind');
    if (!s) { try { s = sessionStorage.getItem('roomForBoth.selectedState') || ''; } catch (e) {} }
    L.state = DISTRICTS[s] ? s : '';
    L.district = (L.state && d && districtName(L.state, d)) ? d : '';
    L.kind = (k === 'turned-up' || k === 'worked' || k === 'invasive') ? k : 'all';
    L.limit = PAGE_SIZE;
  }
  function syncListUrl() {
    var q = new URLSearchParams();
    if (L.state) q.set('state', L.state);
    if (L.district) q.set('district', L.district);
    if (L.kind !== 'all') q.set('kind', L.kind);
    var qs = q.toString();
    history.replaceState(null, '', '#community' + (qs ? '?' + qs : ''));
  }
  function renderList() {
    var root = content('community'); if (!root) return;
    var token = ++L.token;
    var title = L.district ? esc(districtName(L.state, L.district) + ', ' + stateName(L.state)) : T('What neighbours report', 'Apa yang dilaporkan jiran');
    var h = hero({
      eyebrow: T('Community · What neighbours report', 'Komuniti · Apa yang dilaporkan jiran'),
      title: title,
      lead: T('Anonymous, district level, structured, and read by a team member before it appears. No names, no addresses, no replies, no votes.',
        'Tanpa nama, peringkat daerah, berstruktur, dan dibaca oleh ahli pasukan sebelum dipaparkan. Tiada nama, tiada alamat, tiada balasan, tiada undian.')
    });
    h += '<div class="cm-selects">' + stateSelect('filterState', L.state) + districtSelect('filterDistrict', L.state, L.district) + '</div>';
    if (L.district) {
      h += '<button type="button" class="cm-btn cm-btn--primary" style="margin-top:.75rem" data-act="share">' + T('Share what you saw', 'Kongsi apa yang anda lihat') + '</button>';
    }
    h += '<div class="cm-tabs" role="group" aria-label="' + esc(lang() === 'bm' ? 'Tapis laporan' : 'Filter reports') + '">' +
      [['all', 'All', 'Semua'], ['turned-up', 'What turned up', 'Apa yang muncul'], ['worked', 'What worked', 'Apa yang berkesan'], ['invasive', 'Invasive sightings', 'Penampakan invasif']].map(function (k) {
        return '<button type="button" class="cm-chip" data-act="kind" data-val="' + k[0] + '" aria-pressed="' + (L.kind === k[0]) + '">' + TE(k[1], k[2]) + '</button>';
      }).join('') + '</div>';
    h += '<div id="community__results" aria-live="polite"></div>';
    root.innerHTML = h;
    var out = document.getElementById('community__results');
    if (!L.district) {
      out.innerHTML = '<div class="cm-card" style="margin-top:1rem"><p class="cm-muted" style="font-size:.875rem">' +
        T('Choose a state and a district to see the reviewed reports for it. Reports are never shown from a neighbouring district.',
          'Pilih negeri dan daerah untuk melihat laporan yang telah disemak. Laporan tidak pernah dipaparkan daripada daerah jiran.') + '</p></div>';
      return;
    }
    out.innerHTML = '<p class="cm-note">' + T('Loading reports…', 'Memuatkan laporan…') + '</p>';
    API.listPublished({ state: L.state, district: L.district }).then(function (all) {
      if (token !== L.token) return;
      out.innerHTML = listResultsHtml(all);
      // An empty district carries its own "Be the first to share" button; drop the duplicate.
      if (!all.length) { var top = root.querySelector(':scope > [data-act="share"]'); if (top) top.remove(); }
    }).catch(function () {
      if (token !== L.token) return;
      out.innerHTML = '<div class="cm-card" style="margin-top:1rem"><p class="cm-muted">' +
        T('The reports did not load. Try again in a moment.', 'Laporan tidak dapat dimuat. Cuba lagi sebentar nanti.') + '</p>' +
        '<button type="button" class="cm-btn cm-btn--ghost" style="margin-top:.75rem" data-act="reload-list">' + T('Try again', 'Cuba lagi') + '</button></div>';
    });
  }
  function topOf(list, getter) {
    var counts = {};
    list.forEach(function (r) { getter(r).forEach(function (v) { counts[v] = (counts[v] || 0) + 1; }); });
    var best = null;
    Object.keys(counts).forEach(function (k) { if (!best || counts[k] > counts[best]) best = k; });
    return best;
  }
  function listResultsHtml(all) {
    var dn = districtName(L.state, L.district);
    if (!all.length) {
      var sum = API.stateRecordSummary ? API.stateRecordSummary(L.state) : null;
      var line = sum
        ? T('Nobody has shared a reviewed report for this district. That says nothing about the animals: ' + esc(stateName(L.state)) + ' has ' + sum.total + ' occurrence records, ' + sum.topCount + ' of them ' + esc(sum.top) + '.',
          'Tiada sesiapa berkongsi laporan yang disemak untuk daerah ini. Itu tidak bermakna tiada haiwan: ' + esc(stateName(L.state)) + ' mempunyai ' + sum.total + ' rekod kejadian, ' + sum.topCount + ' daripadanya ' + esc(sum.top) + '.')
        : T('Nobody has shared a reviewed report for this district. That says nothing about the animals.', 'Tiada sesiapa berkongsi laporan yang disemak untuk daerah ini. Itu tidak bermakna tiada haiwan.');
      return '<div class="cm-card cm-empty" style="margin-top:1rem"><span class="cm-empty__zero">0</span>' +
        '<h2>' + T('No reports yet for ' + esc(dn), 'Belum ada laporan untuk ' + esc(dn)) + '</h2><p>' + line + '</p>' +
        '<button type="button" class="cm-btn cm-btn--primary" data-act="share">' + T('Be the first to share', 'Jadilah yang pertama berkongsi') + '</button>' +
        '<button type="button" class="cm-btn cm-btn--ghost" data-act="open-map">' + T('See what is recorded in ' + esc(stateName(L.state)) + ' (map)', 'Lihat apa yang direkodkan di ' + esc(stateName(L.state)) + ' (peta)') + '</button></div>' +
        '<div class="cm-note"><b style="color:#0b130e">' + T('Empty means empty', 'Kosong bermaksud kosong') + '</b><br>' +
        T('A district with no reports shows this, never a borrowed figure from the state or a neighbour.', 'Daerah tanpa laporan menunjukkan ini, tidak pernah angka yang dipinjam daripada negeri atau jiran.') + '</div>';
    }
    var list = L.kind === 'all' ? all : all.filter(function (r) { return r.kind === L.kind; });
    var h = '';
    if (L.kind === 'all') {
      var topSp = topOf(all, function (r) { return [r.species]; });
      var topFix = topOf(all, function (r) { return r.worked.filter(function (w) { return w !== 'nothing-yet'; }); });
      h += '<div class="cm-stats">' +
        '<div class="cm-stat"><b>' + all.length + '</b><span>' + T('reviewed reports', 'laporan yang disemak') + '</span></div>' +
        '<div class="cm-stat"><b>' + (topSp ? label(SPECIES, topSp) : '–') + '</b><span>' + T('most reported', 'paling banyak dilaporkan') + '</span></div>' +
        '<div class="cm-stat"><b>' + (topFix ? label(WORKED, topFix) : '–') + '</b><span>' + T('most cited fix', 'penyelesaian paling disebut') + '</span></div></div>';
    }
    if (L.kind === 'invasive') {
      h += '<div class="cm-note" style="margin-top:1rem"><b style="color:#0b130e;font-size:.8125rem">' + T('Two species qualify', 'Dua spesies layak') + '</b><br>' +
        T('Only the house crow and common myna are listed as introduced in GRIIS Malaysia among the seven. A sighting of a native species filed as invasive does not pass review.',
          'Hanya gagak rumah dan gembala kerbau disenaraikan sebagai spesies diperkenalkan dalam GRIIS Malaysia daripada tujuh spesies. Penampakan spesies asli yang difailkan sebagai invasif tidak lulus semakan.') + '</div>';
    }
    if (API.isMock) {
      h += '<p class="cm-note cm-note--panel">' + T('Sample reports, written for the prototype to show the layout. Counts on the live site come from reviewed reports only.',
        'Laporan contoh, ditulis untuk prototaip bagi menunjukkan susun atur. Kiraan di tapak sebenar datang daripada laporan yang disemak sahaja.') + '</p>';
    }
    if (!list.length) {
      h += '<div class="cm-card" style="margin-top:1rem"><p class="cm-muted" style="font-size:.875rem">' + T('No reviewed reports of this kind for ' + esc(dn) + '.', 'Tiada laporan jenis ini yang disemak untuk ' + esc(dn) + '.') + '</p></div>';
      return h;
    }
    list.slice(0, L.limit).forEach(function (r) { h += reportCard(r); });
    var more = list.length - L.limit;
    if (more > 0) {
      h += '<div style="text-align:center;margin-top:.9rem"><button type="button" class="cm-link cm-link--float" data-act="more">' + T('Show ' + more + ' more', 'Tunjuk ' + more + ' lagi') + '</button></div>';
    }
    if (L.kind === 'invasive') {
      h += '<p class="cm-note">' + T(list.length + ' of ' + all.length + ' reports. Invasive sightings are shown to the district council contact on the who to call page as a count, never as a list of homes.',
        list.length + ' daripada ' + all.length + ' laporan. Penampakan invasif ditunjukkan kepada hubungan majlis daerah pada halaman siapa untuk dihubungi sebagai kiraan, bukan senarai rumah.') + '</p>';
    }
    h += '<span class="cm-sr" id="community__listdata" data-total="' + all.length + '"></span>';
    return h;
  }

  // ================================================================ REPORT
  function renderReport() {
    var root = content('community-report'); if (!root) return;
    var id = query().get('id') || '';
    root.innerHTML = '<p class="cm-note">' + T('Loading…', 'Memuatkan…') + '</p>';
    API.getReport(id).then(function (r) {
      if (query().get('id') !== id) return;
      if (!r) {
        root.innerHTML = hero({ back: { act: 'back-list', label: T('Back to the list', 'Kembali ke senarai') }, eyebrow: T('Community · Report', 'Komuniti · Laporan'), title: T('Report not found', 'Laporan tidak dijumpai'), lead: T('This report is not published, or the link is out of date.', 'Laporan ini tidak diterbitkan, atau pautan sudah lapuk.') });
        return;
      }
      var place = placeText(r.state, r.district);
      var sp = opt(SPECIES, r.species);
      var title = sp ? T(esc(sp.en) + (r.did.length ? ': ' + esc(r.did.map(function (d) { return opt(DID, d).en.toLowerCase(); }).join(', ')) : ''), esc(sp.bm) + (r.did.length ? ': ' + esc(r.did.map(function (d) { return opt(DID, d).bm.toLowerCase(); }).join(', ')) : '')) : esc(r.species);
      var worked = r.worked.filter(function (w) { return w !== 'nothing-yet'; });
      var h = hero({
        back: { act: 'back-list', label: T('Back to ' + esc(districtName(r.state, r.district)), 'Kembali ke ' + esc(districtName(r.state, r.district))), data: ' data-state="' + r.state + '" data-district="' + r.district + '"' },
        eyebrow: T('Community · Report', 'Komuniti · Laporan'),
        title: title
      });
      var invCode = INVASIVE_CHECK_CODE[r.species];
      // U2-14: a report names an animal, so it links to the "Is it invasive?" check.
      var invLink = invCode ? '<a class="cm-tag" style="text-decoration:underline;text-underline-offset:2px" href="invasive.html?species=' + invCode + '">' + T('Is it invasive? Check', 'Adakah ia invasif? Semak') + ' →</a>' : '';
      h += '<div class="cm-report__tags" style="margin-top:.9rem">' + speciesTag(r.species) + kindTag(r.kind) + invLink + '<span class="cm-tag cm-tag--ok">' + T('Reviewed ' + esc(fmtDayEn(r.decidedAt || r.week) + ' ' + new Date((r.decidedAt || r.week) + 'T00:00:00').getFullYear()), 'Disemak ' + esc(fmtDayBm(r.decidedAt || r.week) + ' ' + new Date((r.decidedAt || r.week) + 'T00:00:00').getFullYear())) + '</span></div>';
      h += '<div class="cm-card" style="margin-top:1rem"><dl style="margin:0">' +
        kv(T('Where', 'Di mana'), esc(place) + ' · ' + T('District only; the form never asks for more.', 'Daerah sahaja; borang tidak pernah meminta lebih.')) +
        kv(T('When', 'Bila'), weekOf(r.week) + (r.time ? ', ' + label(TIME, r.time).toLowerCase() : '')) +
        (r.did.length ? kv(T('What happened', 'Apa yang berlaku'), joinLabels(DID, r.did)) : '') +
        (worked.length ? kv(T('What worked', 'Apa yang berkesan'), joinLabels(WORKED, worked)) : '') +
        (r.note ? kv(T('Note', 'Nota'), esc(r.note)) : '') + '</dl></div>';
      var planRows = worked.map(function (w) { return opt(WORKED, w); }).filter(function (o) { return o && o.plan; });
      if (planRows.length) {
        h += '<div class="cm-card"><div class="cm-label cm-label--green">' + T('Matches your plan', 'Sepadan dengan pelan anda') + '</div>' +
          '<p class="cm-muted" style="margin-top:.5rem;font-size:.875rem;color:#334155">' +
          T(planRows.map(function (o) { return '"' + esc(o.plan[0]) + '"'; }).join(' and ') + (planRows.length > 1 ? ' are' : ' is') + ' in the sourced plan. This report is one neighbour saying it worked; the plan rows carry the source.',
            planRows.map(function (o) { return '"' + esc(o.plan[1]) + '"'; }).join(' dan ') + ' ada dalam pelan bersumber. Laporan ini ialah seorang jiran yang mengatakan ia berkesan; baris pelan membawa sumbernya.') + '</p>' +
          '<a class="cm-btn cm-btn--ghost" style="margin-top:.75rem" href="plan.html">' + T('Open my plan', 'Buka pelan saya') + '</a></div>';
      }
      h += '<div class="cm-report__foot cm-float" style="margin-top:.9rem"><button type="button" class="cm-link cm-link--muted" data-act="flag" data-id="' + esc(r.id) + '">' + T('Report a problem with this report', 'Laporkan masalah dengan laporan ini') + '</button>' +
        '<span>' + T(r.photo ? 'Photo: attached' : 'Photo: none', r.photo ? 'Foto: dilampirkan' : 'Foto: tiada') + '</span></div>';
      root.innerHTML = h;
    });
  }
  function kv(k, v) { return '<div class="cm-kv"><dt>' + k + '</dt><dd>' + v + '</dd></div>'; }

  // ================================================================== SHARE
  var D = null; // the draft; in memory only, discarded when the page is left
  function newDraft() {
    var q = query();
    var s = q.get('state'), d = q.get('district');
    if (!s) { try { s = sessionStorage.getItem('roomForBoth.selectedState') || ''; } catch (e) {} }
    if (!DISTRICTS[s]) s = '';
    if (!(s && d && districtName(s, d))) d = '';
    return { step: 1, species: '', kind: '', state: s, district: d, when: '', time: '', did: [], worked: [], note: '', aiText: '', aiFilled: {}, ai: { state: 'idle' }, aiSkipped: false, photo: null, consent: false, err: {}, noteIssues: [], photoErr: '', sending: false, sendErr: false };
  }
  function discardDraft() {
    if (D && D.photo && D.photo.url) { try { URL.revokeObjectURL(D.photo.url); } catch (e) {} }
    D = null;
  }
  function stepper(step) {
    var items = [['What happened, where and when', 'Apa yang berlaku, di mana dan bila'], ['Review and send', 'Semak dan hantar']];
    if (step === 3) step = 2; // the review page keeps its internal number 3
    var h = '<ol class="cm-steps" style="list-style:none;padding:0" aria-label="' + esc(lang() === 'bm' ? 'Langkah' : 'Steps') + '">';
    items.forEach(function (it, i) {
      var n = i + 1;
      h += '<li class="cm-steps__item' + (n === step ? ' is-active' : n < step ? ' is-done' : '') + '"' + (n === step ? ' aria-current="step"' : '') + '><span class="cm-steps__dot">' + n + '</span><span>' + TE(it[0], it[1]) + '</span></li>';
      if (i < items.length - 1) h += '<li class="cm-steps__line" aria-hidden="true"></li>';
    });
    return h + '</ol>';
  }
  function qHead(n, titleHtml, hintHtml) {
    return '<div class="cm-q"><div class="cm-q__head"><span class="cm-q__badge">' + n + '</span><span class="cm-q__title">' + titleHtml + '</span></div>' + (hintHtml ? '<div class="cm-q__hint">' + hintHtml + '</div>' : '');
  }
  function errMsg(key, en, bm) { return D.err[key] ? '<div class="cm-errmsg" role="alert">' + T(en, bm) + '</div>' : ''; }
  function kindsFor(species) { return KINDS.filter(function (k) { return k.id !== 'invasive' || INVASIVE_SPECIES.indexOf(species) !== -1; }); }

  function renderShare() {
    var root = content('community-share'); if (!root) return;
    if (!D) D = newDraft();
    if (D.step === 1) return renderStep1(root);
    return renderStep3(root);
  }
  function renderStep1(root) {
    var h = hero({
      back: { act: 'cancel-share', label: T('Cancel', 'Batal') },
      eyebrow: T('Community · Share what you saw', 'Komuniti · Kongsi apa yang anda lihat'),
      title: T('What happened, where and when', 'Apa yang berlaku, di mana dan bila')
    });
    h += stepper(1);
    h += '<div class="cm-card cm-ai" style="margin-top:1rem">' + aiBlockHtml() + '</div>';
    h += '<div class="cm-card" style="margin-top:1rem">';
    h += qHead(1, T('What did you see', 'Apa yang anda lihat') + aiMark('species')) + chips('species', SPECIES, D.species, false) + errMsg('species', 'Choose one.', 'Pilih satu.');
    if (D.species === 'snake') {
      h += '<div class="cm-alert cm-alert--red" role="alert"><b>' + T('A snake, now?', 'Seekor ular, sekarang?') + '</b>' +
        T('If it is there now, leave this page and open Emergency. This form is for afterwards.', 'Jika ia ada di situ sekarang, tinggalkan halaman ini dan buka Kecemasan. Borang ini untuk selepas kejadian.') +
        ' <a href="emergency.html" style="font-weight:700;text-decoration:underline">' + T('Open Emergency', 'Buka Kecemasan') + '</a></div>';
    }
    h += '</div>';
    h += qHead(2, T('Kind of report', 'Jenis laporan') + aiMark('kind'),
      D.species === 'snake' ? T('Invasive sighting is not offered: both snakes the site covers are native.', 'Penampakan invasif tidak ditawarkan: kedua-dua ular yang dilindungi tapak ini adalah asli.')
        : T('Invasive sighting is only offered for the house crow and common myna.', 'Penampakan invasif hanya ditawarkan untuk gagak rumah dan gembala kerbau.')) +
      chips('kind', kindsFor(D.species), D.kind, false) + errMsg('kind', 'Choose one.', 'Pilih satu.');
    if (D.species === 'snake') {
      h += '<div class="cm-alert cm-alert--amber"><b>' + T('No photo for snake reports', 'Tiada foto untuk laporan ular') + '</b>' +
        T('For a snake report the photo step is skipped. The site never shows a snake photograph from a neighbour, so that a frightened person is not shown one on the Emergency path.',
          'Untuk laporan ular, langkah foto dilangkau. Tapak tidak pernah menunjukkan foto ular daripada jiran, supaya orang yang ketakutan tidak ditunjukkan satu pada laluan Kecemasan.') + '</div>';
    }
    h += '</div>';
    h += qHead(3, T('Where, district only', 'Di mana, daerah sahaja'), T('Pre-filled from your choice on Home. Never a street, never a coordinate.', 'Diisi awal daripada pilihan anda di Utama. Tidak pernah jalan, tidak pernah koordinat.')) +
      '<div class="cm-selects">' + stateSelect('shareState', D.state) + districtSelect('shareDistrict', D.state, D.district) + '</div>' + errMsg('place', 'Choose a state and a district.', 'Pilih negeri dan daerah.') + '</div>';
    h += qHead(4, T('When', 'Bila') + aiMark('when')) + chips('when', WHEN, D.when, false) + errMsg('when', 'Choose one.', 'Pilih satu.') + '</div>';
    h += qHead(5, T('Time of day', 'Waktu dalam hari') + aiMark('time')) + chips('time', TIME, D.time, false) + errMsg('time', 'Choose one.', 'Pilih satu.') + '</div>';
    h += step2Body();
    h += '</div>';
    h += '<div style="margin-top:1rem"><button type="button" class="cm-btn cm-btn--primary" data-act="next1">' + T('Next: review and send', 'Seterusnya: semak dan hantar') + '</button></div>';
    h += '<p class="cm-note">' + T('Nothing is sent until the last step. Closing the page discards the draft.', 'Tiada apa dihantar sehingga langkah terakhir. Menutup halaman akan membuang draf.') + '</p>';
    root.innerHTML = h;
  }
  // ---- AI 3: Report from your words (AC 5.4.1) ----
  // AC 5.4.1 / Safeguards 5.1 (7): every field the sentence filled says so, until the resident changes it.
  function aiMark(group) {
    return D.aiFilled && D.aiFilled[group] ? ' <span class="cm-ai-mark">' + T('Filled from your sentence', 'Diisi daripada ayat anda') + '</span>' : '';
  }
  var AI_FIELDS = [
    ['species', SPECIES, 'what you saw', 'apa yang anda lihat', false], ['kind', KINDS, 'kind of report', 'jenis laporan', false],
    ['when', WHEN, 'when', 'bila', false], ['time', TIME, 'time of day', 'waktu dalam hari', false],
    ['did', DID, 'what it did', 'apa yang dilakukannya', true], ['worked', WORKED, 'what worked', 'apa yang berkesan', true]
  ];
  function aiBlockHtml() {
    if (D.aiSkipped) {
      return '<button type="button" class="cm-link" data-act="ai-open">' + T('Or describe it in one sentence and we fill in the form', 'Atau terangkan dalam satu ayat dan kami isikan borang') + '</button>';
    }
    var busy = D.ai.state === 'loading';
    var h = '<div class="cm-q__title" style="font-size:1rem">' + T('Tell us in one sentence', 'Beritahu kami dalam satu ayat') + '</div>' +
      '<p class="cm-muted" style="margin:.2rem 0 .6rem">' + T('We fill in what you saw, the kind of report, when, the time of day, what it did and what worked. You choose the state and district yourself. Check every answer below; you can change any of them.',
        'Kami isikan apa yang anda lihat, jenis laporan, bila, waktu, apa yang dilakukannya dan apa yang berkesan. Anda memilih negeri dan daerah sendiri. Semak setiap jawapan di bawah; anda boleh mengubah mana-mana.') + '</p>' +
      '<textarea id="community-share__ai" class="cm-textarea" maxlength="' + AI_MAX + '" data-field="ai-text" aria-describedby="community-share__aihelp" placeholder="' + esc(lang() === 'bm' ? 'cth. Semalam pagi-pagi lapan ekor kera naik bumbung dan ambil buah. Kunci penutup tong berkesan.' : 'e.g. Yesterday at dawn about eight macaques came onto the roof and took fruit. A latching bin lid worked.') + '"' + (busy ? ' disabled' : '') + '>' + esc(D.aiText) + '</textarea>' +
      '<div class="cm-actions" style="margin-top:.6rem;align-items:center">' +
      '<button type="button" class="cm-btn cm-btn--sm cm-btn--primary" data-act="ai-fill"' + (busy ? ' disabled' : '') + '>' + (busy ? T('Reading your sentence…', 'Membaca ayat anda…') : T('Fill in the form from my sentence', 'Isi borang daripada ayat saya')) + '</button>' +
      '<button type="button" class="cm-link" data-act="ai-skip"' + (busy ? ' disabled' : '') + '>' + T('Skip, I will tap the answers', 'Langkau, saya akan pilih jawapan') + '</button></div>';
    var st = D.ai.state;
    if (st === 'done') {
      h += '<div class="cm-ai-msg" role="status">' + aiDoneHtml() + '</div>';
      if (aiComplete()) h += '<div class="cm-actions"><button type="button" class="cm-btn cm-btn--sm cm-btn--outline" data-act="ai-review">' + T('Everything is filled: review and send', 'Semua telah diisi: semak dan hantar') + '</button></div>';
    } else if (st === 'snake') {
      h += '<div class="cm-ai-msg cm-ai-msg--warn" role="alert"><b>' + T('Your sentence mentions a snake.', 'Ayat anda menyebut ular.') + '</b> ' +
        T('We set the animal to "A snake" and did not send your sentence anywhere. A snake report has no photo step and cannot be an invasive sighting. If it is there now, leave this page and open Emergency. Tap the answers below.',
          'Kami menetapkan haiwan kepada "Seekor ular" dan tidak menghantar ayat anda ke mana-mana. Laporan ular tiada langkah foto dan tidak boleh menjadi penampakan invasif. Jika ia ada di situ sekarang, tinggalkan halaman ini dan buka Kecemasan. Pilih jawapan di bawah.') + '</div>';
    } else if (st === 'none') {
      h += '<div class="cm-ai-msg cm-ai-msg--warn" role="status">' + T('Nothing in your sentence matched one of the options, so nothing was filled in. Tap the answers below.', 'Tiada apa dalam ayat anda yang sepadan dengan pilihan, jadi tiada apa diisi. Pilih jawapan di bawah.') + '</div>';
    } else if (st === 'failed') {
      h += '<div class="cm-ai-msg cm-ai-msg--warn" role="alert">' + T('The sentence could not be read just now. Nothing was filled in; tap the answers below.', 'Ayat tidak dapat dibaca sekarang. Tiada apa diisi; pilih jawapan di bawah.') + '</div>';
    } else if (st === 'empty') {
      h += '<div class="cm-ai-msg cm-ai-msg--warn" role="status">' + T('Type a sentence first, or skip and tap the answers.', 'Taip satu ayat dahulu, atau langkau dan pilih jawapan.') + '</div>';
    }
    h += '<p class="cm-note" id="community-share__aihelp" style="margin-top:.6rem">' +
      T('An AI language model reads your sentence and can only tick the options of this form. Anything it is unsure of stays blank, every answer stays editable, nothing is sent until the last step, and the sentence is not stored. The tap-through form works the same without it.',
        'Model bahasa AI membaca ayat anda dan hanya boleh menanda pilihan borang ini. Apa yang tidak pasti dibiarkan kosong, setiap jawapan boleh disunting, tiada apa dihantar sehingga langkah terakhir, dan ayat tidak disimpan. Borang pilihan berfungsi sama tanpanya.') +
      (API.isMock ? ' ' + T('Prototype: a keyword stand-in is used until the model route exists.', 'Prototaip: pengganti kata kunci digunakan sehingga laluan model wujud.') : '') + '</p>';
    return h;
  }
  // The whole form is ready for the last step: nothing left blank and no note problem.
  function aiComplete() {
    return !!(D.species && D.kind && D.state && D.district && D.when && D.time && D.did.length && (D.kind !== 'worked' || D.worked.filter(function (w) { return w !== 'nothing-yet'; }).length));
  }
  function aiDoneHtml() {
    var filledEn = [], filledBm = [], blankEn = [], blankBm = [];
    AI_FIELDS.forEach(function (f) {
      var key = f[0], list = f[1], multi = f[4];
      if (D.ai.filled.indexOf(key) !== -1) {
        var ids = multi ? D[key] : [D[key]];
        filledEn.push(f[2] + ' (' + ids.map(function (i) { return opt(list, i).en.toLowerCase(); }).join(', ') + ')');
        filledBm.push(f[3] + ' (' + ids.map(function (i) { return opt(list, i).bm.toLowerCase(); }).join(', ') + ')');
      } else if (key === 'worked' && D.kind !== 'worked' && !(D.ai.reasons && D.ai.reasons.worked)) {
        // not a "what worked" report, so nothing is missing here
      } else {
        var why = D.ai.reasons && D.ai.reasons[key];
        blankEn.push(f[2] + ', because ' + esc(why ? why[0] : 'your sentence does not say'));
        blankBm.push(f[3] + ', kerana ' + esc(why ? why[1] : 'ayat anda tidak menyatakannya'));
      }
    });
    return T('Filled from your sentence: ' + esc(filledEn.join('; ')) + '.' + (blankEn.length ? ' Left blank: ' + blankEn.join('; ') + '. Tap an answer if it applies.' : ''),
      'Diisi daripada ayat anda: ' + esc(filledBm.join('; ')) + '.' + (blankBm.length ? ' Dibiarkan kosong: ' + blankBm.join('; ') + '. Pilih jawapan jika berkenaan.' : ''));
  }
  function callParse(text) {
    if (API.parse) return API.parse(text);
    return fetch('/api/community/parse', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: text }) })
      .then(function (r) { return r.json().then(function (b) { if (!r.ok || (b && b.ok === false)) throw new Error('parse'); return b; }); });
  }
  // Whatever comes back, only ids that exist in the form are kept (AC 5.4.1).
  function cleanIds(list, ids) {
    var valid = list.map(function (o) { return o.id; }), out = [];
    (Array.isArray(ids) ? ids : []).forEach(function (i) { if (valid.indexOf(i) !== -1 && out.indexOf(i) === -1) out.push(i); });
    return out;
  }
  function runAiFill() {
    if (!D || D.ai.state === 'loading') return;
    var text = String(D.aiText || '').trim().slice(0, AI_MAX);
    if (!text) { D.ai = { state: 'empty' }; renderShare(); return; }
    // A sentence that names a snake is handled by rule, before any model call: the animal becomes "a snake",
    // the invasive kind and the photo step go away, and nothing is sent to the model.
    if (SNAKE_TERMS.test(text)) {
      D.species = 'snake';
      if (D.kind === 'invasive') D.kind = '';
      if (D.photo) { try { URL.revokeObjectURL(D.photo.url); } catch (x) {} D.photo = null; }
      D.aiFilled = {};
      D.ai = { state: 'snake' }; renderShare(); return;
    }
    D.ai = { state: 'loading' }; renderShare();
    var timer = new Promise(function (_, rej) { setTimeout(function () { rej(new Error('timeout')); }, AI_TIMEOUT_MS); });
    Promise.race([callParse(text), timer]).then(function (res) {
      if (!D) return;
      res = res || {};
      var filled = [];
      // Single-choice fields: the value must be an option of the form. The model never sets a snake (a rule does).
      var sp = cleanIds(SPECIES, [res.species])[0];
      if (sp && sp !== 'snake') { D.species = sp; filled.push('species'); delete D.err.species; if (D.kind === 'invasive' && INVASIVE_SPECIES.indexOf(sp) === -1) D.kind = ''; }
      var kd = cleanIds(KINDS, [res.kind])[0];
      if (kd && kindsFor(D.species).some(function (k) { return k.id === kd; })) { D.kind = kd; filled.push('kind'); delete D.err.kind; }
      var wh = cleanIds(WHEN, [res.when])[0];
      if (wh) { D.when = wh; filled.push('when'); delete D.err.when; }
      var tm = cleanIds(TIME, [res.time])[0];
      if (tm) { D.time = tm; filled.push('time'); delete D.err.time; }
      var did = cleanIds(DID, res.did), worked = cleanIds(WORKED, res.worked);
      if (worked.indexOf('nothing-yet') !== -1) worked = ['nothing-yet'];
      if (did.length) { D.did = did; filled.push('did'); delete D.err.did; }
      if (worked.length) { D.worked = worked; filled.push('worked'); delete D.err.worked; }
      D.aiFilled = {}; filled.forEach(function (f) { D.aiFilled[f] = true; });
      D.ai = { state: filled.length ? 'done' : 'none', filled: filled, reasons: res.blank_reasons || {} };
      renderShare();
    }).catch(function () {
      if (D) { D.ai = { state: 'failed' }; renderShare(); }
    });
  }

  // The old step 2 questions (what it did, what worked, the note), now part of the one page.
  function step2Body() {
    var h = '';
    h += qHead(6, T('What it did (pick all that apply)', 'Apa yang dilakukannya (pilih semua yang berkenaan)') + aiMark('did')) + chips('did', DID, D.did, true) + errMsg('did', 'Choose at least one.', 'Pilih sekurang-kurangnya satu.') + '</div>';
    h += qHead(7, T('What worked, if anything', 'Apa yang berkesan, jika ada') + aiMark('worked'), T('Every option maps to a sourced row in the plan.', 'Setiap pilihan dipetakan kepada baris bersumber dalam pelan.')) + chips('worked', WORKED, D.worked, true) + errMsg('worked', 'Choose at least one for a "what worked" report.', 'Pilih sekurang-kurangnya satu untuk laporan "apa yang berkesan".') + '</div>';
    h += '<div class="cm-q"><label class="cm-q__title" for="community-share__note" style="display:block;margin-bottom:.4rem">' + T('Anything else (optional, ' + NOTE_MAX + ' characters)', 'Apa-apa lagi (pilihan, ' + NOTE_MAX + ' aksara)') + '</label>' +
      '<textarea id="community-share__note" class="cm-textarea' + (D.noteIssues.length ? ' cm-error' : '') + '" maxlength="' + NOTE_MAX + '" data-field="note" aria-describedby="community-share__notehelp">' + esc(D.note) + '</textarea>' +
      '<div class="cm-count"><span id="community-share__count">' + D.note.length + '</span>/' + NOTE_MAX + '</div>';
    if (D.noteIssues.length) {
      var en = D.noteIssues.map(function (k) { return ISSUE_TEXT[k][0]; }).join(', ');
      var bm = D.noteIssues.map(function (k) { return ISSUE_TEXT[k][1]; }).join(', ');
      h += '<div class="cm-alert cm-alert--red cm-alert--plain" role="alert"><b>' + T('Your note may contain something that identifies you or someone else', 'Nota anda mungkin mengandungi sesuatu yang mengenal pasti anda atau orang lain') + '</b>' +
        T('It looks like ' + esc(en) + '. Please edit the note and remove it, then continue. A report is read by a person before it appears.', 'Nampaknya ada ' + esc(bm) + '. Sila sunting nota dan buangkannya, kemudian teruskan. Laporan dibaca oleh seseorang sebelum dipaparkan.') + '</div>';
    }
    h += '<div class="cm-note" id="community-share__notehelp">' + T('Checked before review for phone numbers, names, house numbers and street names. If any are found you are asked to edit the note.', 'Disemak sebelum semakan untuk nombor telefon, nama, nombor rumah dan nama jalan. Jika ditemui, anda diminta menyunting nota.') + '</div></div>';
    return h;
  }
  function renderStep3(root) {
    var snake = D.species === 'snake';
    var h = hero({
      back: { act: 'back-step', label: T('Back', 'Kembali') },
      eyebrow: T('Community · Share what you saw', 'Komuniti · Kongsi apa yang anda lihat'),
      title: T('Review and send', 'Semak dan hantar')
    });
    h += stepper(3);
    if (!snake) {
      h += '<div class="cm-card" style="margin-top:1rem"><div class="cm-q__title" style="font-size:.9375rem">' + T('Photo (optional)', 'Foto (pilihan)') + '</div>';
      if (D.photo) {
        h += '<div class="cm-photo" style="margin-top:.7rem"><img alt="' + esc(lang() === 'bm' ? 'Pratonton foto' : 'Photo preview') + '" src="' + D.photo.url + '"><div><div class="cm-muted">' + T('Location and camera data removed on this device.', 'Data lokasi dan kamera dibuang pada peranti ini.') + '</div>' +
          '<button type="button" class="cm-link" style="margin-top:.4rem" data-act="remove-photo">' + T('Remove photo', 'Buang foto') + '</button></div></div>';
      } else {
        h += '<label class="cm-drop" style="margin-top:.7rem"><input type="file" accept="image/jpeg,image/png" data-field="photo"><strong>' + T('Add a photo of the animal', 'Tambah foto haiwan') + '</strong><span>' + T('JPEG or PNG, up to 5 MB. Location data is removed on your device.', 'JPEG atau PNG, sehingga 5 MB. Data lokasi dibuang pada peranti anda.') + '</span></label>';
      }
      if (D.photoErr) h += '<div class="cm-errmsg" role="alert">' + T(D.photoErr === 'type' ? 'Use a JPEG or PNG photo.' : D.photoErr === 'size' ? 'That photo is over 5 MB.' : 'The photo could not be read. Try another.', D.photoErr === 'type' ? 'Gunakan foto JPEG atau PNG.' : D.photoErr === 'size' ? 'Foto itu melebihi 5 MB.' : 'Foto tidak dapat dibaca. Cuba yang lain.') + '</div>';
      h += '<p class="cm-note">' + T('Photos are not kept in this version: your report is sent and published without the photo.', 'Foto tidak disimpan dalam versi ini: laporan anda dihantar dan diterbitkan tanpa foto.') + '</p></div>';
    } else {
      h += '<div class="cm-alert cm-alert--amber cm-alert--plain" style="margin-top:1rem"><b>' + T('No photo for snake reports', 'Tiada foto untuk laporan ular') + '</b>' + T('The photo step is skipped for a snake report.', 'Langkah foto dilangkau untuk laporan ular.') + '</div>';
    }
    h += '<div class="cm-card"><div class="cm-label cm-label--green">' + T('Your report', 'Laporan anda') + '</div><dl class="cm-sum">' +
      '<dt>' + T('What', 'Apa') + '</dt><dd>' + label(SPECIES, D.species) + ' · ' + label(KINDS, D.kind).toLowerCase() + '</dd>' +
      '<dt>' + T('Where and when', 'Di mana dan bila') + '</dt><dd>' + esc(placeText(D.state, D.district)) + ' · ' + label(WHEN, D.when).toLowerCase() + ' · ' + label(TIME, D.time).toLowerCase() + '</dd>' +
      '<dt>' + T('What it did', 'Apa yang dilakukannya') + '</dt><dd>' + joinLabels(DID, D.did).toLowerCase() + '</dd>' +
      (D.worked.length ? '<dt>' + T('What worked', 'Apa yang berkesan') + '</dt><dd>' + joinLabels(WORKED, D.worked).toLowerCase() + '</dd>' : '') +
      (D.note ? '<dt>' + T('Note', 'Nota') + '</dt><dd>' + esc(D.note) + '</dd>' : '') + '</dl></div>';
    if (D.noteIssues.length) {
      h += '<div class="cm-alert cm-alert--red cm-alert--plain" role="alert" style="margin-top:1rem"><b>' + T('The note needs editing', 'Nota perlu disunting') + '</b>' + T('Go back and remove the personal detail before sending.', 'Kembali dan buang butiran peribadi sebelum menghantar.') + '</div>';
    }
    h += '<label class="cm-check"><input type="checkbox" data-field="consent"' + (D.consent ? ' checked' : '') + '><span>' +
      T('I understand this is anonymous, will be read by a team member first, and cannot be edited or withdrawn after sending because nothing links it to me.',
        'Saya faham ini tanpa nama, akan dibaca oleh ahli pasukan terlebih dahulu, dan tidak boleh disunting atau ditarik balik selepas dihantar kerana tiada apa yang mengaitkannya dengan saya.') + '</span></label>';
    if (D.sendErr) h += '<div class="cm-errmsg" role="alert" style="margin-left:0">' + T('The report was not sent. Nothing was saved; try again.', 'Laporan tidak dihantar. Tiada apa disimpan; cuba lagi.') + '</div>';
    h += '<div style="margin-top:1rem"><button type="button" class="cm-btn cm-btn--primary" data-act="send" id="community-share__send"' + (D.consent && !D.sending && !D.noteIssues.length ? '' : ' disabled') + '>' + (D.sending ? T('Sending…', 'Menghantar…') : T('Send for review', 'Hantar untuk semakan')) + '</button>' +
      '<button type="button" class="cm-btn cm-btn--ghost" data-act="back-step">' + T('Back', 'Kembali') + '</button></div>';
    root.innerHTML = h;
  }
  function validate1() {
    var e = {};
    if (!D.species) e.species = 1;
    if (!D.kind) e.kind = 1;
    if (!(D.state && D.district)) e.place = 1;
    if (!D.when) e.when = 1;
    if (!D.time) e.time = 1;
    D.err = e;
    return !Object.keys(e).length;
  }
  // Every question of the page at once: one pass, every missing answer marked.
  function validateAll() {
    var ok1 = validate1(), e1 = D.err;
    var ok2 = validate2();
    D.err = Object.assign({}, e1, D.err);
    return ok1 && ok2;
  }
  function validate2() {
    var e = {};
    if (!D.did.length) e.did = 1;
    if (D.kind === 'worked' && !D.worked.filter(function (w) { return w !== 'nothing-yet'; }).length) e.worked = 1;
    D.err = e;
    D.noteIssues = noteIssues(D.note);
    return !Object.keys(e).length && !D.noteIssues.length;
  }
  function stripMetadata(file) {
    // Redrawing on a canvas drops EXIF (GPS, camera) because only pixels are re-encoded.
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        try {
          var max = 1600, w = img.naturalWidth, h = img.naturalHeight, k = Math.min(1, max / Math.max(w, h));
          var c = document.createElement('canvas');
          c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k));
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          URL.revokeObjectURL(url);
          c.toBlob(function (blob) { blob ? resolve(blob) : reject(new Error('encode')); }, 'image/jpeg', 0.88);
        } catch (err) { URL.revokeObjectURL(url); reject(err); }
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('read')); };
      img.src = url;
    });
  }
  function weekFor(when) {
    var now = new Date();
    var mon = mondayOf(now);
    if (when === 'this-week') return mon;
    if (when === 'last-week') return addDays(mon, -7);
    if (when === 'earlier-month') return addDays(mon, -14);
    return addDays(mon, -42);
  }
  function doSend() {
    if (!D || D.sending) return;
    D.noteIssues = noteIssues(D.note);
    if (D.noteIssues.length || !D.consent) { renderShare(); return; }
    D.sending = true; D.sendErr = false; renderShare();
    var report = { species: D.species, kind: D.kind, state: D.state, district: D.district, week: weekFor(D.when), time: D.time, did: D.did, worked: D.worked, note: D.note };
    var place = { state: D.state, district: D.district };
    API.submit(report, D.species === 'snake' ? null : (D.photo && D.photo.blob) || null).then(function (res) {
      discardDraft();
      go('community-sent', { ref: res.ref, state: place.state, district: place.district });
    }).catch(function () {
      if (D) { D.sending = false; D.sendErr = true; renderShare(); }
    });
  }

  // ================================================================== SENT
  function renderSent() {
    var root = content('community-sent'); if (!root) return;
    var q = query();
    var ref = q.get('ref') || '', s = q.get('state') || '', d = q.get('district') || '';
    var dn = districtName(s, d);
    var h = '<div class="cm-eyebrow">' + T('Community · Share what you saw', 'Komuniti · Kongsi apa yang anda lihat') + '</div>';
    h += '<div class="cm-card cm-sent" style="margin-top:1rem;text-align:center"><span class="cm-sent__tick">' + ICON_TICK_BIG + '</span>' +
      '<h1 class="font-display" style="margin-top:.75rem;font-size:1.5rem;font-weight:800;color:#0b130e">' + T('Sent for review', 'Dihantar untuk semakan') + '</h1>' +
      '<p style="margin-top:.5rem;text-align:left;font-size:.9375rem;color:#334155;line-height:1.5">' +
      T('A team member reads every report before it appears. There is no account, so there is nothing to notify; check the ' + (dn ? esc(dn) + ' ' : '') + 'page later.',
        'Seorang ahli pasukan membaca setiap laporan sebelum ia dipaparkan. Tiada akaun, jadi tiada apa untuk dimaklumkan; semak halaman ' + (dn ? esc(dn) + ' ' : '') + 'kemudian.') + '</p>' +
      (ref ? '<p class="cm-muted" style="margin-top:.6rem;text-align:left">' + T('Reference ' + esc(ref) + '. It identifies the report to the team, not you. Keep it only if you want to ask about the review.',
        'Rujukan ' + esc(ref) + '. Ia mengenal pasti laporan kepada pasukan, bukan anda. Simpan hanya jika anda mahu bertanya tentang semakan.') + '</p>' : '') + '</div>';
    h += '<div style="margin-top:1rem"><button type="button" class="cm-btn cm-btn--primary" data-act="back-list" data-state="' + esc(s) + '" data-district="' + esc(d) + '">' + T('Back to ' + (dn ? esc(dn) : 'Community'), 'Kembali ke ' + (dn ? esc(dn) : 'Komuniti')) + '</button>' +
      '<a class="cm-btn cm-btn--ghost" href="plan.html">' + T('Plan for my home', 'Pelan untuk rumah saya') + '</a></div>';
    h += '<div class="cm-note"><b style="color:#0b130e">' + T('What review removes', 'Apa yang dibuang oleh semakan') + '</b><br>' +
      T('Personal details, exact locations, photos of people or houses, abuse, species outside the seven, and a native species filed as invasive. The full list is on "How review works".',
        'Butiran peribadi, lokasi tepat, foto orang atau rumah, penyalahgunaan, spesies di luar tujuh, dan spesies asli yang difailkan sebagai invasif. Senarai penuh ada di "Cara semakan berfungsi".') +
      ' <a href="community-how-review-works.html" style="text-decoration:underline;font-weight:600">' + T('How review works', 'Cara semakan berfungsi') + '</a></div>';
    root.innerHTML = h;
  }

  // ================================================================= REVIEW
  var R = { key: '', tab: 'submitted', district: 'all', queue: [], log: [], open: null, showLog: false, loading: false, gateErr: false, token: 0 };
  function renderReview() {
    var root = content('community-review'); if (!root) return;
    var h = hero({
      eyebrow: T('Community · Review queue · Team only', 'Komuniti · Baris semakan · Pasukan sahaja'),
      title: T('Review queue', 'Baris semakan'),
      lead: T('A person reads every report before it appears. Publish, hold or delete, with a reason from the fixed list; the log keeps the reference, the decision, the reason and the time, and nothing that identifies the reporter.',
        'Seseorang membaca setiap laporan sebelum ia dipaparkan. Terbitkan, tahan atau padam, dengan sebab daripada senarai tetap; log menyimpan rujukan, keputusan, sebab dan masa, dan tiada apa yang mengenal pasti pelapor.')
    });
    if (!R.key) {
      h += '<form class="cm-card cm-gate" style="margin-top:1.4rem" data-form="gate"><label class="cm-q__title" for="community-review__key" style="display:block;margin-bottom:.5rem">' + T('Reviewer key', 'Kunci penyemak') + '</label>' +
        '<input id="community-review__key" class="cm-input" type="password" autocomplete="off" data-field="key">' +
        (R.gateErr ? '<div class="cm-errmsg" role="alert" style="margin-left:0">' + T('That key was not accepted.', 'Kunci itu tidak diterima.') + '</div>' : '') +
        '<p class="cm-note">' + T('The key is held in this tab only and is never stored in this browser.', 'Kunci disimpan dalam tab ini sahaja dan tidak pernah disimpan dalam pelayar ini.') + (API.isMock ? ' ' + T('Prototype: any non-empty key opens the sample queue.', 'Prototaip: sebarang kunci tidak kosong membuka baris contoh.') : '') + '</p>' +
        '<button type="submit" class="cm-btn cm-btn--primary" style="margin-top:.8rem">' + T('Open the queue', 'Buka baris semakan') + '</button></form>';
      root.innerHTML = h; return;
    }
    if (R.loading) { root.innerHTML = h + '<p class="cm-note">' + T('Loading…', 'Memuatkan…') + '</p>'; return; }
    var counts = { submitted: 0, held: 0, published: 0, deleted: 0 };
    R.queue.forEach(function (r) { counts[r.status] = (counts[r.status] || 0) + 1; });
    var districts = {};
    R.queue.forEach(function (r) { districts[r.state + '/' + r.district] = placeText(r.state, r.district); });
    h += '<div class="cm-selects"><select class="cm-select" data-sel="reviewDistrict" aria-label="' + esc(lang() === 'bm' ? 'Daerah' : 'District') + '">' +
      '<option value="all"' + (R.district === 'all' ? ' selected' : '') + '>' + esc(lang() === 'bm' ? 'Semua daerah' : 'All districts') + '</option>' +
      Object.keys(districts).sort().map(function (k) { return '<option value="' + esc(k) + '"' + (R.district === k ? ' selected' : '') + '>' + esc(districts[k]) + '</option>'; }).join('') + '</select>' +
      '<button type="button" class="cm-btn cm-btn--ghost" data-act="signout" style="border-radius:.85rem">' + T('Signed in with the reviewer key · sign out', 'Log masuk dengan kunci penyemak · log keluar') + '</button></div>';
    h += '<div class="cm-tabs" role="tablist">' + [['submitted', 'Submitted', 'Dihantar'], ['held', 'Held', 'Ditahan'], ['published', 'Published', 'Diterbitkan'], ['deleted', 'Deleted', 'Dipadam']].map(function (t) {
      return '<button type="button" role="tab" class="cm-chip" data-act="tab" data-val="' + t[0] + '" aria-pressed="' + (R.tab === t[0]) + '">' + TE(t[1], t[2]) + ' (' + (counts[t[0]] || 0) + ')</button>';
    }).join('') + '</div>';
    h += '<div class="cm-stats"><div class="cm-stat"><b>' + counts.submitted + '</b><span>' + T('waiting for review', 'menunggu semakan') + '</span></div>' +
      '<div class="cm-stat"><b>' + counts.held + '</b><span>' + T('held, deleted after ' + HOLD_DAYS + ' days', 'ditahan, dipadam selepas ' + HOLD_DAYS + ' hari') + '</span></div>' +
      '<div class="cm-stat"><b>' + R.log.length + '</b><span>' + T('decisions in the log', 'keputusan dalam log') + '</span></div></div>';
    if (API.isMock) h += '<p class="cm-note cm-note--panel">' + T('Sample queue for the prototype. A report is shown exactly as submitted. Nothing about the reporter appears because nothing about the reporter was received.',
      'Baris contoh untuk prototaip. Laporan ditunjukkan tepat seperti dihantar. Tiada apa tentang pelapor kerana tiada apa tentang pelapor diterima.') + '</p>';
    var items = R.queue.filter(function (r) { return r.status === R.tab && (R.district === 'all' || (r.state + '/' + r.district) === R.district); });
    if (!items.length) h += '<div class="cm-card" style="margin-top:1rem"><p class="cm-muted" style="font-size:.875rem">' + T('Nothing here.', 'Tiada apa di sini.') + '</p></div>';
    items.forEach(function (r) { h += reviewCard(r); });
    h += '<div style="text-align:center;margin-top:1.1rem"><button type="button" class="cm-link cm-link--float" data-act="toggle-log">' + (R.showLog ? T('Hide the review log', 'Sembunyikan log semakan') : T('Open the review log', 'Buka log semakan')) + '</button></div>';
    if (R.showLog) h += logHtml();
    root.innerHTML = h;
  }
  function reasonLabel(id) { var o = opt(REASONS, id); return o ? TE(o.en, o.bm) : esc(id); }
  function reviewCard(r) {
    var open = R.open && R.open.id === r.id ? R.open : null;
    var h = '<article class="cm-report" data-id="' + esc(r.id) + '">';
    h += '<div class="cm-report__top"><div class="cm-report__tags">' + speciesTag(r.species) + kindTag(r.kind) + '</div><span class="cm-report__week">' + weekOf(r.week) + '</span></div>';
    if (r.status === 'deleted') {
      h += '<p class="cm-report__text" style="color:#64748b">' + T('Content deleted. Only the reference, the decision, the reason and the time are kept.', 'Kandungan dipadam. Hanya rujukan, keputusan, sebab dan masa disimpan.') + '</p>';
    } else {
      h += '<p class="cm-report__text">' + reportCardText(r) + '</p>';
      if (r.worked.length && r.worked.join() !== 'nothing-yet') h += '<div class="cm-report__fix">' + ICON_TICK + '<span>' + joinLabels(WORKED, r.worked.filter(function (w) { return w !== 'nothing-yet'; })) + '</span></div>';
      if (r.photo) h += '<p class="cm-note" style="margin-top:.4rem">' + T('A photo is attached.', 'Foto dilampirkan.') + '</p>';
    }
    var meta = esc(r.id) + ' · ' + esc(districtName(r.state, r.district)) + ' · ';
    if (r.status === 'held') meta += T('held ' + esc(fmtDayEn(r.decidedAt)) + ' · deleted ' + esc(fmtDayEn(r.holdUntil)) + ' unless published', 'ditahan ' + esc(fmtDayBm(r.decidedAt)) + ' · dipadam ' + esc(fmtDayBm(r.holdUntil)) + ' kecuali diterbitkan');
    else if (r.status === 'submitted') meta += T('submitted ' + esc(fmtDayEn(r.submitted)), 'dihantar ' + esc(fmtDayBm(r.submitted)));
    else meta += T(r.status + ' ' + esc(fmtDayEn(r.decidedAt || r.submitted)), (r.status === 'published' ? 'diterbitkan ' : 'dipadam ') + esc(fmtDayBm(r.decidedAt || r.submitted)));
    h += '<div class="cm-report__foot" style="' + (r.status === 'held' ? 'color:#e11d48' : '') + '"><span>' + meta + '</span></div>';
    if (r.status === 'published' || r.status === 'deleted') {
      if (r.reason) h += '<p class="cm-note" style="margin-top:.3rem">' + T('Reason: ', 'Sebab: ') + reasonLabel(r.reason) + '</p>';
      return h + '</article>';
    }
    if (open) {
      var pickFor = REASONS.filter(function (x) { return x.for.indexOf(open.decision) !== -1; });
      h += '<div class="cm-reason" role="radiogroup" aria-label="' + esc(lang() === 'bm' ? 'Sebab keputusan' : 'Reason for the decision') + '"><div class="cm-label cm-label--green" style="margin-bottom:.4rem">' + T('Reason for the decision · fixed list, one required', 'Sebab keputusan · senarai tetap, satu diperlukan') + '</div>' +
        pickFor.map(function (x) {
          return '<label class="' + (open.reason === x.id ? 'is-picked' : '') + '"><input type="radio" name="reason-' + esc(r.id) + '" data-act="reason" data-val="' + x.id + '"' + (open.reason === x.id ? ' checked' : '') + '>' + TE(x.en, x.bm) + '</label>';
        }).join('') +
        (open.err ? '<div class="cm-errmsg" role="alert" style="margin-left:0">' + T('Choose a reason to continue.', 'Pilih sebab untuk meneruskan.') + '</div>' : '') +
        '<p class="cm-note" style="margin-top:.5rem">' + T('Recorded to the log with the reference, the decision and the time. The reviewer is logged by role, never by name. A hold is deleted after ' + HOLD_DAYS + ' days unless it is published.',
          'Direkodkan dalam log dengan rujukan, keputusan dan masa. Penyemak dilog mengikut peranan, tidak pernah nama. Tahanan dipadam selepas ' + HOLD_DAYS + ' hari kecuali diterbitkan.') + '</p></div>' +
        '<div class="cm-actions"><button type="button" class="cm-btn cm-btn--sm ' + (open.decision === 'publish' ? 'cm-btn--primary' : 'cm-btn--danger') + '" data-act="record">' +
        (open.decision === 'publish' ? T('Record the publish', 'Rekod penerbitan') : open.decision === 'hold' ? T('Record the hold', 'Rekod tahanan') : T('Record the delete', 'Rekod pemadaman')) + '</button>' +
        '<button type="button" class="cm-btn cm-btn--sm cm-btn--outline" data-act="cancel-decision">' + T('Cancel', 'Batal') + '</button></div>';
    } else {
      h += '<div class="cm-actions">';
      if (r.status === 'held') {
        h += '<span class="cm-btn cm-btn--sm cm-btn--outline-danger" style="cursor:default">' + T('Held: ', 'Ditahan: ') + reasonLabel(r.reason) + '</span>';
      } else {
        h += '<button type="button" class="cm-btn cm-btn--sm cm-btn--primary" data-act="decide" data-decision="publish" data-id="' + esc(r.id) + '">' + T('Publish', 'Terbitkan') + '</button>' +
          '<button type="button" class="cm-btn cm-btn--sm cm-btn--outline" data-act="decide" data-decision="hold" data-id="' + esc(r.id) + '">' + T('Hold', 'Tahan') + '</button>';
      }
      if (r.status === 'held') h += '<button type="button" class="cm-btn cm-btn--sm cm-btn--outline" data-act="decide" data-decision="publish" data-id="' + esc(r.id) + '">' + T('Publish', 'Terbitkan') + '</button>';
      h += '<button type="button" class="cm-btn cm-btn--sm cm-btn--outline-danger" data-act="decide" data-decision="delete" data-id="' + esc(r.id) + '">' + T('Delete', 'Padam') + '</button></div>';
    }
    return h + '</article>';
  }
  function logHtml() {
    var rows = R.log.slice(0, 40).map(function (l) {
      return '<tr><td>' + esc(l.ref) + '</td><td>' + esc(l.decision) + '</td><td>' + reasonLabel(l.reason) + '</td><td>' + esc(l.at) + '</td><td>' + esc(l.role) + '</td></tr>';
    }).join('');
    return '<div class="cm-card" style="margin-top:.9rem;overflow-x:auto"><div class="cm-label">' + T('Review log · reference, decision, reason, time. Nothing that identifies the reporter.', 'Log semakan · rujukan, keputusan, sebab, masa. Tiada apa yang mengenal pasti pelapor.') + '</div>' +
      '<table class="cm-log"><thead><tr><th>' + T('Reference', 'Rujukan') + '</th><th>' + T('Decision', 'Keputusan') + '</th><th>' + T('Reason', 'Sebab') + '</th><th>' + T('Time', 'Masa') + '</th><th>' + T('By', 'Oleh') + '</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
  }
  function loadReview() {
    var token = ++R.token;
    R.loading = true; renderReview();
    Promise.all([API.listQueue(R.key), API.listLog(R.key)]).then(function (res) {
      if (token !== R.token) return;
      R.queue = res[0]; R.log = res[1]; R.loading = false; renderReview();
    }).catch(function () {
      R.loading = false; R.key = ''; R.gateErr = true; renderReview();
    });
  }

  // ================================================================ EVENTS
  function onClick(e) {
    var el = e.target.closest('[data-act]');
    if (!el) return;
    var act = el.getAttribute('data-act');
    if (act === 'chip') return onChip(el);
    switch (act) {
      case 'share': go('community-share', { state: L.state, district: L.district }); break;
      case 'kind': L.kind = el.getAttribute('data-val'); L.limit = PAGE_SIZE; syncListUrl(); renderList(); break;
      case 'more': L.limit += PAGE_SIZE * 2; renderList(); break;
      case 'reload-list': renderList(); break;
      case 'open-map': go('ecosystem', { state: L.state }); break;
      case 'open-report': go('community-report', { id: el.getAttribute('data-id') }); break;
      case 'back-list': go('community', { state: el.getAttribute('data-state') || L.state, district: el.getAttribute('data-district') || L.district }); break;
      case 'flag': toast('Thanks. A team member will look at this report again.', 'Terima kasih. Seorang ahli pasukan akan menyemak semula laporan ini.'); break;
      case 'cancel-share': var s0 = D ? D.state : '', d0 = D ? D.district : ''; discardDraft(); go('community', { state: s0, district: d0 }); break;
      case 'back-step': D.step = 1; renderShare(); window.scrollTo(0, 0); break;
      case 'next1': if (validateAll()) { D.step = 3; renderShare(); window.scrollTo(0, 0); } else { renderShare(); focusFirstError(); } break;
      case 'ai-fill': runAiFill(); break;
      case 'ai-skip': D.aiSkipped = true; D.ai = { state: 'idle' }; renderShare(); break;
      case 'ai-open': D.aiSkipped = false; renderShare(); break;
      case 'ai-review': if (validateAll()) { D.step = 3; renderShare(); window.scrollTo(0, 0); } else { renderShare(); focusFirstError(); } break;
      case 'remove-photo': if (D.photo) { try { URL.revokeObjectURL(D.photo.url); } catch (x) {} D.photo = null; } renderShare(); break;
      case 'send': doSend(); break;
      case 'signout': R.key = ''; R.queue = []; R.log = []; R.open = null; R.showLog = false; R.token++; renderReview(); break;
      case 'tab': R.tab = el.getAttribute('data-val'); R.open = null; renderReview(); break;
      case 'toggle-log': R.showLog = !R.showLog; renderReview(); break;
      case 'decide': R.open = { id: el.getAttribute('data-id'), decision: el.getAttribute('data-decision'), reason: el.getAttribute('data-decision') === 'publish' ? 'published' : '', err: false }; renderReview(); break;
      case 'cancel-decision': R.open = null; renderReview(); break;
      case 'record': recordDecision(); break;
      case 'reason': R.open.reason = el.getAttribute('data-val'); R.open.err = false; renderReview(); break;
    }
  }
  function focusFirstError() {
    var el = document.querySelector('#community-share__content .cm-errmsg');
    if (el && el.scrollIntoView) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
  function onChip(el) {
    var g = el.getAttribute('data-group'), v = el.getAttribute('data-val');
    if (!D) return;
    if (D.aiFilled) delete D.aiFilled[g]; // a field the resident changes is theirs again
    if (g === 'species') {
      D.species = v;
      if (D.kind === 'invasive' && INVASIVE_SPECIES.indexOf(v) === -1) D.kind = '';
      delete D.err.species;
    } else if (g === 'did' || g === 'worked') {
      var arr = D[g], i = arr.indexOf(v);
      if (i === -1) {
        arr.push(v);
        if (g === 'worked') {
          if (v === 'nothing-yet') D.worked = ['nothing-yet'];
          else D.worked = D.worked.filter(function (w) { return w !== 'nothing-yet'; });
        }
      } else arr.splice(i, 1);
      delete D.err[g];
    } else {
      D[g] = v; delete D.err[g];
    }
    renderShare();
  }
  function onChange(e) {
    var t = e.target;
    var sel = t.getAttribute && t.getAttribute('data-sel');
    if (sel === 'filterState') { L.state = t.value; L.district = ''; L.kind = 'all'; L.limit = PAGE_SIZE; syncListUrl(); renderList(); return; }
    if (sel === 'filterDistrict') { L.district = t.value; L.kind = 'all'; L.limit = PAGE_SIZE; syncListUrl(); renderList(); return; }
    if (sel === 'shareState') { D.state = t.value; D.district = ''; delete D.err.place; renderShare(); return; }
    if (sel === 'shareDistrict') { D.district = t.value; delete D.err.place; renderShare(); return; }
    if (sel === 'reviewDistrict') { R.district = t.value; renderReview(); return; }
    var f = t.getAttribute && t.getAttribute('data-field');
    if (f === 'consent') { D.consent = t.checked; var b = document.getElementById('community-share__send'); if (b) b.disabled = !(D.consent && !D.sending && !D.noteIssues.length); }
    if (f === 'photo' && t.files && t.files[0]) {
      var file = t.files[0];
      if (!/^image\/(jpeg|png)$/.test(file.type)) { D.photoErr = 'type'; renderShare(); return; }
      if (file.size > PHOTO_MAX_BYTES) { D.photoErr = 'size'; renderShare(); return; }
      D.photoErr = '';
      stripMetadata(file).then(function (blob) {
        if (!D) return;
        D.photo = { blob: blob, url: URL.createObjectURL(blob) }; renderShare();
      }).catch(function () { if (D) { D.photoErr = 'read'; renderShare(); } });
    }
  }
  function onInput(e) {
    var t = e.target, f = t.getAttribute && t.getAttribute('data-field');
    if (f === 'ai-text' && D) { D.aiText = t.value.slice(0, AI_MAX); }
    if (f === 'note' && D) {
      D.note = t.value.slice(0, NOTE_MAX);
      var c = document.getElementById('community-share__count'); if (c) c.textContent = D.note.length;
    }
    if (f === 'key') R.key0 = t.value;
  }
  function doGate() {
    var input = document.getElementById('community-review__key');
    var key = input ? input.value : '';
    API.verifyKey(key).then(function (ok) {
      if (!ok) { R.gateErr = true; renderReview(); return; }
      R.gateErr = false; R.key = key; R.key0 = ''; loadReview();
    }).catch(function () { R.gateErr = true; renderReview(); });
  }
  function recordDecision() {
    var o = R.open; if (!o) return;
    if (!o.reason) { o.err = true; renderReview(); return; }
    API.decide(R.key, o.id, o.decision, o.reason).then(function () {
      R.open = null; return Promise.all([API.listQueue(R.key), API.listLog(R.key)]);
    }).then(function (res) { R.queue = res[0]; R.log = res[1]; renderReview(); toast('Decision recorded.', 'Keputusan direkodkan.'); })
      .catch(function () { toast('The decision was not recorded. Try again.', 'Keputusan tidak direkodkan. Cuba lagi.'); });
  }
  // Form submit inside the gate: Enter key submits.
  document.addEventListener('submit', function (e) {
    if (e.target && e.target.getAttribute && e.target.getAttribute('data-form') === 'gate') { e.preventDefault(); doGate(); }
  });

  // ---------------------------------------------------------------- wiring
  var current = '';
  var RENDER = { 'community': renderList, 'community-report': renderReport, 'community-share': renderShare, 'community-sent': renderSent, 'community-review': renderReview };
  window.PageInit = window.PageInit || {};
  PAGES.forEach(function (p) { PageInit[p] = function () { buildShell(p); }; });
  document.addEventListener('roomforboth:pageshow', function (e) {
    var page = e.detail && e.detail.page;
    if (page !== 'community-share' && D) discardDraft(); // closing the page discards the draft
    current = PAGES.indexOf(page) !== -1 ? page : '';
    if (!current) return;
    buildShell(current);
    if (current === 'community') loadListFromQuery();
    if (current === 'community-share' && !D) D = newDraft();
    RENDER[current]();
  });
  // Re-render on language change so <option> text follows the toggle (spans already do).
  new MutationObserver(function () { if (current) RENDER[current](); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
})();
