(function () {
  'use strict';

  var TITLE_MAP = {
    home: { en: 'Room for Both', bm: 'Ruang Bersama' },
    identify: { en: 'Identify wildlife | Room for Both', bm: 'Kenal pasti hidupan liar | Ruang Bersama' },
    species: { en: 'Species information | Room for Both', bm: 'Maklumat spesies | Ruang Bersama' },
    whattodo: { en: 'What to do now | Room for Both', bm: 'Apa perlu dilakukan sekarang | Ruang Bersama' },
    snakewhattodo: { en: 'Immediate safety steps | Room for Both', bm: 'Langkah keselamatan segera | Ruang Bersama' },
    authority: { en: 'Who deals with this | Room for Both', bm: 'Siapa yang mengendalikan ini | Ruang Bersama' },
    findable: { en: 'Keep it findable | Room for Both', bm: 'Kekalkan boleh dijumpai | Ruang Bersama' },
    stopback: { en: 'Stop it coming back | Room for Both', bm: 'Cegah ia kembali | Ruang Bersama' },
    states: { en: 'State profiles | Room for Both', bm: 'Profil negeri | Ruang Bersama' },
    statedetail: { en: 'State profile | Room for Both', bm: 'Profil negeri | Ruang Bersama' },
    about: { en: 'About the data | Room for Both', bm: 'Tentang data | Ruang Bersama' }
  };

  var BM_REPLACEMENTS = [
    [/—\s*select a state\s*—/gi, '— pilih negeri —'],
    [/\bVerified:/g, 'Disahkan:'],
    [/\bDatabase source\b/g, 'Sumber pangkalan data'],
    [/\bWildlife management and response\b/g, 'Pengurusan dan tindak balas hidupan liar'],
    [/\bNot specified\b/g, 'Tidak dinyatakan']
  ];

  var EN_REPLACEMENTS = [
    [/—\s*pilih negeri\s*—/gi, '— select a state —'],
    [/\bDisahkan:/g, 'Verified:'],
    [/\bSumber pangkalan data\b/g, 'Database source'],
    [/\bPengurusan dan tindak balas hidupan liar\b/g, 'Wildlife management and response'],
    [/\bTidak dinyatakan\b/g, 'Not specified']
  ];

  function lang() {
    return document.documentElement.lang === 'bm' ? 'bm' : 'en';
  }

  function currentPage() {
    if (window.APP && APP.currentPage) return APP.currentPage;
    var visible = document.querySelector('.page:not(.hidden)');
    return visible && visible.id ? visible.id.replace(/^page-/, '') : 'home';
  }

  function syncTitle(page) {
    page = page || currentPage();
    var entry = TITLE_MAP[page] || TITLE_MAP.home;
    var desired = entry[lang()] || entry.en;
    if (document.title !== desired) document.title = desired;
  }

  function replaceTextIn(root) {
    root = root || document.body;
    if (!root) return;
    var replacements = lang() === 'bm' ? BM_REPLACEMENTS : EN_REPLACEMENTS;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function (node) {
      var parent = node.parentElement;
      if (!parent || /^(SCRIPT|STYLE|TEXTAREA|OPTION)$/.test(parent.tagName)) return;
      var original = node.nodeValue || '';
      var updated = original;
      replacements.forEach(function (pair) { updated = updated.replace(pair[0], pair[1]); });
      if (updated !== original) node.nodeValue = updated;
    });
  }

  function localiseStatePlaceholders() {
    document.querySelectorAll('select').forEach(function (select) {
      Array.prototype.forEach.call(select.options || [], function (option) {
        var text = String(option.textContent || '').trim();
        if (/^—?\s*select a state\s*—?$/i.test(text) || /^Select state…?$/i.test(text) || /^Pilih negeri…?$/i.test(text) || /^—?\s*pilih negeri\s*—?$/i.test(text)) {
          var desired = lang() === 'bm' ? '— pilih negeri —' : '— select a state —';
          if (option.textContent !== desired) option.textContent = desired;
        }
      });
    });
  }

  function removeStrayAuthorityNotSpecified() {
    var page = document.getElementById('page-authority');
    if (!page) return;
    var walker = document.createTreeWalker(page, NodeFilter.SHOW_TEXT);
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function (node) {
      var text = String(node.nodeValue || '').trim();
      if (text !== 'Not specified' && text !== 'Tidak dinyatakan') return;
      var el = node.parentElement;
      if (!el) return;
      if (String(el.textContent || '').trim() === text) {
        el.remove();
      } else {
        node.nodeValue = '';
      }
    });
  }

  function makeDescribeConfirmBilingual() {
    var panel = document.getElementById('panel-describe');
    if (!panel) return;
    panel.querySelectorAll('.confirm-btn').forEach(function (btn) {
      if (btn.dataset.bilingualConfirm === '1') return;
      var en = btn.querySelector('[data-en]');
      var bm = btn.querySelector('[data-bm]');
      if (en) {
        en.removeAttribute('data-en');
        en.textContent = 'Confirm / Sahkan';
      }
      if (bm) bm.remove();
      btn.dataset.bilingualConfirm = '1';
    });
  }

  function resetIdentify() {
    var page = document.getElementById('page-identify');
    if (!page) return;

    var input = document.getElementById('id_describeInput');
    if (input && input.value) input.value = '';

    var matches = document.getElementById('id_describeMatches');
    if (matches) matches.classList.add('hidden');

    var matchGrid = document.getElementById('id_describeMatchGrid');
    if (matchGrid && matchGrid.innerHTML) matchGrid.innerHTML = '';

    var guidedGrid = document.getElementById('id_guidedResultGrid');
    if (guidedGrid && guidedGrid.innerHTML) guidedGrid.innerHTML = '';

    page.querySelectorAll('.id-card.selected').forEach(function (card) { card.classList.remove('selected'); });
    page.querySelectorAll('.guided-step').forEach(function (step) { step.classList.add('hidden'); });
    var firstStep = document.getElementById('id_guidedStep0');
    if (firstStep) firstStep.classList.remove('hidden');

    page.querySelectorAll('.route-tab').forEach(function (tab) { tab.classList.remove('active'); });
    page.querySelectorAll('.route-panel').forEach(function (panel) { panel.classList.remove('active'); });
    var describeTab = page.querySelector('.route-tab[data-route="describe"]');
    var describePanel = document.getElementById('panel-describe');
    if (describeTab) describeTab.classList.add('active');
    if (describePanel) describePanel.classList.add('active');

    if (typeof window.guidedAnswers !== 'undefined') {
      window.guidedAnswers = { size: null, covering: null, location: null };
    }
    if (window.APP) APP.speciesId = null;
  }

  function installGoToWrapper() {
    if (typeof window.goTo !== 'function' || window.goTo.__mentorReviewWrapped) return;
    var originalGoTo = window.goTo;
    var wrapped = function (page, opts) {
      if (page === 'identify') resetIdentify();
      var result = originalGoTo.apply(this, arguments);
      setTimeout(function () {
        if (page === 'identify') resetIdentify();
        applyAll(page);
      }, 0);
      return result;
    };
    wrapped.__mentorReviewWrapped = true;
    wrapped.__originalGoTo = originalGoTo;
    window.goTo = wrapped;
  }

  function applyAll(page) {
    replaceTextIn(document.body);
    localiseStatePlaceholders();
    removeStrayAuthorityNotSpecified();
    makeDescribeConfirmBilingual();
    syncTitle(page);
  }

  function init() {
    installGoToWrapper();
    applyAll();

    var scheduled = false;
    function scheduleApply() {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(function () {
        scheduled = false;
        installGoToWrapper();
        applyAll();
      });
    }

    var bodyObserver = new MutationObserver(scheduleApply);
    bodyObserver.observe(document.body, { childList: true, subtree: true });

    var htmlObserver = new MutationObserver(function () {
      applyAll();
    });
    htmlObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
