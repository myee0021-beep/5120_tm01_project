(function(){
  'use strict';

  var SPECIES={
    'macaque':{en:'Long-tailed Macaque',bm:'Kera',sci:'Macaca fascicularis',size:['medium'],covering:['fur'],location:['roof','ground']},
    'wild-boar':{en:'Wild Boar',bm:'Babi Hutan',sci:'Sus scrofa',size:['large'],covering:['fur'],location:['ground']},
    'common-myna':{en:'Common Myna',bm:'Gembala Kerbau',sci:'Acridotheres tristis',size:['small'],covering:['feathers'],location:['roof','ground']},
    'house-crow':{en:'House Crow',bm:'Gagak Rumah',sci:'Corvus splendens',size:['medium'],covering:['feathers'],location:['roof','ground']},
    'water-monitor':{en:'Water Monitor Lizard',bm:'Biawak',sci:'Varanus salvator',size:['medium','large'],covering:['scales'],location:['water','ground']}
  };
  var NUMERIC_TO_ID={1:'macaque',2:'wild-boar',3:'common-myna',5:'house-crow',6:'water-monitor'};

  function normaliseId(id){return NUMERIC_TO_ID[String(id)]||String(id||'');}
  function q(id){return document.getElementById(id);}
  function show(el){if(el)el.classList.remove('hidden');}
  function hide(el){if(el)el.classList.add('hidden');}
  function clean(v){return String(v==null?'':v).replace(/\s+/g,' ').trim();}
  function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');}
  function isBm(){return String(document.documentElement.lang||'').toLowerCase()==='bm';}

  function navigate(id){
    try{if(typeof window.goTo==='function'){window.goTo('whattodo',{id:id});return;}}catch(_){}
  }

  function cardHtml(id,matched){
    var a=SPECIES[id];if(!a)return'';
    var name=isBm()?a.bm:a.en;
    return '<div class="id-card flex items-center justify-between gap-4 rounded-xl border border-slate-200 hover:border-emerald-400 bg-white px-4 py-3.5 transition-colors" data-runtime-card="1" data-species-id="'+esc(id)+'">'+
      '<div class="min-w-0"><div><span class="font-display font-bold text-sm text-forest-950">'+esc(name)+'</span> <span class="text-xs italic text-slate-400">/ '+esc(a.sci)+'</span></div>'+
      '<div class="text-[11px] text-slate-500 mt-1"><strong>'+(isBm()?'Sepadan pada':'Matched on')+':</strong> '+esc(matched)+'</div></div>'+ 
      '<button type="button" data-runtime-confirm="'+esc(id)+'" class="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-forest-950 hover:bg-black transition-colors text-white text-xs font-bold px-4 py-2">Confirm / Sahkan</button>'+ 
    '</div>';
  }

  function wireRuntimeCards(root){
    if(!root)return;
    root.querySelectorAll('[data-runtime-confirm]').forEach(function(btn){
      btn.addEventListener('click',function(e){e.preventDefault();e.stopImmediatePropagation();navigate(btn.getAttribute('data-runtime-confirm'));},true);
    });
  }

  function resetGuided(){
    window.guidedAnswers={size:null,covering:null,location:null};
    document.querySelectorAll('.guided-step').forEach(function(s){s.classList.add('hidden');});
    show(q('id_guidedStep0'));
    hide(q('id_guidedResult'));
    var g=q('id_guidedResultGrid');if(g)g.innerHTML='';
  }

  function scoreSpecies(a,ans){
    var score=0;
    if(a.size.indexOf(ans.size)!==-1)score+=3;
    if(a.covering.indexOf(ans.covering)!==-1)score+=4;else return -1;
    if(a.location.indexOf(ans.location)!==-1)score+=2;
    return score;
  }

  function renderGuided(){
    var ans=window.guidedAnswers||{};
    var ranked=Object.keys(SPECIES).map(function(id){return{id:id,score:scoreSpecies(SPECIES[id],ans)};})
      .filter(function(x){return x.score>=0;}).sort(function(a,b){return b.score-a.score;}).slice(0,3);
    var grid=q('id_guidedResultGrid');if(!grid)return;
    var matched=[ans.size,ans.covering,ans.location].filter(Boolean).join(', ');
    grid.innerHTML=ranked.length?ranked.map(function(x){return cardHtml(x.id,matched);}).join(''):'<p class="text-sm text-slate-400 text-center py-4">No close match in our species table.</p>';
    wireRuntimeCards(grid);
    document.querySelectorAll('.guided-step').forEach(function(s){s.classList.add('hidden');});
    show(q('id_guidedResult'));
  }

  function bindGuided(){
    if(document.documentElement.dataset.mainGuidedBound==='1')return;
    document.documentElement.dataset.mainGuidedBound='1';
    if(!window.guidedAnswers)window.guidedAnswers={size:null,covering:null,location:null};

    document.addEventListener('click',function(e){
      var btn=e.target&&e.target.closest?e.target.closest('.guided-opt-size,.guided-opt-covering,.guided-opt-location,[data-guided-back],#id_guidedRestart'):null;
      if(!btn)return;
      if(btn.classList.contains('guided-opt-size')){
        e.preventDefault();e.stopImmediatePropagation();window.guidedAnswers.size=btn.dataset.answer;hide(q('id_guidedStep0'));show(q('id_guidedStep1'));return;
      }
      if(btn.classList.contains('guided-opt-covering')){
        e.preventDefault();e.stopImmediatePropagation();window.guidedAnswers.covering=btn.dataset.answer;hide(q('id_guidedStep1'));show(q('id_guidedStep2'));return;
      }
      if(btn.classList.contains('guided-opt-location')){
        e.preventDefault();e.stopImmediatePropagation();window.guidedAnswers.location=btn.dataset.answer;hide(q('id_guidedStep2'));renderGuided();return;
      }
      if(btn.id==='id_guidedRestart'){
        e.preventDefault();e.stopImmediatePropagation();resetGuided();return;
      }
      if(btn.hasAttribute('data-guided-back')){
        e.preventDefault();e.stopImmediatePropagation();var i=parseInt(btn.dataset.guidedBack,10);document.querySelectorAll('.guided-step').forEach(function(s){s.classList.add('hidden');});show(q('id_guidedStep'+i));
      }
    },true);
  }

  function describeMessage(text){
    var grid=q('id_describeMatchGrid');var box=q('id_describeMatches');if(!grid||!box)return;
    grid.innerHTML='<p class="text-sm text-slate-400 text-center py-4">'+esc(text)+'</p>';show(box);
  }

  function matchedTerms(text,id){
    var keys={macaque:['grey','monkey','tail','banana','roof','food'], 'wild-boar':['boar','pig','garden','ground'], 'common-myna':['myna','bird','brown','yellow','roof'], 'house-crow':['crow','black','bin','rubbish','roof'], 'water-monitor':['monitor','lizard','drain','water']}[id]||[];
    var lower=text.toLowerCase();var found=keys.filter(function(k){return lower.indexOf(k)!==-1;}).slice(0,4);
    return found.length?found.join(', '):(isBm()?'penerangan anda':'your description');
  }

  function renderDescribe(ids,text){
    var grid=q('id_describeMatchGrid');var box=q('id_describeMatches');if(!grid||!box)return;
    ids=(ids||[]).map(normaliseId).filter(function(id,i,a){return SPECIES[id]&&a.indexOf(id)===i;}).slice(0,3);
    grid.innerHTML=ids.length?ids.map(function(id){return cardHtml(id,matchedTerms(text,id));}).join(''):'<p class="text-sm text-slate-400 text-center py-4">No match — try the guided questions instead.</p>';
    wireRuntimeCards(grid);show(box);
  }

  function bindDescribe(){
    if(document.documentElement.dataset.mainDescribeBound==='1')return;
    document.documentElement.dataset.mainDescribeBound='1';
    document.addEventListener('click',function(e){
      var btn=e.target&&e.target.closest?e.target.closest('#id_describeBtn'):null;if(!btn)return;
      e.preventDefault();e.stopImmediatePropagation();
      var input=q('id_describeInput');var rawText=clean(input&&input.value);if(!rawText)return;
      describeMessage('AI is looking for matches…');
      var controller=new AbortController();var timeoutId=setTimeout(function(){controller.abort();},8000);
      fetch('/api/identify-describe',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({text:rawText}),signal:controller.signal})
        .then(function(r){return r.json().then(function(data){return{status:r.status,data:data};});})
        .then(function(out){clearTimeout(timeoutId);var data=out.data||{};if(!data.ok||!Array.isArray(data.species_ids))throw new Error(data.error||('HTTP '+out.status));console.log('[Describe it] AI responded with species_ids:',data.species_ids);renderDescribe(data.species_ids,rawText);})
        .catch(function(err){clearTimeout(timeoutId);console.warn('[Describe it] AI call failed/unavailable',err);describeMessage('AI matching could not be completed — try Guided Q&A instead.');});
    },true);
  }

  function init(){bindGuided();bindDescribe();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
