(function () {
  'use strict';

  // Generic square wildlife illustration for the General Guidance route.
  // Load from GitHub raw so the image still renders even if the current
  // Cloudflare static-asset bundle has not picked up the binary correctly.
  var IMAGE_URL = 'https://raw.githubusercontent.com/myee0021-beep/5120_tm01_project/main/public/assets/general-guidance-wildlife.jpg';

  function isGeneralRoute() {
    try {
      return String((window.APP && window.APP.speciesId) || '').toLowerCase() === 'general';
    } catch (e) {
      return false;
    }
  }

  function styleImage(img) {
    if (!img) return;
    img.src = IMAGE_URL;
    img.alt = 'General wildlife guidance illustration';
    img.classList.remove('object-cover');
    img.classList.add('object-contain');
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'contain';
    img.style.padding = '2px';
    img.style.background = '#f7f5ef';
    img.dataset.generalGuidanceImage = 'true';
  }

  function imageHtml() {
    return '<img src="' + IMAGE_URL + '" alt="General wildlife guidance illustration" class="w-full h-full object-contain" style="width:100%;height:100%;object-fit:contain;padding:2px;background:#f7f5ef" data-general-guidance-image="true">';
  }

  function patchIconBox(id) {
    var box = document.getElementById(id);
    if (!box) return;

    var existing = box.querySelector('img[data-general-guidance-image="true"]');
    if (existing) {
      styleImage(existing);
      return;
    }

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

    document.querySelectorAll('img[alt="General guidance"], img[alt="Panduan Am"], img[alt="Dillenia suffruticosa"], img[data-general-guidance-image="true"]').forEach(styleImage);

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
