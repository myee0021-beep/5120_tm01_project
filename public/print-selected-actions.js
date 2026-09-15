(function(){
  'use strict';
  var observer=null;
  function isPrintPage(){return String(location.hash||'').replace(/^#/,'').split('?')[0]==='plan-print';}
  function ensureStyle(){
    if(!isPrintPage()||document.getElementById('i2-print-select-style'))return;
    var s=document.createElement('style');s.id='i2-print-select-style';s.textContent=[
      '#plan-print__sheetActions{pointer-events:auto!important}',
      '#plan-print__sheetActions .action-row{pointer-events:auto!important;position:relative}',
      '#plan-print__sheetActions .print-select-toggle{appearance:none;-webkit-appearance:none;width:20px;height:20px;min-width:20px;margin-top:2px;border:2px solid #cbd5e1;border-radius:5px;background:#fff;cursor:pointer;position:relative;z-index:50;display:inline-flex;align-items:center;justify-content:center;pointer-events:auto!important;padding:0}',
      '#plan-print__sheetActions .print-select-toggle[aria-pressed="true"]{background:#166534;border-color:#166534;color:#fff}',
      '#plan-print__sheetActions .print-select-toggle[aria-pressed="true"]::after{content:"✓";font-size:13px;font-weight:700;line-height:1}',
      '@media print{#plan-print__sheetActions .action-row[data-selected="false"]{display:none!important}#plan-print__sheetActions .action-row[data-selected="true"]{display:flex!important}#plan-print__sheetActions .print-select-toggle{display:none!important}}'
    ].join('');document.head.appendChild(s);
  }
  function bindRows(){
    if(!isPrintPage())return;ensureStyle();
    var host=document.getElementById('plan-print__sheetActions');if(!host)return;
    host.querySelectorAll('.action-row').forEach(function(row){
      var original=row.querySelector('input[type="checkbox"],.print-action-check');
      if(!original)return;
      var selected=!!original.checked;
      row.setAttribute('data-selected',selected?'true':'false');
      original.style.display='none';original.setAttribute('aria-hidden','true');original.tabIndex=-1;
      var btn=row.querySelector('.print-select-toggle');
      if(!btn){
        btn=document.createElement('button');btn.type='button';btn.className='print-select-toggle';btn.setAttribute('aria-label','Include this action in print');
        row.insertBefore(btn,row.firstChild);
      }
      btn.setAttribute('aria-pressed',selected?'true':'false');
    });
  }
  function observe(){
    if(!isPrintPage())return;
    var host=document.getElementById('plan-print__sheetActions');if(!host)return;
    if(observer)observer.disconnect();
    observer=new MutationObserver(function(){setTimeout(bindRows,0);});
    observer.observe(host,{childList:true,subtree:true});
  }
  document.addEventListener('click',function(e){
    if(!isPrintPage())return;
    var btn=e.target&&e.target.closest?e.target.closest('#plan-print__sheetActions .print-select-toggle'):null;if(!btn)return;
    e.preventDefault();e.stopImmediatePropagation();
    var row=btn.closest('.action-row');if(!row)return;
    var original=row.querySelector('input[type="checkbox"],.print-action-check');
    var next=btn.getAttribute('aria-pressed')!=='true';
    btn.setAttribute('aria-pressed',next?'true':'false');row.setAttribute('data-selected',next?'true':'false');
    if(original){original.checked=next;original.dispatchEvent(new Event('change',{bubbles:true}));}
  },true);
  function run(){
    if(!isPrintPage()){if(observer){observer.disconnect();observer=null;}return;}
    setTimeout(function(){bindRows();observe();},0);setTimeout(bindRows,100);setTimeout(bindRows,400);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
  window.addEventListener('hashchange',run);document.addEventListener('roomforboth:pageshow',run);window.addEventListener('roomforboth:print-snapshot-ready',run);
})();