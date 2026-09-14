(function(){
  'use strict';

  var SNAKE_RE = /\b(snake|ular|cobra|python|viper|slither|slithering|hiss|hissing|fang|fanged)\b/i;
  var busy = false;

  function byId(id){ return document.getElementById(id); }
  function esc(v){ return String(v == null ? '' : v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;'); }
  function lang(){ return String(document.documentElement.lang || '').toLowerCase() === 'bm' ? 'bm' : 'en'; }
  function animals(){ return Array.isArray(window.ANIMALS) ? window.ANIMALS : []; }
  function findAnimal(id){ return animals().filter(function(a){ return a && a.id === id; })[0] || null; }

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
    var image = a.image || a.img || a.imageUrl || (a.media && a.media.imageUrl) || '';
    var imageHtml = image ? '<img src="'+esc(image)+'" alt="" class="h-14 w-14 rounded-xl object-cover shrink-0">' : '<div class="h-14 w-14 rounded-xl bg-slate-100 shrink-0"></div>';
    return '<div class="id-card flex items-center gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3" data-species-id="'+esc(a.id)+'">'+
      imageHtml+
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
        headers:{'content-type':'application/json'},
        body:JSON.stringify({text:text})
      });
      var data=await r.json().catch(function(){return null;});
      if(!r.ok || !data || !data.ok || !Array.isArray(data.species_ids)) throw new Error((data&&data.error)||('HTTP '+r.status));
      console.log('[Describe AI] MiniMax species_ids',data.species_ids);
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
      // Preserve the app's existing safety-first snake route; never send snake text to the model.
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
