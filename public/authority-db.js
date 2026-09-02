(function () {
  'use strict';

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

  function categoryForCurrentRoute() {
    var db = window.RoomForBothDB;
    if (!db || !db.cache) return null;

    var species = typeof db.currentDbSpecies === 'function' ? db.currentDbSpecies() : null;
    if (species && Number(species.category_id) > 0) return Number(species.category_id);

    var route = '';
    try { route = String((window.APP && window.APP.speciesId) || '').toLowerCase(); } catch (e) {}

    // Generic snake has no species row by design. Resolve its authority category
    // only from the database category metadata; never use a hard-coded category id.
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

  function populateStateSelectFromDb() {
    var db = window.RoomForBothDB;
    var select = document.getElementById('auth_stateSelect');
    if (!db || !db.cache || !select) return false;

    var rows = Array.isArray(db.cache.states) ? db.cache.states : [];
    if (!rows.length) return false;

    var previous = select.value || (window.APP && window.APP.stateId) || '';
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

    // Preserve the state selected elsewhere in the app by matching either the
    // numeric DB state_code or the human-readable state name.
    if (previous) {
      var prevText = String(previous).toLowerCase();
      var match = Array.prototype.find.call(select.options, function (o) {
        return o.value === String(previous) || text(o.textContent).toLowerCase() === prevText;
      });
      if (match) select.value = match.value;
    }

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

  function showAuthority(row) {
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
    if (desc) desc.textContent = text(row.what_they_do) || text(row.contact_route) || '—';
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
      var phone = contact.replace(/[^0-9+]/g, '');
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

    if (contactBlock) contactBlock.dataset.source = 'neon:authority';
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
        showAuthority(rows[0]);
        return true;
      }

      // Some authority categories (for example a national emergency line) are
      // stored once rather than duplicated for every state. Use such a row only
      // when the database itself returns exactly one authority for the category.
      return db.getAuthorities(categoryId).then(function (allData) {
        var allRows = Array.isArray(allData.authorities) ? allData.authorities : [];
        if (allRows.length === 1) {
          showAuthority(allRows[0]);
          return true;
        }
        showNoContact(
          'No verified database authority record is available for ' + stateName + ' and this animal category.',
          'Tiada rekod agensi pangkalan data yang disahkan untuk ' + stateName + ' dan kategori haiwan ini.'
        );
        return false;
      });
    }).catch(function (err) {
      console.warn('[Room for Both] Authority database lookup failed:', err.message);
      showNoContact(
        'The authority database could not be reached. No fallback phone number is being shown.',
        'Pangkalan data agensi tidak dapat dicapai. Tiada nombor telefon sandaran dipaparkan.'
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
      if (event.target && event.target.id === 'auth_stateSelect') {
        setTimeout(fetchAuthorityForSelection, 0);
      }
    }, true);

    window.addEventListener('roomforboth:db-ready', function () {
      setTimeout(renderAuthorityFromDb, 0);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
})();
