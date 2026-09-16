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
  var STATE_LABELS={johor:'Johor',kedah:'Kedah',kelantan:'Kelantan',melaka:'Melaka','negeri-sembilan':'Negeri Sembilan',pahang:'Pahang',perak:'Perak',perlis:'Perlis',penang:'Pulau Pinang','pulau-pinang':'Pulau Pinang',sabah:'Sabah',sarawak:'Sarawak',selangor:'Selangor',terengganu:'Terengganu',kl:'Kuala Lumpur','kuala-lumpur':'Kuala Lumpur',labuan:'Labuan',putrajaya:'Putrajaya'};
  var runToken=0;

  function clean(v){return String(v==null?'':v).replace(/\s+/g,' ').trim();}
  function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');}
  function norm(v){return clean(v).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');}
  function lang(){var l=String(document.documentElement.lang||'').toLowerCase();return(l==='bm'||l==='ms')?'bm':'en';}
  function currentPage(){return String(location.hash||'#index').replace(/^#/,'').split('?')[0]||'index';}
  function answers(){try{return JSON.parse(sessionStorage.getItem('roomForBoth.homeAnswers')||'null')||{};}catch(e){return {};}}
  function plainDate(v){var s=clean(v),m=s.match(/^(\d{4}-\d{2}-\d{2})/);return m?m[1]:s;}
  function state(){
    var a=answers();
    try{if(window.AppNav&&AppNav.currentQuery){var x=new URLSearchParams(AppNav.currentQuery).get('state');if(x)return norm(x);}}catch(e){}
    try{var h=String(location.hash||''),q=h.indexOf('?');if(q!==-1){var y=new URLSearchParams(h.slice(q+1)).get('state');if(y)return norm(y);}}catch(e){}
    try{var z=sessionStorage.getItem('roomForBoth.selectedState');if(z)return norm(z);}catch(e){}
    return norm(a.state||'');
  }
  function speciesCodes(){
    var a=answers(),raw=a.speciesSeen||a.species_seen||a.species||[];if(!Array.isArray(raw))raw=[raw];
    var out=[];
    raw.forEach(function(v){var n=norm(v);if(!n||n==='none'||n==='not-sure')return;if(n==='snake'||n==='snakes'||n==='ular'){out.push('python','cobra');return;}Object.keys(SPECIES).forEach(function(code){var m=SPECIES[code];if(n===code||n===String(m.id)||n.indexOf(code)!==-1||(code==='macaque'&&n.indexOf('long-tailed-macaque')!==-1)||(code==='monitor'&&(n.indexOf('water-monitor')!==-1||n.indexOf('monitor-lizard')!==-1)))out.push(code);});});
    return out.filter(function(v,i,a2){return a2.indexOf(v)===i;});
  }
  function occurrenceRows(){
    var d=window.OCCURRENCES_ALL_YEARS;if(!d||!Array.isArray(d.rows))return[];return d.rows;
  }
  function occurrenceFor(st,code){
    var allRows=occurrenceRows().filter(function(r){return norm(r[0])===st&&r[1]===code;});
    var datedRows=allRows.filter(function(r){return Number(r[2])>0&&Number(r[3])>=1&&Number(r[3])<=12;});
    var total=0,datedTotal=0,months=[0,0,0,0,0,0,0,0,0,0,0,0],years=[];
    allRows.forEach(function(r){total+=Number(r[4])||0;});
    datedRows.forEach(function(r){var y=Number(r[2]),m=Number(r[3]),c=Number(r[4])||0;datedTotal+=c;if(y)years.push(y);if(m>=1&&m<=12)months[m-1]+=c;});
    return{total:total,datedTotal:datedTotal,months:months,minYear:years.length?Math.min.apply(null,years):null,maxYear:years.length?Math.max.apply(null,years):null};
  }
  function answerValues(v){if(v==null)return[];return Array.isArray(v)?v:[v];}
  function documentedAnswers(){
    var a=answers(),seen={},out=[];
    var SAFE_HOME_ANSWERS={'closed-bins':1,'covered-bins':1,'secured-bins':1,'bins-with-lids':1,'kept-indoors':1,'indoors':1};
    function add(key,value){
      var n=norm(value);if(!n||n==='no'||n==='false'||n==='none'||n==='not-sure'||n==='unknown')return;
      if(key==='wasteStorage'&&SAFE_HOME_ANSWERS[n])return;
      var label=n.replace(/-/g,' '),tokens=[n];
      if(n==='yes'||n==='true'){
        if(key==='neighboursFeed'){label='neighbour feeding';tokens=['neighbour-feeding','neighbor-feeding','feeding','feed','deliberate-feeding'];}
        else return;
      }
      var dedupe=norm(label);if(!dedupe||seen[dedupe])return;seen[dedupe]=1;
      out.push({key:key,label:label,tokens:tokens});
    }
    ['foodSources','wasteStorage','neighboursFeed','attractants'].forEach(function(key){answerValues(a[key]).forEach(function(v){add(key,v);});});
    return out;
  }
  function rowSpeciesId(r){var v=r&&r.species_id;return v==null?null:Number(v);}
  function rowText(r){return Object.keys(r||{}).map(function(k){return typeof r[k]==='string'||typeof r[k]==='number'?String(r[k]):'';}).join(' ').toLowerCase().replace(/[_-]+/g,' ');}
  function validAttractant(r){return!!(r&&clean(r.date_verified)&&(clean(r.source_url)||clean(r.source_person)||clean(r.source_institution)||clean(r.source_name)));}
  function sourceName(r){
    var named=clean(r&&(r.source_person||r.source_institution||r.source_name));if(named)return named;
    var u=clean(r&&r.source_url);if(!u)return'';
    try{var host=new URL(u,location.href).hostname.replace(/^www\./,'');if(/wwf\.org\.my$/i.test(host))return'WWF-Malaysia';if(/wildlife\.gov\.my$/i.test(host)||/perhilitan/i.test(host))return'PERHILITAN';return host;}catch(e){return u;}
  }
  function answerMatchScore(item,row,sid){
    var txt=rowText(row),score=0,rs=rowSpeciesId(row);
    item.tokens.forEach(function(token){var phrase=norm(token).replace(/-/g,' '),words=norm(token).split('-').filter(function(x){return x.length>2;});if(phrase&&txt.indexOf(phrase)!==-1)score+=10;words.forEach(function(w){if(txt.indexOf(w)!==-1)score+=1;});});
    if(score>0&&rs===sid)score+=2;return score;
  }
  function matchAttractants(rows,code){
    var items=documentedAnswers(),sid=SPECIES[code].id,matched=[];
    items.forEach(function(item){var best=null,bestScore=0;rows.forEach(function(r){if(!validAttractant(r))return;var rs=rowSpeciesId(r);if(rs&&rs!==sid)return;var score=answerMatchScore(item,r,sid);if(score>bestScore){best=r;bestScore=score;}});if(best&&bestScore>0)matched.push({answer:item.label,row:best});});
    return matched;
  }
  function complaintRowFor(rows,speciesId,preferredYear){
    var matches=(rows||[]).filter(function(r){return Number(r&&r.species_id)===Number(speciesId);});if(!matches.length)return null;
    if(preferredYear){var same=matches.filter(function(r){return Number(r.year)===Number(preferredYear);});if(same.length)matches=same;}
    matches.sort(function(a,b){return(Number(b.year)||0)-(Number(a.year)||0);});return matches[0]||null;
  }
  function apiJson(url){return fetch(url,{headers:{accept:'application/json'},cache:'no-store'}).then(function(r){return r.json().then(function(b){if(!r.ok||b&&b.ok===false)throw new Error((b&&b.error)||('HTTP '+r.status));return b;});});}
  function sourceLink(url,label){return url?'<a class="underline underline-offset-2" target="_blank" rel="noopener" href="'+esc(url)+'">'+esc(label)+'</a>':esc(label);}
  function setNeighbourVisibility(codes){var card=document.getElementById('plan-result__neighbourCard');if(!card)return;card.classList.toggle('hidden',codes.indexOf('macaque')===-1);}

  function render(st,codes,complaints,attractants){
    var list=document.getElementById('plan-result__speciesList');if(!list)return;
    var l=lang(),stateLabel=STATE_LABELS[st]||st,cs=complaints&&complaints.summary||null,complaintRows=complaints&&Array.isArray(complaints.rows)?complaints.rows:[];
    list.innerHTML='';setNeighbourVisibility(codes);
    if(!codes.length){list.innerHTML='<div class="text-sm text-slate-500">'+esc(l==='bm'?'Tiada spesies dipilih dalam soal selidik. Tiada isyarat spesies direka.':'No species was selected in the questionnaire. No species signal is invented.')+'</div>';return;}
    codes.forEach(function(code){
      var meta=SPECIES[code],occ=occurrenceFor(st,code),att=matchAttractants(attractants,code),name=l==='bm'?meta.bm:meta.en;
      var complaint=complaintRowFor(complaintRows,meta.id,cs&&cs.year);
      var card=document.createElement('div');card.className='rounded-xl border border-slate-100 p-4 mb-3';
      var html='<div class="font-semibold text-forest-950">'+esc(name)+'</div><div class="mt-3 space-y-2 text-sm text-slate-700">';
      html+='<div><strong>'+(l==='bm'?'Rekod kejadian':'Recorded occurrences')+':</strong> '+occ.total.toLocaleString()+' · '+sourceLink('#about-the-data','GBIF occurrence extract')+'</div>';
      if(meta.absentComplaint||!complaint){html+='<div><strong>'+(l==='bm'?'Aduan konflik':'Conflict complaints')+':</strong> '+esc(l==='bm'?'Tiada baris aduan khusus spesies yang diterbitkan untuk spesies ini di negeri ini; jumlah semua spesies tidak digunakan sebagai ganti.':'No published species-specific complaint row is available for this species in this state; the all-species total is not substituted.')+'</div>';}
      else{var cSource=clean(complaint.source_url||(cs&&cs.source_url)),cDate=plainDate(complaint.date_verified||(cs&&cs.date_verified)),cYear=Number(complaint.year)||(cs&&cs.year)||2020;html+='<div><strong>'+(l==='bm'?'Aduan konflik':'Conflict complaints')+':</strong> '+Number(complaint.cases||0).toLocaleString()+' · '+esc(cYear+' '+(l==='bm'?'aduan khusus spesies':'species-specific complaints'))+' · '+sourceLink(cSource||'#about-the-data','PERHILITAN Table 29')+(cDate?' · '+esc(l==='bm'?'disahkan ':'verified ')+esc(cDate):'')+'</div>';}
      html+='<div><strong>'+(l==='bm'?'Tarikan rumah yang didokumenkan':'Documented attractants matched')+':</strong> '+att.length+'</div>';
      if(att.length){html+='<ul class="ml-4 list-disc text-xs text-slate-500">'+att.map(function(x){var r=x.row,src=sourceName(r),d=plainDate(r.date_verified);return'<li>'+esc(x.answer)+' · '+sourceLink(r.source_url,src)+(d?' · '+esc(l==='bm'?'disahkan ':'verified ')+esc(d):'')+'</li>';}).join('')+'</ul>';}
      else html+='<div class="text-xs text-slate-500">'+esc(l==='bm'?'Tiada jawapan di rumah ini sepadan dengan sebab yang didokumenkan untuk spesies ini.':'Nothing at this home matched the documented causes for this species.')+'</div>';
      html+='</div>';
      card.innerHTML=html;list.appendChild(card);
    });
    var desc=document.getElementById('plan-result__signalsDescription');if(desc)desc.textContent=l==='bm'?'Tiga isyarat berasingan dengan kiraan dan sumbernya. Aduan menggunakan baris negeri dan spesies yang dipilih daripada jadual PERHILITAN yang telah diselaraskan; jumlah semua spesies tidak digunakan sebagai ganti.':'Three separate signals with their counts and sources. Complaints use the selected state/species row from the reconciled PERHILITAN table; the all-species total is not substituted.';
    var heading=document.getElementById('plan-result__stateHeading');if(heading)heading.textContent=stateLabel;
  }

  function renderMonthly(st,codes){
    var chart=document.getElementById('plan-result__seasonChart'),wrap=document.getElementById('plan-result__seasonChartWrap'),desc=document.getElementById('plan-result__seasonDescription');if(!chart||!wrap||!desc)return;
    var l=lang(),threshold=30;chart.innerHTML='';wrap.classList.add('hidden');
    if(!codes.length){desc.textContent=l==='bm'?'Pilih sekurang-kurangnya satu spesies untuk melihat profil bulanan rekod bertarikh.':'Select at least one species to view monthly profiles of dated records.';return;}
    desc.textContent=l==='bm'?'Setiap spesies yang dipilih ditunjukkan secara berasingan. Rekod menunjukkan tempat spesies dilaporkan, bukan bilangan haiwan.':'Each selected species is shown separately. Records show where the species was reported, not the number of animals.';
    var monthsShort=l==='bm'?['Jan','Feb','Mac','Apr','Mei','Jun','Jul','Ogo','Sep','Okt','Nov','Dis']:['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    codes.forEach(function(code){
      var occ=occurrenceFor(st,code),name=l==='bm'?SPECIES[code].bm:SPECIES[code].en,card=document.createElement('section');card.className='rounded-xl border border-slate-100 bg-slate-50 p-3';
      var title=document.createElement('div');title.className='text-xs font-semibold text-forest-950';title.textContent=name;card.appendChild(title);
      var detail=document.createElement('p');detail.className='mt-1 text-xs text-slate-500';
      if(occ.datedTotal<threshold){detail.textContent=l==='bm'?'Rekod bertarikh tidak mencukupi untuk '+name+' di '+(STATE_LABELS[st]||st)+' untuk memaparkan profil bulanan. Rekod semasa: '+occ.datedTotal.toLocaleString()+' · Ambang: '+threshold:'Not enough dated records for '+name+' in '+(STATE_LABELS[st]||st)+' to show a monthly profile. Records so far: '+occ.datedTotal.toLocaleString()+' · Threshold: '+threshold;card.appendChild(detail);chart.appendChild(card);return;}
      detail.textContent=(l==='bm'?'Jumlah rekod bertarikh: ':'Dated records: ')+occ.datedTotal.toLocaleString()+' · '+occ.minYear+'–'+occ.maxYear;card.appendChild(detail);
      var bars=document.createElement('div');bars.className='mt-3 flex items-end gap-1.5 h-24';var max=Math.max.apply(null,occ.months);var labels=document.createElement('div');labels.className='flex justify-between mt-1.5 text-[10px] text-slate-400';
      occ.months.forEach(function(count,index){var isPeak=count===max&&count>0,item=document.createElement('div');item.className='bar-item'+(isPeak?' peak':'');var value=document.createElement('span');value.className='bar-value';value.textContent=count.toLocaleString();var bar=document.createElement('div');bar.className='bar-col'+(isPeak?' peak':'');bar.style.height=Math.max(8,Math.round(count/max*100))+'%';var tip=monthsShort[index]+': '+count.toLocaleString()+(l==='bm'?' rekod':' records');bar.title=tip;item.setAttribute('aria-label',tip);item.appendChild(value);item.appendChild(bar);bars.appendChild(item);var lbl=document.createElement('span');lbl.textContent=monthsShort[index];labels.appendChild(lbl);});
      card.appendChild(bars);card.appendChild(labels);var footnote=document.createElement('p');footnote.className='mt-2 text-[11px] text-slate-400';footnote.textContent=l==='bm'?'Ini ialah rekod tempat spesies itu dilaporkan, bukan bilangan haiwan.':'These are records of where the species was reported, not a count of animals.';card.appendChild(footnote);chart.appendChild(card);
    });
    wrap.classList.remove('hidden');
  }

  function load(){
    if(currentPage()!=='plan-result')return;var st=state(),codes=speciesCodes();if(!st)return;setNeighbourVisibility(codes);
    if(!window.OCCURRENCES_ALL_YEARS||!Array.isArray(window.OCCURRENCES_ALL_YEARS.rows))return;
    var token=++runToken;
    Promise.all([apiJson('/api/i2/complaints?state='+encodeURIComponent(st)).catch(function(){return{rows:[],summary:null};}),apiJson('/api/i2/attractants').then(function(b){return Array.isArray(b.rows)?b.rows:[];}).catch(function(){return[];})]).then(function(xs){if(token!==runToken)return;render(st,codes,xs[0],xs[1]);renderMonthly(st,codes);window.dispatchEvent(new Event('roomforboth:signals-ready'));});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else setTimeout(load,0);
  window.addEventListener('hashchange',function(){setTimeout(load,0);});window.addEventListener('popstate',function(){setTimeout(load,0);});document.addEventListener('roomforboth:pageshow',function(){setTimeout(load,0);});window.addEventListener('roomforboth:db-plan-ready',function(){setTimeout(load,0);});window.addEventListener('roomforboth:all-years-occurrence-data-ready',function(){setTimeout(load,0);});
})();