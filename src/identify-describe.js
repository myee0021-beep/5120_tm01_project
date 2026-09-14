function json(data,status=200,headers={}){
  return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...headers}});
}

const DESCRIBE_SPECIES=[
  {id:'house-crow',en:'House Crow',bm:'Gagak Rumah',sci:'Corvus splendens',hints:'noisy black bird, raids open rubbish bins and food waste, nests on roofs/eaves'},
  {id:'macaque',en:'Long-tailed Macaque',bm:'Kera',sci:'Macaca fascicularis',hints:'monkey, often in a troop, grey or brown, long tail, enters through windows/roofs, takes fruit or food from kitchens or bins'},
  {id:'water-monitor',en:'Water Monitor Lizard',bm:'Biawak',sci:'Varanus salvator',hints:'large lizard, long tail, follows drains/canals/rivers, preys on poultry or fish ponds'},
  {id:'wild-boar',en:'Wild Boar',bm:'Babi Hutan',sci:'Sus scrofa',hints:'pig-like animal, roots up soil/gardens at night, forest-fringe housing'},
  {id:'common-myna',en:'Common Myna',bm:'Gembala Kerbau',sci:'Acridotheres tristis',hints:'small brown bird with a yellow beak, noisy, nests in roof eaves and cavities'}
];

export async function handleIdentifyDescribe(request,env){
  if(!env.MINIMAX_API_KEY)return json({ok:false,error:'AI identification is not configured.'},501);

  let body;
  try{body=await request.json();}catch{return json({ok:false,error:'Request body must be JSON.'},400);}
  const text=String(body?.text||'').trim().slice(0,500);
  if(!text)return json({ok:false,error:'text is required.'},400);

  const allowedIds=DESCRIBE_SPECIES.map(s=>s.id);
  const speciesList=DESCRIBE_SPECIES.map(s=>`- id: "${s.id}" | ${s.en} (${s.sci}, Malay: ${s.bm}) — ${s.hints}`).join('\n');
  const systemPrompt=`You identify which wildlife species is most likely being described in a report of an animal causing a problem at a home in Malaysia. You may ONLY choose from this fixed list of species ids — never invent a new id or name:\n${speciesList}\n\nThe user's text may be in English, Malay, or a mix of the two.\n\nHow to decide:\n- If the text describes ANY behaviour, damage, sound, appearance, or location that is even loosely consistent with one of the species above, include that species as a match — use low confidence if vague rather than leaving it out.\n- Only return an empty list when the text has NO real connection to any species above.\n- None of the species above is a snake. If the text sounds like a snake or another legless reptile (long, slithering, no legs, hissing, striking, fanged), return an empty list rather than matching water-monitor or another species.\n\nRespond with ONLY a JSON object matching this shape — no explanation, reasoning or markdown: {"matches":[{"species_id":"<one of the ids above>","confidence":"high"|"medium"|"low"}]}. List at most 3 matches, most likely first.`;

  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),8000);
  try{
    const response=await fetch('https://api.minimax.io/v1/text/chatcompletion_v2',{
      method:'POST',
      headers:{'content-type':'application/json',authorization:`Bearer ${env.MINIMAX_API_KEY}`},
      body:JSON.stringify({model:'MiniMax-Text-01',temperature:0.1,max_tokens:300,messages:[{role:'system',content:systemPrompt},{role:'user',content:text}]}),
      signal:controller.signal
    });
    clearTimeout(timeout);
    if(!response.ok){
      console.error('[Describe AI] MiniMax API error',response.status,await response.text().catch(()=>''));
      return json({ok:false,error:'AI identification request failed.'},502);
    }
    const payload=await response.json();
    const content=payload?.choices?.[0]?.message?.content||'';
    const jsonMatch=content.match(/\{[\s\S]*\}/);
    if(!jsonMatch){
      console.error('[Describe AI] MiniMax returned no parseable content',JSON.stringify(payload));
      return json({ok:false,error:'AI returned no usable result.'},502);
    }
    let parsed;
    try{parsed=JSON.parse(jsonMatch[0]);}catch{return json({ok:false,error:'AI returned malformed JSON.'},502);}
    const matches=Array.isArray(parsed?.matches)?parsed.matches.filter(m=>allowedIds.includes(m?.species_id)).slice(0,3):[];
    const speciesIds=matches.map(m=>m.species_id);
    return json({ok:true,species_ids:speciesIds,matches,status:speciesIds.length?'matched':'no_match'});
  }catch(err){
    clearTimeout(timeout);
    console.error('[Describe AI] identify-describe failed',err?.message||err);
    return json({ok:false,error:'AI identification request failed.'},502);
  }
}
