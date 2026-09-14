import iteration2Worker from './worker-iteration2.js';

function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})}
function extractNumbers(text){return String(text||'').match(/\b\d+(?:[.,]\d+)?%?\b/g)||[]}
function flatten(value,out=[]){if(value==null)return out;if(Array.isArray(value)){value.forEach(v=>flatten(v,out));return out}if(typeof value==='object'){Object.values(value).forEach(v=>flatten(v,out));return out}var s=String(value).trim();if(s)out.push(s);return out}
function validate(summary,rows){
  var text=String(summary||'').trim();
  if(!text)return false;
  var sentences=text.split(/(?<=[.!?])\s+/).map(s=>s.trim()).filter(Boolean);
  if(sentences.length<4||sentences.length>6)return false;
  var allowedNumbers=new Set(extractNumbers(flatten(rows).join(' ')));
  if(!extractNumbers(text).every(n=>allowedNumbers.has(n)))return false;
  return true;
}
async function askMiniMax(env,rows,language,retryNote=''){
  if(!env.MINIMAX_API_KEY)throw new Error('MINIMAX_API_KEY is not configured');
  var langName=language==='bm'?'Bahasa Melayu':'English';
  var prompt=`You write a short resident-facing summary for the Room for Both wildlife plan page.\n- Write exactly 4 to 6 short sentences in ${langName}.\n- Use ONLY facts already present in the supplied rows.\n- Do not invent, add, infer, strengthen or weaken any species, number, level, signal, action, recommendation, date, place, cause or prediction.\n- You may connect or lightly rephrase the supplied rows, but every factual claim must be directly supported by them.\n- The rows are authoritative.\n- Do not give advice of your own.\n- Return only the paragraph text, with no heading, bullets, markdown or disclaimer.${retryNote}`;
  var c=new AbortController();var timeout=setTimeout(()=>c.abort(),10000);
  try{
    var res=await fetch('https://api.minimax.io/v1/text/chatcompletion_v2',{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${env.MINIMAX_API_KEY}`},body:JSON.stringify({model:'MiniMax-Text-01',temperature:0.1,max_tokens:450,messages:[{role:'system',content:prompt},{role:'user',content:'Rows already displayed on the page:\n'+JSON.stringify(rows,null,2)}]}),signal:c.signal});
    if(!res.ok)throw new Error('MiniMax API '+res.status);
    var payload=await res.json();var text=String(payload?.choices?.[0]?.message?.content||'').trim();
    if(!text)throw new Error('empty completion');
    return text;
  }finally{clearTimeout(timeout)}
}
async function handlePlanSummary(request,env){
  if(!env.MINIMAX_API_KEY)return json({ok:false,hidden:true,error:'AI summary is not configured.'},501);
  var body;try{body=await request.json()}catch{return json({ok:false,hidden:true,error:'Request body must be JSON.'},400)}
  var rows=Array.isArray(body?.rows)?body.rows.slice(0,100):[];
  var language=body?.language==='bm'?'bm':'en';
  if(!rows.length)return json({ok:false,hidden:true,error:'rows is required.'},400);
  var disclaimer=language==='bm'
    ?'Ringkasan ini ditulis daripada jadual di bawah dan tidak menambah apa-apa kepadanya. Jika ayat dan jadual tidak sepadan, jadual adalah betul.'
    :'This summary is written from the table below and adds nothing to it. If a sentence and the table disagree, the table is correct.';
  for(var attempt=1;attempt<=2;attempt++){
    try{
      var text=await askMiniMax(env,rows,language,attempt===2?'\nPrevious output failed validation. Stay even closer to the supplied rows.':'');
      if(validate(text,rows))return json({ok:true,hidden:false,language,summary:text,disclaimer,attempts:attempt});
    }catch(e){console.error('[plan-summary]',attempt,e?.message||e)}
  }
  return json({ok:false,hidden:true,notice:language==='bm'?'Ringkasan AI tidak dapat dipaparkan. Sila gunakan pelan dan penunjuk tahap di bawah.':'The AI summary could not be displayed. Please use the plan and level indicators below.',disclaimer});
}

const PLAN_SUMMARY_CLIENT = String.raw`
<script id="room-for-both-plan-summary-worker-client">
(function(){
  'use strict';
  var last='';var controller=null;var timer=null;var sourceRef=null;
  function clean(v){return String(v==null?'':v).replace(/\s+/g,' ').trim()}
  function lang(){var l=String(document.documentElement.lang||'').toLowerCase();try{if(!l)l=String(localStorage.getItem('owm-lang')||'').toLowerCase()}catch(e){}return(l==='bm'||l==='ms')?'bm':'en'}
  function visible(el){if(!el)return false;var s=getComputedStyle(el);return s.display!=='none'&&s.visibility!=='hidden'&&el.getClientRects().length>0}
  function pageRoot(){return document.querySelector('.page:not(.hidden)')||document.body}
  function textOf(el){return clean(el&&el.innerText)}

  function findPlanCard(){
    var root=pageRoot();
    var headings=root.querySelectorAll('h1,h2,h3,h4,h5,h6,[role="heading"],p,div,span');
    for(var i=0;i<headings.length;i++){
      var el=headings[i];
      if(!visible(el))continue;
      var t=textOf(el).toLowerCase();
      if(t==='your prevention plan'||t==='pelan pencegahan anda'||t.indexOf('your prevention plan')===0||t.indexOf('pelan pencegahan anda')===0){
        var card=el.closest('section,article,[class*="rounded"],[class*="card"]');
        if(card&&visible(card))return card;
      }
    }
    return null;
  }

  function rowsFromPlanCard(card){
    if(!card)return[];
    var rows=[];
    var controls=card.querySelectorAll('input[type="checkbox"],button[role="checkbox"],[role="checkbox"],.checkbox-btn');
    var seen=[];
    Array.prototype.forEach.call(controls,function(ctrl){
      var holder=ctrl.closest('li,label,[class*="flex"],[class*="grid"],div');
      if(!holder||seen.indexOf(holder)!==-1)return;
      var whole=textOf(holder);
      if(!whole)return;
      seen.push(holder);
      var lines=String(holder.innerText||'').split(/\n+/).map(clean).filter(Boolean);
      var action='';var source='';
      lines.forEach(function(line){
        if(/^source\s*:/i.test(line)||/^sumber\s*:/i.test(line))source=line.replace(/^(source|sumber)\s*:\s*/i,'');
        else if(!action&&!/^\d+\s+of\s+\d+\s+done$/i.test(line))action=line.replace(/^\d+\.\s*/, '');
      });
      if(!source){var m=whole.match(/(?:Source|Sumber)\s*:\s*(.+)$/i);if(m)source=clean(m[1])}
      if(action)rows.push({action:action,source:source||null});
    });
    if(rows.length)return rows.slice(0,20);

    var candidates=card.querySelectorAll('li,[data-action],[data-plan-row]');
    Array.prototype.forEach.call(candidates,function(el){
      var whole=textOf(el);if(!whole)return;
      var lines=String(el.innerText||'').split(/\n+/).map(clean).filter(Boolean);
      var source='';var action='';
      lines.forEach(function(line){
        if(/^source\s*:/i.test(line)||/^sumber\s*:/i.test(line))source=line.replace(/^(source|sumber)\s*:\s*/i,'');
        else if(!action)action=line.replace(/^\d+\.\s*/, '');
      });
      if(action)rows.push({action:action,source:source||null});
    });
    return rows.slice(0,20);
  }

  function findTable(){
    var root=pageRoot();var best=null,bestScore=-1;
    Array.prototype.forEach.call(root.querySelectorAll('table'),function(t){
      if(!visible(t)||!t.querySelector('tbody tr'))return;
      var p=t.closest('section,main,article,[class*="rounded"],[class*="card"]')||t.parentElement;
      var x=textOf(p).toLowerCase();var s=0;
      if(/\bplan\b|\bpelan\b/.test(x))s+=6;if(/\bresult\b|\bhasil\b/.test(x))s+=4;if(/\bsignal\b|\bisyarat\b/.test(x))s+=2;if(/\blevel\b|\btahap\b/.test(x))s+=2;
      if(s>bestScore){best=t;bestScore=s}
    });
    return bestScore>=6?best:null;
  }
  function rowsFromTable(t){
    var h=Array.prototype.map.call(t.querySelectorAll('thead th'),function(th,i){return clean(th.innerText)||('column_'+(i+1))});
    return Array.prototype.map.call(t.querySelectorAll('tbody tr'),function(tr){var o={};Array.prototype.forEach.call(tr.querySelectorAll('th,td'),function(td,i){o[h[i]||('column_'+(i+1))]=clean(td.innerText)});return o}).filter(function(o){return Object.keys(o).some(function(k){return clean(o[k])})})
  }

  function findSource(){
    var card=findPlanCard();
    var r=rowsFromPlanCard(card);
    if(card&&r.length)return{anchor:card,rows:r,kind:'card'};
    var table=findTable();
    if(table){r=rowsFromTable(table);if(r.length)return{anchor:table,rows:r,kind:'table'}}
    return null;
  }

  function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;')}
  function box(src){
    var b=document.getElementById('i2-plan-ai-summary-worker');
    if(b)return b;
    b=document.createElement('div');b.id='i2-plan-ai-summary-worker';b.setAttribute('data-generated-by','cloudflare-worker');
    b.className='mb-5 rounded-2xl border border-emerald-200 bg-emerald-50/70 px-5 py-4 text-sm text-slate-700';
    if(src.kind==='card'){
      var heading=null;var nodes=src.anchor.querySelectorAll('h1,h2,h3,h4,h5,h6,[role="heading"]');
      for(var i=0;i<nodes.length;i++){var tt=textOf(nodes[i]).toLowerCase();if(tt.indexOf('prevention plan')!==-1||tt.indexOf('pelan pencegahan')!==-1){heading=nodes[i];break}}
      var intro=heading&&heading.nextElementSibling;
      if(intro&&intro.parentNode===src.anchor)intro.insertAdjacentElement('afterend',b);
      else if(heading&&heading.parentNode)heading.parentNode.insertBefore(b,heading.nextSibling);
      else src.anchor.insertBefore(b,src.anchor.firstChild);
    }else{
      var a=src.anchor.closest('.overflow-x-auto')||src.anchor;if(a.parentNode)a.parentNode.insertBefore(b,a);
    }
    return b;
  }
  function notice(b,p,l){
    b.innerHTML='<p class="font-semibold text-forest-800">'+esc(l==='bm'?'Pelan dalam bahasa mudah':'Plan in plain words')+'</p><p class="mt-1 text-slate-500">'+esc((p&&p.notice)||(l==='bm'?'Ringkasan AI tidak dapat dipaparkan. Sila gunakan pelan dan penunjuk tahap di bawah.':'The AI summary could not be displayed. Please use the plan and level indicators below.'))+'</p>';
  }
  function request(src){
    var r=src.rows;if(!r.length)return;var l=lang();var fp=l+':'+JSON.stringify(r);if(fp===last)return;last=fp;sourceRef=src.anchor;
    if(controller)controller.abort();controller=new AbortController();var b=box(src);
    b.innerHTML='<p class="font-semibold text-forest-800">'+esc(l==='bm'?'Pelan dalam bahasa mudah':'Plan in plain words')+'</p><p class="mt-1 text-slate-500">'+esc(l==='bm'?'Menjana ringkasan daripada pelan di bawah…':'Writing a summary from the plan below…')+'</p>';
    fetch('/api/i2/plan-summary',{method:'POST',headers:{'content-type':'application/json','accept':'application/json'},cache:'no-store',body:JSON.stringify({rows:r,language:l}),signal:controller.signal})
      .then(function(res){return res.json().then(function(p){return{ok:res.ok,p:p}})})
      .then(function(x){var p=x.p;if(x.ok&&p&&p.ok&&!p.hidden&&p.summary){b.innerHTML='<p class="font-semibold text-forest-800">'+esc(l==='bm'?'Pelan dalam bahasa mudah':'Plan in plain words')+'</p><p class="mt-2 leading-relaxed">'+esc(p.summary)+'</p><button type="button" data-plan-table-link class="mt-3 text-xs font-semibold text-forest-700 underline underline-offset-2">'+esc(l==='bm'?'Baca pelan di bawah':'Read the plan instead')+'</button><p class="mt-2 text-[11px] leading-relaxed text-slate-500">'+esc(p.disclaimer||'')+'</p>';var bt=b.querySelector('[data-plan-table-link]');if(bt)bt.onclick=function(){if(sourceRef)sourceRef.scrollIntoView({behavior:'smooth',block:'start'})}}else notice(b,p,l)})
      .catch(function(e){if(e&&e.name==='AbortError')return;notice(b,null,l)})
  }
  function scan(){clearTimeout(timer);timer=setTimeout(function(){var src=findSource();if(src)request(src)},120)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',scan,{once:true});else scan();
  new MutationObserver(scan).observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class','lang','hidden']});
  window.addEventListener('roomforboth:db-ready',scan);window.addEventListener('hashchange',scan);window.addEventListener('popstate',scan);
})();
</script>`;
class BodyInjector{element(el){el.append(PLAN_SUMMARY_CLIENT,{html:true})}}

export default{
  async fetch(request,env,ctx){
    var url=new URL(request.url);
    if(request.method==='POST'&&url.pathname==='/api/i2/plan-summary')return handlePlanSummary(request,env);
    const response=await iteration2Worker.fetch(request,env,ctx);
    const type=response.headers.get('content-type')||'';
    if(!type.toLowerCase().includes('text/html'))return response;
    return new HTMLRewriter().on('body',new BodyInjector()).transform(response);
  }
};
