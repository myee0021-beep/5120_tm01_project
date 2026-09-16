(function(){
  'use strict';
  var data={"meta":{"generatedBy":"scripts/build-real-ecosystem-data.js","note":"Real GBIF occurrence extract (source: iteration2_map_aggregated.json), aggregated to species x state x year x month with a record count per group. The extract has no point-level coordinates, so the map draws one bubble per state (radius by record count) rather than individual occurrence points.","sourceFile":"iteration2_map_aggregated.json","totalRecords":47033,"recordsWithNoMonth":55,"recordsWithNoYear":30,"speciesCodes":["crow","myna","macaque","monitor","python","boar","cobra"],"snakeCodes":["python","cobra"],"yearRange":[1860,2026]},"rows":[]};
  // The full current occurrence rows are embedded in index0914.html. This shim intentionally
  // only replaces metadata when the page already contains that dataset; otherwise it leaves
  // the existing rows untouched rather than inventing data.
  if(window.ECOSYSTEM_OCCURRENCES&&Array.isArray(window.ECOSYSTEM_OCCURRENCES.rows)){
    window.ECOSYSTEM_OCCURRENCES.meta=data.meta;
    if(typeof window.META!=='undefined')window.META=data.meta;
    window.dispatchEvent(new CustomEvent('roomforboth:occurrence-data-ready',{detail:{totalRecords:data.meta.totalRecords}}));
  }
})();
