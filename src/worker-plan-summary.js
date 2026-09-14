import iteration2Worker from './worker-iteration2.js';

function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})}
function clean(v){return String(v==null?'':v).replace(/\s+/g,' ').trim()}
function extractNumbers(text){return String(text||'').match(/\b\d+(?:[.,]\d+)?%?\b/g)||[]}
function flatten(value,out=[]){if(value==null)return out;if(Array.isArray(value)){value.forEach(v=>flatten(v,out));return out}if(typeof value==='object'){Object.values(value).forEach(v=>flatten(v,out));return out}var s=clean(value);if(s)out.push(s);return out}

const KNOWN_ANIMAL_TERMS=['macaque','monkey','kera','wild boar','boar','babi hutan','myna','crow','python','cobra','snake','ular','monitor lizard','water monitor','biawak'];

function validate(summary,rows){
  var text=clean(summary);
  if(!text)return false;
  var sentences=text.split(/(?<=[.!?])\s+/).map(clean).filter(Boolean);
  if(sentences.length<2||sentences.length>3)return false;

  var source=clean(flatten(rows).join(' ')).toLowerCase();
  var allowedNumbers=new Set(extractNumbers(source));
  if(!extractNumbers(text).every(n=>allowedNumbers.has(n)))return false;

  var lower=text.toLowerCase();
  for(const term of KNOWN_ANIMAL_TERMS){
    if(lower.includes(term)&&!source.includes(term))return false;
  }

  var sourceTokens=new Set(source.split(/[^a-z0-9]+/).filter(t=>t.length>=4));
  for(const sentence of sentences){
    var overlap=sentence.toLowerCase().split(/[^a-z0-9]+/).filter(t=>t.length>=4&&sourceTokens.has(t));
    if(overlap.length<2)return false;
  }
  return true;
}

async function askMiniMax(env,rows,language,retryNote=''){
  if(!env.MINIMAX_API_KEY)throw new Error('MINIMAX_API_KEY is not configured');
  var langName=language==='bm'?'Bahasa Melayu':'English';
  var prompt=`You write the "Plan in plain words" AI summary for the Room for Both wildlife prevention plan.\n- Write exactly 2 to 3 short sentences in ${langName}.\n- The selected prevention actions below are the ONLY source of truth.\n- Summarise the main priorities and, where supported by the actions, indicate what the resident should focus on first.\n- Use ONLY information explicitly present in those selected actions.\n- Do not invent or add any species, risk, number, place, date, cause, action, recommendation, safety advice or prediction.\n- Do not introduce a new action that is not already represented in the selected actions.\n- You may connect and lightly rephrase the actions so the result is easy for a resident to understand.\n- Do not mention that you are an AI.\n- Return only the paragraph text: no heading, bullets, markdown, disclaimer or explanation.${retryNote}`;

  var controller=new AbortController();
  var timeout=setTimeout(()=>controller.abort(),10000);
  try{
    var res=await fetch('https://api.minimax.io/v1/text/chatcompletion_v2',{
      method:'POST',
      headers:{'content-type':'application/json',authorization:`Bearer ${env.MINIMAX_API_KEY}`},
      body:JSON.stringify({
        model:'MiniMax-Text-01',
        temperature:0.1,
        max_tokens:220,
        messages:[
          {role:'system',content:prompt},
          {role:'user',content:'Selected prevention actions:\n'+JSON.stringify(rows,null,2)}
        ]
      }),
      signal:controller.signal
    });
    if(!res.ok)throw new Error('MiniMax API '+res.status);
    var payload=await res.json();
    var text=clean(payload?.choices?.[0]?.message?.content||'');
    if(!text)throw new Error('empty completion');
    return text;
  }finally{clearTimeout(timeout)}
}

async function handlePlanSummary(request,env){
  if(!env.MINIMAX_API_KEY)return json({ok:false,hidden:true,error:'AI summary is not configured.'},501);
  var body;
  try{body=await request.json()}catch{return json({ok:false,hidden:true,error:'Request body must be JSON.'},400)}
  var rows=Array.isArray(body?.rows)?body.rows.slice(0,20):[];
  var language=body?.language==='bm'?'bm':'en';
  if(!rows.length)return json({ok:false,hidden:true,error:'rows is required.'},400);

  for(var attempt=1;attempt<=2;attempt++){
    try{
      var text=await askMiniMax(env,rows,language,attempt===2?'\nPrevious output failed validation. Stay closer to the exact actions and do not add any new information.':'');
      if(validate(text,rows))return json({ok:true,hidden:false,language,summary:text,attempts:attempt});
    }catch(e){console.error('[plan-summary]',attempt,e?.message||e)}
  }

  return json({
    ok:false,
    hidden:true,
    notice:language==='bm'
      ?'Ringkasan AI tidak dapat dipaparkan. Gunakan tindakan pencegahan di atas.'
      :'The AI summary could not be displayed. Please use the prevention actions above.'
  });
}

const PLAN_SUMMARY_CLIENT=String.raw`
<script id="room-for-both-plan-summary-worker-client">
(function(){
  'use strict';
  var last='';var controller=null;var timer=null;
  function clean(v){return String(v==null?'':v).replace(/\s+/g,' ').trim()}
  function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;')}
  function lang(){var l=String(document.documentElement.lang||'').toLowerCase();try{if(!l)l=String(localStorage.getItem('owm-lang')||'').toLowerCase()}catch(e){}return(l==='bm'||l==='ms')?'bm':'en'}

  function actionsHost(){return document.getElementById('plan-result__preventionActions')}
  function rowsFromActions(){
    var host=actionsHost();if(!host)return[];
    return Array.prototype.map.call(host.querySelectorAll('[data-plan-row="database"]'),function(row){
      var text=clean(row.innerText).replace(/^\d+\.\s*/,'');
      return text?{action:text,prevention_id:row.getAttribute('data-prevention-id')||null}:null;
    }).filter(Boolean).slice(0,20);
  }

  function box(){
    var host=actionsHost();if(!host)return null;
    var b=document.getElementById('i2-plan-ai-summary-worker');
    if(!b){
      b=document.createElement('div');
      b.id='i2-plan-ai-summary-worker';
      b.setAttribute('data-generated-by','minimax');
      b.className='mt-5 mb-5 rounded-2xl border border-emerald-200 bg-emerald-50/70 px-5 py-4 text-sm text-slate-700';
    }
    if(b.previousElementSibling!==host)host.insertAdjacentElement('afterend',b);
    return b;
  }

  function title(l){return l==='bm'?'Pelan dalam bahasa mudah · AI':'Plan in plain words · AI'}
  function renderNotice(b,p,l){
    if(!b)return;
    b.innerHTML='<p class="font-semibold text-forest-800">'+esc(title(l))+'</p><p class="mt-2 text-slate-500">'+esc((p&&p.notice)||(l==='bm'?'Ringkasan AI tidak dapat dipaparkan. Gunakan tindakan pencegahan di atas.':'The AI summary could not be displayed. Please use the prevention actions above.'))+'</p>';
  }

  function request(){
    var rows=rowsFromActions();if(!rows.length)return;
    var l=lang();var fp=l+':'+JSON.stringify(rows);if(fp===last)return;last=fp;
    if(controller)controller.abort();controller=new AbortController();
    var b=box();if(!b)return;
    b.innerHTML='<p class="font-semibold text-forest-800">'+esc(title(l))+'</p><p class="mt-2 text-slate-500">'+esc(l==='bm'?'Menjana ringkasan daripada tindakan di atas…':'Summarising the actions above…')+'</p>';

    fetch('/api/i2/plan-summary',{
      method:'POST',
      headers:{'content-type':'application/json','accept':'application/json'},
      cache:'no-store',
      body:JSON.stringify({rows:rows,language:l}),
      signal:controller.signal
    })
      .then(function(res){return res.json().then(function(p){return{ok:res.ok,p:p}})})
      .then(function(x){
        var p=x.p||{};
        if(x.ok&&p.ok&&!p.hidden&&p.summary){
          b.innerHTML='<p class="font-semibold text-forest-800">'+esc(title(l))+'</p><p class="mt-2 leading-relaxed">'+esc(p.summary)+'</p>';
        }else renderNotice(b,p,l);
      })
      .catch(function(e){if(e&&e.name==='AbortError')return;renderNotice(b,null,l)});
  }

  function scan(){clearTimeout(timer);timer=setTimeout(request,150)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',scan,{once:true});else scan();
  window.addEventListener('roomforboth:db-ready',scan);
  window.addEventListener('roomforboth:db-plan-ready',scan);
  window.addEventListener('hashchange',scan);
  window.addEventListener('popstate',scan);
  new MutationObserver(function(){
    var host=actionsHost();
    if(host&&host.querySelector('[data-plan-row="database"]'))scan();
  }).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['lang','class','hidden']});
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
