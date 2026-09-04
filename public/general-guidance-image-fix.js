(function () {
  'use strict';

  // Square wildlife illustration optimized for the General Guidance route.
  // It is a generic illustration, not a species photo, so no iNaturalist
  // credit/source is shown underneath it.
  var IMAGE_URL = '/assets/general-guidance-wildlife.jpg';

  function isGeneralRoute() {
    try {
      return String((window.APP && window.APP.speciesId) || '').toLowerCase() === 'general';
    } catch (e) {
      return false;
    }
  }

  function imageHtml() {
    return '<img src="' + IMAGE_URL + '" alt="General wildlife guidance illustration" class="w-full h-full object-contain" style="padding:3px;background:#f7f5ef" data-general-guidance-image="true">';
  }

  function patchIconBox(id) {
    var box = document.getElementById(id);
    if (!box) return;

    // Important: do not recreate the <img> on every MutationObserver pass.
    // Replacing it repeatedly can restart the request before the image finishes
    // loading and leaves the card looking blank.
    var existing = box.querySelector('img[data-general-guidance-image="true"]');
    if (existing) return;

    box.innerHTML = imageHtml();
  }

  function hidePhotoCredits() {
    ['wtd_photoCredit', 'auth_photoCredit', 'sp_photoCredit', 'kif_photoCredit'].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.classList.add('hidden');
      el.style.display = 'none';
    });

    ['wtd_photoSourceLink', 'auth_photoSourceLink', 'sp_photoSourceLink', 'kif_photoSourceLink'].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.removeAttribute('href');
      el.style.display = 'none';
    });
  }

  function patchVisibleGeneralImage() {
    if (!isGeneralRoute()) return;

    ['wtd_iconBox', 'auth_iconBox', 'sp_iconBox', 'kif_iconBox'].forEach(patchIconBox);

    document.querySelectorAll('img[alt="General guidance"], img[alt="Panduan Am"], img[alt="Dillenia suffruticosa"]').forEach(function (img) {
      if (img.dataset.generalGuidanceImage === 'true') return;
      img.src = IMAGE_URL;
      img.alt = 'General wildlife guidance illustration';
      img.classList.remove('object-cover');
      img.classList.add('object-contain');
      img.style.padding = '3px';
      img.style.background = '#f7f5ef';
      img.dataset.generalGuidanceImage = 'true';
      img.onerror = null;
    });

    hidePhotoCredits();
  }

  function apply() {
    patchVisibleGeneralImage();
  }

  function init() {
    apply();
    document.addEventListener('click', function () { setTimeout(apply, 0); }, true);
    window.addEventListener('hashchange', function () { setTimeout(apply, 0); });
    window.addEventListener('roomforboth:db-ready', function () { setTimeout(apply, 0); });

    var observer = new MutationObserver(function () {
      setTimeout(apply, 0);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
