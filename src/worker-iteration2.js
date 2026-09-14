import { neon } from '@neondatabase/serverless';

function json(data,status=200,headers={}){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...headers}})}
function getSql(env){if(!env.DATABASE_URL)throw new Error('DATABASE_URL is not configured');return neon(env.DATABASE_URL)}
const TABLES={
  complaints:['complaint_series','complaints','complaint','complain','complain_table','complain_data','wildlife_complaints','wildlife_complaint'],
  attractants:['attractant_rule','attractant_rules','attractants','attractant','attract','attraction','attraction_rule','attract_table','home_attractants','home_attractant'],
  failures:['search_failure_log','search_failures','search_failure','lookup_failure_log','lookup_failures','lookup_failure','failure_log','failed_lookup','failed_search','search_log']
};
const safeIdent=s=>/^[a-z_][a-z0-9_]*$/i.test(s||'');
async function existingTables(sql){const rows=await sql`SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name`;return rows.map(r=>r.table_name)}
function choose(existing,candidates,pattern){const exact=candidates.find(x=>existing.includes(x));if(exact)return exact;if(pattern){const fuzzy=existing.find(x=>pattern.test(x));if(fuzzy)return fuzzy}return null}
async function columns(sql,table){if(!table)return[];return (await sql`SELECT column_name,data_type,is_nullable,column_default FROM information_schema.columns WHERE table_schema='public' AND table_name=${table} ORDER BY ordinal_position`).map(r=>r)}
async function rowsFrom(sql,table,limit=5000){if(!table||!safeIdent(table))return[];const q=`SELECT to_jsonb(t) AS row FROM public."${table}" t LIMIT $1`;const rows=await sql.query(q,[limit]);return rows.map(x=>x.row)}
function norm(v){return String(v??'').trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}
function pick(row,keys){for(const k of keys)if(row&&row[k]!=null&&row[k]!=='')return row[k];return null}
function stateValue(r){return pick(r,['state_key','state','state_name','statecode','state_code','jurisdiction','region'])}
function speciesValue(r){return pick(r,['species_key','species','species_name','common_name','english_name','animal','animal_name','category'])}
function filterRows(rows,url){const state=url.searchParams.get('state');const species=url.searchParams.get('species');let out=rows;if(state){const n=norm(state);out=out.filter(r=>{const s=norm(stateValue(r));return !s||s===n||s.includes(n)||n.includes(s)})}if(species){const n=norm(species);out=out.filter(r=>{const s=norm(speciesValue(r));return !s||s===n||s.includes(n)||n.includes(s)})}return out}
function positiveInt(value){const n=Number(value);return Number.isInteger(n)&&n>0?n:null}
function answerValue(obj,keys){for(const k of keys){const v=obj&&obj[k];if(v!=null&&String(v).trim()!=='')return String(v).trim()}return ''}
function inferHousingType(homeAnswers){return answerValue(homeAnswers,['housing_type','housingType','home_type','homeType','property_type','propertyType','dwelling_type','dwellingType'])}
function inferCauseGroup(homeAnswers){return answerValue(homeAnswers,['cause_group','causeGroup','cause','attractant','attractant_group','problem_cause','problemCause'])}
async function loadPreventionPlan(sql,payload={}){
  const homeAnswers=payload.homeAnswers&&typeof payload.homeAnswers==='object'?payload.homeAnswers:{};
  const speciesId=positiveInt(payload.species_id||payload.speciesId||homeAnswers.species_id||homeAnswers.speciesId);
  const categoryId=positiveInt(payload.category_id||payload.categoryId||homeAnswers.category_id||homeAnswers.categoryId);
  const housingType=String(payload.housing_type||payload.housingType||inferHousingType(homeAnswers)||'').trim();
  const causeGroup=String(payload.cause_group||payload.causeGroup||inferCauseGroup(homeAnswers)||'').trim();

  if(speciesId===null&&categoryId===null){return {ok:false,status:400,error:'species_id or category_id is required to build the prevention plan.'}}

  const rows=await sql`
    SELECT *
    FROM prevention_action
    WHERE (${speciesId}::int IS NULL OR species_id=${speciesId})
      AND (${categoryId}::int IS NULL OR category_id=${categoryId})
      AND (${housingType||null}::text IS NULL OR LOWER(housing_type)=LOWER(${housingType||null}) OR housing_type IS NULL OR BTRIM(housing_type)='')
      AND (${causeGroup||null}::text IS NULL OR LOWER(cause_group)=LOWER(${causeGroup||null}) OR cause_group IS NULL OR BTRIM(cause_group)='')
    ORDER BY harm_rank NULLS LAST, prevention_id
  `;

  let actions=rows;
  if(!actions.length&&(housingType||causeGroup)){
    actions=await sql`
      SELECT * FROM prevention_action
      WHERE (${speciesId}::int IS NULL OR species_id=${speciesId})
        AND (${categoryId}::int IS NULL OR category_id=${categoryId})
      ORDER BY harm_rank NULLS LAST, prevention_id
    `;
  }
  return {ok:true,actions,count:actions.length,filters:{species_id:speciesId,category_id:categoryId,housing_type:housingType||null,cause_group:causeGroup||null}};
}
async function insertFailure(sql,table,payload){if(!table||!safeIdent(table))return {logged:false,reason:'failure_table_not_found'};const cols=await columns(sql,table);const names=new Set(cols.map(c=>c.column_name));const values=[];const outCols=[];const add=(aliases,val)=>{const c=aliases.find(x=>names.has(x));if(c&&val!=null){outCols.push(c);values.push(val)}};add(['kind','lookup_kind','event_type','type'],String(payload.kind||'lookup').slice(0,80));add(['query_text','query','search_term','term','lookup_value'],String(payload.query||'').slice(0,200));add(['failure_reason','reason','error','status'],String(payload.reason||'no_match').slice(0,120));add(['page','route','path'],String(payload.page||payload.route||'').slice(0,160));if(!outCols.length){try{await sql.query(`INSERT INTO public."${table}" DEFAULT VALUES`);return {logged:true,table,columns:[]}}catch(e){return {logged:false,table,error:e.message}}}const quoted=outCols.map(c=>`"${c}"`).join(',');const params=values.map((_,i)=>`$${i+1}`).join(',');try{await sql.query(`INSERT INTO public."${table}" (${quoted}) VALUES (${params})`,values);return {logged:true,table,columns:outCols}}catch(e){return {logged:false,table,error:e.message}}}

async function api(request,env){
  const url=new URL(request.url);const sql=getSql(env);const existing=await existingTables(sql);const found={
    complaints:choose(existing,TABLES.complaints,/complain/i),
    attractants:choose(existing,TABLES.attractants,/attract/i),
    failures:choose(existing,TABLES.failures,/(fail|error).*(search|lookup)|(search|lookup).*(fail|error)/i)
  };
  if(request.method==='GET'&&url.pathname==='/api/health')return json({ok:true,service:'room-for-both-iteration2',database:'connected',tables:found});
  if(request.method==='GET'&&url.pathname==='/api/i2/status')return json({ok:true,tables:found,columns:{complaints:await columns(sql,found.complaints),attractants:await columns(sql,found.attractants),failures:await columns(sql,found.failures)}});
  if(request.method==='GET'&&url.pathname==='/api/i2/complaints'){const rows=filterRows(await rowsFrom(sql,found.complaints),url);return json({ok:true,table:found.complaints,count:rows.length,rows})}
  if(request.method==='GET'&&url.pathname==='/api/i2/attractants'){const rows=filterRows(await rowsFrom(sql,found.attractants),url);return json({ok:true,table:found.attractants,count:rows.length,rows})}
  if((request.method==='POST'||request.method==='GET')&&url.pathname==='/api/i2/plan'){
    let payload={};
    if(request.method==='POST'){try{payload=await request.json()}catch{return json({ok:false,error:'Request body must be JSON.'},400)}}
    else payload={species_id:url.searchParams.get('species_id'),category_id:url.searchParams.get('category_id'),housing_type:url.searchParams.get('housing_type'),cause_group:url.searchParams.get('cause_group')};
    const result=await loadPreventionPlan(sql,payload);
    return json(result,result.status||200);
  }
  if(request.method==='POST'&&url.pathname==='/api/i2/search-failure'){let payload={};try{payload=await request.json()}catch{};const result=await insertFailure(sql,found.failures,payload);return json({ok:true,...result},result.logged?201:202)}
  if(request.method==='POST'&&url.pathname==='/api/identify-describe')return json({ok:false,error:'AI backend is not enabled in the Iteration 2 branch; frontend fallback remains active.'},501);
  if(url.pathname.startsWith('/api/'))return json({ok:false,error:'API route not found'},404);
  return null;
}

async function serveAssetWithClient(request,env){
  const response=await env.ASSETS.fetch(request);
  const url=new URL(request.url);
  if(request.method!=='GET'||url.pathname!=='/'&&url.pathname!=='/index.html')return response;
  const type=response.headers.get('content-type')||'';
  if(!type.includes('text/html'))return response;
  let html=await response.text();
  if(!html.includes('/i2-real-data-client.js'))html=html.replace(/<\/body>/i,'<script src="/i2-real-data-client.js"></script></body>');
  const headers=new Headers(response.headers);headers.set('cache-control','no-store');headers.delete('content-length');
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}

export default{async fetch(request,env){try{const r=await api(request,env);if(r)return r}catch(err){console.error('[iteration2 worker]',err);if(new URL(request.url).pathname.startsWith('/api/'))return json({ok:false,error:'Database/API request failed',detail:err?.message||String(err)},500)}return serveAssetWithClient(request,env)}};
