(function(){
  'use strict';

  var SNAKE_RE = /\b(snake|ular|cobra|python|viper|slither|slithering|hiss|hissing|fang|fanged)\b/i;
  var busy = false;
  var CATALOG = {
    'house-crow': {id:'house-crow',en:'House Crow',bm:'Gagak Rumah',sci:'Corvus splendens',keys:['crow','gagak','black bird','rubbish','bin','roof']},
    'macaque': {id:'macaque',en:'Long-tailed Macaque',bm:'Kera',sci:'Macaca fascicularis',keys:['monkey','macaque','kera','monyet','beruk','tail','troop','banana','roof','food']},
    'water-monitor': {id:'water-monitor',en:'Water Monitor Lizard',bm:'Biawak',sci:'Varanus salvator',keys:['monitor','lizard','biawak','drain','canal','river','poultry','fish']},
    'wild-boar': {id:'wild-boar',en:'Wild Boar',bm:'Babi Hutan',sci:'Sus scrofa',keys:['boar','pig','babi hutan','garden','soil','night']},
    'common-myna': {id:'common-myna',en:'Common Myna',bm:'Gembala Kerbau',sci:'Acridotheres tristis',keys:['myna','brown bird','yellow beak','roof','eaves','noisy bird']}
  };

  function byId(id){ return document.getElementById(id); }
  function esc(v){ return String(v == null ? '' : v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;'); }
  function lang(){ return String(document.documentElement.lang || '').toLowerCase() === 'bm' ? 'bm' : 'en'; }
  function animals(){ return Object.keys(CATALOG).map(function(k){return CATALOG[k];}); }
  function findAnimal(id){ return CATALOG[String(id||'')] || null; }

  function ensureMatchesVisible(){
    var wrap=byId('id_describeMatches');
    if(wrap) wrap.classList.remove('hidden');
  }

  function setMessage(en,bm){
    var grid=byId('id_describeMatchGrid');
    if(!grid) return;
    grid.innerHTML='<p class="text-sm text-slate-400 text-center py-4"><span data-en>'+esc(en)+'</span><span data-bm>'+esc(bm)+'</span></p>';
    ensureMatchesVisible();
    try { if(typeof window.setLang==='function') window.setLang(localStorage.getItem('owm-lang') || 'en'); } catch(e) {}
  }

  function candidateCard(a){
    var name = lang()==='bm' ? (a.bm || a.en || a.id) : (a.en || a.bm || a.id);
    var sub = [a.sci, lang()==='bm' ? a.en : a.bm].filter(Boolean).join(' · ');
    return '<div class="id-card flex items-center gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3" data-species-id="'+esc(a.id)+'">'+
      '<div class="h-14 w-14 rounded-xl bg-slate-100 shrink-0 flex items-center justify-center text-slate-400 text-xs">AI</div>'+
      '<div class="min-w-0 flex-1"><div class="text-sm font-bold text-slate-800">'+esc(name)+'</div><div class="text-xs text-slate-400 mt-0.5">'+esc(sub)+'</div></div>'+
      '<a href="#" class="confirm-btn shrink-0 rounded-full bg-forest-950 text-white text-xs font-bold px-4 py-2" data-ai-confirm="'+esc(a.id)+'"><span data-en>Confirm</span><span data-bm>Sahkan</span></a>'+
      '</div>';
  }

  function renderIds(ids){
    var grid=byId('id_describeMatchGrid');
    if(!grid) return;
    var matched=(ids||[]).map(findAnimal).filter(Boolean);
    if(!matched.length){
      setMessage('No match — try the guided questions instead.','Tiada padanan — cuba soal jawab berpandu.');
      return;
    }
    grid.innerHTML=matched.map(candidateCard).join('');
    grid.querySelectorAll('[data-ai-confirm]').forEach(function(link){
      link.addEventListener('click',function(e){
        e.preventDefault();
        var id=link.getAttribute('data-ai-confirm');
        if(typeof window.goTo==='function') window.goTo('whattodo',{id:id});
        else location.hash='#whattodo?id='+encodeURIComponent(id);
      });
    });
    ensureMatchesVisible();
    try { if(typeof window.setLang==='function') window.setLang(localStorage.getItem('owm-lang') || 'en'); } catch(e) {}
  }

  function localFallback(text){
    var lower=String(text||'').toLowerCase();
    var scored=animals().map(function(a){
      var score=0;
      (a.keys||[]).forEach(function(k){ if(lower.indexOf(String(k).toLowerCase())>-1) score+=1; });
      String(a.sci||'').toLowerCase().split(/\s+/).forEach(function(w){ if(w.length>3 && lower.indexOf(w)>-1) score+=1; });
      return {a:a,score:score};
    }).sort(function(x,y){return y.score-x.score;});
    renderIds(scored.filter(function(x){return x.score>0;}).slice(0,3).map(function(x){return x.a.id;}));
  }

  async function runAi(text){
    setMessage('Looking for a match…','Mencari padanan…');
    try{
      var r=await fetch('/api/identify-describe',{
        method:'POST',
        headers:{'content-type':'application/json','accept':'application/json'},
        cache:'no-store',
        body:JSON.stringify({text:text})
      });
      var data=await r.json().catch(function(){return null;});
      console.log('[Describe AI] response',r.status,data);
      if(!r.ok || !data || !data.ok || !Array.isArray(data.species_ids)) throw new Error((data&&data.error)||('HTTP '+r.status));
      renderIds(data.species_ids);
    }catch(err){
      console.warn('[Describe AI] API failed; local fallback used',err&&err.message||err);
      localFallback(text);
    }
  }

  function bind(){
    var btn=byId('id_describeBtn');
    var input=byId('id_describeInput');
    if(!btn || !input || btn.getAttribute('data-ai-bound')==='true') return;
    btn.setAttribute('data-ai-bound','true');

    btn.addEventListener('click',function(e){
      var text=String(input.value||'').trim();
      if(!text){
        e.preventDefault(); e.stopImmediatePropagation();
        setMessage('Type a description first, or try the guided questions instead.','Taip penerangan dahulu, atau cuba soal jawab berpandu.');
        return;
      }
      if(SNAKE_RE.test(text)) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if(busy) return;
      busy=true;
      runAi(text).finally(function(){busy=false;});
    },true);
  }

  function schedule(){ setTimeout(bind,50); setTimeout(bind,250); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',schedule,{once:true}); else schedule();
  window.addEventListener('hashchange',schedule);
  document.addEventListener('roomforboth:pageshow',schedule);
})();
