(function(){
'use strict';
var STATES=[['johor','Johor'],['kedah','Kedah'],['kelantan','Kelantan'],['melaka','Melaka'],['negeri-sembilan','Negeri Sembilan'],['pahang','Pahang'],['perak','Perak'],['perlis','Perlis'],['penang','Pulau Pinang'],['sabah','Sabah'],['sarawak','Sarawak'],['selangor','Selangor'],['terengganu','Terengganu'],['kl','W.P. Kuala Lumpur'],['labuan','W.P. Labuan'],['putrajaya','W.P. Putrajaya']];
function t(v){return String(v==null?'':v).replace(/\s+/g,' ').trim();}
function patchText(doc){
 var root=doc.body||doc.documentElement;if(!root)return;
 var w=doc.createTreeWalker(root,NodeFilter.SHOW_TEXT),nodes=[];
 while(w.nextNode())nodes.push(w.currentNode);
 nodes.forEach(function(n){var p=n.parentElement;if(!p||p.closest('script,style'))return;var v=n.nodeValue||'',x=v.replace(/1960\s+to\s+2026/g,'1860 to 2026').replace(/1960\s+hingga\s+2026/g,'1860 hingga 2026');if(x!==v)n.nodeValue=x;});
}
function progress(doc){
 doc.querySelectorAll('a,button,[role="tab"],li,span').forEach(function(e){var s=t(e.textContent);if((s==='Prevention'||s==='Pencegahan')&&e.children.length<=2){var p=t((e.parentElement&&e.parentElement.textContent)||'');if(/Start|Identify|Action|Contact|Mula|Tindakan|Hubungi/i.test(p))e.style.display='none';}
 if(/^Next:\s*Prevention$/i.test(s)||/^Seterusnya:\s*Pencegahan$/i.test(s)){e.textContent='Next: Plan';if(!e.dataset.planFixed){e.dataset.planFixed='1';e.addEventListener('click',function(ev){ev.preventDefault();try{window.top.location.hash='#plan';}catch(_){}});}}});
}
function notSure(doc){
 doc.querySelectorAll('a,button,[role="button"]').forEach(function(e){
   var s=t(e.textContent);if(!/^Not sure\??/i.test(s)&&!/^Tidak pasti\??/i.test(s))return;
   var context=e.closest('section,main,article,div');var contextText=t(context&&context.textContent);
   if(!/snake|ular|animal is here now|emergency/i.test(contextText))return;
   if(/guided|question|soal jawab/i.test(contextText))return;
   if(e.dataset.snakeFixed)return;e.dataset.snakeFixed='1';
   e.addEventListener('click',function(ev){
     var x=Array.from(doc.querySelectorAll('a,button,[role="tab"],[role="button"]')).find(function(a){return /Start\s*\/\s*snake check|snake check|semak ular/i.test(t(a.textContent));});
     if(!x)return;ev.preventDefault();ev.stopImmediatePropagation();x.click();
   },true);
 });
}
function states(doc){
 doc.querySelectorAll('select').forEach(function(s){var texts=Array.from(s.options).map(function(o){return t(o.textContent).toLowerCase();});var hits=STATES.filter(function(x){return texts.indexOf(x[1].toLowerCase())!==-1;}).length;if(hits<5)return;STATES.forEach(function(x){if(!Array.from(s.options).some(function(o){return t(o.textContent).toLowerCase()===x[1].toLowerCase();})){var o=doc.createElement('option');o.value=x[0];o.textContent=x[1];s.appendChild(o);}});});
}
function patch(doc){
 if(!doc||!doc.documentElement)return;
 patchText(doc);progress(doc);notSure(doc);states(doc);
 doc.querySelectorAll('iframe').forEach(function(f){try{patch(f.contentDocument);}catch(_){}if(!f.dataset.acBound){f.dataset.acBound='1';f.addEventListener('load',function(){setTimeout(scan,80);});}});
}
function scan(){try{patch(document);}catch(e){console.warn('[Emergency AC]',e);}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',scan,{once:true});else scan();
window.addEventListener('hashchange',function(){setTimeout(scan,80);});
document.addEventListener('roomforboth:pageshow',function(){setTimeout(scan,80);});
})();