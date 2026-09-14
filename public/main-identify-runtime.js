(function(){
  'use strict';

  var NUMERIC_TO_ID={1:'macaque',2:'wild-boar',3:'common-myna',5:'house-crow',6:'water-monitor'};
  function normaliseId(id){return NUMERIC_TO_ID[String(id)]||String(id||'');}
  function q(id){return document.getElementById(id);}
  function show(el){if(el)el.classList.remove('hidden');}
  function hide(el){if(el)el.classList.add('hidden');}
  function resetGuided(){
    window.guidedAnswers={size:null,covering:null,location:null};
    document.querySelectorAll('.guided-step').forEach(function(s){s.classList.add('hidden');});
    show(q('id_guidedStep0'));
    var g=q('id_guidedResultGrid');if(g)g.innerHTML='';
  }

  function bindGuided(){
    if(document.documentElement.dataset.mainGuidedBound==='1')return;
    document.documentElement.dataset.mainGuidedBound='1';
    if(!window.guidedAnswers)window.guidedAnswers={size:null,covering:null,location:null};

    document.addEventListener('click',function(e){
      var btn=e.target&&e.target.closest?e.target.closest('.guided-opt-size,.guided-opt-covering,.guided-opt-location,[data-guided-back],#id_guidedRestart'):null;
      if(!btn)return;

      if(btn.classList.contains('guided-opt-size')){
        e.preventDefault();e.stopImmediatePropagation();
        window.guidedAnswers.size=btn.dataset.answer;
        hide(q('id_guidedStep0'));show(q('id_guidedStep1'));
        return;
      }
      if(btn.classList.contains('guided-opt-covering')){
        e.preventDefault();e.stopImmediatePropagation();
        window.guidedAnswers.covering=btn.dataset.answer;
        hide(q('id_guidedStep1'));show(q('id_guidedStep2'));
        return;
      }
      if(btn.classList.contains('guided-opt-location')){
        e.preventDefault();e.stopImmediatePropagation();
        window.guidedAnswers.location=btn.dataset.answer;
        hide(q('id_guidedStep2'));
        if(typeof window.showGuidedCandidates==='function'){
          window.showGuidedCandidates();
        }else{
          var result=q('id_guidedResult');show(result);
          var grid=q('id_guidedResultGrid');if(grid)grid.innerHTML='<p class="text-sm text-slate-400 text-center py-4">No close match in our species table.</p>';
        }
        return;
      }
      if(btn.id==='id_guidedRestart'){
        e.preventDefault();e.stopImmediatePropagation();resetGuided();return;
      }
      if(btn.hasAttribute('data-guided-back')){
        e.preventDefault();e.stopImmediatePropagation();
        var i=parseInt(btn.dataset.guidedBack,10);
        document.querySelectorAll('.guided-step').forEach(function(s){s.classList.add('hidden');});
        show(q('id_guidedStep'+i));
      }
    },true);
  }

  function renderDescribeFallback(ids){
    var grid=q('id_describeMatchGrid');var box=q('id_describeMatches');if(!grid||!box)return;
    var names={
      'macaque':['Long-tailed Macaque','Macaca fascicularis'],
      'wild-boar':['Wild Boar','Sus scrofa'],
      'common-myna':['Common Myna','Acridotheres tristis'],
      'house-crow':['House Crow','Corvus splendens'],
      'water-monitor':['Water Monitor Lizard','Varanus salvator']
    };
    grid.innerHTML=ids.length?ids.map(function(id){var n=names[id]||[id,''];return '<div class="id-card rounded-xl border border-slate-200 bg-white px-5 py-4" data-species-id="'+id+'"><div class="text-sm font-bold text-slate-800">'+n[0]+'</div><div class="text-xs italic text-slate-500 mt-0.5">'+n[1]+'</div><div class="mt-2 text-xs text-slate-500"><strong>Matched on:</strong> your description</div></div>';}).join(''):'<p class="text-sm text-slate-400 text-center py-4">No match — try the guided questions instead.</p>';
    show(box);
    if(typeof window.wireCardSelection==='function')window.wireCardSelection(grid);
  }

  function bindDescribe(){
    if(document.documentElement.dataset.mainDescribeBound==='1')return;
    document.documentElement.dataset.mainDescribeBound='1';
    document.addEventListener('click',function(e){
      var btn=e.target&&e.target.closest?e.target.closest('#id_describeBtn'):null;
      if(!btn)return;
      e.preventDefault();e.stopImmediatePropagation();
      var input=q('id_describeInput');var rawText=String(input&&input.value||'').trim();
      if(!rawText)return;
      var lowerText=rawText.toLowerCase();
      try{
        if(window.SNAKE_TERM_RE&&window.SNAKE_TERM_RE.test(lowerText)&&typeof window.renderSnakeRedirectPrompt==='function'){
          window.renderSnakeRedirectPrompt();return;
        }
      }catch(_){}
      show(q('id_describeMatches'));
      var grid=q('id_describeMatchGrid');if(grid)grid.innerHTML='<p class="text-sm text-slate-400 text-center py-4">AI is looking for matches…</p>';
      var controller=new AbortController();var timeoutId=setTimeout(function(){controller.abort();},8000);
      fetch('/api/identify-describe',{
        method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({text:rawText}),signal:controller.signal
      }).then(function(r){return r.json().then(function(data){return{status:r.status,data:data};});}).then(function(out){
        clearTimeout(timeoutId);
        var data=out.data||{};
        if(!data.ok||!Array.isArray(data.species_ids))throw new Error(data.error||('HTTP '+out.status));
        var ids=data.species_ids.map(normaliseId);
        console.log('[Describe it] AI responded with species_ids:',ids);
        if(typeof window.renderDescribeResult==='function')window.renderDescribeResult(ids,lowerText);else renderDescribeFallback(ids);
      }).catch(function(err){
        clearTimeout(timeoutId);
        console.warn('[Describe it] AI call failed/unavailable',err);
        if(typeof window.renderDescribeResult==='function')window.renderDescribeResult(null,lowerText);
        else renderDescribeFallback([]);
      });
    },true);
  }

  function init(){bindGuided();bindDescribe();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
