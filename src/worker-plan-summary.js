import iteration2Worker from './worker-iteration2.js';

const SUMMARY_CACHE_TTL = 60 * 60 * 24 * 7;

function json(data,status=200,headers={}){
  return new Response(JSON.stringify(data),{
    status,
    headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...headers}
  });
}
function clean(v){return String(v==null?'':v).replace(/\s+/g,' ').trim()}
function extractNumbers(text){return String(text||'').match(/\b\d+(?:[.,]\d+)?%?\b/g)||[]}
function flatten(value,out=[]){if(value==null)return out;if(Array.isArray(value)){value.forEach(v=>flatten(v,out));return out}if(typeof value==='object'){Object.values(value).forEach(v=>flatten(v,out));return out}var s=clean(value);if(s)out.push(s);return out}

const KNOWN_ANIMAL_TERMS=['macaque','monkey','kera','wild boar','boar','babi hutan','myna','crow','python','cobra','snake','ular','monitor lizard','water monitor','biawak'];

function validate(summary,rows){
  var text=clean(summary);
  if(!text)return false;
  var sentences=text.split(/(?<=[.!?])\s+/).map(clean).filter(Boolean);
  if(sentences.length<4||sentences.length>6)return false;

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

function stableRows(rows){
  return rows.map(function(row){
    return {prevention_id:row&&row.prevention_id!=null?String(row.prevention_id):'',action:clean(row&&row.action)};
  }).filter(function(row){return row.action;});
}

function hashText(text){var h=2166136261;for(var i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)}return(h>>>0).toString(16)}
function summaryCacheKey(rows,language){
  var stable=stableRows(rows).sort(function(a,b){var ai=Number(a.prevention_id),bi=Number(b.prevention_id);if(Number.isFinite(ai)&&Number.isFinite(bi)&&ai!==bi)return ai-bi;return(a.prevention_id+a.action).localeCompare(b.prevention_id+b.action)});
  var ids=stable.map(function(r){return r.prevention_id||'x'}).join('-');
  return new Request('https://plan-summary-cache.internal/v3/'+encodeURIComponent(language)+'/'+encodeURIComponent(ids)+'/'+hashText(JSON.stringify(stable)),{method:'GET'});
}
async function readCachedSummary(rows,language){try{var cached=await caches.default.match(summaryCacheKey(rows,language));if(!cached)return null;var payload=await cached.json();if(payload&&payload.ok&&payload.summary&&validate(payload.summary,rows))return payload}catch(e){console.warn('[plan-summary-cache] read failed',e?.message||e)}return null}
async function writeCachedSummary(rows,language,payload){try{await caches.default.put(summaryCacheKey(rows,language),new Response(JSON.stringify(payload),{headers:{'content-type':'application/json; charset=utf-8','cache-control':'public, max-age='+SUMMARY_CACHE_TTL}}))}catch(e){console.warn('[plan-summary-cache] write failed',e?.message||e)}}

async function askMiniMax(env,rows,language,retryNote=''){
  if(!env.MINIMAX_API_KEY)throw new Error('MINIMAX_API_KEY is not configured');
  var langName=language==='bm'?'Bahasa Melayu':'English';
  var prompt=`You write the "Plan in plain words" summary for Room for Both.\n- Write exactly 4 to 6 short sentences in ${langName}.\n- The prevention rows supplied below are the ONLY source of truth.\n- Use ONLY facts, species, numbers and actions explicitly present in those rows.\n- Do not add any risk, place, date, cause, action, recommendation, prediction or safety advice that is not present.\n- Do not imply probability for the resident's home.\n- Lightly rephrase and connect the rows so a resident can understand the priorities.\n- Return only the paragraph text. No heading, bullets, markdown, disclaimer or explanation.${retryNote}`;
  var res=await fetch('https://api.minimax.io/v1/text/chatcompletion_v2',{
    method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${env.MINIMAX_API_KEY}`},
    body:JSON.stringify({model:'MiniMax-Text-01',temperature:0.1,max_tokens:300,messages:[{role:'system',content:prompt},{role:'user',content:'Rows already displayed on the page:\n'+JSON.stringify(rows,null,2)}]})
  });
  if(!res.ok)throw new Error('MiniMax API '+res.status);
  var payload=await res.json();
  var text=clean(payload?.choices?.[0]?.message?.content||'');
  if(!text)throw new Error('empty completion');
  return text;
}

async function handlePlanSummary(request,env,ctx){
  var body;try{body=await request.json()}catch{return json({ok:false,hidden:true,error:'Request body must be JSON.'},400)}
  var rows=Array.isArray(body?.rows)?stableRows(body.rows.slice(0,20)):[];
  var language=body?.language==='bm'?'bm':'en';
  if(!rows.length)return json({ok:false,hidden:true,error:'rows is required.'},400);
  var cached=await readCachedSummary(rows,language);if(cached)return json({...cached,cached:true});
  if(!env.MINIMAX_API_KEY)return json({ok:false,hidden:true,error:'AI summary is not configured.'},501);
  for(var attempt=1;attempt<=2;attempt++){
    try{
      var text=await askMiniMax(env,rows,language,attempt===2?'\nPrevious output failed validation. Stay strictly within the supplied rows and keep exactly 4 to 6 sentences.':'');
      if(validate(text,rows)){
        var payload={ok:true,hidden:false,language,summary:text,attempts:attempt};
        if(ctx&&typeof ctx.waitUntil==='function')ctx.waitUntil(writeCachedSummary(rows,language,payload));else await writeCachedSummary(rows,language,payload);
        return json({...payload,cached:false});
      }
    }catch(e){console.error('[plan-summary]',attempt,e?.message||e)}
  }
  return json({ok:false,hidden:true,notice:language==='bm'?'Ringkasan AI tidak dapat dipaparkan selepas semakan. Gunakan jadual di halaman ini.':'The AI summary could not be displayed after validation. Use the table on this page.'});
}

export default{async fetch(request,env,ctx){var url=new URL(request.url);if(request.method==='POST'&&url.pathname==='/api/i2/plan-summary')return handlePlanSummary(request,env,ctx);return iteration2Worker.fetch(request,env,ctx)}};
