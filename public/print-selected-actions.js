(function(){
  'use strict';

  function isPrintPage(){
    return String(location.hash||'').replace(/^#/,'').split('?')[0]==='plan-print';
  }

  function ensureStyle(){
    var style=document.getElementById('i2-print-selected-only-style');
    if(style)return;
    style=document.createElement('style');
    style.id='i2-print-selected-only-style';
    style.textContent=[
      '@media print{',
      '#plan-print__sheetActions .action-row[data-selected="false"],',
      '#plan-print__sheetActions .action-row:has(input[type="checkbox"]:not(:checked)),',
      '#plan-print__sheetActions .action-row:has(.print-action-check:not(:checked)){display:none!important}',
      '#plan-print__sheetActions .action-row[data-selected="true"],',
      '#plan-print__sheetActions .action-row:has(input[type="checkbox"]:checked),',
      '#plan-print__sheetActions .action-row:has(.print-action-check:checked){display:flex!important}',
      '}'
    ].join('');
    document.head.appendChild(style);
  }

  function markRows(){
    if(!isPrintPage())return;
    var host=document.getElementById('plan-print__sheetActions');
    if(!host)return;
    host.querySelectorAll('.action-row').forEach(function(row){
      var input=row.querySelector('input[type="checkbox"],.print-action-check');
      if(!input)return;
      row.setAttribute('data-selected',input.checked?'true':'false');
      if(!input.getAttribute('data-print-selection-bound')){
        input.setAttribute('data-print-selection-bound','true');
        input.addEventListener('change',function(){
          row.setAttribute('data-selected',input.checked?'true':'false');
        });
      }
    });
  }

  function bind(){
    if(!isPrintPage())return;
    ensureStyle();
    markRows();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});
  else bind();
  window.addEventListener('hashchange',function(){setTimeout(bind,30);});
  document.addEventListener('roomforboth:pageshow',function(){setTimeout(bind,30);});
  document.addEventListener('change',function(e){
    if(!isPrintPage())return;
    if(e.target&&e.target.matches&&e.target.matches('#plan-print__sheetActions input[type="checkbox"],#plan-print__sheetActions .print-action-check'))markRows();
  },true);
})();
