(function(){
  'use strict';
  var CONFIG=window.RoomForBothConfig=window.RoomForBothConfig||{};
  if(!Number.isFinite(Number(CONFIG.describeTimeoutMs)))CONFIG.describeTimeoutMs=8000;
  var SNAKE_RE=/\b(snake|ular|cobra|python|viper|slither|slithering|hiss|hissing|fang|fanged)\b/i;
  var CATALOG={
    'house-crow':{id:'house-crow',en:'House Crow',bm:'Gagak Rumah',sci:'Corvus splendens',keys:['crow','gagak','black bird','rubbish','bin','roof'],feature:'black bird often seen around bins and roofs'},
    'macaque':{id:'macaque',en:'Long-tailed Macaque',bm:'Kera',sci:'Macaca fascicularis',keys:['monkey','macaque','kera','monyet','beruk','long tail','tail','troop','banana','roof','food','grey'],feature:'long tail and monkey-like body'},
    'water-monitor':{id:'water-monitor',en:'Water Monitor Lizard',bm:'Biawak',sci:'Varanus salvator',keys:['monitor','lizard','biawak','drain','canal','river','poultry','fish'],feature:'large lizard, often near drains or water'},
    'wild-boar':{id:'wild-boar',en:'Wild Boar',bm:'Babi Hutan',sci:'Sus scrofa',keys:['boar','pig','babi hutan','garden','soil','night'],feature:'pig-like body and ground-foraging behaviour'},
    'common-myna':{id:'common-myna',en:'Common Myna',bm:'Gembala Kerbau',sci:'Acridotheres tristis',keys:['myna','brown bird','yellow beak','roof','eaves','noisy bird'],feature:'brown bird with a yellow bill'}
  };
  var ALL_SEVEN=['Long-tailed Macaque','Wild Boar','Common Myna','Reticulated Python','House Crow','Water Monitor Lizard','Equatorial Spitting Cobra'];
  var STOP={a:1,an:1,the:1,and:1,or:1,of:1,on:1,in:1,at:1,to:1,from:1,with:1,it:1,was:1,is:1,size:1,about:1,saw:1,see:1,took:1,came:1,through:1};

  function clean(v){return String(v==null?'':v).replace(/\s+/g,' ').trim();}
  function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');}
  function docLang(doc){var l=String((doc.documentElement&&doc.documentElement.lang)||'').toLowerCase();return(l==='bm'||l==='ms')?'bm':'en';}
  function byId(doc,id){return doc.getElementById(id);}
  function ensureVisible(doc){var w=byId(doc,'id_describeMatches');if(w)w.classList.remove('hidden');}
  function applyLang(doc,win){try{if(win&&typeof win.setLang==='function')win.setLang(win.localStorage.getItem('owm-lang')||'en');}catch(e){}}
  function setMessage(doc,win,en,bm,extra){var g=byId(doc,'id_describeMatchGrid');if(!g)return;g.innerHTML='<div class="text-sm text-slate-500 text-center py-4"><span data-en>'+esc(en)+'</span><span data-bm>'+esc(bm)+'</span>'+(extra||'')+'</div>';ensureVisible(doc);applyLang(doc,win);}
  function recordFailure(kind){try{var k='roomForBoth.describeFailures',v=JSON.parse(localStorage.getItem(k)||'{"count":0}');v.count=(Number(v.count)||0)+1;v.lastFailureAt=new Date().toISOString();v.lastFailureKind=kind;localStorage.setItem(k,JSON.stringify(v));}catch(e){}}
  function words(text){return String(text||'').toLowerCase().match(/[a-z]+(?:-[a-z]+)?/g)||[];}
  function matchInfo(a,text){var lower=String(text||'').toLowerCase(),matched=[];a.keys.forEach(function(k){if(lower.indexOf(k.toLowerCase())!==-1&&matched.indexOf(k)===-1)matched.push(k);});var unmatched=words(text).filter(function(w){return w.length>3&&!STOP[w]&&!matched.some(function(m){return m.indexOf(w)!==-1||w.indexOf(m)!==-1;});}).slice(0,4);return{matched:matched,unmatched:unmatched,label:matched.length>=2?'Likely':'Possible'};}
  function guidedButton(){return '<button type="button" data-ai-guided class="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold"><span data-en>Use Guided Q&amp;A instead</span><span data-bm>Guna soal jawab berpandu</span></button>';}
  function tryGuided(doc){var nodes=Array.prototype.slice.call(doc.querySelectorAll('button,a,[role="tab"]'));var target=nodes.find(function(n){return /guided q&a|guided|soal jawab/i.test(String(n.textContent||''));});if(target){try{target.click();}catch(e){}return true;}return false;}
  function bindGuided(doc,root){root.querySelectorAll('[data-ai-guided]').forEach(function(b){b.addEventListener('click',function(){tryGuided(doc);});});}
  function card(doc,a,text){var info=matchInfo(a,text),l=docLang(doc),name=l==='bm'?(a.bm||a.en):a.en;var matched=info.matched.length?info.matched.join(', '):(l==='bm'?'tiada kata khusus dipadankan':'no specific keyword match');var notMatched=info.unmatched.length?info.unmatched.join(', '):(l==='bm'?'tiada ciri tambahan yang tidak sepadan':'no additional unmatched feature');var label=l==='bm'?(info.label==='Likely'?'Berkemungkinan':'Mungkin'):info.label;return '<div class="id-card rounded-xl border border-slate-200 bg-white px-4 py-4" data-species-id="'+esc(a.id)+'"><div class="flex items-start justify-between gap-4"><div><div class="text-sm font-bold text-slate-800">'+esc(name)+'</div><div class="text-xs italic text-slate-500 mt-0.5">'+esc(a.sci)+'</div><div class="text-xs text-slate-500 mt-1">'+esc((l==='bm'?'Ciri pembeza: ':'Distinguishing feature: ')+a.feature)+'</div></div><span class="text-xs font-semibold text-emerald-700">'+esc(label)+'</span></div><div class="mt-3 text-xs text-slate-600"><strong>'+(l==='bm'?'Sepadan pada':'Matched on')+':</strong> '+esc(matched)+'</div><div class="mt-1 text-xs text-slate-500"><strong>'+(l==='bm'?'Tidak sepadan':'Did not match')+':</strong> '+esc(notMatched)+'</div><button type="button" class="mt-3 rounded-full bg-forest-950 text-white text-xs font-bold px-4 py-2" data-ai-confirm="'+esc(a.id)+'">'+(l==='bm'?'Sahkan':'Confirm')+'</button></div>';}
  function render(doc,win,ids,text){var g=byId(doc,'id_describeMatchGrid');if(!g)return;var l=docLang(doc),matched=(ids||[]).map(function(id){return CATALOG[String(id||'')];}).filter(Boolean).slice(0,3);if(!matched.length){setMessage(doc,win,'No match among the seven species covered: '+ALL_SEVEN.join(', ')+'. Try Guided Q&A or choose None of these.','Tiada padanan antara tujuh spesies yang diliputi. Cuba soal jawab berpandu atau pilih Tiada satu pun.','<div class="mt-3">'+guidedButton()+'</div><p class="mt-2 text-xs text-slate-400"><span data-en>Your description is not stored.</span><span data-bm>Penerangan anda tidak disimpan.</span></p>');bindGuided(doc,g);return;}g.innerHTML=matched.map(function(a){return card(doc,a,text);}).join('')+'<div class="mt-3 rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-500"><p>'+(l==='bm'?'Model hanya dibenarkan memilih calon daripada senarai yang diliputi. Penerangan anda tidak disimpan.':'The model may only choose candidates from the covered list. Your submitted description is not stored.')+'</p><div class="mt-2">'+guidedButton()+'</div></div>';ensureVisible(doc);g.querySelectorAll('[data-ai-confirm]').forEach(function(b){b.addEventListener('click',function(){var id=b.getAttribute('data-ai-confirm');if(win&&typeof win.goTo==='function')win.goTo('whattodo',{id:id});else if(typeof window.goTo==='function')window.goTo('whattodo',{id:id});});});bindGuided(doc,g);applyLang(doc,win);}
  async function run(doc,win,text){setMessage(doc,win,'AI is looking for up to three matches…','AI sedang mencari sehingga tiga padanan…');var controller=new AbortController(),timedOut=false;var timeout=setTimeout(function(){timedOut=true;controller.abort();},Number(CONFIG.describeTimeoutMs)||8000);try{var r=await window.fetch('/api/identify-describe',{method:'POST',headers:{'content-type':'application/json','accept':'application/json'},cache:'no-store',body:JSON.stringify({text:text}),signal:controller.signal});var data=await r.json().catch(function(){return null;});console.log('[Describe AI iframe]',r.status,data);if(!r.ok||!data||!data.ok||!Array.isArray(data.species_ids))throw new Error((data&&data.error)||('HTTP '+r.status));render(doc,win,data.species_ids,text);}catch(e){recordFailure(timedOut?'timeout':'request_failed');if(timedOut||(e&&e.name==='AbortError'))setMessage(doc,win,'The AI request timed out. Use Guided Q&A instead.','Permintaan AI tamat masa. Guna soal jawab berpandu.','<div class="mt-3">'+guidedButton()+'</div>');else setMessage(doc,win,'AI matching could not be completed. Use Guided Q&A instead.','Padanan AI tidak dapat diselesaikan. Guna soal jawab berpandu.','<div class="mt-3">'+guidedButton()+'</div>');var g=byId(doc,'id_describeMatchGrid');if(g)bindGuided(doc,g);}finally{clearTimeout(timeout);}}

  function ensureButton(doc){var input=byId(doc,'id_describeInput');if(!input)return null;var btn=byId(doc,'id_describeBtn');if(btn)return btn;btn=doc.createElement('button');btn.id='id_describeBtn';btn.type='button';btn.className='mt-5 rounded-full bg-forest-950 text-white font-bold px-6 py-3';btn.textContent='Find matches with AI';input.insertAdjacentElement('afterend',btn);return btn;}
  function bindDoc(doc,win){
    if(!doc||!doc.body)return;
    var input=byId(doc,'id_describeInput');if(!input)return;
    var btn=ensureButton(doc);if(!btn)return;
    if(btn.getAttribute('data-ai-iframe-bound')==='true')return;
    btn.setAttribute('data-ai-iframe-bound','true');
    var busy=false;
    btn.addEventListener('click',function(e){var text=clean(input.value);if(!text){e.preventDefault();e.stopImmediatePropagation();setMessage(doc,win,'Type a description first.','Taip penerangan dahulu.');return;}if(SNAKE_RE.test(text))return;e.preventDefault();e.stopImmediatePropagation();if(busy)return;busy=true;run(doc,win,text).finally(function(){busy=false;});},true);
    input.addEventListener('keydown',function(e){if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();btn.click();}});
  }

  function bindOuter(){bindDoc(document,window);}
  function bindFrame(){
    var frame=document.getElementById('emergency__frame');if(!frame)return;
    try{var doc=frame.contentDocument||(frame.contentWindow&&frame.contentWindow.document);if(doc)bindDoc(doc,frame.contentWindow);}catch(e){console.warn('[Describe AI] iframe access failed',e);}
  }
  function schedule(){setTimeout(bindOuter,20);setTimeout(bindFrame,40);setTimeout(bindFrame,200);setTimeout(bindFrame,800);}
  function init(){var frame=document.getElementById('emergency__frame');if(frame&&!frame.getAttribute('data-ai-load-bound')){frame.setAttribute('data-ai-load-bound','true');frame.addEventListener('load',function(){setTimeout(bindFrame,0);setTimeout(bindFrame,150);});}schedule();}

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
  window.addEventListener('hashchange',schedule);
  document.addEventListener('roomforboth:pageshow',schedule);
  document.addEventListener('click',function(){setTimeout(bindFrame,30);},true);
})();
