(function(){
  'use strict';

  function clean(v){return String(v==null?'':v).replace(/\s+/g,' ').trim();}

  function replaceText(){
    if(!document.body)return;
    var walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT),nodes=[];
    while(walker.nextNode())nodes.push(walker.currentNode);
    nodes.forEach(function(node){
      var p=node.parentElement;if(!p||p.closest('script,style,noscript'))return;
      var s=node.nodeValue||'',n=s;
      n=n.replace(/PERHILITAN Table 19/g,'PERHILITAN Table 29');
      n=n.replace(/criterion A3cd, since 2022/gi,'criterion A2cd+3cd+4cd, last assessed 28 October 2024');
      n=n.replace(/\s*·\s*E\d+(?:\s*(?:to|hingga|,|\/|&|dan)\s*E?\d+)*\b/gi,'');
      n=n.replace(/\bE\d+(?:\s*[,\/&]\s*E?\d+)+\b/gi,'');
      if(n!==s)node.nodeValue=n;
    });
  }

  function addEmergencyShortcuts(){
    document.querySelectorAll('header').forEach(function(header){
      var row=header.querySelector('.max-w-7xl');
      if(!row||row.querySelector('.i2-mobile-emergency-shortcut'))return;
      var a=document.createElement('a');
      a.className='i2-mobile-emergency-shortcut sm:hidden inline-flex items-center justify-center w-9 h-9 rounded-full bg-rose-600 hover:bg-rose-700 transition-colors text-white shrink-0';
      a.href='emergency.html';a.setAttribute('aria-label','An animal is here now');a.title='An animal is here now';
      a.innerHTML='<svg fill="none" height="18" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" viewBox="0 0 24 24" width="18"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"></path><path d="M12 9v4"></path><path d="M12 17h.01"></path></svg>';
      var lang=row.querySelector('[data-lang]')&&row.querySelector('[data-lang]').parentElement;
      if(lang&&lang.parentNode===row)row.insertBefore(a,lang.nextSibling);else row.appendChild(a);
    });
  }

  function removeInternalEpicBadges(){
    document.querySelectorAll('.info-pill').forEach(function(el){
      var t=clean(el.textContent);
      if(/^E\d+(?:\s*[,\/&-]\s*E?\d+)*$/i.test(t))el.remove();
    });
  }

  function apply(){replaceText();addEmergencyShortcuts();removeInternalEpicBadges();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
  window.addEventListener('hashchange',function(){setTimeout(apply,0);});
  document.addEventListener('roomforboth:pageshow',function(){setTimeout(apply,0);});
  new MutationObserver(function(){clearTimeout(window.__i2fixTimer);window.__i2fixTimer=setTimeout(apply,30);}).observe(document.documentElement,{subtree:true,childList:true,characterData:true});
})();
