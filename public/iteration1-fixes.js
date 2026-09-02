(function () {
  'use strict';

  var STATE_ID_BY_NAME = {
    'Johor': 'johor',
    'Kedah': 'kedah',
    'Kelantan': 'kelantan',
    'Melaka': 'melaka',
    'Negeri Sembilan': 'negeri-sembilan',
    'Pahang': 'pahang',
    'Perak': 'perak',
    'Perlis': 'perlis',
    'Pulau Pinang': 'penang',
    'Sabah': 'sabah',
    'Sarawak': 'sarawak',
    'Selangor': 'selangor',
    'Terengganu': 'terengganu',
    'Kuala Lumpur': 'kl',
    'Putrajaya': 'putrajaya',
    'Labuan': 'labuan'
  };

  var MONTHS_EN = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  var MONTHS_BM = ['Januari','Februari','Mac','April','Mei','Jun','Julai','Ogos','September','Oktober','November','Disember'];

  function currentLang() {
    return document.documentElement.lang === 'bm' ? 'bm' : 'en';
  }

  function formatDateParts(year, month, day) {
    var m = Number(month) - 1;
    var d = Number(day);
    if (m < 0 || m > 11 || !d) return null;
    var months = currentLang() === 'bm' ? MONTHS_BM : MONTHS_EN;
    return d + ' ' + months[m] + ' ' + year;
  }

  function monthIndex(name) {
    var all = MONTHS_EN.concat(MONTHS_BM);
    var idx = all.map(function (x) { return x.toLowerCase(); }).indexOf(String(name || '').toLowerCase());
    return idx < 0 ? -1 : idx % 12;
  }

  function localiseDatesInText(text) {
    if (!text) return text;
    var out = String(text);
    out = out.replace(/\b(\d{4})-(\d{2})-(\d{2})T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z\b/g, function (_, y, m, d) {
      return formatDateParts(y, m, d) || _;
    });
    out = out.replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g, function (_, y, m, d) {
      return formatDateParts(y, m, d) || _;
    });
    out = out.replace(/\b(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December|Januari|Februari|Mac|Mei|Jun|Julai|Ogos|Oktober|Disember)\s+(\d{4})\b/gi, function (_, d, monthName, y) {
      var idx = monthIndex(monthName);
      if (idx < 0) return _;
      var months = currentLang() === 'bm' ? MONTHS_BM : MONTHS_EN;
      return Number(d) + ' ' + months[idx] + ' ' + y;
    });
    out = out.replace(/\b18 Aug 2026\b/g, currentLang() === 'bm' ? '19 Ogos 2026' : '19 August 2026');
    out = out.replace(/\b18 Ogos 2026\b/g, currentLang() === 'bm' ? '19 Ogos 2026' : '19 August 2026');
    return out;
  }

  function scrubVisibleText(root) {
    root = root || document.body;
    if (!root) return;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function (node) {
      var parent = node.parentElement;
      if (!parent || /^(SCRIPT|STYLE|TEXTAREA|OPTION)$/.test(parent.tagName)) return;
      var original = node.nodeValue || '';
      var trimmed = original.trim();
      if (/^(NA|N\/A)$/i.test(trimmed)) {
        node.nodeValue = original.replace(trimmed, '');
        return;
      }
      var updated = localiseDatesInText(original);
      if (updated !== original) node.nodeValue = updated;
    });
  }

  function stateOptionValue(row) {
    var name = String((row && row.state_name) || '').trim();
    if (!name) return '';
    return STATE_ID_BY_NAME[name] || name.toLowerCase().replace(/\s+/g, '-');
  }

  function populateHomeStates() {
    var select = document.getElementById('home_stateSelect');
    if (!select) return Promise.resolve(false);

    return fetch('/api/states', { method: 'GET', headers: { Accept: 'application/json' }, cache: 'no-store' })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        var rows = Array.isArray(data.states) ? data.states : [];
        if (!rows.length) throw new Error('No states returned');

        var previous = select.value || '';
        select.innerHTML = '';

        var placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = currentLang() === 'bm' ? 'Pilih negeri…' : 'Select state…';
        select.appendChild(placeholder);

        rows.forEach(function (row) {
          var name = String(row.state_name || '').trim();
          if (!name) return;
          var option = document.createElement('option');
          option.value = stateOptionValue(row);
          option.textContent = name;
          option.dataset.stateCode = String(row.state_code || '');
          option.dataset.jurisdictionType = String(row.jurisdiction_type || '');
          select.appendChild(option);
        });

        if (previous && Array.prototype.some.call(select.options, function (o) { return o.value === previous; })) {
          select.value = previous;
        }

        select.dataset.source = 'neon:state';
        select.dataset.count = String(rows.length);
        console.info('[Room for Both] home_stateSelect populated from /api/states:', rows.length);
        return true;
      })
      .catch(function (err) {
        console.warn('[Room for Both] Could not populate home state selector from /api/states:', err.message);
        return false;
      });
  }

  function hidePrintableGuidanceCard() {
    var button = document.getElementById('auth_printBtn');
    if (!button) return;
    button.style.display = 'none';
    button.setAttribute('aria-hidden', 'true');
    button.setAttribute('tabindex', '-1');
  }

  function refreshLanguageSensitiveUi() {
    var select = document.getElementById('home_stateSelect');
    if (select && select.options.length) {
      select.options[0].textContent = currentLang() === 'bm' ? 'Pilih negeri…' : 'Select state…';
    }
    scrubVisibleText(document.body);
  }

  function init() {
    hidePrintableGuidanceCard();
    scrubVisibleText(document.body);

    // Populate after the page's own scripts have finished initialising, then retry once
    // to prevent older hard-coded initialisation from overwriting the database result.
    setTimeout(function () {
      populateHomeStates().then(function () {
        setTimeout(populateHomeStates, 300);
      });
    }, 0);

    var bodyObserver = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        Array.prototype.forEach.call(mutation.addedNodes || [], function (node) {
          if (node.nodeType === Node.TEXT_NODE) {
            var original = node.nodeValue || '';
            var trimmed = original.trim();
            if (/^(NA|N\/A)$/i.test(trimmed)) node.nodeValue = original.replace(trimmed, '');
            else node.nodeValue = localiseDatesInText(original);
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            scrubVisibleText(node);
          }
        });
      });
    });
    bodyObserver.observe(document.body, { childList: true, subtree: true });

    var htmlObserver = new MutationObserver(refreshLanguageSensitiveUi);
    htmlObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
