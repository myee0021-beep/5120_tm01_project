(function(){
  'use strict';

  var SPECIES={
    macaque:{id:1,en:'Long-tailed Macaque',bm:'Kera'},
    boar:{id:2,en:'Wild Boar',bm:'Babi Hutan'},
    myna:{id:3,en:'Common Myna',bm:'Gembala Kerbau',absentComplaint:true},
    python:{id:4,en:'Reticulated Python',bm:'Ular Sawa Batik'},
    crow:{id:5,en:'House Crow',bm:'Gagak Rumah',absentComplaint:true},
    monitor:{id:6,en:'Water Monitor Lizard',bm:'Biawak Air'},
    cobra:{id:7,en:'Equatorial Spitting Cobra',bm:'Ular Senduk Sembur'}
  };
  var ID_TO_CODE={1:'macaque',2:'boar',3:'myna',4:'python',5:'crow',6:'monitor',7:'cobra'};
  var STATE_LABELS={johor:'Johor',kedah:'Kedah',kelantan:'Kelantan',melaka:'Melaka','negeri-sembilan':'Negeri Sembilan',pahang:'Pahang',perak:'Perak',perlis:'Perlis',penang:'Pulau Pinang','pulau-pinang':'Pulau Pinang',sabah:'Sabah',sarawak:'Sarawak',selangor:'Selangor',terengganu:'Terengganu',kl:'Kuala Lumpur','kuala-lumpur':'Kuala Lumpur',labuan:'Labuan',putrajaya:'Putrajaya'};
  var incompleteYears={2025:true,2026:true};
  var runToken=0;

  function clean(v){return String(v==null?'':v).replace(/\s+/g,' ').trim();}
  function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');}
  function norm(v){return clean(v).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');}
  function lang(){var l=String(document.documentElement.lang||'').toLowerCase();return(l==='bm'||l==='ms')?'bm':'en';}
  function currentPage(){return String(location.hash||'#index').replace(/^#/,'').split('?')[0]||'index';}
  function answers(){try{return JSON.parse(sessionStorage.getItem('roomForBoth.homeAnswers')||'null')||{};}catch(e){return {};}}
  function state(){
    var a=answers();
    try{if(window.AppNav&&AppNav.currentQuery){var x=new URLSearchParams(AppNav.currentQuery).get('state');if(x)return norm(x);}}catch(e){}
    try{var h=String(location.hash||''),q=h.indexOf('?');if(q!==-1){var y=new URLSearchParams(h.slice(q+1)).get('state');if(y)return norm(y);}}catch(e){}
    try{var z=sessionStorage.getItem('roomForBoth.selectedState');if(z)return norm(z);}catch(e){}
    return norm(a.state||'');
  }
  function speciesCodes(){
    var a=answers();var raw=a.speciesSeen||a.species_seen||a.species||[];if(!Array.isArray(raw))raw=[raw];
    var out=[];
    raw.forEach(function(v){var n=norm(v);if(!n||n==='none'||n==='not-sure')return;if(n==='snake'||n==='snakes'||n==='ular'){out.push('python','cobra');return;}Object.keys(SPECIES).forEach(function(code){var m=SPECIES[code];if(n===code||n===String(m.id)||n.indexOf(code)!==-1)out.push(code);});});
    return out.filter(function(v,i,a){return a.indexOf(v)===i;});
  }
  function occurrenceRows(){
    var d=window.ECOSYSTEM_OCCURRENCES;if(!d||!Array.isArray(d.rows))return[];return d.rows;
  }
  function occurrenceFor(st,code){
    var rows=occurrenceRows().filter(function(r){return norm(r[0])===st&&r[1]===code&&!incompleteYears[Number(r[2])];});
    var total=0,months=[0,0,0,0,0,0,0,0,0,0,0,0],years=[];
    rows.forEach(function(r){var y=Number(r[2]),m=Number(r[3]),c=Number(r[4])||0;total+=c;if(y)years.push(y);if(m>=1&&m<=12)months[m-1]+=c;});
    return{total:total,months:months,minYear:years.length?Math.min.apply(null,years):null,maxYear:years.length?Math.max.apply(null,years):null};
  }
  function documentedAnswerTokens(){
    var a=answers();var vals=[];
    ['foodSources','wasteStorage','neighboursFeed','attractants'].forEach(function(k){var v=a[k];if(Array.isArray(v))vals=vals.concat(v);else if(v!=null)vals.push(v);});
    return vals.map(norm).filter(Boolean);
  }
  function rowSpeciesId(r){return Number(r&&r.species_id)||null;}
  function rowText(r){return Object.keys(r||{}).map(function(k){return typeof r[k]==='string'||typeof r[k]==='number'?String(r[k]):'';}).join(' ').toLowerCase().replace(/[_-]+/g,' ');}
  function validAttractant(r){return!!(r&&clean(r.date_verified)&&(clean(r.source_url)||clean(r.source_person)||clean(r.source_institution)||clean(r.source_name)));}
  function matchAttractants(rows,code){
    var tokens=documentedAnswerTokens(),sid=SPECIES[code].id,seen={},matched=[];
    tokens.forEach(function(t){
      var words=t.split('-').filter(function(x){return x.length>2;});
      rows.forEach(function(r){if(!validAttractant(r))return;var rs=rowSpeciesId(r);if(rs&&rs!==sid)return;var txt=rowText(r);if(words.length&&words.some(function(w){return txt.indexOf(w)!==-1;})){var key=t+'|'+clean(r.source_url||r.source_institution||r.source_name);if(!seen[key]){seen[key]=1;matched.push({answer:t,row:r});}}});
    });
    return matched;
  }
  function apiJson(url){return fetch(url,{headers:{accept:'application/json'},cache:'no-store'}).then(function(r){return r.json().then(function(b){if(!r.ok||b&&b.ok===false)throw new Error((b&&b.error)||('HTTP '+r.status));return b;});});}
  function sourceLink(url,label){return url?'<a class="underline underline-offset-2" target="_blank" rel="noopener" href="'+esc(url)+'">'+esc(label)+'</a>':esc(label);}

  function render(st,codes,complaints,attractants){
    var list=document.getElementById('plan-result__speciesList');if(!list)return;
    var l=lang(),stateLabel=STATE_LABELS[st]||st,cs=complaints&&complaints.summary||null,complaintRows=complaints&&Array.isArray(complaints.rows)?complaints.rows:[];
    var complaintSeriesExists=complaintRows.length>0&&cs&&Number(cs.total_cases)>=0;
    list.innerHTML='';
    if(!codes.length){list.innerHTML='<div class="text-sm text-slate-500">'+esc(l==='bm'?'Tiada spesies dipilih dalam soal selidik. Tiada isyarat spesies direka.':'No species was selected in the questionnaire. No species signal is invented.')+'</div>';return;}
    codes.forEach(function(code){
      var meta=SPECIES[code],occ=occurrenceFor(st,code),att=matchAttractants(attractants,code),name=l==='bm'?meta.bm:meta.en;
      var card=document.createElement('div');card.className='rounded-xl border border-slate-100 p-4 mb-3';
      var html='<div class="font-semibold text-forest-950">'+esc(name)+'</div><div class="mt-3 space-y-2 text-sm text-slate-700">';
      html+='<div><strong>'+(l==='bm'?'Rekod kejadian':'Recorded occurrences')+':</strong> '+occ.total.toLocaleString()+' · '+sourceLink('#about-the-data','GBIF occurrence extract')+' <span class="text-xs text-slate-400">('+(l==='bm'?'2025 dan 2026 dikecualikan sebagai tahun tidak lengkap':'2025 and 2026 excluded as incomplete years')+')</span></div>';
      if(meta.absentComplaint){
        html+='<div><strong>'+(l==='bm'?'Aduan konflik':'Conflict complaints')+':</strong> '+esc(l==='bm'?'Spesies ini tidak terdapat dalam jadual kes nasional yang diterbitkan; tiada angka kejadian digunakan sebagai ganti.':'This species is absent from the published national case table; no occurrence count is substituted.')+'</div>';
      }else if(complaintSeriesExists){
        html+='<div><strong>'+(l==='bm'?'Aduan konflik':'Conflict complaints')+':</strong> '+Number(cs.total_cases||0).toLocaleString()+' · '+esc((cs.year||2020)+' '+(l==='bm'?'jumlah semua spesies negeri':'all-species state total'))+' · '+sourceLink(cs.source_url||'#about-the-data','PERHILITAN Table 29')+(cs.date_verified?' · '+esc(l==='bm'?'disahkan ':'verified ')+esc(cs.date_verified):'')+'</div>';
      }else{
        html+='<div><strong>'+(l==='bm'?'Aduan konflik':'Conflict complaints')+':</strong> '+esc(l==='bm'?'Tiada siri aduan untuk negeri ini; tiada angka ganti dipaparkan.':'No complaint series exists for this state; no substitute figure is shown.')+'</div>';
      }
      html+='<div><strong>'+(l==='bm'?'Tarikan rumah yang didokumenkan':'Documented attractants matched')+':</strong> '+att.length+'</div>';
      if(att.length){html+='<ul class="ml-4 list-disc text-xs text-slate-500">'+att.map(function(x){var r=x.row;var src=clean(r.source_person||r.source_institution||r.source_name||'Malaysian source');return'<li>'+esc(x.answer.replace(/-/g,' '))+' · '+sourceLink(r.source_url,src)+(r.date_verified?' · '+esc(r.date_verified):'')+'</li>';}).join('')+'</ul>';}
      else html+='<div class="text-xs text-slate-500">'+esc(l==='bm'?'Tiada jawapan di rumah ini sepadan dengan sebab yang didokumenkan untuk spesies ini.':'Nothing at this home matched the documented causes for this species.')+'</div>';
      html+='</div><div class="mt-3 text-xs text-slate-500">'+esc(l==='bm'?'Tahap gabungan tidak dipaparkan sehingga baris ambang D34 tersedia daripada satu sumber data. Isyarat di atas ialah rekod negeri dan panduan terdokumen, bukan kebarangkalian bagi alamat anda.':'Combined level is not displayed until the D34 threshold row is available from one data source. The signals above are state records and documented guidance, not a probability for your address.')+'</div>';
      card.innerHTML=html;list.appendChild(card);
    });
    var desc=document.getElementById('plan-result__signalsDescription');if(desc)desc.textContent=l==='bm'?'Tiga isyarat berasingan dengan kiraan dan sumbernya. Aduan menggunakan jumlah semua spesies negeri sehingga angka spesies yang telah disemak dimuatkan.':'Three separate signals with their counts and sources. Complaints use the all-species state total until reconciled species figures are loaded.';
    var heading=document.getElementById('plan-result__stateHeading');if(heading)heading.textContent=stateLabel;
  }

  function renderMonthly(st,codes){
    var bars=document.getElementById('plan-result__seasonBars'),desc=document.getElementById('plan-result__seasonDescription');if(!bars||!desc)return;
    var l=lang();
    if(codes.length!==1){bars.innerHTML='';desc.textContent=l==='bm'?'Profil bulanan dipaparkan apabila satu spesies dipilih dan ambang D34 tersedia.':'Monthly profile is shown when one species is selected and the D34 threshold is available.';return;}
    var occ=occurrenceFor(st,codes[0]);bars.innerHTML='';
    desc.textContent=(l==='bm'?'Terdapat ':'There are ')+occ.total.toLocaleString()+(l==='bm'?' rekod lengkap untuk spesies ini di negeri ini. Ambang D34 belum tersedia melalui antara muka data, jadi graf bulanan tidak dilukis dan tiada ambang direka.':' complete-year records for this species in this state. The D34 threshold is not available through the data interface yet, so no monthly chart is drawn and no threshold is invented.')+(occ.minYear?' '+(l==='bm'?'Julat tahun lengkap: ':'Complete-year range: ')+occ.minYear+'–'+occ.maxYear+'.':'');
  }

  function load(){
    if(currentPage()!=='plan-result')return;var st=state(),codes=speciesCodes();if(!st)return;var token=++runToken;
    Promise.all([apiJson('/api/i2/complaints?state='+encodeURIComponent(st)).catch(function(){return{rows:[],summary:null};}),apiJson('/api/i2/attractants').then(function(b){return Array.isArray(b.rows)?b.rows:[];}).catch(function(){return[];})]).then(function(xs){if(token!==runToken)return;render(st,codes,xs[0],xs[1]);renderMonthly(st,codes);window.dispatchEvent(new Event('roomforboth:signals-ready'));});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else setTimeout(load,0);
  window.addEventListener('hashchange',function(){setTimeout(load,0);});window.addEventListener('popstate',function(){setTimeout(load,0);});document.addEventListener('roomforboth:pageshow',function(){setTimeout(load,0);});window.addEventListener('roomforboth:db-plan-ready',function(){setTimeout(load,0);});
})();
