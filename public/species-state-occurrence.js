(function () {
  'use strict';

  // Verified values derived only from state_occurrence_summary.csv.
  // We only show state/species counts that the summary explicitly supports.
  var VERIFIED_BY_SPECIES = {
    'house-crow': [
      { name: 'Selangor', records: 6057 },
      { name: 'Pulau Pinang', records: 3959 },
      { name: 'Kuala Lumpur', records: 2164 },
      { name: 'Johor', records: 1665 },
      { name: 'Melaka', records: 561 },
      { name: 'Putrajaya', records: 201 }
    ],
    'common-myna': [
      { name: 'Pahang', records: 2007 },
      { name: 'Negeri Sembilan', records: 1918 },
      { name: 'Perak', records: 1684 },
      { name: 'Kedah', records: 1565 },
      { name: 'Sarawak', records: 975 },
      { name: 'Perlis', records: 375 },
      { name: 'Kelantan', records: 143 },
      { name: 'Terengganu', records: 123 }
    ],
    'macaque': [
      { name: 'Sabah', records: 1713 }
    ],
    'water-monitor': [
      { name: 'Labuan', records: 7 }
    ],
    'reticulated-python': [],
    'wild-boar': [],
    'snake': [],
    'spitting-cobra': []
  };

  function formatNumber(value) {
    return Number(value || 0).toLocaleString('en-US');
  }

  function applyVerifiedTopStates() {
    if (!Array.isArray(window.SPECIES)) return;

    window.SPECIES.forEach(function (species) {
      if (!species || !Object.prototype.hasOwnProperty.call(VERIFIED_BY_SPECIES, species.id)) return;

      var rows = VERIFIED_BY_SPECIES[species.id]
        .slice()
        .sort(function (a, b) { return b.records - a.records; })
        .slice(0, 3);

      var max = rows.length ? rows[0].records : 0;
      species.topStates = rows.map(function (row) {
        return {
          name: row.name,
          value: formatNumber(row.records),
          pct: max ? Math.round((row.records / max) * 100) : 0
        };
      });
    });
  }

  applyVerifiedTopStates();

  // Re-apply just before the species page is rendered in case other startup
  // code reintroduces the old hard-coded prototype values.
  document.addEventListener('click', function () {
    applyVerifiedTopStates();
  }, true);
  window.addEventListener('hashchange', applyVerifiedTopStates);
  window.addEventListener('roomforboth:db-ready', applyVerifiedTopStates);
})();
