(function(){
  'use strict';
  var seq=0;
  var SPECIES={
    1:{en:'Long-tailed macaque',bm:'Kera'},
    2:{en:'Wild boar',bm:'Babi hutan'},
    3:{en:'Common myna',bm:'Gembala kerbau'},
    4:{en:'Reticulated python',bm:'Ular sawa batik'},
    5:{en:'House crow',bm:'Gagak rumah'},
    6:{en:'Water monitor lizard',bm:'Biawak air'},
    7:{en:'Equatorial spitting cobra',bm:'Ular senduk sembur'}
  };
  function clean(v){return String(v==null?'':v).replace(/\s+/g,' ').trim();}
  function norm(v){return clean(v).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').replace(/^pulau-pinang$/,'penang').replace(/^kuala-lumpur$/,'kl');}
  function lang(){var l=String(document.documentElement.lang||'').toLowerCase();return(l==='bm'||l==='ms')?'bm':'en';}
  function page(){return String(location.hash||'#index').replace(/^#/,'').split('?')[0]||'index';}
  function currentState(){var s=document.getElementById('index__home_stateSelect');return s?norm(s.value):'';}
  function answers(){try{return JSON.parse(sessionStorage.getItem('roomForBoth.homeAnswers')||'null')||{};}catch(e){return {};}}
  function plainDate(v){var s=clean(v),m=s.match(/^(\d{4}-\d{2}-\d{2})/);return m?m[1]:s;}
  function selectedSpeciesId(){
    var a=answers(),raw=a.speciesSeen||a.species_seen||a.species||[];if(!Array.isArray(raw))raw=[raw];
    for(var i=0;i<raw.length;i++){
      var n=norm(raw[i]);
      if(n==='1'||n.indexOf('macaque')!==-1||n==='monkey'||n==='kera')return 1;
      if(n==='2'||n.indexOf('boar')!==-1||n.indexOf('babi-hutan')!==-1)return 2;
      if(n==='3'||n.indexOf('myna')!==-1)return 3;
      if(n==='4'||n.indexOf('python')!==-1)return 4;
      if(n==='5'||n.indexOf('crow')!==-1)return 5;
      if(n==='6'||n.indexOf('monitor')!==-1||n==='biawak')return 6;
      if(n==='7'||n.indexOf('cobra')!==-1)return 7;
    }
    return null;
  }
  function api(st){return fetch('/api/i2/complaints?state='+encodeURIComponent(st),{headers:{accept:'application/json'},cache:'no-store'}).then(function(r){return r.json().then(function(b){if(!r.ok||b&&b.ok===false)throw new Error((b&&b.error)||('HTTP '+r.status));return b;});});}
  function setText(id,text){var e=document.getElementById(id);if(e)e.textContent=text;}
  function clearGlance(){
    setText('index__glanceComplaints','—');
    setText('index__glanceComplaintsLabel',lang()==='bm'?'memuatkan angka aduan yang disahkan…':'loading verified complaint figure…');
    var cap=document.getElementById('index__glanceCaption');if(cap)cap.textContent='';
  }
  function complaintRow(rows,speciesId,year){
    var found=(rows||[]).filter(function(r){return Number(r&&r.species_id)===Number(speciesId);});
    if(year){var same=found.filter(function(r){return Number(r.year)===Number(year);});if(same.length)found=same;}
    found.sort(function(a,b){return(Number(b.year)||0)-(Number(a.year)||0);});
    return found[0]||null;
  }
  function apply(st,b){
    if(page()!=='index'||st!==currentState())return;
    var l=lang(),sum=b&&b.summary||null,rows=b&&Array.isArray(b.rows)?b.rows:[];
    var sid=selectedSpeciesId()||(sum&&Number(sum.top_species_id))||null;
    var row=sid?complaintRow(rows,sid,sum&&sum.year):null;
    if(row){
      var meta=SPECIES[sid]||{},name=l==='bm'?(meta.bm||('Spesies '+sid)):(meta.en||('Species '+sid));
      var year=Number(row.year)||(sum&&sum.year)||2020,date=plainDate(row.date_verified||(sum&&sum.date_verified));
      setText('index__glanceComplaints',Number(row.cases||0).toLocaleString());
      setText('index__glanceComplaintsLabel',l==='bm'?'aduan '+name+', '+year:name+' complaints, '+year);
      var cap=document.getElementById('index__glanceCaption');
      if(cap){cap.textContent=(l==='bm'?'Angka aduan khusus spesies untuk negeri yang dipilih. Sumber: PERHILITAN Table 19':'Species-specific complaint figure for the selected state. Source: PERHILITAN Table 19')+(date?(l==='bm'?' · disahkan ':' · verified ')+date:'')+'.';}
    }else{
      setText('index__glanceComplaints','—');
      setText('index__glanceComplaintsLabel',l==='bm'?'tiada angka aduan khusus spesies untuk negeri ini':'no species-specific complaint figure for this state');
      var cap2=document.getElementById('index__glanceCaption');if(cap2)cap2.textContent='';
    }
  }
  function load(){
    if(page()!=='index')return;
    clearGlance();
    var st=currentState();if(!st)return;
    var token=++seq;
    api(st).then(function(b){if(token===seq)apply(st,b);}).catch(function(){if(token===seq)apply(st,{rows:[],summary:null});});
  }
  document.addEventListener('change',function(e){if(e.target&&e.target.id==='index__home_stateSelect')setTimeout(load,0);},true);
  document.addEventListener('click',function(e){if(e.target&&e.target.closest&&e.target.closest('#index__home_goBtn'))setTimeout(load,0);},true);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(load,120);},{once:true});else setTimeout(load,120);
  window.addEventListener('hashchange',function(){setTimeout(load,120);});document.addEventListener('roomforboth:pageshow',function(){setTimeout(load,120);});
})();
