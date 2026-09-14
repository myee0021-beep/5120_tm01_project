(function(){
  'use strict';
  // AC 2.2.1 requires the A4 sheet to contain the same prevention rows,
  // in the same order, as the generated screen plan. Selection/check state
  // must not remove rows from the printed record. The sheet itself is built
  // from roomForBoth.currentPlanSnapshot by ac-compliance.js.
  function clearLegacySelectedOnlyStyle(){
    var old=document.getElementById('i2-print-selected-only-style');
    if(old)old.remove();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',clearLegacySelectedOnlyStyle,{once:true});
  else clearLegacySelectedOnlyStyle();
  window.addEventListener('hashchange',clearLegacySelectedOnlyStyle);
  document.addEventListener('roomforboth:pageshow',clearLegacySelectedOnlyStyle);
})();
