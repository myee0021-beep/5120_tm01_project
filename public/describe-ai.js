(function(){
  'use strict';
  var CONFIG=window.RoomForBothConfig=window.RoomForBothConfig||{};
  if(!Number.isFinite(Number(CONFIG.describeTimeoutMs)))CONFIG.describeTimeoutMs=8000;
  var SNAKE_RE=/\b(snake|ular|cobra|python|viper|slither|slithering|hiss|hissing|fang|fanged)\b/i;
  var busy=false,controller=null;
  var CATALOG={
    'house-crow':{id:'house-crow',en:'House Crow',bm:'Gagak Rumah',sci:'Corvus splendens',keys:['crow','gagak','black bird','rubbish','bin','roof'],feature:'black bird often seen around bins and roofs'},
    'macaque':{id:'macaque',en:'Long-tailed Macaque',bm:'Kera',sci:'Macaca fascicularis',keys:['monkey','macaque','kera','monyet','beruk','long tail','tail','troop','banana','roof','food','grey'],feature:'long tail and monkey-like body'},
    'water-monitor':{id:'water-monitor',en:'Water Monitor Lizard',bm:'Biawak',sci:'Varanus salvator',keys:['monitor','lizard','biawak','drain','canal','river','poultry','fish'],feature:'large lizard, often near drains or water'},
    'wild-boar':{id:'wild-boar',en:'Wild Boar',bm:'Babi Hutan',sci:'Sus scrofa',keys:['boar','pig','babi hutan','garden','soil','night'],feature:'pig-like body and ground-foraging behaviour'},
    'common-myna':{id:'common-myna',en:'Common Myna',bm:'Gembala Kerbau',sci:'Acridotheres tristis',keys:['myna','brown bird','yellow beak','roof','eaves','noisy bird'],feature:'brown bird with a yellow bill'}
  };
  var ALL_SEVEN=['Long-tailed Macaque','Wild Boar','Common Myna','Reticulated Python','House Crow','Water Monitor Lizard','Equatorial Spitting Cobra'];
  var STOP={a:1,an:1,the:1,and:1,or:1,of:1,on:1,in:1,at:1,to:1,from:1,with:1,it:1,was:1,is:1,size:1,about:1,saw:1,see:1,took:1,came:1,through:1};

  function byId(id){return document.getElementById(id);}
  function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');}
  function lang(){return String(document.documentElement.lang||'').toLowerCase()==='bm'?'bm':'en';}
  function ensureVisible(){var w=byId('id_describeMatches');if(w)w.classList.remove('hidden');}
  function applyLang(){try{if(typeof window.setLang==='function')window.setLang(localStorage.getItem('owm-lang')||'en');}catch(e){}}
  function setMessage(en,bm,extra){var g=byId('id_describeMatchGrid');if(!g)return;g.innerHTML='<div class="text-sm text-slate-500 text-center py-4"><span data-en>'+esc(en)+'</span><span data-bm>'+esc(bm)+'</span>'+(extra||'')+'</div>';ensureVisible();applyLang();}
  function recordFailure(kind){try{var k='roomForBoth.describeFailures',v=JSON.parse(localStorage.getItem(k)||'{"count":0}');v.count=(Number(v.count)||0)+1;v.lastFailureAt=new Date().toISOString();v.lastFailureKind=kind;localStorage.setItem(k,JSON.stringify(v));}catch(e){}}
  function tryGuided(){var nodes=Array.prototype.slice.call(document.querySelectorAll('button,a,[role="tab"]'));var target=nodes.find(function(n){return /guided q&a|guided|soal jawab/i.test(String(n.textContent||''));});if(target){setTimeout(function(){try{target.click();}catch(e){}},100);return true;}return false;}
  function guidedButton(){return '<button type="button" data-ai-guided class="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold"><span data-en>Use Guided Q&amp;A instead</span><span data-bm>Guna soal jawab berpandu</span></button>';}
  function fallbackToGuided(kind,msg){recordFailure(kind);setMessage(msg||'AI matching is unavailable right now. Guided Q&A is available instead.','Padanan AI tidak tersedia sekarang. Soal jawab berpandu tersedia sebagai ganti.','<div class="mt-3">'+guidedButton()+'</div><p class="mt-2 text-xs text-slate-400"><span data-en>Your description is not stored. Only a failure count and timestamp are kept on this device.</span><span data-bm>Penerangan anda tidak disimpan. Hanya kiraan kegagalan dan cap masa disimpan pada peranti ini.</span></p>');var b=document.querySelector('[data-ai-guided]');if(b)b.addEventListener('click',tryGuided);}
  function words(text){return String(text||'').toLowerCase().match(/[a-z]+(?:-[a-z]+)?/g)||[];}
  function matchInfo(a,text){var lower=String(text||'').toLowerCase(),matched=[];a.keys.forEach(function(k){if(lower.indexOf(k.toLowerCase())!==-1&&matched.indexOf(k)===-1)matched.push(k);});var unmatched=words(text).filter(function(w){return w.length>3&&!STOP[w]&&!matched.some(function(m){return m.indexOf(w)!==-1||w.indexOf(m)!==-1;});}).slice(0,4);return{matched:matched,unmatched:unmatched,label:matched.length>=2?'Likely':'Possible'};}
  function card(a,text){var info=matchInfo(a,text),l=lang(),name=l==='bm'?(a.bm||a.en):a.en;var matched=info.matched.length?info.matched.join(', '):(l==='bm'?'tiada kata khusus dipadankan pada peranti':'no specific on-device keyword match');var notMatched=info.unmatched.length?info.unmatched.join(', '):(l==='bm'?'tiada ciri tambahan yang tidak sepadan':'no additional unmatched feature');var label=l==='bm'?(info.label==='Likely'?'Berkemungkinan':'Mungkin'):info.label;return '<div class="id-card rounded-xl border border-slate-200 bg-white px-4 py-4" data-species-id="'+esc(a.id)+'"><div class="flex items-start justify-between gap-4"><div><div class="text-sm font-bold text-slate-800">'+esc(name)+'</div><div class="text-xs italic text-slate-500 mt-0.5">'+esc(a.sci)+'</div><div class="text-xs text-slate-500 mt-1">'+esc(l==='bm'?'Ciri pembeza: ':'Distinguishing feature: ')+esc(a.feature)+'</div></div><span class="text-xs font-semibold text-emerald-700">'+esc(label)+'</span></div><div class="mt-3 text-xs text-slate-600"><strong>'+(l==='bm'?'Sepadan pada':'Matched on')+':</strong> '+esc(matched)+'</div><div class="mt-1 text-xs text-slate-500"><strong>'+(l==='bm'?'Tidak sepadan':'Did not match')+':</strong> '+esc(notMatched)+'</div><button type="button" class="mt-3 rounded-full bg-forest-950 text-white text-xs font-bold px-4 py-2" data-ai-confirm="'+esc(a.id)+'">'+(l==='bm'?'Sahkan':'Confirm')+'</button></div>';}
  function bindGuidedButtons(root){root.querySelectorAll('[data-ai-guided]').forEach(function(b){b.addEventListener('click',tryGuided);});}
  function render(ids,text){var g=byId('id_describeMatchGrid');if(!g)return;var l=lang(),matched=(ids||[]).map(function(id){return CATALOG[String(id||'')];}).filter(Boolean).slice(0,3);if(!matched.length){setMessage('No match among the seven species covered: '+ALL_SEVEN.join(', ')+'. Try Guided Q&A or choose None of these.','Tiada padanan antara tujuh spesies yang diliputi. Cuba soal jawab berpandu atau pilih Tiada satu pun.','<div class="mt-3">'+guidedButton()+'</div><p class="mt-2 text-xs text-slate-400"><span data-en>Your description is not stored.</span><span data-bm>Penerangan anda tidak disimpan.</span></p>');bindGuidedButtons(g);return;}g.innerHTML=matched.map(function(a){return card(a,text);}).join('')+'<div class="mt-3 rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-500"><p>'+(l==='bm'?'Model hanya dibenarkan memilih calon daripada senarai yang diliputi. Penerangan anda tidak disimpan.':'The model may only choose candidates from the covered list. Your submitted description is not stored.')+'</p><div class="mt-2">'+guidedButton()+'</div></div>';ensureVisible();g.querySelectorAll('[data-ai-confirm]').forEach(function(b){b.addEventListener('click',function(){var id=b.getAttribute('data-ai-confirm');if(typeof window.goTo==='function')window.goTo('whattodo',{id:id});else location.hash='#whattodo?id='+encodeURIComponent(id);});});bindGuidedButtons(g);applyLang();}
  async function run(text){setMessage('AI is looking for up to three matches…','AI sedang mencari sehingga tiga padanan…');controller=new AbortController();var timedOut=false;var timeout=setTimeout(function(){timedOut=true;controller.abort();},Number(CONFIG.describeTimeoutMs)||8000);try{var r=await fetch('/api/identify-describe',{method:'POST',headers:{'content-type':'application/json','accept':'application/json'},cache:'no-store',body:JSON.stringify({text:text}),signal:controller.signal});var data=await r.json().catch(function(){return null;});if(!r.ok||!data||!data.ok||!Array.isArray(data.species_ids)){var reason=(data&&data.error)||('HTTP '+r.status);throw new Error(reason);}render(data.species_ids,text);}catch(e){var message=String(e&&e.message||'');if(timedOut||(e&&e.name==='AbortError'))fallbackToGuided('timeout','AI matching timed out. Guided Q&A is available instead.');else if(/not configured|501/i.test(message))fallbackToGuided('not_configured','AI matching is not configured on this deployment. Guided Q&A is available instead.');else fallbackToGuided('request_failed','AI matching could not be reached. Guided Q&A is available instead.');}finally{clearTimeout(timeout);controller=null;setBusy(false);}}

  function ensureAction(){
    var input=byId('id_describeInput');if(!input)return null;
    var btn=byId('id_describeBtn');
    if(!btn){
      var wrap=document.createElement('div');wrap.className='mt-4 flex flex-wrap items-center gap-3';wrap.setAttribute('data-describe-ai-action','true');
      wrap.innerHTML='<button id="id_describeBtn" type="button" class="rounded-full bg-forest-950 px-6 py-3 text-sm font-bold text-white shadow-sm hover:opacity-90"><span data-en>Find matches with AI</span><span data-bm>Cari padanan dengan AI</span></button><span class="text-xs text-slate-400"><span data-en>Uses the description above. Text is not stored.</span><span data-bm>Menggunakan penerangan di atas. Teks tidak disimpan.</span></span>';
      input.insertAdjacentElement('afterend',wrap);btn=byId('id_describeBtn');applyLang();
    }else{
      if(!btn.querySelector('[data-en]'))btn.innerHTML='<span data-en>Find matches with AI</span><span data-bm>Cari padanan dengan AI</span>';
      btn.type='button';applyLang();
    }
    return btn;
  }

  function setBusy(on){
    busy=!!on;var btn=byId('id_describeBtn');if(!btn)return;btn.disabled=busy;btn.setAttribute('aria-busy',busy?'true':'false');btn.style.opacity=busy?'0.65':'';
  }

  function bind(){
    var input=byId('id_describeInput'),btn=ensureAction();if(!btn||!input||btn.getAttribute('data-ai-bound')==='true')return;
    btn.setAttribute('data-ai-bound','true');
    btn.addEventListener('click',function(e){
      var text=String(input.value||'').trim();e.preventDefault();e.stopImmediatePropagation();
      if(!text){setMessage('Type a description first.','Taip penerangan dahulu.');return;}
      if(SNAKE_RE.test(text)){setMessage('Snake-like descriptions use the Emergency snake safety route instead of AI matching.','Penerangan seperti ular menggunakan laluan keselamatan ular Kecemasan, bukan padanan AI.');return;}
      if(busy)return;setBusy(true);run(text);
    },true);
    input.addEventListener('keydown',function(e){if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();btn.click();}});
  }
  function schedule(){setTimeout(bind,20);setTimeout(bind,160);setTimeout(bind,600);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();window.addEventListener('hashchange',schedule);document.addEventListener('roomforboth:pageshow',schedule);
})();
