(function () {
  'use strict';

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function clean(value) {
    if (value == null) return '';
    var text = String(value).trim();
    if (!text || text.toUpperCase() === 'NA' || text.toUpperCase() === 'N/A') return '';
    return text;
  }

  function labelForTable(table) {
    return {
      species_behaviour: 'Behaviour guidance',
      immediate_action: 'Immediate action',
      prevention_action: 'Prevention action',
      authority: 'Authority contact'
    }[table] || table;
  }

  function findHost() {
    var page = document.getElementById('page-about');
    if (!page) return null;
    return page.querySelector('#about_database_sources') || page.querySelector('tbody[data-database-sources]');
  }

  function renderSources(payload) {
    var host = findHost();
    if (!host) return;
    var rows = Array.isArray(payload && payload.sources) ? payload.sources : [];

    if (!rows.length) {
      host.innerHTML = '<tr><td colspan="4" class="py-6 text-sm text-slate-500">No verified source records are currently stored in the database.</td></tr>';
      host.setAttribute('data-source', 'neon:data-sources:empty');
      return;
    }

    host.innerHTML = rows.map(function (row) {
      var institution = clean(row.source_institution);
      var person = clean(row.source_person);
      var url = clean(row.source_url);
      var name = institution || person || 'Source record';
      var usage = labelForTable(row.source_table);
      if (row.species_name) usage += ' · ' + row.species_name;
      else if (row.category_name) usage += ' · ' + row.category_name;
      if (clean(row.jurisdiction)) usage += ' · ' + clean(row.jurisdiction);
      var verified = clean(row.date_verified) || 'Not recorded';
      var link = url
        ? '<a href="' + esc(url) + '" target="_blank" rel="noopener" class="text-forest-600 hover:text-forest-800 font-semibold">View original source ↗</a>'
        : '<span class="text-slate-400">No URL recorded</span>';

      return '<tr>' +
        '<td class="py-4 pr-4 font-display font-bold text-forest-950">' + esc(name) + (person && institution ? '<div class="mt-1 text-xs font-normal text-slate-500">' + esc(person) + '</div>' : '') + '</td>' +
        '<td class="py-4 pr-4 text-slate-600">' + esc(usage) + '</td>' +
        '<td class="py-4 pr-4 text-slate-500 text-sm">' + esc(verified) + '</td>' +
        '<td class="py-4">' + link + '</td>' +
      '</tr>';
    }).join('');
    host.setAttribute('data-source', 'neon:data-sources');
  }

  function loadSources() {
    var host = findHost();
    if (!host) return Promise.resolve(false);
    host.innerHTML = '<tr><td colspan="4" class="py-6 text-sm text-slate-500">Loading verified database sources…</td></tr>';
    return fetch('/api/data-sources', { headers: { Accept: 'application/json' } })
      .then(function (response) {
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return response.json();
      })
      .then(function (payload) {
        renderSources(payload);
        return true;
      })
      .catch(function (error) {
        console.error('[Room for Both] Data sources API failed', error);
        host.innerHTML = '<tr><td colspan="4" class="py-6 text-sm text-rose-600">Verified database sources could not be loaded.</td></tr>';
        host.setAttribute('data-source', 'neon:data-sources:error');
        return false;
      });
  }

  document.addEventListener('DOMContentLoaded', loadSources);
  window.addEventListener('roomforboth:db-ready', loadSources);
  window.RoomForBothDataSources = { reload: loadSources };
})();
