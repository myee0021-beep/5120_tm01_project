(function () {
  'use strict';

  var STATE_DATA = {
    selangor: { name: 'Selangor', records: 11055, topSpecies: 'House Crow', scientific: 'Corvus splendens', topSpeciesRecords: 6057 },
    penang: { name: 'Pulau Pinang', records: 8428, topSpecies: 'House Crow', scientific: 'Corvus splendens', topSpeciesRecords: 3959 },
    sabah: { name: 'Sabah', records: 4563, topSpecies: 'Long-tailed Macaque', scientific: 'Macaca fascicularis', topSpeciesRecords: 1713 },
    kl: { name: 'Kuala Lumpur', records: 4329, topSpecies: 'House Crow', scientific: 'Corvus splendens', topSpeciesRecords: 2164 },
    johor: { name: 'Johor', records: 3563, topSpecies: 'House Crow', scientific: 'Corvus splendens', topSpeciesRecords: 1665 },
    'negeri-sembilan': { name: 'Negeri Sembilan', records: 3470, topSpecies: 'Common Myna', scientific: 'Acridotheres tristis', topSpeciesRecords: 1918 },
    pahang: { name: 'Pahang', records: 2881, topSpecies: 'Common Myna', scientific: 'Acridotheres tristis', topSpeciesRecords: 2007 },
    kedah: { name: 'Kedah', records: 2485, topSpecies: 'Common Myna', scientific: 'Acridotheres tristis', topSpeciesRecords: 1565 },
    perak: { name: 'Perak', records: 2263, topSpecies: 'Common Myna', scientific: 'Acridotheres tristis', topSpeciesRecords: 1684 },
    sarawak: { name: 'Sarawak', records: 1743, topSpecies: 'Common Myna', scientific: 'Acridotheres tristis', topSpeciesRecords: 975 },
    melaka: { name: 'Melaka', records: 1109, topSpecies: 'House Crow', scientific: 'Corvus splendens', topSpeciesRecords: 561 },
    perlis: { name: 'Perlis', records: 402, topSpecies: 'Common Myna', scientific: 'Acridotheres tristis', topSpeciesRecords: 375 },
    putrajaya: { name: 'Putrajaya', records: 361, topSpecies: 'House Crow', scientific: 'Corvus splendens', topSpeciesRecords: 201 },
    terengganu: { name: 'Terengganu', records: 200, topSpecies: 'Common Myna', scientific: 'Acridotheres tristis', topSpeciesRecords: 123 },
    kelantan: { name: 'Kelantan', records: 163, topSpecies: 'Common Myna', scientific: 'Acridotheres tristis', topSpeciesRecords: 143 },
    labuan: { name: 'Labuan', records: 12, topSpecies: 'Common Water Monitor', scientific: 'Varanus salvator', topSpeciesRecords: 7 }
  };

  var SPECIES_ID_BY_ENGLISH = {
    'House Crow': 'house-crow',
    'Long-tailed Macaque': 'macaque',
    'Common Myna': 'common-myna',
    'Common Water Monitor': 'water-monitor',
    'Reticulated Python': 'reticulated-python'
  };

  function fmt(n) { return Number(n || 0).toLocaleString('en-US'); }

  function stateIdFromCard(card) {
    var onclick = card.getAttribute('onclick') || '';
    var m = onclick.match(/state\s*:\s*['\"]([^'\"]+)['\"]/i);
    return m ? m[1] : '';
  }

  function updateStateCard(card) {
    var id = stateIdFromCard(card);
    var row = STATE_DATA[id];
    if (!row || card.getAttribute('data-state-occurrence-applied') === 'true') return;

    var paragraphs = card.querySelectorAll('p');
    Array.prototype.forEach.call(paragraphs, function (p) {
      var text = (p.textContent || '').trim();
      if (/Top species|Spesies utama/i.test(text)) {
        p.innerHTML = '<span data-en>Top species</span><span data-bm>Spesies utama</span>: ' + row.topSpecies;
        p.title = row.scientific + ' — ' + fmt(row.topSpeciesRecords) + ' records in this state';
      }
    });

    var spans = card.querySelectorAll('span');
    Array.prototype.forEach.call(spans, function (span) {
      var text = (span.textContent || '').trim();
      if (/^[\d,]+\s*(records|rekod)?$/i.test(text) || (/^[\d,]+$/.test(text) && span.querySelector('[data-en], [data-bm]'))) {
        span.innerHTML = fmt(row.records) + ' <span data-en>records</span><span data-bm>rekod</span>';
      }
    });

    card.setAttribute('data-source', 'state_occurrence_summary.csv');
    card.setAttribute('data-occurrence-records', String(row.records));
    card.setAttribute('data-top-species', row.topSpecies);
    card.setAttribute('data-state-occurrence-applied', 'true');
  }

  function updateStateCards() {
    var page = document.getElementById('page-states');
    if (!page) return;
    var cards = page.querySelectorAll('a[onclick*="statedetail"][onclick*="state"]');
    Array.prototype.forEach.call(cards, updateStateCard);
  }

  function updateSharedStateDataset() {
    if (!Array.isArray(window.STATES)) return;
    window.STATES.forEach(function (state) {
      var row = STATE_DATA[state.id];
      if (!row) return;
      state.records = fmt(row.records);
      state.topSpeciesId = SPECIES_ID_BY_ENGLISH[row.topSpecies] || state.topSpeciesId;
      state.topSpeciesName = row.topSpecies;
      state.topSpeciesScientific = row.scientific;
      state.topSpeciesRecords = row.topSpeciesRecords;
    });
  }

  function apply() {
    updateSharedStateDataset();
    updateStateCards();
  }

  function init() {
    apply();
    // Do not observe the whole DOM: updateStateCards() changes innerHTML itself,
    // which previously retriggered the observer indefinitely and froze clicks.
    window.addEventListener('hashchange', apply);
    window.addEventListener('roomforboth:db-ready', apply);
    document.addEventListener('click', function (event) {
      var target = event.target && event.target.closest ? event.target.closest('a,button') : null;
      if (target) setTimeout(apply, 0);
    }, true);
  }

  window.ROOM_FOR_BOTH_STATE_OCCURRENCE = STATE_DATA;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
