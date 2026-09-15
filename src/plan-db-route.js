import { neon } from '@neondatabase/serverless';

function json(data,status=200){
  return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
}
function clean(v){return String(v==null?'':v).replace(/\s+/g,' ').trim();}
function norm(v){return clean(v).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');}
function flatten(v,out=[]){
  if(v==null)return out;
  if(Array.isArray(v)){v.forEach(x=>flatten(x,out));return out;}
  if(typeof v==='object'){Object.values(v).forEach(x=>flatten(x,out));return out;}
  var s=clean(v);if(s)out.push(s);return out;
}

const SPECIES_ALIASES={
  1:['1','long-tailed-macaque','macaque','monkey','kera','macaca-fascicularis'],
  2:['2','wild-boar','boar','babi-hutan','sus-scrofa'],
  3:['3','common-myna','common-mynah','myna','gembala-kerbau','tiong-gembala-kerbau','acridotheres-tristis'],
  4:['4','reticulated-python','python','ular-sawa-batik','malayopython-reticulatus'],
  5:['5','house-crow','crow','gagak-rumah','corvus-splendens'],
  6:['6','common-water-monitor','water-monitor','water-monitor-lizard','monitor-lizard','biawak','biawak-air','varanus-salvator'],
  7:['7','equatorial-spitting-cobra','spitting-cobra','cobra','ular-senduk-sembur','naja-sumatrana']
};

function requestedSpeciesIds(payload){
  var values=[];
  flatten(payload&&payload.speciesSeen,values);
  flatten(payload&&payload.species,values);
  flatten(payload&&payload.species_id,values);
  flatten(payload&&payload.speciesId,values);
  var ids=new Set();
  values.map(norm).filter(Boolean).forEach(function(token){
    Object.keys(SPECIES_ALIASES).forEach(function(id){
      if(SPECIES_ALIASES[id].some(function(a){return a===token||a.includes(token)||token.includes(a);}))ids.add(Number(id));
    });
  });
  return ids;
}

function tokenSet(payload){
  var values=[];
  ['foodSources','wasteStorage','neighboursFeed','attractants','signals','doorsWindows','openDoorsWindows','open_doors_windows','clutter','shelter','clutterShelter','reporting','report','cause_group','causeGroups','causes'].forEach(function(k){flatten(payload&&payload[k],values);});
  var out=new Set();
  values.forEach(function(v){var n=norm(v);if(!n)return;out.add(n);n.split('-').filter(function(x){return x.length>2;}).forEach(function(x){out.add(x);});});
  return out;
}
function deriveCauseGroups(payload){
  var t=tokenSet(payload),g=new Set();
  var has=function(){for(var i=0;i<arguments.length;i++)if(t.has(norm(arguments[i])))return true;return false;};
  if(has('food-waste-and-bins','open-bins','open-bin','uncovered-bin','unsecured-bin','rubbish','garbage','waste','bin','bins','food-waste','pet-food','petfood','food'))g.add('food-waste-and-bins');
  if(has('deliberate-feeding','feeding','feed','intentional-feeding','neighbour-feeding','neighbor-feeding','neighbours-feed','neighbors-feed','yes'))g.add('deliberate-feeding');
  if(has('fruit-trees','fruit-tree','fruit','ripe-fruit','garden-fruit'))g.add('fruit-trees');
  if(has('open-doors-windows','door','doors','window','windows','open-door','open-doors','open-window','open-windows'))g.add('open-doors-windows');
  if(has('clutter-and-shelter','clutter','pile','piles','shelter','debris'))g.add('clutter-and-shelter');
  if(has('reporting','report','authority','perhilitan'))g.add('reporting');
  if(has('personal-protection','shoes','floor','sleeping-floor','car'))g.add('personal-protection');
  return g;
}
function housingMatches(row,housing){
  var h=norm(housing);if(!h)return true;
  var r=norm(row&&row.housing_type);return !r||r==='all'||r==='any'||r==='general'||r===h||r.includes(h)||h.includes(r);
}
function sourceOk(r){
  return !!(clean(r&&r.action_text_en||r&&r.action_text_ms) && (clean(r&&r.source_person)||clean(r&&r.source_institution)||clean(r&&r.source_url)) && clean(r&&r.date_verified));
}
function publicAction(r,language){
  var en=clean(r.action_text_en),ms=clean(r.action_text_ms);
  return {
    prevention_id:r.prevention_id,
    species_id:r.species_id,
    species_name:clean(r.species_name),
    cause_group:r.cause_group,
    action_kind:r.action_kind,
    harm_rank:Number(r.harm_rank)||0,
    action_text:language==='bm'?(ms||en):(en||ms),
    action_text_en:en||null,
    action_text_ms:ms||null,
    housing_type:r.housing_type,
    costs_money:r.costs_money,
    source_person:r.source_person,
    source_institution:r.source_institution,
    source_url:r.source_url,
    date_verified:r.date_verified
  };
}

export async function handlePlanRequest(request,env){
  if(!env.DATABASE_URL)return json({ok:false,error:'DATABASE_URL is not configured',actions:[]},500);
  let payload;
  try{payload=await request.json();}catch{return json({ok:false,error:'Request body must be JSON',actions:[]},400);}
  try{
    const sql=neon(env.DATABASE_URL);
    const rows=await sql`
      SELECT
        p.prevention_id,p.species_id,p.category_id,p.cause_group,p.action_kind,p.harm_rank,
        p.action_text_en,p.action_text_ms,p.housing_type,p.costs_money,
        p.source_person,p.source_institution,p.source_url,p.date_verified,
        s.english_name AS species_name
      FROM prevention_action p
      LEFT JOIN species s ON s.species_id=p.species_id
      ORDER BY COALESCE(NULLIF(p.harm_rank,0),999),p.prevention_id
    `;
    var language=(payload&&((payload.language==='bm')||(payload.language==='ms'))) ? 'bm':'en';
    var speciesIds=requestedSpeciesIds(payload||{}),causes=deriveCauseGroups(payload||{}),housing=payload&&((payload.housingType!=null?payload.housingType:payload.housing_type));
    var speciesRows=rows.filter(function(r){return !speciesIds.size || speciesIds.has(Number(r.species_id));});
    var matched=speciesRows.filter(function(r){return (!causes.size||causes.has(norm(r.cause_group)))&&housingMatches(r,housing);});
    var tier='exact';
    if(!matched.length){matched=speciesRows;tier='species_general';}
    matched=matched.filter(sourceOk);
    var seen=new Set(),actions=[];
    matched.forEach(function(r){
      if(actions.length>=12)return;
      var a=publicAction(r,language),key=norm(a.action_text)||String(a.prevention_id||'');
      if(!key||seen.has(key))return;seen.add(key);actions.push(a);
    });
    return json({ok:true,table:'prevention_action',count:actions.length,state:payload&&payload.state||null,language:language,species_ids:Array.from(speciesIds),matched_cause_groups:Array.from(causes),tier:tier,fallback_used:tier!=='exact',actions:actions});
  }catch(err){
    console.error('[stable-plan-route]',err&&err.message?err.message:err);
    return json({ok:false,error:'Database/API request failed',detail:err&&err.message?err.message:String(err),actions:[]},500);
  }
}
