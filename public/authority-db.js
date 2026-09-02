(function () {
  'use strict';

  var HQ_JURISDICTION = 'National / Headquarters';
  var HQ_FALLBACK_STATES = ['Putrajaya', 'Sabah', 'Sarawak'];

  function text(value) {
    if (value === null || value === undefined) return '';
    var out = String(value).trim();
    return /^(NA|N\/A)$/i.test(out) ? '' : out;
  }

  function currentLang() {
    return document.documentElement.lang === 'bm' ? 'bm' : 'en';
  }

  function stateNameFromSelect(select) {
    if (!select) return '';
    var option = select.options && select.selectedIndex >= 0 ? select.options[select.selectedIndex] : null;
    return option ? text(option.textContent).replace(/^—\s*|\s*—$/g, '').trim() : '';
  }

  function formatVerified(value) {
    var raw = text(value);
    if (!raw) return currentLang() === 'bm' ? 'Disahkan dalam pangkalan data' : 'Verified in database';
    var d = new Date(raw);
    if (isNaN(d.getTime())) return (currentLang() === 'bm' ? 'Disahkan: ' : 'Verified: ') + raw;
    var locale = currentLang() === 'bm' ? 'ms-MY' : 'en-GB';
    return (currentLang() === 'bm' ? 'Disahkan: ' : 'Verified: ') + d.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function currentRouteId() {
    try { return String((window.APP && window.APP.speciesId) || '').toLowerCase(); }
    catch (e) { return ''; }
  }

  function categoryForCurrentRoute() {
    var db = window.RoomForBothDB;
    if (!db || !db.cache) return null;

    var species = typeof db.currentDbSpecies === 'function' ? db.currentDbSpecies() : null;
    if (species && Number(species.category_id) > 0) return Number(species.category_id);

    var route = currentRouteId();
    if (route === 'snake') {
      var candidates = (db.cache.categories || []).filter(function (row) {
        var haystack = [row.category_name, row.description, row.responsible_body_type]
          .map(function (v) { return text(v).toLowerCase(); }).join(' ');
        return /snake|bomba|fire|emergency/.test(haystack);
      });
      if (candidates.length === 1 && Number(candidates[0].category_id) > 0) return Number(candidates[0].category_id);
    }

    return null;
  }

  function firstDbCategoryId() {
    var db = window.RoomForBothDB;
    var rows = db && db.cache && Array.isArray(db.cache.categories) ? db.cache.categories : [];
    var found = rows.find(function (row) { return Number(row.category_id) > 0; });
    return found ? Number(found.category_id) : null;
  }

  function populateStateSelectFromDb() {
    var db = window.RoomForBothDB;
    var select = document.getElementById('auth_stateSelect');
    if (!db || !db.cache || !select) return false;

    var rows = Array.isArray(db.cache.states) ? db.cache.states : [];
    if (!rows.length) return false;

    var previous = select.value || (window.APP && window.APP.stateId) || '';
    var previousName = stateNameFromSelect(select);
    select.innerHTML = '';

    var placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = currentLang() === 'bm' ? '— pilih negeri —' : '— select a state —';
    select.appendChild(placeholder);

    rows.forEach(function (row) {
      var name = text(row.state_name);
      if (!name) return;
      var option = document.createElement('option');
      option.value = String(row.state_code || '');
      option.textContent = name;
      option.dataset.stateCode = String(row.state_code || '');
      option.dataset.jurisdictionType = text(row.jurisdiction_type);
      select.appendChild(option);
    });

    var match = Array.prototype.find.call(select.options, function (o) {
      return (previous && o.value === String(previous)) ||
        (previousName && text(o.textContent).toLowerCase() === previousName.toLowerCase());
    });
    if (match) select.value = match.value;

    select.dataset.source = 'neon:state';
    select.dataset.count = String(rows.length);
    select.dataset.dbPopulated = 'true';
    return true;
  }

  function showNoContact(messageEn, messageBm) {
    var contactBlock = document.getElementById('auth_contactBlock');
    var noContact = document.getElementById('auth_noContactBlock');
    if (contactBlock) contactBlock.classList.add('hidden');
    if (noContact) {
      noContact.classList.remove('hidden');
      var p = noContact.querySelector('p');
      if (p) p.innerHTML = '<span data-en>' + messageEn + '</span><span data-bm>' + messageBm + '</span>';
    }
  }

  function showAuthority(row, isHqFallback) {
    var contactBlock = document.getElementById('auth_contactBlock');
    var noContact = document.getElementById('auth_noContactBlock');
    var categoryNote = document.getElementById('auth_categoryNote');
    if (contactBlock) contactBlock.classList.remove('hidden');
    if (noContact) noContact.classList.add('hidden');

    var name = document.getElementById('auth_authorityName');
    var desc = document.getElementById('auth_authorityDesc');
    var verified = document.querySelector('#auth_authorityVerified span');
    var source = document.getElementById('auth_authoritySource');
    var number = document.getElementById('auth_callNumber');
    var call = document.getElementById('auth_callBtn');

    if (name) name.textContent = text(row.agency_name) || '—';
    if (desc) {
      var baseDesc = text(row.what_they_do) || text(row.contact_route) || '—';
      if (isHqFallback) {
        baseDesc += currentLang() === 'bm'
          ? ' — digunakan sebagai hubungan ibu pejabat kerana rekod negeri khusus belum tersedia.'
          : ' — used as the headquarters fallback because no state-specific record is available.';
      }
      desc.textContent = baseDesc;
    }
    if (verified) verified.textContent = formatVerified(row.last_verified);

    if (source) {
      source.innerHTML = '';
      var sourceUrl = text(row.source_url);
      if (sourceUrl) {
        var a = document.createElement('a');
        a.href = sourceUrl;
        a.target = '_blank';
        a.rel = 'noopener';
        a.className = 'underline underline-offset-2 hover:text-forest-700';
        a.textContent = currentLang() === 'bm' ? 'Sumber pangkalan data ↗' : 'Database source ↗';
        source.appendChild(a);
      } else {
        source.textContent = currentLang() === 'bm' ? 'Sumber: pangkalan data Neon' : 'Source: Neon database';
      }
    }

    var contact = text(row.contact_value);
    if (number) number.textContent = contact || '—';
    if (call) {
      var phoneMatch = contact.match(/\+?[0-9][0-9\-\s]{2,}/);
      var phone = phoneMatch ? phoneMatch[0].replace(/[^0-9+]/g, '') : '';
      call.href = phone ? 'tel:' + phone : '#';
      call.classList.toggle('pointer-events-none', !phone);
      call.classList.toggle('opacity-50', !phone);
    }

    if (categoryNote) {
      var note = text(row.response_standard);
      if (note) {
        categoryNote.classList.remove('hidden');
        var p = categoryNote.querySelector('p');
        if (p) p.textContent = note;
      } else {
        categoryNote.classList.add('hidden');
      }
    }

    if (contactBlock) {
      contactBlock.dataset.source = 'neon:authority';
      contactBlock.dataset.fallback = isHqFallback ? 'national-headquarters' : 'none';
    }
  }

  function fetchHq(categoryId, fallbackReason) {
    var db = window.RoomForBothDB;
    if (!db || typeof db.getAuthorities !== 'function' || !categoryId) return Promise.resolve(false);

    return db.getAuthorities(categoryId, HQ_JURISDICTION).then(function (data) {
      var rows = Array.isArray(data.authorities) ? data.authorities : [];
      if (!rows.length) return false;
      showAuthority(rows[0], Boolean(fallbackReason));
      return true;
    });
  }

  function fetchAuthorityForSelection() {
    var db = window.RoomForBothDB;
    var select = document.getElementById('auth_stateSelect');
    if (!db || typeof db.getAuthorities !== 'function' || !select) return Promise.resolve(false);

    var stateName = stateNameFromSelect(select);
    if (!stateName || !select.value) {
      showNoContact(
        'Select your state above to load the authority and phone number from the database.',
        'Pilih negeri anda di atas untuk memuatkan agensi dan nombor telefon daripada pangkalan data.'
      );
      return Promise.resolve(false);
    }

    var categoryId = categoryForCurrentRoute();

    // General Guidance has no confirmed species/category. The DB stores the same
    // National / Headquarters contact across authority categories, so select a
    // real category id from the DB and read the HQ record rather than hard-coding a number.
    if (!categoryId && currentRouteId() === 'general') {
      var generalCategoryId = firstDbCategoryId();
      if (!generalCategoryId) {
        showNoContact(
          'The National / Headquarters database contact could not be resolved.',
          'Hubungan pangkalan data National / Headquarters tidak dapat dikenal pasti.'
        );
        return Promise.resolve(false);
      }
      return fetchHq(generalCategoryId, 'general').then(function (ok) {
        if (!ok) showNoContact(
          'No verified National / Headquarters contact is available in the database.',
          'Tiada hubungan National / Headquarters yang disahkan tersedia dalam pangkalan data.'
        );
        return ok;
      });
    }

    if (!categoryId) {
      showNoContact(
        'A specific authority cannot be loaded until the animal category is confirmed in the database.',
        'Agensi khusus tidak boleh dimuatkan sehingga kategori haiwan disahkan dalam pangkalan data.'
      );
      return Promise.resolve(false);
    }

    return db.getAuthorities(categoryId, stateName).then(function (data) {
      var rows = Array.isArray(data.authorities) ? data.authorities : [];
      if (rows.length) {
        showAuthority(rows[0], false);
        return true;
      }

      // Putrajaya, Sabah and Sarawak are currently present in the state table but
      // do not have state-specific authority rows. For those three only, read the
      // verified National / Headquarters contact from Neon. Do not hard-code 999.
      if (HQ_FALLBACK_STATES.indexOf(stateName) !== -1) {
        return fetchHq(categoryId, stateName).then(function (ok) {
          if (!ok) showNoContact(
            'No verified state or National / Headquarters contact is available in the database for ' + stateName + '.',
            'Tiada hubungan negeri atau National / Headquarters yang disahkan tersedia dalam pangkalan data untuk ' + stateName + '.'
          );
          return ok;
        });
      }

      showNoContact(
        'No verified database authority record is available for ' + stateName + ' and this animal category.',
        'Tiada rekod agensi pangkalan data yang disahkan untuk ' + stateName + ' dan kategori haiwan ini.'
      );
      return false;
    }).catch(function (err) {
      console.warn('[Room for Both] Authority database lookup failed:', err.message);
      showNoContact(
        'The authority database could not be reached. No hard-coded fallback phone number is being shown.',
        'Pangkalan data agensi tidak dapat dicapai. Tiada nombor telefon sandaran berkod keras dipaparkan.'
      );
      return false;
    });
  }

  function renderAuthorityFromDb() {
    populateStateSelectFromDb();
    return fetchAuthorityForSelection();
  }

  function install() {
    var db = window.RoomForBothDB;
    if (!db) return;

    Promise.resolve(db.ready).then(function () {
      populateStateSelectFromDb();
      renderAuthorityFromDb();
    });

    if (typeof window.render_authority === 'function' && !window.render_authority.__neonAuthorityWrapped) {
      var original = window.render_authority;
      window.render_authority = function () {
        var result = original.apply(this, arguments);
        Promise.resolve(window.RoomForBothDB.ready).then(function () {
          setTimeout(renderAuthorityFromDb, 0);
        });
        return result;
      };
      window.render_authority.__neonAuthorityWrapped = true;
    }

    document.addEventListener('change', function (event) {
      if (event.target && event.target.id === 'auth_stateSelect') setTimeout(fetchAuthorityForSelection, 0);
    }, true);

    window.addEventListener('roomforboth:db-ready', function () {
      setTimeout(renderAuthorityFromDb, 0);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
})();
