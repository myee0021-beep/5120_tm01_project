(function(){
  'use strict';

  function isPrintPage(){
    return String(location.hash || '').replace(/^#/,'').split('?')[0] === 'plan-print';
  }

  function rows(){
    return Array.prototype.slice.call(document.querySelectorAll('#plan-print__sheetActions .action-row'));
  }

  function syncPrintSelection(){
    if(!isPrintPage()) return;
    rows().forEach(function(row){
      var checkbox = row.querySelector('.print-action-check');
      var selected = !!(checkbox && checkbox.checked);
      row.classList.toggle('i2-print-selected', selected);
      row.classList.toggle('i2-print-not-selected', !selected);
    });
  }

  function ensureStyle(){
    if(document.getElementById('i2-print-selected-only-style')) return;
    var style = document.createElement('style');
    style.id = 'i2-print-selected-only-style';
    style.textContent = [
      '@media print{',
      '#plan-print__sheetActions .action-row.i2-print-not-selected{display:none!important}',
      '#plan-print__sheetActions .action-row.i2-print-selected{display:flex!important}',
      '}'
    ].join('');
    document.head.appendChild(style);
  }

  function bind(){
    if(!isPrintPage()) return;
    ensureStyle();
    var wrap = document.getElementById('plan-print__sheetActions');
    if(!wrap || wrap.getAttribute('data-selected-print-bound') === 'true') return;
    wrap.setAttribute('data-selected-print-bound','true');
    wrap.addEventListener('change', function(e){
      if(e.target && e.target.classList && e.target.classList.contains('print-action-check')){
        syncPrintSelection();
      }
    });
    syncPrintSelection();
  }

  window.addEventListener('beforeprint', function(){
    bind();
    syncPrintSelection();
  });
  window.addEventListener('afterprint', function(){
    syncPrintSelection();
  });
  window.addEventListener('hashchange', function(){ setTimeout(bind, 100); });
  document.addEventListener('roomforboth:pageshow', function(){ setTimeout(bind, 100); });
  document.addEventListener('DOMContentLoaded', function(){ setTimeout(bind, 100); }, {once:true});
  setTimeout(bind, 250);
})();
