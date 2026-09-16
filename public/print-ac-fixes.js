(function(){
  'use strict';

  var SNAPSHOT_KEY='roomForBoth.currentPlanSnapshot';
  var timer=null;
  var SPECIES_ID_BY_TOKEN={macaque:1,boar:2,myna:3,python:4,crow:5,monitor:6,cobra:7};

  function clean(v){return String(v==null?'':v).replace(/\s+/g,' ').trim();}
  function norm(v){return clean(v).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');}
  function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');}
  function page(){return String(location.hash||'#index').replace(/^#/,'').split('?')[0]||'index';}
  function lang(){var l=String(document.documentElement.lang||'').toLowerCase();return(l==='bm'||l==='ms')?'bm':'en';}
  function plainDate(v){var s=clean(v),m=s.match(/^(\d{4}-\d{2}-\d{2})/);return m?m[1]:s;}
  function snapshot(){try{return JSON.parse(sessionStorage.getItem(SNAPSHOT_KEY)||'null');}catch(e){return null;}}
  function answers(){try{return JSON.parse(sessionStorage.getItem('roomForBoth.homeAnswers')||'null')||{};}catch(e){return {};}}
  function sourceName(a){
    var s=clean(a&&(a.source_person||a.source_institution||a.source_name));
    if(s)return s.replace(/Suzika Julling/g,'Suzika Juiling');
    var u=clean(a&&a.source_url);if(!u)return'';
    try{return new URL(u,location.href).hostname.replace(/^www\./,'').replace(/wwf\.org\.my$/i,'WWF-Malaysia').replace(/wildlife\.gov\.my$/i,'PERHILITAN');}catch(e){return u;}
  }

  function selectedSpeciesIds(){
    var a=answers(),raw=a.speciesSeen||a.species_seen||a.species||[];
    if(!Array.isArray(raw))raw=[raw];
    var ids=[];
    raw.forEach(function(v){
      var n=norm(v);
      if(!n||n==='none'||n==='not-sure')return;
      if(n==='snake'||n==='snakes'||n==='ular'){ids.push(4,7);return;}
      Object.keys(SPECIES_ID_BY_TOKEN).forEach(function(code){
        if(n===code||n===String(SPECIES_ID_BY_TOKEN[code])||n.indexOf(code)!==-1||(code==='macaque'&&n.indexOf('long-tailed-macaque')!==-1)||(code==='monitor'&&(n.indexOf('water-monitor')!==-1||n.indexOf('monitor-lizard')!==-1))){ids.push(SPECIES_ID_BY_TOKEN[code]);}
      });
    });
    return ids.filter(function(v,i,a2){return a2.indexOf(v)===i;});
  }

  function isUnsafeOrIrrelevantAction(text){
    return /\b(poison|poisoning|cull|culling|kill|killing|euthan|relocat|trap|trapping|capture|shoot|snare)\b/i.test(text);
  }
  function isFeedingCause(cause){return /deliberate[-_ ]feeding|neighbou?r[-_ ]feeding|feeding/.test(cause);}
  function isPracticalAction(text){return /\b(secure|close|cover|store|keep|remove|harvest|clean|lock|seal|bring|put|dispose|wash|use a bin|lid|lids|rubbish|garbage|waste|food source|indoors)\b/i.test(text);}

  function feedingAction(){
    var s=snapshot(),rows=s&&Array.isArray(s.actions)?s.actions:[];
    var speciesIds=selectedSpeciesIds();
    var body=clean(document.getElementById('plan-result__neighbourBody')&&document.getElementById('plan-result__neighbourBody').textContent).toLowerCase();
    var foot=clean(document.getElementById('plan-result__neighbourFootnote')&&document.getElementById('plan-result__neighbourFootnote').textContent).toLowerCase();

    // Hard rule: never use an action belonging to another species. If the current
    // Plan has species-scoped rows, only those rows are eligible for this card.
    var speciesScoped=rows.filter(function(a){return speciesIds.indexOf(Number(a&&a.species_id))!==-1;});
    if(speciesIds.length&&speciesScoped.length)rows=speciesScoped;
    else if(speciesIds.length){rows=rows.filter(function(a){return a&&a.species_id==null;});}

    var best=null,bestScore=-999;
    rows.forEach(function(a){
      var text=clean(a.action_text||a.action),low=text.toLowerCase(),cause=clean(a.cause_group).toLowerCase(),score=0;
      if(!text)return;
      if(isUnsafeOrIrrelevantAction(text))return;
      if((body&&body.indexOf(low)!==-1)||(foot&&foot.indexOf(low)!==-1))return;

      // Prefer a real alternative action over another warning sentence.
      if(/^\s*(do not|don't|never|avoid|stop)\b.*\b(feed|feeding)\b/i.test(text))score-=35;
      if(/\b(feeding creates dependency|become aggressive|turn aggressive|expect food daily)\b/i.test(text))score-=60;
      if(isFeedingCause(cause))score+=45;
      if(isPracticalAction(text))score+=40;
      if(/food[-_ ]waste[-_ ]and[-_ ]bins|fruit[-_ ]trees|waste|bins/.test(cause))score+=18;
      if(/\b(feed|feeding)\b/i.test(text))score+=4;
      if(a.species_id!=null&&speciesIds.indexOf(Number(a.species_id))!==-1)score+=50;

      if(score>bestScore){best=a;bestScore=score;}
    });
    return best&&bestScore>0?best:null;
  }

  function cleanInstructionText(text){
    return clean(text)
      .replace(/Print the card for the neighbour;?\s*it names nobody\.?/ig,'')
      .replace(/Cetak kad untuk jiran;?[^.]*tidak menamakan sesiapa\.?/ig,'')
      .replace(/Suzika Julling/g,'Suzika Juiling');
  }

  function ensureBasePrintStyle(){
    if(document.getElementById('i2-print-layout-style'))return;
    var style=document.createElement('style');
    style.id='i2-print-layout-style';
    style.textContent=[
      '@media print{',
      '@page{size:A4;margin:7mm}',
      'html.i2-plan-print-page,html.i2-plan-print-page body{background:#fff!important;margin:0!important;padding:0!important}',
      'html.i2-plan-print-page body>*:not(#page-plan-print){display:none!important}',
      'html.i2-plan-print-page #page-plan-print{display:block!important;position:static!important;min-height:0!important;background:#fff!important}',
      'html.i2-plan-print-page #page-plan-print .no-print,html.i2-plan-print-page #page-plan-print header,html.i2-plan-print-page #page-plan-print footer{display:none!important}',
      'html.i2-plan-print-page #page-plan-print main{display:block!important;padding:0!important;margin:0!important}',
      'html.i2-plan-print-page #page-plan-print main>div{max-width:none!important;width:100%!important;padding:0!important;margin:0!important}',
      'html.i2-plan-print-page #page-plan-print .sheet{box-shadow:none!important;border:0!important;border-radius:0!important;margin:0!important;padding:4mm!important;break-inside:avoid!important;page-break-inside:avoid!important}',
      'html.i2-plan-print-page #plan-print__sheetActions{margin-top:1.5mm!important}',
      'html.i2-plan-print-page #plan-print__sheetActions .action-row{break-inside:avoid!important;page-break-inside:avoid!important;margin:0 0 1.5mm!important;font-size:8.5pt!important;line-height:1.22!important}',
      'html.i2-plan-print-page #plan-print__sheetActions .action-main{font-size:8.5pt!important;line-height:1.22!important}',
      'html.i2-plan-print-page #plan-print__sheetActions .action-meta{font-size:7pt!important;line-height:1.15!important}',
      'html.i2-plan-print-page #plan-print__sheetSpecies{font-size:7.5pt!important;line-height:1.18!important}',
      'html.i2-plan-print-page #plan-print__sheetSummary{font-size:8pt!important;line-height:1.2!important}',
      'html.i2-plan-print-page #page-plan-print .mt-6{margin-top:3mm!important}',
      'html.i2-plan-print-page #page-plan-print .mt-4{margin-top:2mm!important}',
      'html.i2-plan-print-page #page-plan-print .mt-2{margin-top:1mm!important}',
      'html.i2-plan-print-page #page-plan-print .sheet-label{font-size:7pt!important;line-height:1.1!important}',
      'html.i2-plan-print-page [id^="plan-print__sheet"]{break-inside:avoid!important;page-break-inside:avoid!important}',
      'html.i2-plan-print-page main,html.i2-plan-print-page section,html.i2-plan-print-page article{box-shadow:none!important}',
      '}',
      '@media screen{#i2-neighbour-print-card{display:none!important}}'
    ].join('');
    document.head.appendChild(style);
  }

  function markPlanPrint(){
    if(page()==='plan-print')document.documentElement.classList.add('i2-plan-print-page');
    else document.documentElement.classList.remove('i2-plan-print-page');
  }

  function addScreenCTA(){
    if(page()!=='plan-result')return;
    var card=document.getElementById('plan-result__neighbourCard');if(!card)return;
    // Species gate lives in index0914.html's renderPlanResult(); a hidden card
    // means the current species isn't macaque, so don't write into or read
    // stale text out of it here.
    if(card.classList.contains('hidden')){var leftover=document.getElementById('i2-neighbour-action');if(leftover)leftover.remove();return;}
    var body=document.getElementById('plan-result__neighbourBody');
    if(body){var cleaned=cleanInstructionText(body.textContent);if(cleaned&&clean(body.textContent)!==cleaned)body.textContent=cleaned;}
    var foot=document.getElementById('plan-result__neighbourFootnote');
    if(foot)foot.textContent=cleanInstructionText(foot.textContent);

    var action=feedingAction(),existing=document.getElementById('i2-neighbour-action');
    if(!action){if(existing)existing.remove();return;}
    if(!existing){existing=document.createElement('p');existing.id='i2-neighbour-action';existing.className='mt-3 text-sm font-semibold text-emerald-900';var anchor=foot||body;if(anchor&&anchor.parentNode)anchor.parentNode.insertBefore(existing,anchor);else card.appendChild(existing);}
    existing.textContent=(lang()==='bm'?'Apa yang perlu dibuat: ':'What to do instead: ')+clean(action.action_text||action.action);
  }

  function removeNeighbourPrintArtifacts(){
    var sheet=document.getElementById('i2-neighbour-print-card');if(sheet)sheet.remove();
    var style=document.getElementById('i2-neighbour-print-style');if(style)style.remove();
  }

  function buildNeighbourPrint(){
    var action=feedingAction();
    var title=clean(document.getElementById('plan-result__neighbourTitle')&&document.getElementById('plan-result__neighbourTitle').textContent);
    var body=cleanInstructionText(document.getElementById('plan-result__neighbourBody')&&document.getElementById('plan-result__neighbourBody').textContent);
    var foot=cleanInstructionText(document.getElementById('plan-result__neighbourFootnote')&&document.getElementById('plan-result__neighbourFootnote').textContent);
    var actionText=clean(action&&(action.action_text||action.action));
    var src=sourceName(action),date=plainDate(action&&action.date_verified);
    var l=lang();

    removeNeighbourPrintArtifacts();
    var sheet=document.createElement('section');sheet.id='i2-neighbour-print-card';
    sheet.innerHTML='<h1>'+esc(title)+'</h1>'+
      (body?'<div class="block"><strong>'+(l==='bm'?'Apa yang berlaku apabila haiwan diberi makan':'What feeding does')+'</strong><p>'+esc(body)+'</p></div>':'')+
      (foot?'<div class="block"><strong>'+(l==='bm'?'Apa akibatnya kepada haiwan':'What it can lead to for the animal')+'</strong><p>'+esc(foot)+'</p></div>':'')+
      (actionText?'<div class="block action"><strong>'+(l==='bm'?'Apa yang perlu dibuat':'What to do instead')+'</strong><p>'+esc(actionText)+'</p></div>':'')+
      (src?'<div class="meta"><strong>'+(l==='bm'?'Sumber':'Source')+':</strong> '+esc(src)+'</div>':'')+
      (date?'<div class="meta"><strong>'+(l==='bm'?'Disahkan':'Verified')+':</strong> '+esc(date)+'</div>':'');
    document.body.appendChild(sheet);

    var style=document.createElement('style');style.id='i2-neighbour-print-style';
    style.textContent='@media screen{#i2-neighbour-print-card{display:none!important}}@media print{@page{size:A5;margin:10mm}body *{visibility:hidden!important}#i2-neighbour-print-card,#i2-neighbour-print-card *{visibility:visible!important}#i2-neighbour-print-card{display:block!important;position:absolute!important;left:0!important;top:0!important;width:100%!important;box-sizing:border-box!important;font-family:Arial,sans-serif!important;color:#111!important;break-inside:avoid!important;page-break-inside:avoid!important}#i2-neighbour-print-card h1{font-size:17pt!important;line-height:1.15!important;margin:0 0 6mm!important}#i2-neighbour-print-card .block{break-inside:avoid!important;page-break-inside:avoid!important;margin:0 0 5mm!important}#i2-neighbour-print-card .block strong{display:block!important;font-size:10pt!important;margin-bottom:1.5mm!important}#i2-neighbour-print-card p{font-size:10pt!important;line-height:1.4!important;margin:0!important}#i2-neighbour-print-card .action{padding:3.5mm!important;background:#f4f7f4!important;border:1px solid #d8e4d8!important;border-radius:3mm!important}#i2-neighbour-print-card .meta{font-size:8.5pt!important;line-height:1.3!important;margin-top:2.5mm!important;color:#444!important}html,body{margin:0!important;padding:0!important}}';
    document.head.appendChild(style);
  }

  function bindNeighbourPrint(){
    if(page()!=='plan-result')return;
    var card=document.getElementById('plan-result__neighbourCard');if(!card)return;
    var old=document.getElementById('i2-neighbour-print-btn');
    if(card.classList.contains('hidden')){if(old)old.remove();return;}
    if(!old){
      old=document.createElement('button');old.type='button';old.id='i2-neighbour-print-btn';old.className='mt-3 inline-flex items-center rounded-full border border-emerald-200 bg-white px-4 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-50';old.textContent=lang()==='bm'?'Cetak kad untuk jiran':'Print card for neighbour';card.appendChild(old);
    }
    if(old.getAttribute('data-i2-print-fixed')==='1')return;
    var btn=old.cloneNode(true);btn.setAttribute('data-i2-print-fixed','1');old.replaceWith(btn);
    btn.addEventListener('click',function(e){e.preventDefault();e.stopImmediatePropagation();buildNeighbourPrint();window.print();});
  }

  function cleanupAfterPrint(){if(document.getElementById('i2-neighbour-print-card'))removeNeighbourPrintArtifacts();}
  function apply(){ensureBasePrintStyle();markPlanPrint();addScreenCTA();bindNeighbourPrint();}
  function schedule(){clearTimeout(timer);timer=setTimeout(apply,60);}

  window.addEventListener('afterprint',cleanupAfterPrint);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
  window.addEventListener('hashchange',schedule);
  document.addEventListener('roomforboth:pageshow',schedule);
  window.addEventListener('roomforboth:print-snapshot-ready',schedule);
  window.addEventListener('roomforboth:db-plan-ready',schedule);
  new MutationObserver(schedule).observe(document.documentElement,{subtree:true,childList:true});
})();
