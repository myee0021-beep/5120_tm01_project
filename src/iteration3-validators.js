export const I3 = Object.freeze({
  species: new Set(['macaque','wild-boar','water-monitor','house-crow','common-myna','snake','not-sure']),
  kind: new Set(['turned-up','worked','invasive']),
  when: new Set(['this-week','last-week','earlier-month','longer-ago']),
  time: new Set(['early-morning','late-morning','midday','afternoon','evening','night']),
  did: new Set(['took-food','came-inside','onto-roof','damaged','passed-through','stayed-nearby']),
  worked: new Set(['latching-lid','picked-fruit','screens','cleared-undergrowth','stopped-feeding','pet-food-indoors','nothing-yet']),
  states: new Set(['johor','kedah','kelantan','melaka','negeri-sembilan','pahang','perak','perlis','penang','sabah','sarawak','selangor','terengganu','kl','labuan','putrajaya']),
  decisions: new Set(['publish','hold','delete']),
  reasons: Object.freeze({
    published: new Set(['publish']),
    'personal-detail': new Set(['hold','delete']),
    'photo-identifying': new Set(['hold','delete']),
    'exact-location': new Set(['hold','delete']),
    'outside-seven': new Set(['hold','delete']),
    'harmful-advice': new Set(['hold','delete']),
    duplicate: new Set(['hold','delete']),
    abuse: new Set(['hold','delete']),
    test: new Set(['publish','hold','delete'])
  })
});

export const SNAKE_TERMS = Object.freeze([
  'snake','snakes','ular','sawa','ular sawa','tedung','senduk','ular senduk','python','cobra','viper','krait','pit viper',
  'legless','no legs','slithering','hissing','fang','fanged','strike','striking'
]);

export function cleanText(value, max=300){
  return String(value ?? '').replace(/[\u0000-\u001F\u007F]/g,' ').replace(/\s+/g,' ').trim().slice(0,max);
}
export function slug(value){return cleanText(value,160).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}
export function list(value){return Array.isArray(value)?value:[]}
export function uniqueAllowed(values, allowed){return [...new Set(list(values).filter(v=>allowed.has(v)))]}
export function containsSnakeTerm(text){const t=cleanText(text,500).toLowerCase();return SNAKE_TERMS.some(term=>new RegExp('(^|[^a-z])'+term.replace(/s+/g,'\s+')+'([^a-z]|$)').test(t))}

export function validateCommunitySubmission(input){
  const species=String(input?.species||'');
  const kind=String(input?.kind||'');
  const state=String(input?.state||'');
  const district=slug(input?.district||'');
  const week=String(input?.week||'');
  const time=String(input?.time||'');
  if(!I3.species.has(species))return {ok:false,error:'Invalid species.'};
  if(!I3.kind.has(kind))return {ok:false,error:'Invalid report kind.'};
  if(!I3.states.has(state))return {ok:false,error:'Invalid state.'};
  if(!district)return {ok:false,error:'district is required.'};
  if(!/^\d{4}-\d{2}-\d{2}$/.test(week))return {ok:false,error:'week must be YYYY-MM-DD.'};
  if(!I3.time.has(time))return {ok:false,error:'Invalid time.'};
  if(species==='snake'&&kind==='invasive')return {ok:false,error:'Snake reports cannot be invasive sightings.'};
  if(kind==='invasive'&&!['house-crow','common-myna'].includes(species))return {ok:false,error:'Invasive sightings are limited to house crow and common myna.'};
  const did=uniqueAllowed(input?.did,I3.did);
  let worked=uniqueAllowed(input?.worked,I3.worked);
  if(worked.includes('nothing-yet')&&worked.length>1)worked=['nothing-yet'];
  const note=cleanText(input?.note||'',140);
  return {ok:true,value:{species,kind,state,district,week,time,did,worked,note}};
}

export function detectPersonalDetail(note){
  const text=cleanText(note,500);
  if(!text)return null;
  const checks=[
    ['phone',/(?:\+?6?0?1\d[-\s]?\d{3,4}[-\s]?\d{4}|\b\d{8,12}\b)/i],
    ['email',/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i],
    ['url',/\b(?:https?:\/\/|www\.)\S+/i],
    ['postal',/\b\d{5}\b/],
    ['street',/\b(?:jalan|jln|lorong|lor|persiaran|street|st\.?|road|rd\.?|avenue|ave\.?|lane|ln\.?)\s+[A-Za-z0-9][A-Za-z0-9 .'-]{1,40}/i],
    ['house-number',/\b(?:no\.?|number|house)\s*#?\s*\d+[A-Za-z]?\b/i],
    ['named-person',/\b(?:mr|mrs|ms|miss|dr|encik|puan|cik)\.?\s+[A-Z][A-Za-z'-]{1,30}\b/]
  ];
  for(const [kind,re] of checks)if(re.test(text))return kind;
  return null;
}

export function validateReviewDecision(decision,reason){
  if(!I3.decisions.has(decision))return {ok:false,error:'Invalid decision.'};
  const allowed=I3.reasons[reason];
  if(!allowed||!allowed.has(decision))return {ok:false,error:'Reason is not valid for this decision.'};
  return {ok:true};
}

export function validateAi3Candidate(candidate, sentence){
  if(!candidate||typeof candidate!=='object'||Array.isArray(candidate))return {ok:false,error:'AI result must be an object.'};
  const allowedKeys=new Set(['species','kind','when','time','did','worked','blank_reasons','evidence']);
  if(Object.keys(candidate).some(k=>!allowedKeys.has(k)))return {ok:false,error:'AI result has unexpected fields.'};
  const evidence=candidate.evidence&&typeof candidate.evidence==='object'&&!Array.isArray(candidate.evidence)?candidate.evidence:{};
  const source=cleanText(sentence,300);
  const sourceNorm=source.toLowerCase();
  const evidenceMatches=(quote)=>{
    const q=cleanText(quote||'',120).toLowerCase();
    return !!q&&sourceNorm.includes(q);
  };
  const out={};
  const copyScalar=(field,allowed,extraReject)=>{
    const v=candidate[field]; if(v==null)return;
    if(typeof v!=='string'||!allowed.has(v)||extraReject?.(v))return;
    if(!evidenceMatches(evidence[field]))return;
    out[field]=v;
  };
  copyScalar('species',I3.species,v=>v==='snake');
  copyScalar('kind',I3.kind);
  copyScalar('when',I3.when);
  copyScalar('time',I3.time);
  const copyArray=(field,allowed)=>{
    const vals=uniqueAllowed(candidate[field],allowed); if(!vals.length)return;
    const ev=evidence[field]; if(!ev||typeof ev!=='object')return;
    const kept=vals.filter(v=>evidenceMatches(ev[v]));
    if(kept.length)out[field]=kept;
  };
  copyArray('did',I3.did); copyArray('worked',I3.worked);
  if(out.kind==='invasive'&&!['house-crow','common-myna'].includes(out.species||''))delete out.kind;
  if(out.worked?.includes('nothing-yet')&&out.worked.length>1)out.worked=['nothing-yet'];
  if(candidate.blank_reasons&&typeof candidate.blank_reasons==='object'&&!Array.isArray(candidate.blank_reasons))out.blank_reasons=candidate.blank_reasons;
  return {ok:true,value:out};
}
