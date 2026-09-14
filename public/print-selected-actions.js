(function(){
  'use strict';

  function isPrintPage(){
    return String(location.hash || '').replace(/^#/,'').split('?')[0] === 'plan-print';
  }

  function ensureStyle(){
    if(document.getElementById('i2-print-selected-only-style')) return;
    var style = document.createElement('style');
    style.id = 'i2-print-selected-only-style';
    style.textContent = [
      '@media print{',
      '#plan-print__sheetActions .action-row:has(.print-action-check:not(:checked)){display:none!important}',
      '#plan-print__sheetActions .action-row:has(.print-action-check:checked){display:flex!important}',
      '}'
    ].join('');
    document.head.appendChild(style);
  }

  function bind(){
    if(!isPrintPage()) return;
    ensureStyle();
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',bind,{once:true});
  }else{
    bind();
  }
  window.addEventListener('hashchange',function(){setTimeout(bind,50);});
  document.addEventListener('roomforboth:pageshow',function(){setTimeout(bind,50);});
})();
