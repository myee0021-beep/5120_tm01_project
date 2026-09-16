(function(){
  'use strict';

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

  function apply(){addEmergencyShortcuts();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
  window.addEventListener('hashchange',function(){setTimeout(apply,0);});
  document.addEventListener('roomforboth:pageshow',function(){setTimeout(apply,0);});
})();