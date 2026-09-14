import { neon } from '@neondatabase/serverless';

function json(data,status=200,headers={}){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...headers}})}
function getSql(env){if(!env.DATABASE_URL)throw new Error('DATABASE_URL is not configured');return neon(env.DATABASE_URL)}
const TABLES={
  complaints:['complaint_series','complaints','complaint','complain','complain_table','complain_data','wildlife_complaints','wildlife_complaint'],
  attractants:['attractant_rule','attractant_rules','attractants','attractant','attract','attraction','attraction_rule','attract_table','home_attractants','home_attractant'],
  prevention:['prevention_action','prevention_actions','prevention','preventive_action','preventive_actions'],
  species:['species','wildlife_species','animal_species'],
  categories:['animal_category','animal_categories','species_category','species_categories'],
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
const STATE_CODE_BY_KEY={
  johor:1,kedah:2,kelantan:3,melaka:4,'negeri-sembilan':5,pahang:6,perak:7,perlis:8,penang:9,'pulau-pinang':9,
  sabah:10,sarawak:11,selangor:12,terengganu:13,kl:14,'kuala-lumpur':14,'w-p-kuala-lumpur':14,labuan:15,'w-p-labuan':15,putrajaya:16,'w-p-putrajaya':16
};
function resolveStateCode(value){const n=norm(value);if(!n)return null;if(/^\d+$/.test(n))return Number(n);return STATE_CODE_BY_KEY[n]??null}
function resolveSpeciesId(value){const n=norm(value);if(!n)return null;if(/^\d+$/.test(n))return Number(n);for(const [id,aliases] of Object.entries(SPECIES_ALIASES)){if(aliases.some(a=>a===n||a.includes(n)||n.includes(a)))return Number(id)}return null}
function filterRows(rows,url){const state=url.searchParams.get('state');const species=url.searchParams.get('species');let out=rows;if(state){const n=norm(state);out=out.filter(r=>{const s=norm(stateValue(r));return !s||s===n||s.includes(n)||n.includes(s)})}if(species){const n=norm(species);out=out.filter(r=>{const s=norm(speciesValue(r));return !s||s===n||s.includes(n)||n.includes(s)})}return out}
function filterComplaintRows(rows,url){
  let out=rows;
  const state=url.searchParams.get('state');
  const year=url.searchParams.get('year');
  const species=url.searchParams.get('species');
  if(state){
    const code=resolveStateCode(state);
    if(code!=null)out=out.filter(r=>Number(pick(r,['state_code','statecode']))===code);
    else {const n=norm(state);out=out.filter(r=>{const s=norm(stateValue(r));return s===n||s.includes(n)||n.includes(s)})}
  }
  if(year&&/^\d{4}$/.test(year))out=out.filter(r=>Number(pick(r,['year']))===Number(year));
  if(species){
    const id=resolveSpeciesId(species);
    if(id!=null)out=out.filter(r=>Number(pick(r,['species_id']))===id);
    else {const n=norm(species);out=out.filter(r=>{const s=norm(speciesValue(r));return s===n||s.includes(n)||n.includes(s)})}
  }
  return out;
}
function summarizeComplaintRows(rows,url){
  if(!rows.length)return {year:null,total_cases:0,top_species_id:null,top_species_cases:0,source_url:null,date_verified:null,has_explicit_total:false};
  const requestedYear=url.searchParams.get('year');
  const years=rows.map(r=>Number(pick(r,['year']))).filter(Number.isFinite);
  const year=requestedYear&&/^\d{4}$/.test(requestedYear)?Number(requestedYear):(years.length?Math.max(...years):null);
  const scoped=year==null?rows:rows.filter(r=>Number(pick(r,['year']))===year);
  const totals=scoped.filter(r=>pick(r,['species_id'])==null);
  const speciesRows=scoped.filter(r=>pick(r,['species_id'])!=null);
  const sumSpecies=speciesRows.reduce((sum,r)=>sum+(Number(pick(r,['cases']))||0),0);
  const explicitTotal=totals.length?Math.max(...totals.map(r=>Number(pick(r,['cases']))||0)):null;
  const totalCases=explicitTotal!=null?explicitTotal:sumSpecies;
  let top=null;
  for(const r of speciesRows){const c=Number(pick(r,['cases']))||0;if(!top||c>top.cases)top={species_id:Number(pick(r,['species_id'])),cases:c}}
  const sourceRow=totals[0]||speciesRows[0]||scoped[0]||null;
  return {
    year,
    total_cases:totalCases,
    top_species_id:top?top.species_id:null,
    top_species_cases:top?top.cases:0,
    source_url:sourceRow?pick(sourceRow,['source_url','url','reference_url']):null,
    date_verified:sourceRow?pick(sourceRow,['date_verified','verified_date','last_verified']):null,
    has_explicit_total:explicitTotal!=null
  };
}
function arr(v){if(v==null)return[];return Array.isArray(v)?v:[v]}
function flattenStrings(v,out=[]){if(v==null)return out;if(Array.isArray(v)){v.forEach(x=>flattenStrings(x,out));return out}if(typeof v==='object'){Object.values(v).forEach(x=>flattenStrings(x,out));return out}const s=String(v).trim();if(s)out.push(s);return out}
function tokenSet(values){const out=new Set();flattenStrings(values).forEach(v=>{const n=norm(v);if(!n)return;out.add(n);n.split('-').filter(x=>x.length>2).forEach(x=>out.add(x))});return out}
function addSynonyms(tokens){const add=(...xs)=>xs.forEach(x=>tokens.add(norm(x)));const has=(...xs)=>xs.some(x=>tokens.has(norm(x)));
  if(has('open-bins','open-bin','uncovered-bin','unsecured-bin','rubbish','garbage','waste','bin'))add('waste','food-waste','rubbish','garbage','bin','bins','food-waste-and-bins');
  if(has('fruit-trees','fruit-tree','fruit','ripe-fruit'))add('fruit','fruit-tree','fruit-trees','garden-fruit','fruit-trees');
  if(has('pet-food','petfood'))add('pet-food','petfood','feeding','food-waste-and-bins');
  if(has('yes','neighbours-feed','neighbors-feed','feeding','feed'))add('feeding','feed','intentional-feeding','neighbour-feeding','neighbor-feeding','deliberate-feeding');
  if(has('door','doors','window','windows','open-door','open-doors','open-window','open-windows'))add('open-doors-windows');
  if(has('clutter','pile','piles','shelter','debris'))add('clutter-and-shelter');
  if(has('report','reporting','authority','perhilitan'))add('reporting');
  return tokens;
}

const SPECIES_ALIASES={
  1:['long-tailed-macaque','macaque','monkey','kera','macaca-fascicularis'],
  2:['wild-boar','boar','babi-hutan','sus-scrofa'],
  3:['common-myna','myna','tiong-gembala-kerbau','acridotheres-tristis'],
  4:['reticulated-python','python','ular-sawa-batik','malayopython-reticulatus'],
  5:['house-crow','crow','gagak-rumah','corvus-splendens'],
  6:['common-water-monitor','water-monitor','monitor-lizard','biawak','biawak-air','varanus-salvator'],
  7:['equatorial-spitting-cobra','spitting-cobra','cobra','ular-senduk-sembur','naja-sumatrana']
};
function requestedSpeciesIds(requested,speciesById){
  const req=arr(requested).map(norm).filter(Boolean);
  const ids=new Set();
  for(const token of req){
    if(token==='snake'||token==='ular'){ids.add('4');ids.add('7');continue}
    for(const [id,aliases] of Object.entries(SPECIES_ALIASES)){
      if(aliases.some(a=>a===token||a.includes(token)||token.includes(a)))ids.add(String(id));
    }
    for(const [id,s] of speciesById.entries()){
      const names=[s.english_name,s.malay_name,s.scientific_name,s.order_family_species].map(norm).filter(Boolean);
      if(names.some(n=>n===token||n.includes(token)||token.includes(n)))ids.add(String(id));
    }
  }
  return ids;
}
function isSnakeRequest(requested,speciesIds){
  const req=arr(requested).map(norm);
  return speciesIds.has('4')||speciesIds.has('7')||req.some(x=>x==='snake'||x==='ular'||x.includes('python')||x.includes('cobra'));
}
function rowSpeciesNames(row,speciesById){const direct=[pick(row,['species','species_name','english_name','malay_name','scientific_name','species_key'])];const id=pick(row,['species_id']);const s=id!=null?speciesById.get(String(id)):null;if(s)direct.push(s.english_name,s.malay_name,s.scientific_name,s.order_family_species);return direct.filter(Boolean)}
function speciesMatches(row,requested,speciesById){
  const req=arr(requested).map(norm).filter(Boolean);
  if(!req.length)return true;
  const requestedIds=requestedSpeciesIds(requested,speciesById);
  const rowId=pick(row,['species_id']);
  if(rowId==null)return isSnakeRequest(requested,requestedIds);
  if(requestedIds.size)return requestedIds.has(String(rowId));
  const names=rowSpeciesNames(row,speciesById).map(norm).filter(Boolean);
  return req.some(r=>names.some(n=>n===r||n.includes(r)||r.includes(n)));
}

const DB_CAUSE_GROUPS=['food-waste-and-bins','clutter-and-shelter','personal-protection','deliberate-feeding','fruit-trees','open-doors-windows','reporting'];
function deriveCauseGroups(payload={}){
  const groups=new Set();
  const add=x=>groups.add(norm(x));
  const raw={
    foodSources:payload.foodSources,
    wasteStorage:payload.wasteStorage,
    neighboursFeed:payload.neighboursFeed,
    attractants:payload.attractants,
    signals:payload.signals,
    doorsWindows:payload.doorsWindows??payload.openDoorsWindows??payload.open_doors_windows,
    clutter:payload.clutter??payload.shelter??payload.clutterShelter,
    reporting:payload.reporting??payload.report
  };
  const tokens=addSynonyms(tokenSet(raw));
  const has=(...xs)=>xs.some(x=>tokens.has(norm(x)));
  if(has('food-waste-and-bins','open-bins','open-bin','uncovered-bin','unsecured-bin','rubbish','garbage','waste','bin','bins','food-waste','pet-food','petfood','food'))add('food_waste_and_bins');
  if(has('deliberate-feeding','feeding','feed','intentional-feeding','neighbour-feeding','neighbor-feeding','neighbours-feed','neighbors-feed'))add('deliberate_feeding');
  if(has('fruit-trees','fruit-tree','fruit','ripe-fruit','garden-fruit'))add('fruit_trees');
  if(has('open-doors-windows','door','doors','window','windows','open-door','open-doors','open-window','open-windows'))add('open_doors_windows');
  if(has('clutter-and-shelter','clutter','pile','piles','shelter','debris'))add('clutter_and_shelter');
  if(has('reporting','report','authority','perhilitan'))add('reporting');
  if(has('personal-protection','shoes','floor','sleeping-floor','car'))add('personal_protection');
  flattenStrings(payload.cause_group??payload.causeGroups??payload.causes).forEach(v=>{const n=norm(v);if(DB_CAUSE_GROUPS.includes(n))groups.add(n)});
  return groups;
}
function causeMatches(row,causeGroups){
  if(!causeGroups.size)return true;
  const cause=norm(pick(row,['cause_group','trigger_key','signal_key','cause','reason']));
  if(!cause)return false;
  return causeGroups.has(cause);
}
function housingMatches(row,housingType){const h=norm(housingType);if(!h)return true;const r=norm(pick(row,['housing_type','housing','home_type']));if(!r||r==='all'||r==='any'||r==='general')return true;return r===h||r.includes(h)||h.includes(r)}
function publicAction(row,speciesById,language='en'){
  const id=pick(row,['prevention_id','action_id','id']);
  const speciesId=pick(row,['species_id']);
  const species=speciesId!=null?speciesById.get(String(speciesId)):null;
  const en=pick(row,['action_text_en','action_en','text_en','action_text','action']);
  const ms=pick(row,['action_text_ms','action_text_bm','action_ms','text_ms','text_bm']);
  return {
    prevention_id:id,
    species_id:speciesId,
    species_name:species?.english_name||species?.malay_name||null,
    cause_group:pick(row,['cause_group','trigger_key','signal_key','cause']),
    action_kind:pick(row,['action_kind','kind','type']),
    harm_rank:Number(pick(row,['harm_rank','priority','rank']))||0,
    action_text:language==='bm'?(ms||en):(en||ms),
    action_text_en:en||null,
    action_text_ms:ms||null,
    housing_type:pick(row,['housing_type','housing','home_type']),
    costs_money:pick(row,['costs_money','cost','requires_cost']),
    source_person:pick(row,['source_person','author','source_author']),
    source_institution:pick(row,['source_institution','source_name','institution']),
    source_url:pick(row,['source_url','url','reference_url']),
    date_verified:pick(row,['date_verified','verified_date','last_verified'])
  };
}
async function getPreventionContext(sql,found){
  const preventionRows=await rowsFrom(sql,found.prevention,5000);
  const speciesRows=await rowsFrom(sql,found.species,5000);
  const speciesById=new Map();
  speciesRows.forEach(s=>{const id=pick(s,['species_id','id']);if(id!=null)speciesById.set(String(id),s)});
  return {preventionRows,speciesRows,speciesById};
}
function sortPreventionRows(rows){
  return rows.slice().sort((a,b)=>{
    const ar=Number(pick(a,['harm_rank','priority','rank']));
    const br=Number(pick(b,['harm_rank','priority','rank']));
    const av=Number.isFinite(ar)&&ar>0?ar:999;
    const bv=Number.isFinite(br)&&br>0?br:999;
    if(av!==bv)return av-bv;
    return (Number(pick(a,['prevention_id','action_id','id']))||999999)-(Number(pick(b,['prevention_id','action_id','id']))||999999);
  });
}
async function buildPlan(sql,found,payload={}){
  if(!found.prevention)return {ok:false,error:'prevention_action table not found',actions:[]};
  const {preventionRows,speciesById}=await getPreventionContext(sql,found);
  const speciesSeen=payload.speciesSeen??payload.species??[];
  const housingType=payload.housingType??payload.housing_type??null;
  const causeGroups=deriveCauseGroups(payload);
  const language=(payload.language==='bm'||payload.language==='ms')?'bm':'en';
  const requestedIds=requestedSpeciesIds(speciesSeen,speciesById);

  let matched=preventionRows.filter(r=>speciesMatches(r,speciesSeen,speciesById)&&causeMatches(r,causeGroups)&&housingMatches(r,housingType));
  let tier='exact';
  if(!matched.length){
    matched=preventionRows.filter(r=>speciesMatches(r,speciesSeen,speciesById));
    tier='species_general';
  }

  matched=sortPreventionRows(matched);
  const seen=new Set();
  const actions=[];
  for(const r of matched){const a=publicAction(r,speciesById,language);const key=norm(a.action_text)||String(a.prevention_id||'');if(!key||seen.has(key))continue;seen.add(key);actions.push(a);if(actions.length>=12)break}
  return {ok:true,table:found.prevention,count:actions.length,state:payload.state||null,language,species_ids:Array.from(requestedIds),matched_cause_groups:Array.from(causeGroups),tier,fallback_used:tier!=='exact',actions};
}
async function insertFailure(sql,table,payload){if(!table||!safeIdent(table))return {logged:false,reason:'failure_table_not_found'};const cols=await columns(sql,table);const names=new Set(cols.map(c=>c.column_name));const values=[];const outCols=[];const add=(aliases,val)=>{const c=aliases.find(x=>names.has(x));if(c&&val!=null){outCols.push(c);values.push(val)}};add(['kind','lookup_kind','event_type','type'],String(payload.kind||'lookup').slice(0,80));add(['query_text','query','search_term','term','lookup_value'],String(payload.query||'').slice(0,200));add(['failure_reason','reason','error','status'],String(payload.reason||'no_match').slice(0,120));add(['page','route','path'],String(payload.page||payload.route||'').slice(0,160));if(!outCols.length){try{await sql.query(`INSERT INTO public."${table}" DEFAULT VALUES`);return {logged:true,table,columns:[]}}catch(e){return {logged:false,table,error:e.message}}}const quoted=outCols.map(c=>`"${c}"`).join(',');const params=values.map((_,i)=>`$${i+1}`).join(',');try{await sql.query(`INSERT INTO public."${table}" (${quoted}) VALUES (${params})`,values);return {logged:true,table,columns:outCols}}catch(e){return {logged:false,table,error:e.message}}}
async function api(request,env){
  const url=new URL(request.url);const sql=getSql(env);const existing=await existingTables(sql);
  const found={
    complaints:choose(existing,TABLES.complaints,/complain/i),
    attractants:choose(existing,TABLES.attractants,/attract/i),
    prevention:choose(existing,TABLES.prevention,/prevent.*action/i),
    species:choose(existing,TABLES.species,/species/i),
    categories:choose(existing,TABLES.categories,/animal.*categor|species.*categor/i),
    failures:choose(existing,TABLES.failures,/(fail|error).*(search|lookup)|(search|lookup).*(fail|error)/i)
  };
  if(request.method==='GET'&&url.pathname==='/api/health')return json({ok:true,service:'room-for-both-iteration2',database:'connected',tables:found});
  if(request.method==='GET'&&url.pathname==='/api/i2/status')return json({ok:true,tables:found,columns:{complaints:await columns(sql,found.complaints),attractants:await columns(sql,found.attractants),prevention:await columns(sql,found.prevention),species:await columns(sql,found.species),categories:await columns(sql,found.categories),failures:await columns(sql,found.failures)}});
  if(request.method==='GET'&&url.pathname==='/api/i2/complaints'){
    if(!found.complaints)return json({ok:false,error:'complaint_series table not found',rows:[],summary:null},404);
    const rows=filterComplaintRows(await rowsFrom(sql,found.complaints),url);
    const summary=summarizeComplaintRows(rows,url);
    return json({ok:true,table:found.complaints,count:rows.length,summary,rows});
  }
  if(request.method==='GET'&&url.pathname==='/api/i2/attractants'){const rows=filterRows(await rowsFrom(sql,found.attractants),url);return json({ok:true,table:found.attractants,count:rows.length,rows})}
  if(request.method==='GET'&&url.pathname==='/api/i2/prevention-actions'){
    if(!found.prevention)return json({ok:false,error:'prevention_action table not found',rows:[]},404);
    const {preventionRows,speciesById}=await getPreventionContext(sql,found);
    const species=url.searchParams.getAll('species');
    const cause=url.searchParams.getAll('cause');
    const housingType=url.searchParams.get('housing_type')||url.searchParams.get('housing');
    const causeGroups=new Set(cause.map(norm).filter(Boolean));
    const language=(url.searchParams.get('language')==='bm'||url.searchParams.get('language')==='ms')?'bm':'en';
    const filtered=preventionRows.filter(r=>speciesMatches(r,species,speciesById)&&causeMatches(r,causeGroups)&&housingMatches(r,housingType));
    const rows=filtered.map(r=>publicAction(r,speciesById,language)).sort((a,b)=>((a.harm_rank||999)-(b.harm_rank||999))||((Number(a.prevention_id)||999999)-(Number(b.prevention_id)||999999)));
    return json({ok:true,table:found.prevention,count:rows.length,rows});
  }
  if(request.method==='POST'&&url.pathname==='/api/i2/plan'){
    let payload;try{payload=await request.json()}catch{return json({ok:false,error:'Request body must be JSON'},400)}
    const plan=await buildPlan(sql,found,payload||{});
    return json(plan,plan.ok?200:404);
  }
  if(request.method==='POST'&&url.pathname==='/api/i2/search-failure'){let payload={};try{payload=await request.json()}catch{};const result=await insertFailure(sql,found.failures,payload);return json({ok:true,...result},result.logged?201:202)}
  if(request.method==='POST'&&url.pathname==='/api/identify-describe')return json({ok:false,error:'AI backend is not enabled in the Iteration 2 branch; frontend fallback remains active.'},501);
  if(url.pathname.startsWith('/api/'))return json({ok:false,error:'API route not found'},404);
  return null
}

async function injectGeneralGuidanceFix(request,env,url){
  const assetResp=await env.ASSETS.fetch(new Request(url.toString(),request));
  const type=assetResp.headers.get('content-type')||'';
  if(!type.includes('text/html')) return assetResp;
  let html=await assetResp.text();
  const patches=[
    '<script src="/general-guidance-image-fix.js?v=20260914-3"></script>',
    '<script src="/complaint-db-client.js?v=20260914-1"></script>'
  ];
  for(const tag of patches){
    const src=(tag.match(/src="([^"]+)/)||[])[1];
    if(src && !html.includes(src)){
      if(html.includes('</body>')) html=html.replace('</body>',tag+'\n</body>');
      else html+=tag;
    }
  }
  const headers=new Headers(assetResp.headers);
  headers.delete('content-length');
  headers.set('cache-control','no-store, no-cache, must-revalidate');
  headers.set('x-iteration2-patch','general-guidance-image-fix');
  return new Response(html,{status:assetResp.status,statusText:assetResp.statusText,headers});
}

async function serveFrontend(request,env){
  const url=new URL(request.url);
  if(request.method==='GET' && (url.pathname==='/' || url.pathname==='/index.html')){
    url.pathname='/index0914.html';
    return injectGeneralGuidanceFix(request,env,url);
  }
  if(request.method==='GET' && (url.pathname==='/index0914' || url.pathname==='/index0914.html')){
    if(url.pathname==='/index0914') url.pathname='/index0914.html';
    return injectGeneralGuidanceFix(request,env,url);
  }
  return env.ASSETS.fetch(request);
}

export default{async fetch(request,env){try{const r=await api(request,env);if(r)return r}catch(err){console.error('[iteration2 worker]',err);if(new URL(request.url).pathname.startsWith('/api/'))return json({ok:false,error:'Database/API request failed',detail:err?.message||String(err)},500)}return serveFrontend(request,env)}};