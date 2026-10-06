// The one renderer for the A4 "Print my plan" sheet (#page-plan-print).
//
// It replaces the print rendering that used to be split across
// ac-compliance.js, print-selected-actions.js and print-species-consistency.js:
//  - U2-2  follows the site language and re-renders on every EN/BM switch.
//  - U2-3  prints exactly the actions on the plan screen, in the same order,
//          with empty tick boxes (only actions ticked on screen print ticked).
//  - U2-6  each count carries "one record is one report, not one animal".
//  - U2-11 one action per line; sources are numbered and moved to the footer.
(function(){
  'use strict';

  var SNAPSHOT_KEY='roomForBoth.currentPlanSnapshot';
  var SIGNALS_KEY='roomForBoth.planSignals';
  var DONE_KEY='roomForBoth.planDone';
  var SPECIES={
    macaque:{en:'Long-tailed Macaque',bm:'Kera'},
    boar:{en:'Wild Boar',bm:'Babi Hutan'},
    myna:{en:'Common Myna',bm:'Tiong Biasa'},
    python:{en:'Reticulated Python',bm:'Ular Sawa Batik'},
    crow:{en:'House Crow',bm:'Gagak Rumah'},
    monitor:{en:'Water Monitor Lizard',bm:'Biawak Air'},
    cobra:{en:'Equatorial Spitting Cobra',bm:'Ular Senduk Sembur'}
  };
  var T={
    en:{printed:'Printed: ',reports:'reports in your state',complaints:'complaints to PERHILITAN in ',noComplaints:'no published complaint figure',draws:'things at your home draw it in',draws1:'thing at your home draws it in',
        recordNote:'One record is one report, not one animal.',sources:'Sources',verified:'verified ',noPlan:'Return to the plan and generate it before printing.',
        noSpecies:'No animal was picked in the questions, so there are no counts to show.',tick:'Tick when done'},
    bm:{printed:'Dicetak: ',reports:'laporan di negeri anda',complaints:'aduan kepada PERHILITAN pada ',noComplaints:'tiada angka aduan diterbitkan',draws:'perkara di rumah anda menariknya',draws1:'perkara di rumah anda menariknya',
        recordNote:'Satu rekod ialah satu laporan, bukan seekor haiwan.',sources:'Sumber',verified:'disahkan ',noPlan:'Kembali ke pelan dan jana pelan sebelum mencetak.',
        noSpecies:'Tiada haiwan dipilih dalam soalan, jadi tiada kiraan untuk ditunjukkan.',tick:'Tandakan apabila selesai'}
  };
  var fetched={};   // lang -> actions fetched in that language
  var fetching={};
  var timer=null;

  function clean(v){return String(v==null?'':v).replace(/\s+/g,' ').trim();}
  function plainDate(v){var s=clean(v),m=s.match(/^(\d{4}-\d{2}-\d{2})/);return m?m[1]:s;}
  function page(){return String(location.hash||'#index').replace(/^#/,'').split('?')[0]||'index';}
  function lang(){var l=String(document.documentElement.lang||'').toLowerCase();return(l==='bm'||l==='ms')?'bm':'en';}
  function read(key,fallback){try{return JSON.parse(sessionStorage.getItem(key)||'null')||fallback;}catch(e){return fallback;}}
  function el(tag,cls,text){var e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e;}
  function longDate(iso,l){
    var m=String(iso||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);if(!m)return clean(iso);
    var d=new Date(Date.UTC(+m[1],+m[2]-1,+m[3]));
    return d.toLocaleDateString(l==='bm'?'ms-MY':'en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'});
  }
  function sourceLabel(a){
    var p=clean(a.source_person),i=clean(a.source_institution),parts=[];
    if(p)parts.push(p);if(i&&parts.indexOf(i)===-1)parts.push(i);
    return parts.join(' · ')||clean(a.source_url);
  }
  function stateFromHash(){
    try{var h=String(location.hash||''),q=h.indexOf('?');if(q!==-1)return new URLSearchParams(h.slice(q+1)).get('state')||'';}catch(e){}
    return '';
  }

  function ensureStyle(){
    if(document.getElementById('plan-print-sheet-style'))return;
    var s=document.createElement('style');s.id='plan-print-sheet-style';
    s.textContent=[
      '#plan-print__sheetActions .pps-row{display:flex;align-items:baseline;gap:8px;font-size:13px;line-height:1.45;color:#0b2018}',
      '#plan-print__sheetActions .pps-box{flex:0 0 auto;display:inline-block;width:13px;height:13px;border:1.5px solid #64748b;border-radius:3px;position:relative;top:2px}',
      '#plan-print__sheetActions .pps-box.is-done::after{content:"\\2713";position:absolute;left:1px;top:-4px;font-size:12px;font-weight:700;color:#166534}',
      '#plan-print__sheetActions .pps-ref,#plan-print__sheetSpecies .pps-ref{font-size:10px;color:#64748b;vertical-align:super;margin-left:2px}',
      '#plan-print__sheetSpecies .pps-species{font-size:12px;line-height:1.45;color:#334155}',
      '#plan-print__sheetSpecies .pps-species strong{color:#0b2018}',
      '#plan-print__sheetSpecies .pps-note{font-size:11px;color:#64748b;margin-top:4px}',
      '#plan-print-sheet__sources{margin-top:14px;padding-top:10px;border-top:1px solid #e2e8f0;font-size:10px;line-height:1.4;color:#64748b}',
      '#plan-print-sheet__sources ol{margin:4px 0 0;padding-left:16px}',
      '#plan-print-sheet__sources a{color:inherit;text-decoration:underline;text-underline-offset:2px}',
      '@media print{#plan-print__sheetActions .pps-row{font-size:9.5pt!important;line-height:1.3!important;break-inside:avoid}#plan-print-sheet__sources{font-size:7pt!important}#plan-print-sheet__sources a{text-decoration:none!important}#plan-print__sheetSpecies .pps-species{font-size:8.5pt!important}}'
    ].join('');
    document.head.appendChild(s);
  }

  function fetchActions(l){
    if(fetching[l]||fetched[l])return;
    var answers=read('roomForBoth.homeAnswers',{}),st=stateFromHash()||answers.state;
    if(!st)return;
    fetching[l]=true;
    fetch('/api/i2/plan',{method:'POST',headers:{'content-type':'application/json',accept:'application/json'},cache:'no-store',body:JSON.stringify(Object.assign({},answers,{state:st,language:l}))})
      .then(function(r){return r.json();})
      .then(function(b){
        fetching[l]=false;
        var list=b&&b.ok&&Array.isArray(b.actions)?b.actions:[];
        fetched[l]=list.map(function(a){return{prevention_id:clean(a.prevention_id),action_text:clean(a.action_text||a.action_text_en||a.action_text_ms),source_person:clean(a.source_person),source_institution:clean(a.source_institution),source_url:clean(a.source_url),date_verified:clean(a.date_verified)};});
        schedule();
      })
      .catch(function(){fetching[l]=false;});
  }

  // Same rows, same order as the plan screen. The snapshot holds the screen's
  // rows; when the language differs we swap in the same prevention_ids'
  // text in the current language, never a different set of actions.
  function actionsFor(l,snap){
    var base=snap&&Array.isArray(snap.actions)?snap.actions.slice(0,8):[];
    if(!base.length)return base;
    if(snap.language===l)return base;
    var other=fetched[l];
    if(!other){fetchActions(l);return base;}
    var byId={};other.forEach(function(a){if(a.prevention_id)byId[a.prevention_id]=a;});
    return base.map(function(a){return byId[clean(a.prevention_id)]||a;});
  }

  function render(){
    if(page()!=='plan-print')return;
    var actionsWrap=document.getElementById('plan-print__sheetActions');
    var speciesWrap=document.getElementById('plan-print__sheetSpecies');
    var sheet=document.getElementById('plan-print__printSheet');
    if(!actionsWrap||!speciesWrap||!sheet)return;
    ensureStyle();
    var l=lang(),t=T[l],snap=read(SNAPSHOT_KEY,null),signals=read(SIGNALS_KEY,null),done=read(DONE_KEY,{});
    var stateEl=document.getElementById('plan-print__sheetState');
    var summaryEl=document.getElementById('plan-print__sheetSummary');
    var dateEl=document.getElementById('plan-print__sheetPrintedDate');
    var emergency=document.getElementById('plan-print__sheetEmergencyHeading');
    if(emergency&&emergency.parentElement)emergency.parentElement.style.display='none';

    var actions=actionsFor(l,snap);
    var key=JSON.stringify([l,actions,signals,done,snap&&snap.summaryLine]);
    if(sheet.getAttribute('data-pps-key')===key&&actionsWrap.querySelector('.pps-row,.pps-species'))return;
    sheet.setAttribute('data-pps-key',key);

    if(stateEl)stateEl.textContent=clean((signals&&signals.stateLabel)||(snap&&snap.stateLabel))||'—';
    if(summaryEl)summaryEl.textContent=(window.RoomForBothSummaryLine&&window.RoomForBothSummaryLine())||clean(snap&&snap.summaryLine);
    if(dateEl){var now=new Date();dateEl.textContent=t.printed+now.toLocaleDateString(l==='bm'?'ms-MY':'en-GB',{day:'numeric',month:'long',year:'numeric'});}

    // Sources, numbered once each, cited from the lines above.
    var sources=[],sourceIndex={};
    function cite(label,url,date){
      label=clean(label);if(!label)return 0;
      var k=label+'|'+clean(url);
      if(!sourceIndex[k]){sources.push({label:label,url:clean(url),date:plainDate(date)});sourceIndex[k]=sources.length;}
      return sourceIndex[k];
    }
    function ref(n){return n?el('span','pps-ref','['+n+']'):document.createTextNode('');}

    // ---- counts ----
    speciesWrap.innerHTML='';
    var items=signals&&Array.isArray(signals.items)?signals.items:[];
    if(!items.length){
      speciesWrap.appendChild(el('div','pps-species',t.noSpecies));
    }else{
      var gbif=cite(l==='bm'?'Ekstrak rekod kejadian GBIF':'GBIF occurrence extract','','');
      items.forEach(function(it){
        var name=SPECIES[it.code]?SPECIES[it.code][l]:it.code;
        var row=el('div','pps-species');
        row.appendChild(el('strong',null,name+': '));
        row.appendChild(document.createTextNode(Number(it.occurrences||0).toLocaleString()+' '+t.reports));
        row.appendChild(ref(gbif));
        row.appendChild(document.createTextNode(' · '));
        if(it.complaint){
          row.appendChild(document.createTextNode(Number(it.complaint.cases||0).toLocaleString()+' '+t.complaints+it.complaint.year));
          row.appendChild(ref(cite(l==='bm'?'Jadual 29 PERHILITAN':'PERHILITAN Table 29',it.complaint.source_url,it.complaint.date_verified)));
        }else row.appendChild(document.createTextNode(t.noComplaints));
        var n=(it.attractants||[]).length;
        row.appendChild(document.createTextNode(' · '+n+' '+(n===1?t.draws1:t.draws)));
        (it.attractants||[]).forEach(function(a){row.appendChild(ref(cite(a.source,a.source_url,a.date_verified)));});
        speciesWrap.appendChild(row);
      });
      speciesWrap.appendChild(el('div','pps-note',t.recordNote));
    }

    // ---- actions: one per line ----
    actionsWrap.innerHTML='';
    if(!actions.length){
      actionsWrap.appendChild(el('div','pps-species',t.noPlan));
    }else{
      actions.forEach(function(a,i){
        var text=clean(a.action_text);if(!text)return;
        var row=el('div','pps-row');row.setAttribute('data-print-prevention-id',clean(a.prevention_id));
        var box=el('span','pps-box'+(done[clean(a.prevention_id)||text]?' is-done':''));box.setAttribute('aria-hidden','true');box.title=t.tick;
        var main=el('span',null,(i+1)+'. '+text);
        main.appendChild(ref(cite(sourceLabel(a),a.source_url,a.date_verified)));
        row.appendChild(box);row.appendChild(main);actionsWrap.appendChild(row);
      });
    }

    // ---- footer sources ----
    var foot=document.getElementById('plan-print-sheet__sources');
    if(!foot){foot=el('div');foot.id='plan-print-sheet__sources';var last=sheet.lastElementChild;sheet.insertBefore(foot,last);}
    foot.innerHTML='';
    if(sources.length){
      foot.appendChild(el('div','font-semibold',t.sources));
      var ol=el('ol');
      sources.forEach(function(s){
        var li=el('li');
        if(s.url){var a=el('a',null,s.label);a.href=s.url;a.target='_blank';a.rel='noopener';li.appendChild(a);}else li.appendChild(document.createTextNode(s.label));
        if(s.date)li.appendChild(document.createTextNode(' · '+t.verified+longDate(s.date,l)));
        ol.appendChild(li);
      });
      foot.appendChild(ol);
    }
  }

  function schedule(){clearTimeout(timer);timer=setTimeout(render,60);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
  window.addEventListener('hashchange',schedule);
  document.addEventListener('roomforboth:pageshow',function(){schedule();setTimeout(render,300);});
  window.addEventListener('roomforboth:print-snapshot-ready',schedule);
  new MutationObserver(schedule).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  window.addEventListener('beforeprint',render);
})();
