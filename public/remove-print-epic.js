(function(){
  'use strict';
  function page(){return String(location.hash||'#index').replace(/^#/,'').split('?')[0]||'index';}
  function cleanPrintEpic(){
    if(page()!=='plan-print')return;
    var root=document.getElementById('page-plan-print')||document.body;if(!root)return;
    var walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),nodes=[];
    while(walker.nextNode())nodes.push(walker.currentNode);
    nodes.forEach(function(node){
      var parent=node.parentElement;if(!parent||parent.closest('script,style,noscript'))return;
      var old=node.nodeValue||'';
      var next=old.replace(/\s*[·•|-]\s*E\d+\b/g,'').replace(/\bE\d+\b/g,'').replace(/\s{2,}/g,' ');
      if(next!==old)node.nodeValue=next;
    });
  }
  function run(){setTimeout(cleanPrintEpic,0);setTimeout(cleanPrintEpic,100);setTimeout(cleanPrintEpic,400);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
  window.addEventListener('hashchange',run);
  document.addEventListener('roomforboth:pageshow',run);
  new MutationObserver(function(){if(page()==='plan-print')cleanPrintEpic();}).observe(document.documentElement,{subtree:true,childList:true,characterData:true});
})();
