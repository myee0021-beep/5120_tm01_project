(function(){
'use strict';
var MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
var SPECIES_COUNTS={macaque:5153,boar:186,monitor:3535,python:382,cobra:162,crow:17992,myna:19623};
var OLD_TO_NEW={'5,807':'5,153','330':'186','3,710':'3,535','431':'382','209':'162','18,021':'17,992','19,680':'19,623'};
function clean(v){return String(v==null?'':v).replace(/\s+/g,' ').trim();}
function page(){return String(location.hash||'#index').replace(/^#/,'').split('?')[0]||'index';}
function answers(){try{return JSON.parse(sessionStorage.getItem('roomForBoth.homeAnswers')||'null')||{};}catch(e){return{};}}
function norm(v){return clean(v).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');}
function longDate(s){var m=String(s||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);if(!m)return s;var d=new Date(Date.UTC(+m[1],+m[2]-1,+m[3]));return d.toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'});}
function walkText(root,fn){if(!root)return;var w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),a=[];while(w.nextNode())a.push(w.currentNode);a.forEach(function(n){if(n.parentElement&&n.parentElement.closest('script,style,noscript'))return;var x=fn(n.nodeValue||'',n);if(typeof x==='string'&&x!==n.nodeValue)n.nodeValue=x;});}
function patchHomeAndRedList(){var p=page();
 if(p==='index')walkText(document.body,function(s){return s.replace(/39,982/g,'39,766');});
 if(p==='ecosystem-redlist'||p==='species')walkText(document.body,function(s){var n=s;Object.keys(OLD_TO_NEW).forEach(function(k){n=n.replace(new RegExp(k.replace(',','\\,'),'g'),OLD_TO_NEW[k]);});return n;});
}
function removeCombined(){
 if(page()!=='plan-result'&&page()!=='plan-print')return;
 document.querySelectorAll('#plan-result__speciesList div, #plan-print__sheetSpecies div, p, div').forEach(function(el){
   if(el.children.length>0&&el.id!=='plan-result__speciesList'&&el.id!=='plan-print__sheetSpecies')return;
   var t=clean(el.textContent);
   if(/^Combined level is not displayed until the D34 threshold row is available/i.test(t)||/^Tahap gabungan tidak dipaparkan sehingga baris ambang D34/i.test(t))el.remove();
 });
 walkText(document.body,function(s){
   return s.replace(/Combined level is not displayed until the D34 threshold row is available from one data source\.\s*/ig,'')
           .replace(/Tahap gabungan tidak dipaparkan sehingga baris ambang D34[^.]*\.\s*/ig,'');
 });
}
function formatDates(){
 var p=page();
 if(!/plan-result|plan-print|emergency/.test(p))return;
 walkText(document.body,function(s){return s.replace(/\b(20\d{2}-\d{2}-\d{2})\b/g,function(x){return longDate(x);});});
}
function applyD42Home(){
 if(page()!=='index')return;
 var select=document.getElementById('index__home_stateSelect');
 if(select){select.style.display='none';select.setAttribute('aria-hidden','true');select.tabIndex=-1;}
 var btn=document.getElementById('index__home_goBtn');
 if(!btn)return;
 if(btn.dataset.d42Bound!=='1'){
   btn.dataset.d42Bound='1';
   btn.addEventListener('click',function(e){e.preventDefault();e.stopImmediatePropagation();location.hash='#plan';},true);
 }
 var box=btn.parentElement;if(box){box.style.paddingTop='0';box.style.gap='0';}
}
function selectedCodes(){var a=answers(),raw=a.speciesSeen||a.species_seen||a.species||[];if(!Array.isArray(raw))raw=[raw];var out=[];raw.forEach(function(v){var n=norm(v);if(n.indexOf('macaque')>=0)out.push('macaque');else if(n.indexOf('boar')>=0)out.push('boar');else if(n.indexOf('myna')>=0)out.push('myna');else if(n.indexOf('crow')>=0)out.push('crow');else if(n.indexOf('monitor')>=0)out.push('monitor');else if(n.indexOf('python')>=0)out.push('python');else if(n.indexOf('cobra')>=0)out.push('cobra');else if(n==='snake')out.push('python','cobra');});return out.filter(function(x,i,a2){return a2.indexOf(x)===i;});}
function stateKey(){var a=answers(),v=a.state||sessionStorage.getItem('roomForBoth.selectedState')||'';return norm(v).replace(/^pulau-pinang$/,'penang').replace(/^kuala-lumpur$/,'kl');}
function addPrintMonths(){if(page()!=='plan-print'||!window.OCCURRENCES_ALL_YEARS||!Array.isArray(window.OCCURRENCES_ALL_YEARS.rows))return;var host=document.getElementById('plan-print__sheetSummary')||document.getElementById('plan-print__sheetSpecies');if(!host||document.getElementById('i2-print-months'))return;var st=stateKey(),codes=selectedCodes(),rows=window.OCCURRENCES_ALL_YEARS.rows,parts=[];codes.forEach(function(code){var m=new Array(12).fill(0),total=0;rows.forEach(function(r){if(norm(r[0])===st&&r[1]===code&&+r[3]>=1&&+r[3]<=12){m[+r[3]-1]+=+r[4]||0;total+=+r[4]||0;}});if(total>=30)parts.push(code.replace(/-/g,' ') + ': '+m.map(function(v,i){return MONTHS[i]+' '+v.toLocaleString();}).join(' · '));});if(!parts.length)return;var el=document.createElement('div');el.id='i2-print-months';el.className='mt-2 text-xs text-slate-600';el.innerHTML='<strong>Monthly profile</strong><br>'+parts.join('<br>');host.appendChild(el);}
function refreshOccurrenceViews(){if(!window.ECOSYSTEM_OCCURRENCES)return;try{if(typeof window.renderAll==='function')window.renderAll();}catch(e){}document.querySelectorAll('[data-species-filter],#ecosystem__stateSelect,#ecosystem__speciesSelect').forEach(function(el){try{el.dispatchEvent(new Event('change',{bubbles:true}));}catch(e){}});patchHomeAndRedList();addPrintMonths();}
function ensureStyle(){if(document.getElementById('i2-final-mobile-style'))return;var s=document.createElement('style');s.id='i2-final-mobile-style';s.textContent='@media(max-width:390px){header .max-w-7xl{padding-left:.75rem!important;padding-right:.75rem!important;gap:.25rem!important}.i2-mobile-emergency-shortcut{width:2rem!important;height:2rem!important;min-width:2rem!important;margin-left:.15rem!important}header [data-lang]{font-size:.75rem!important}} #index__home_stateSelect{display:none!important;}';document.head.appendChild(s);}
function run(){patchHomeAndRedList();removeCombined();formatDates();applyD42Home();addPrintMonths();ensureStyle();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else setTimeout(run,0);
window.addEventListener('hashchange',function(){setTimeout(run,20);setTimeout(run,120);});document.addEventListener('roomforboth:pageshow',function(){setTimeout(run,20);setTimeout(run,120);});window.addEventListener('roomforboth:all-years-occurrence-data-ready',function(){setTimeout(function(){refreshOccurrenceViews();run();},0);});window.addEventListener('roomforboth:signals-ready',function(){setTimeout(run,0);setTimeout(run,100);});
new MutationObserver(function(){clearTimeout(window.__i2final);window.__i2final=setTimeout(run,25);}).observe(document.documentElement,{subtree:true,childList:true,characterData:true});
})();
