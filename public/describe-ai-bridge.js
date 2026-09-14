(function(){
  'use strict';

  var SNAKE_RE=/\b(snake|ular|cobra|python|viper|slither|slithering|hiss|hissing|fang|fanged)\b/i;
  var ID_MAP={
    '1':'macaque','2':'wild-boar','3':'common-myna','5':'house-crow','6':'water-monitor',
    'macaque':'macaque','wild-boar':'wild-boar','common-myna':'common-myna','house-crow':'house-crow','water-monitor':'water-monitor'
  };
  var CATALOG={
    'macaque':{en:'Long-tailed Macaque',bm:'Kera',sci:'Macaca fascicularis',feature:'long tail and monkey-like body'},
    'wild-boar':{en:'Wild Boar',bm:'Babi Hutan',sci:'Sus scrofa',feature:'pig-like body and ground-foraging behaviour'},
    'common-myna':{en:'Common Myna',bm:'Gembala Kerbau',sci:'Acridotheres tristis',feature:'brown bird with yellow bill'},
    'house-crow':{en:'House Crow',bm:'Gagak Rumah',sci:'Corvus splendens',feature:'black bird often seen around bins and roofs'},
    'water-monitor':{en:'Water Monitor Lizard',bm:'Biawak',sci:'Varanus salvator',feature:'large lizard often seen near drains or water'}
  };

  function clean(v){return String(v==null?'':v).replace(/\s+/g,' ').trim();}
  function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');}
  function normalize(id){return ID_MAP[String(id)]||null;}
  function currentLang(doc){var l=String(doc.documentElement.lang||'').toLowerCase();return(l==='bm'||l==='ms')?'bm':'en';}
  function grid(doc){return doc.getElementById('id_describeMatchGrid');}
  function showMatches(doc){var box=doc.getElementById('id_describeMatches');if(box)box.classList.remove('hidden');}

  function renderMessage(doc,en,bm){
    var g=grid(doc);if(!g)return;
    g.innerHTML='<p class="text-sm text-slate-400 text-center py-4"><span data-en>'+esc(en)+'</span><span data-bm>'+esc(bm)+'</span></p>';
    showMatches(doc);
  }

  function matchedTerms(text,id){
    var t=String(text||'').toLowerCase(),out=[];
    var keys={
      'macaque':['grey','monkey','long tail','tail','banana','roof','food','troop'],
      'wild-boar':['boar','pig','soil','garden','night'],
      'common-myna':['myna','brown bird','yellow beak','roof','eaves'],
      'house-crow':['crow','black bird','bin','rubbish','roof'],
      'water-monitor':['monitor','lizard','biawak','drain','canal','river','water']
    }[id]||[];
    keys.forEach(function(k){if(t.indexOf(k)!==-1&&out.indexOf(k)===-1)out.push(k);});
    return out.slice(0,4);
  }

  function render(doc,win,ids,text){
    var g=grid(doc);if(!g)return;
    var normalized=(ids||[]).map(normalize).filter(Boolean).filter(function(v,i,a){return a.indexOf(v)===i;}).slice(0,3);
    if(!normalized.length){
      renderMessage(doc,'No match among the covered species — try Guided Q&A instead.','Tiada padanan dalam spesies yang diliputi — cuba Soal Jawab Berpandu.');
      return;
    }
    var l=currentLang(doc);
    g.innerHTML=normalized.map(function(id){
      var a=CATALOG[id],terms=matchedTerms(text,id);
      var name=l==='bm'?a.bm:a.en;
      var matched=terms.length?terms.join(', '):(l==='bm'?'ciri umum penerangan':'general description');
      return '<div class="id-card rounded-xl border border-slate-200 bg-white px-4 py-4" data-species-id="'+esc(id)+'">'+
        '<div class="flex items-start justify-between gap-4"><div><div class="text-sm font-bold text-slate-800">'+esc(name)+'</div><div class="text-xs italic text-slate-500 mt-0.5">'+esc(a.sci)+'</div><div class="text-xs text-slate-500 mt-1">'+esc((l==='bm'?'Ciri pembeza: ':'Distinguishing feature: ')+a.feature)+'</div></div><span class="text-xs font-semibold text-emerald-700">'+(l==='bm'?'Berkemungkinan':'Likely')+'</span></div>'+ 
        '<div class="mt-3 text-xs text-slate-600"><strong>'+(l==='bm'?'Sepadan pada':'Matched on')+':</strong> '+esc(matched)+'</div>'+ 
        '<button type="button" data-ai-confirm="'+esc(id)+'" class="mt-3 rounded-full bg-forest-950 text-white text-xs font-bold px-4 py-2">'+(l==='bm'?'Sahkan':'Confirm')+'</button>'+ 
      '</div>';
    }).join('');
    showMatches(doc);
    g.querySelectorAll('[data-ai-confirm]').forEach(function(btn){
      btn.addEventListener('click',function(){
        var id=btn.getAttribute('data-ai-confirm');
        try{if(win&&typeof win.goTo==='function')return win.goTo('whattodo',{id:id});}catch(e){}
        try{if(typeof window.goTo==='function')window.goTo('whattodo',{id:id});}catch(e){}
      });
    });
  }

  async function run(doc,win,text){
    renderMessage(doc,'AI is looking for matches…','AI sedang mencari padanan…');
    try{
      var r=await window.fetch('/api/identify-describe',{
        method:'POST',headers:{'content-type':'application/json','accept':'application/json'},cache:'no-store',body:JSON.stringify({text:text})
      });
      var data=await r.json();
      console.log('[Describe bridge]',r.status,data);
      if(!r.ok||!data||!data.ok||!Array.isArray(data.species_ids))throw new Error((data&&data.error)||('HTTP '+r.status));
      render(doc,win,data.species_ids,text);
    }catch(e){
      console.error('[Describe bridge] request failed',e);
      renderMessage(doc,'AI matching could not be completed — try Guided Q&A instead.','Padanan AI tidak dapat diselesaikan — cuba Soal Jawab Berpandu.');
    }
  }

  function bindDoc(doc,win){
    if(!doc||!doc.documentElement||doc.documentElement.getAttribute('data-describe-ai-bridge')==='1')return;
    if(!doc.getElementById('id_describeBtn')||!doc.getElementById('id_describeInput'))return;
    doc.documentElement.setAttribute('data-describe-ai-bridge','1');
    doc.addEventListener('click',function(e){
      var btn=e.target&&e.target.closest?e.target.closest('#id_describeBtn'):null;
      if(!btn)return;
      var input=doc.getElementById('id_describeInput');
      var text=clean(input&&input.value);
      if(!text){e.preventDefault();e.stopImmediatePropagation();renderMessage(doc,'Type a description first.','Taip penerangan dahulu.');return;}
      if(SNAKE_RE.test(text))return;
      e.preventDefault();
      e.stopImmediatePropagation();
      run(doc,win,text);
    },true);
  }

  function bind(){
    bindDoc(document,window);
    var frame=document.getElementById('emergency__frame');
    if(frame){
      try{bindDoc(frame.contentDocument,frame.contentWindow);}catch(e){}
      if(!frame.getAttribute('data-describe-bridge-load')){
        frame.setAttribute('data-describe-bridge-load','1');
        frame.addEventListener('load',function(){setTimeout(bind,0);setTimeout(bind,100);});
      }
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
  window.addEventListener('hashchange',function(){setTimeout(bind,20);setTimeout(bind,200);});
  document.addEventListener('roomforboth:pageshow',function(){setTimeout(bind,20);});
  setInterval(bind,1000);
})();
