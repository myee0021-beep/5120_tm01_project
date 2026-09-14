(function(){
'use strict';

var SPECIES={
  'macaque':{en:'Long-tailed Macaque',bm:'Kera',sci:'Macaca fascicularis',size:'medium',cover:'fur',loc:['roof','ground']},
  'wild-boar':{en:'Wild Boar',bm:'Babi Hutan',sci:'Sus scrofa',size:'large',cover:'fur',loc:['ground']},
  'common-myna':{en:'Common Myna',bm:'Gembala Kerbau',sci:'Acridotheres tristis',size:'small',cover:'feathers',loc:['roof','ground']},
  'house-crow':{en:'House Crow',bm:'Gagak Rumah',sci:'Corvus splendens',size:'medium',cover:'feathers',loc:['roof','ground']},
  'water-monitor':{en:'Water Monitor Lizard',bm:'Biawak',sci:'Varanus salvator',size:'medium',cover:'scales',loc:['water','ground']}
};
var NUMERIC={'1':'macaque','2':'wild-boar','3':'common-myna','5':'house-crow','6':'water-monitor'};
var SNAKE_RE=/\b(snake|ular|cobra|python|viper|slither|slithering|hiss|hissing|fang|fanged)\b/i;

function clean(v){return String(v==null?'':v).replace(/\s+/g,' ').trim();}
function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');}
function normalizeId(id){var s=String(id);return NUMERIC[s]||s;}
function lang(doc){var l=String(doc.documentElement.lang||'').toLowerCase();return(l==='bm'||l==='ms')?'bm':'en';}
function show(el){if(el)el.classList.remove('hidden');}
function hide(el){if(el)el.classList.add('hidden');}
function all(doc,sel){return Array.from(doc.querySelectorAll(sel));}

function gotoSpecies(win,id){
  try{if(win&&typeof win.goTo==='function'){win.goTo('whattodo',{id:id});return;}}catch(e){}
  try{if(window.top&&typeof window.top.goTo==='function'){window.top.goTo('whattodo',{id:id});return;}}catch(e){}
}

function cardHtml(doc,id,matched){
  var a=SPECIES[id];if(!a)return'';var bm=lang(doc)==='bm';
  return '<button type="button" data-em-species="'+esc(id)+'" class="id-card w-full text-left rounded-xl border border-slate-200 bg-white px-5 py-4 hover:border-forest-600 transition-colors">'+
    '<div class="flex items-start justify-between gap-4"><div><div class="text-sm font-bold text-slate-800">'+esc(bm?a.bm:a.en)+'</div><div class="text-xs italic text-slate-500 mt-0.5">'+esc(a.sci)+'</div></div><span class="text-xs font-semibold text-emerald-700">'+(bm?'Berkemungkinan':'Likely')+'</span></div>'+ 
    '<div class="mt-2 text-xs text-slate-500"><strong>'+(bm?'Sepadan pada':'Matched on')+':</strong> '+esc(matched)+'</div>'+ 
  '</button>';
}

function wireCards(doc,win,host){
  host.querySelectorAll('[data-em-species]').forEach(function(btn){btn.addEventListener('click',function(e){e.preventDefault();gotoSpecies(win,btn.getAttribute('data-em-species'));});});
}

function renderGuided(doc,win,answers){
  var result=doc.getElementById('id_guidedResult');
  var grid=doc.getElementById('id_guidedResultGrid');
  if(!result||!grid)return;
  var candidates=Object.keys(SPECIES).map(function(id){
    var a=SPECIES[id],score=0;
    if(a.cover!==answers.covering)return null;
    if(a.size===answers.size)score+=3;else score+=1;
    if(a.loc.indexOf(answers.location)!==-1)score+=2;
    return{id:id,score:score};
  }).filter(Boolean).sort(function(a,b){return b.score-a.score;}).slice(0,3);
  grid.innerHTML=candidates.length?candidates.map(function(x){return cardHtml(doc,x.id,[answers.size,answers.covering,answers.location].join(', '));}).join(''):'<p class="text-sm text-slate-400 text-center py-4">No close match in our species table.</p>';
  wireCards(doc,win,grid);
  all(doc,'.guided-step').forEach(hide);show(result);
}

function bindGuided(doc,win){
  if(doc.documentElement.dataset.guidedFix==='1')return;
  doc.documentElement.dataset.guidedFix='1';
  var answers={size:null,covering:null,location:null};
  doc.addEventListener('click',function(e){
    var btn=e.target&&e.target.closest?e.target.closest('.guided-opt-size,.guided-opt-covering,.guided-opt-location,[data-guided-back],#id_guidedRestart'):null;
    if(!btn)return;
    if(btn.classList.contains('guided-opt-size')){
      e.preventDefault();e.stopImmediatePropagation();answers.size=btn.dataset.answer;hide(doc.getElementById('id_guidedStep0'));show(doc.getElementById('id_guidedStep1'));return;
    }
    if(btn.classList.contains('guided-opt-covering')){
      e.preventDefault();e.stopImmediatePropagation();answers.covering=btn.dataset.answer;hide(doc.getElementById('id_guidedStep1'));show(doc.getElementById('id_guidedStep2'));return;
    }
    if(btn.classList.contains('guided-opt-location')){
      e.preventDefault();e.stopImmediatePropagation();answers.location=btn.dataset.answer;renderGuided(doc,win,answers);return;
    }
    if(btn.id==='id_guidedRestart'){
      e.preventDefault();e.stopImmediatePropagation();answers={size:null,covering:null,location:null};all(doc,'.guided-step').forEach(hide);show(doc.getElementById('id_guidedStep0'));return;
    }
    if(btn.hasAttribute('data-guided-back')){
      e.preventDefault();e.stopImmediatePropagation();var i=parseInt(btn.dataset.guidedBack,10);all(doc,'.guided-step').forEach(hide);show(doc.getElementById('id_guidedStep'+i));
    }
  },true);
}

function describeMessage(doc,text){var grid=doc.getElementById('id_describeMatchGrid'),box=doc.getElementById('id_describeMatches');if(grid)grid.innerHTML='<p class="text-sm text-slate-400 text-center py-4">'+esc(text)+'</p>';show(box);}
function matchedWords(text,id){var words={macaque:['grey','monkey','tail','banana','roof','food'],wild-boar:['boar','pig','garden','ground'],common-myna:['bird','brown','yellow','roof'],house-crow:['crow','black','bin','roof'],water-monitor:['lizard','monitor','drain','water']}[id]||[];var lower=text.toLowerCase();return words.filter(function(w){return lower.indexOf(w)!==-1;}).slice(0,4).join(', ')||'your description';}
async function runDescribe(doc,win){
  var input=doc.getElementById('id_describeInput');var text=clean(input&&input.value);if(!text){describeMessage(doc,'Type a description first.');return;}
  if(SNAKE_RE.test(text)){try{var snakeTab=all(doc,'a,button,[role="tab"],[role="button"]').find(function(x){return /snake check/i.test(clean(x.textContent));});if(snakeTab)snakeTab.click();}catch(e){}return;}
  describeMessage(doc,'AI is looking for matches…');
  try{
    var r=await window.fetch('/api/identify-describe',{method:'POST',headers:{'content-type':'application/json'},cache:'no-store',body:JSON.stringify({text:text})});
    var data=await r.json();console.log('[Emergency Describe]',r.status,data);
    if(!r.ok||!data||!data.ok||!Array.isArray(data.species_ids))throw new Error((data&&data.error)||('HTTP '+r.status));
    var ids=data.species_ids.map(normalizeId).filter(function(id,i,a){return SPECIES[id]&&a.indexOf(id)===i;}).slice(0,3);
    var grid=doc.getElementById('id_describeMatchGrid');var box=doc.getElementById('id_describeMatches');if(!grid)return;
    grid.innerHTML=ids.length?ids.map(function(id){return cardHtml(doc,id,matchedWords(text,id));}).join(''):'<p class="text-sm text-slate-400 text-center py-4">No match — try the guided questions instead.</p>';
    wireCards(doc,win,grid);show(box);
  }catch(err){console.error('[Emergency Describe] failed',err);describeMessage(doc,'AI matching could not be completed — try Guided Q&A instead.');}
}
function bindDescribe(doc,win){
  if(doc.documentElement.dataset.describeFix==='1')return;
  doc.documentElement.dataset.describeFix='1';
  doc.addEventListener('click',function(e){var btn=e.target&&e.target.closest?e.target.closest('#id_describeBtn'):null;if(!btn)return;e.preventDefault();e.stopImmediatePropagation();runDescribe(doc,win);},true);
}

function patchFrame(){
  var frame=document.getElementById('emergency__frame');if(!frame)return;
  try{var doc=frame.contentDocument,win=frame.contentWindow;if(doc){bindGuided(doc,win);bindDescribe(doc,win);}}catch(e){console.warn('[Emergency identify fix]',e);}
  if(!frame.dataset.identifyFixLoad){frame.dataset.identifyFixLoad='1';frame.addEventListener('load',function(){setTimeout(patchFrame,0);setTimeout(patchFrame,100);});}
}
function init(){patchFrame();setTimeout(patchFrame,100);setTimeout(patchFrame,500);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.addEventListener('hashchange',function(){setTimeout(patchFrame,50);});
document.addEventListener('roomforboth:pageshow',function(){setTimeout(patchFrame,50);});
})();