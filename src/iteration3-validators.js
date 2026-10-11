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

// Name then street type ("Mathew Street"). The name must be capitalised and not a common word.
// Keep in step with noteIssues() in public/community.js (U3-2).
const STREET_SKIP='the|our|this|that|these|those|my|your|his|her|their|its|a|an|and|or|of|on|in|at|by|to|from|near|onto|into|over|under|across|along|past|down|up|main|back|front|side|busy|quiet|same|every|each|next|other|small|big|long|short|dark|wet|old|new|wide|narrow|dirt|country|private|public|rural|cross|one|two|three|four|five|six|seven|eight|nine|ten|only|some|any|no|all|both|many|few|several|about|around|another';
const STREET_SKIP_RE=new RegExp('^(?:'+STREET_SKIP+')$','i');
const HOUSE_NUMBER_STREET_RE=new RegExp('\\b\\d{1,4}[a-z]?(?:/\\d{1,4}[a-z]?)?\\s*,?\\s+(?:(?!(?:'+STREET_SKIP+')\\b)[a-z][a-z\'-]*\\s+)?(?:street|st|road|rd|lane|ln|avenue|ave)\\b','i');
const NAMED_STREET_RE={test(text){const re=/\b([A-Z][A-Za-z'-]{2,})\s+(?:street|road|lane|avenue|st|rd|ave|ln)\b/gi;let m;while((m=re.exec(text)))if(/^[A-Z]/.test(m[1])&&!STREET_SKIP_RE.test(m[1]))return true;return false}};

export function detectPersonalDetail(note){
  const text=cleanText(note,500);
  if(!text)return null;
  const checks=[
    ['phone',/(?:\+?6?0?1\d[-\s]?\d{3,4}[-\s]?\d{4}|\b\d{8,12}\b)/i],
    ['email',/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i],
    ['url',/\b(?:https?:\/\/|www\.)\S+/i],
    ['postal',/\b\d{5}\b/],
    // Malay street words take any next word ("jalan bukit"); English ones only a capitalised name or a number,
    // so "the road near the shop" and "the lane behind us" are not taken as a street (U3-2).
    ['street',/\b(?:jalan|jln|lorong|lor|persiaran)\s+[A-Za-z0-9][A-Za-z0-9 .'-]{1,40}/i],
    ['street',/\b(?:[Ss]treet|[Ss]t\.?|[Rr]oad|[Rr]d\.?|[Aa]venue|[Aa]ve\.?|[Ll]ane|[Ll]n\.?)\s+[A-Z0-9][A-Za-z0-9 .'-]{1,40}/],
    ['house-number',/\b(?:no\.?|number|house)\s*#?\s*\d+[A-Za-z]?\b/i],
    ['house-number',HOUSE_NUMBER_STREET_RE],
    ['street',NAMED_STREET_RE],
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

// U3-5: deterministic post-filters on top of the evidence-substring check, so a bare number before an
// animal ("8 house crows") is never taken as a time and "came to the window" is never "came inside".
const TIME_EVIDENCE_RE=/\b(?:dawn|sunrise|sunset|dusk|morning|breakfast|midday|noon|lunch|afternoon|evening|night|midnight|tonight|subuh|pagi|tengah\s?hari|tengahari|petang|senja|maghrib|malam|dinihari)\b|\b\d{1,2}(?:[.:]\d{2})?\s*(?:a\.?m\.?|p\.?m\.?)(?![a-z])|\b\d{1,2}:\d{2}\b|\bo'?clock\b|\bjam\s+\d{1,2}\b/i;
const CAME_INSIDE_RE=/\b(?:came|come|comes|coming|got|get|gets|getting|went|go|walked|ran|climbed|broke|barged|slipped|sneaked|snuck|let)\s+(?:right\s+|straight\s+|all\s+the\s+way\s+)?(?:in|inside|into)\b|\binside\b|\benter(?:s|ed|ing)?\b|\bmasuk\b|\bdalam\s+(?:rumah|dapur|bilik)\b/i;
const TODAY_RE=/\b(?:today|this\s+morning|this\s+afternoon|this\s+evening|tonight|hari\s+ini|tadi)\b/i;
const YESTERDAY_RE=/\b(?:yesterday|last\s+night|semalam)\b/i;
// U3-5: the animal named in the sentence, used when the model leaves it blank. Filled only when exactly one
// of the seven is named, so a sentence about another animal ("a tiger") fills nothing.
const SPECIES_WORDS={
  'macaque':/\b(?:long[-\s]tailed\s+)?macaques?\b|\bmonkeys?\b|\bmonyet\b|\bkera\b/i,
  'wild-boar':/\bwild\s+(?:boars?|pigs?)\b|\bboars?\b|\bbabi\s+hutan\b/i,
  'water-monitor':/\b(?:water\s+)?monitors?(?:\s+lizards?)?\b|\bbiawak\b/i,
  'house-crow':/\b(?:house\s+)?crows?\b|\bgagak\b/i,
  'common-myna':/\b(?:common\s+)?mynah?s?\b|\btiong\b|\bgembala\s+kerbau\b/i
};
// Weeks run Monday to Sunday (as in the form). Date is read in Malaysia time (UTC+8).
function isMondayMY(now){return new Date(now.getTime()+8*3600*1000).getUTCDay()===1}

export function validateAi3Candidate(candidate, sentence, now=new Date()){
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
  if(out.time&&!TIME_EVIDENCE_RE.test(String(evidence.time||'')))delete out.time;
  if(out.did?.includes('came-inside')){
    const q=evidence.did&&typeof evidence.did==='object'?evidence.did['came-inside']:'';
    if(!CAME_INSIDE_RE.test(String(q||''))){out.did=out.did.filter(v=>v!=='came-inside');if(!out.did.length)delete out.did}
  }
  // Also when the model's answer is not one of the option values or is "not sure"; a valid answer whose quote
  // is not in the sentence stays rejected.
  if(!out.species&&(candidate.species==null||!I3.species.has(candidate.species)||candidate.species==='not-sure')){
    const named=Object.keys(SPECIES_WORDS).filter(k=>SPECIES_WORDS[k].test(source));
    if(named.length===1)out.species=named[0];
  }
  // When is filled from today/yesterday only when the sentence is about one of the seven or says what happened,
  // so "I saw a tiger yesterday" fills nothing (U3-5).
  if(!out.when&&(out.species||out.did||out.worked)){
    // "today" is always this week; "yesterday" is this week except on a Monday, when it was last week.
    if(TODAY_RE.test(source)&&!YESTERDAY_RE.test(source))out.when='this-week';
    else if(YESTERDAY_RE.test(source)&&!TODAY_RE.test(source))out.when=isMondayMY(now)?'last-week':'this-week';
  }
  if(out.kind==='invasive'&&!['house-crow','common-myna'].includes(out.species||''))delete out.kind;
  if(out.worked?.includes('nothing-yet')&&out.worked.length>1)out.worked=['nothing-yet'];
  if(candidate.blank_reasons&&typeof candidate.blank_reasons==='object'&&!Array.isArray(candidate.blank_reasons))out.blank_reasons=candidate.blank_reasons;
  return {ok:true,value:out};
}
