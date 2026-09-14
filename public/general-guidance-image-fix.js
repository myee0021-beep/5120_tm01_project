(function () {
  'use strict';

  var IMAGE_URL = '/assets/general-guidance-wildlife.jpg?v=20260914-3';
  var TARGET_IDS = ['wtd_iconBox','auth_iconBox','sp_iconBox','kif_iconBox'];

  function isGeneral(doc, win) {
    try {
      if (win && win.APP && String(win.APP.speciesId || '').toLowerCase() === 'general') return true;
    } catch (e) {}
    try {
      return /general guidance|panduan am/i.test((doc.body && doc.body.innerText) || '');
    } catch (e) {
      return false;
    }
  }

  function imageHtml() {
    return '<img src="' + IMAGE_URL + '" alt="General wildlife guidance illustration" ' +
      'style="width:100%;height:100%;object-fit:cover;display:block;border-radius:inherit" ' +
      'data-general-guidance-image="true">';
  }

  function patchDoc(doc, win) {
    if (!doc || !isGeneral(doc, win)) return;
    TARGET_IDS.forEach(function (id) {
      var box = doc.getElementById(id);
      if (!box) return;
      var existing = box.querySelector('img[data-general-guidance-image="true"]');
      if (!existing) box.innerHTML = imageHtml();
    });
    ['wtd_photoCredit','auth_photoCredit','sp_photoCredit','kif_photoCredit'].forEach(function (id) {
      var el = doc.getElementById(id);
      if (el) el.style.display = 'none';
    });
  }

  function patchOuter() { patchDoc(document, window); }
  function patchEmergencyFrame() {
    var frame = document.getElementById('emergency__frame');
    if (!frame) return;
    try {
      var doc = frame.contentDocument || (frame.contentWindow && frame.contentWindow.document);
      var win = frame.contentWindow;
      if (!doc) return;
      patchDoc(doc, win);
      if (!frame.__generalImageObserver && doc.body) {
        frame.__generalImageObserver = new MutationObserver(function () { setTimeout(function(){ patchDoc(doc, win); }, 0); });
        frame.__generalImageObserver.observe(doc.body, { childList:true, subtree:true, attributes:true, attributeFilter:['class','hidden'] });
      }
      if (!frame.__generalImageClickHook && doc) {
        doc.addEventListener('click', function(){ setTimeout(function(){ patchDoc(doc, win); }, 0); setTimeout(function(){ patchDoc(doc, win); }, 80); }, true);
        frame.__generalImageClickHook = true;
      }
    } catch (e) { console.warn('[general-guidance-image-fix] iframe patch failed', e); }
  }

  function apply() { patchOuter(); patchEmergencyFrame(); }
  function init() {
    var frame = document.getElementById('emergency__frame');
    if (frame) frame.addEventListener('load', function(){ setTimeout(apply, 0); setTimeout(apply, 150); });
    apply();setTimeout(apply, 200);setTimeout(apply, 800);
    window.addEventListener('hashchange', function(){ setTimeout(apply, 0); });
    document.addEventListener('click', function(){ setTimeout(apply, 0); setTimeout(apply, 100); }, true);
    var obs = new MutationObserver(function(){ setTimeout(apply, 0); });
    obs.observe(document.body, { childList:true, subtree:true, attributes:true, attributeFilter:['hidden','class'] });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
