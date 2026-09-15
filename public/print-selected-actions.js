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
      '#plan-print__sheetActions .action-row{position:relative;pointer-events:auto!important}',
      '#plan-print__sheetActions .print-action-check,',
      '#plan-print__sheetActions input[type="checkbox"]{',
      'pointer-events:auto!important;',
      'cursor:pointer!important;',
      'position:relative!important;',
      'z-index:50!important;',
      'touch-action:manipulation;',
      '}',
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

  function setSelected(input,row,value){
    input.checked=!!value;
    row.setAttribute('data-selected',input.checked?'true':'false');
    input.setAttribute('aria-checked',input.checked?'true':'false');
    input.dispatchEvent(new Event('change',{bubbles:true}));
  }

  function prepareInput(input,row){
    input.disabled=false;
    input.removeAttribute('disabled');
    input.style.pointerEvents='auto';
    input.style.cursor='pointer';
    input.style.position='relative';
    input.style.zIndex='50';

    if(input.getAttribute('data-print-selection-bound')==='true')return;
    input.setAttribute('data-print-selection-bound','true');

    input.addEventListener('click',function(e){
      if(!isPrintPage())return;
      e.preventDefault();
      e.stopImmediatePropagation();
      setSelected(input,row,!input.checked);
    },true);

    input.addEventListener('keydown',function(e){
      if(e.key!==' '&&e.key!=='Enter')return;
      e.preventDefault();
      e.stopPropagation();
      setSelected(input,row,!input.checked);
    });
  }

  function markRows(){
    if(!isPrintPage())return;
    var host=document.getElementById('plan-print__sheetActions');
    if(!host)return;

    host.querySelectorAll('.action-row').forEach(function(row){
      var input=row.querySelector('input[type="checkbox"],.print-action-check');
      if(!input)return;
      row.setAttribute('data-selected',input.checked?'true':'false');
      prepareInput(input,row);

      if(row.getAttribute('data-print-row-hitbox-bound')!=='true'){
        row.setAttribute('data-print-row-hitbox-bound','true');
        row.addEventListener('click',function(e){
          if(!isPrintPage())return;
          if(e.target===input||input.contains(e.target))return;
          if(e.target.closest&&e.target.closest('a,button'))return;

          var rect=input.getBoundingClientRect();
          var pad=12;
          if(e.clientX>=rect.left-pad&&e.clientX<=rect.right+pad&&
             e.clientY>=rect.top-pad&&e.clientY<=rect.bottom+pad){
            e.preventDefault();
            e.stopPropagation();
            setSelected(input,row,!input.checked);
          }
        },true);
      }
    });
  }

  function bind(){
    if(!isPrintPage())return;
    ensureStyle();
    markRows();
    setTimeout(markRows,80);
    setTimeout(markRows,250);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});
  else bind();

  window.addEventListener('hashchange',function(){setTimeout(bind,30);});
  document.addEventListener('roomforboth:pageshow',function(){setTimeout(bind,30);});
  window.addEventListener('roomforboth:print-snapshot-ready',function(){setTimeout(bind,30);});

  document.addEventListener('change',function(e){
    if(!isPrintPage())return;
    if(e.target&&e.target.matches&&e.target.matches('#plan-print__sheetActions input[type="checkbox"],#plan-print__sheetActions .print-action-check')){
      var row=e.target.closest('.action-row');
      if(row)row.setAttribute('data-selected',e.target.checked?'true':'false');
    }
  },true);
})();
