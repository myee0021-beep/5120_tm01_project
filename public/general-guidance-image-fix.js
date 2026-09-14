(function () {
  'use strict';

  // Reuse the existing General Guidance artwork from main.
  var IMAGE_URL = 'https://raw.githubusercontent.com/myee0021-beep/5120_tm01_project/main/public/assets/general-guidance-wildlife.jpg?v=20260914';

  function isGeneralRoute() {
    try {
      return String((window.APP && window.APP.speciesId) || '').toLowerCase() === 'general' ||
        /general guidance|panduan am/i.test(document.body.innerText || '');
    } catch (e) {
      return false;
    }
  }

  function imageHtml() {
    return '<img src="' + IMAGE_URL + '" alt="General wildlife guidance illustration" style="width:100%;height:100%;object-fit:cover;display:block;border-radius:inherit" data-general-guidance-image="true">';
  }

  function patchBox(id) {
    var box = document.getElementById(id);
    if (!box) return;
    if (box.querySelector('img[data-general-guidance-image="true"]')) return;
    box.innerHTML = imageHtml();
  }

  function patchLikelyEmptyHeroBoxes() {
    var candidates = document.querySelectorAll('[id*="iconBox"], [id*="imageBox"], [data-general-guidance-image-target]');
    candidates.forEach(function (box) {
      var r = box.getBoundingClientRect();
      var text = (box.textContent || '').trim();
      if (r.width >= 80 && r.height >= 80 && !box.querySelector('img') && !text) {
        box.innerHTML = imageHtml();
      }
    });
  }

  function apply() {
    if (!isGeneralRoute()) return;
    ['wtd_iconBox','auth_iconBox','sp_iconBox','kif_iconBox'].forEach(patchBox);
    patchLikelyEmptyHeroBoxes();
  }

  function init() {
    apply();
    window.addEventListener('hashchange', function(){ setTimeout(apply, 50); });
    document.addEventListener('click', function(){ setTimeout(apply, 50); }, true);
    var obs = new MutationObserver(function(){ setTimeout(apply, 50); });
    obs.observe(document.body,{childList:true,subtree:true});
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
