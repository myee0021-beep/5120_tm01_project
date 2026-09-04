(function () {
  'use strict';

  // User-provided generic wildlife illustration for the General Guidance route.
  // This is not a species photo, so no iNaturalist credit/source is shown.
  var IMAGE_URL = '/assets/general-guidance-wildlife.jpg';

  function isGeneralRoute() {
    try {
      return String((window.APP && window.APP.speciesId) || '').toLowerCase() === 'general';
    } catch (e) {
      return false;
    }
  }

  function imageHtml() {
    return '<img src="' + IMAGE_URL + '" alt="General wildlife guidance illustration" class="w-full h-full object-cover" data-general-guidance-image="true">';
  }

  function patchIconBox(id) {
    var box = document.getElementById(id);
    if (!box) return;
    if (box.querySelector('img[data-general-guidance-image="true"]')) return;
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

    // Replace the old flower/species-photo slot everywhere the General Guidance
    // identity header appears, without changing the rainforest hero background.
    ['wtd_iconBox', 'auth_iconBox', 'sp_iconBox', 'kif_iconBox'].forEach(patchIconBox);

    document.querySelectorAll('img[alt="General guidance"], img[alt="Panduan Am"], img[alt="Dillenia suffruticosa"]').forEach(function (img) {
      img.src = IMAGE_URL;
      img.alt = 'General wildlife guidance illustration';
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
