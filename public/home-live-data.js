(function(){
  'use strict';
  var seq=0;
  function clean(v){return String(v==null?'':v).replace(/\s+/g,' ').trim();}
  function norm(v){return clean(v).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').replace(/^pulau-pinang$/,'penang').replace(/^kuala-lumpur$/,'kl');}
  function lang(){var l=String(document.documentElement.lang||'').toLowerCase();return(l==='bm'||l==='ms')?'bm':'en';}
  function page(){return String(location.hash||'#index').replace(/^#/,'').split('?')[0]||'index';}
  function currentState(){var s=document.getElementById('index__home_stateSelect');return s?norm(s.value):'';}
  function api(st){return fetch('/api/i2/complaints?state='+encodeURIComponent(st),{headers:{accept:'application/json'},cache:'no-store'}).then(function(r){return r.json().then(function(b){if(!r.ok||b&&b.ok===false)throw new Error((b&&b.error)||('HTTP '+r.status));return b;});});}
  function setText(id,text){var e=document.getElementById(id);if(e)e.textContent=text;}
  function apply(st,b){
    if(page()!=='index'||st!==currentState())return;
    var l=lang(),sum=b&&b.summary||null,rows=b&&Array.isArray(b.rows)?b.rows:[];
    if(sum&&rows.length){
      setText('index__glanceComplaints',Number(sum.total_cases||0).toLocaleString());
      setText('index__glanceComplaintsLabel',l==='bm'?'jumlah aduan hidupan liar semua spesies, '+(sum.year||2020):'all-species wildlife complaints, '+(sum.year||2020));
      var cap=document.getElementById('index__glanceCaption');
      if(cap){
        var source='PERHILITAN Table 29';
        cap.textContent=l==='bm'?'Angka aduan ialah jumlah semua spesies bagi negeri yang dipilih, bukan angka khusus spesies. Sumber: '+source+(sum.date_verified?' · disahkan '+sum.date_verified:'')+'.':'The complaint figure is the all-species total for the selected state, not a species-specific count. Source: '+source+(sum.date_verified?' · verified '+sum.date_verified:'')+'.';
      }
    }else{
      setText('index__glanceComplaints','—');
      setText('index__glanceComplaintsLabel',l==='bm'?'tiada siri aduan untuk negeri ini':'no complaint series for this state');
    }
  }
  function load(){if(page()!=='index')return;var st=currentState();if(!st)return;var token=++seq;api(st).then(function(b){if(token===seq)apply(st,b);}).catch(function(){if(token===seq)apply(st,{rows:[],summary:null});});}
  document.addEventListener('change',function(e){if(e.target&&e.target.id==='index__home_stateSelect')setTimeout(load,0);},true);
  document.addEventListener('click',function(e){if(e.target&&e.target.closest&&e.target.closest('#index__home_goBtn'))setTimeout(load,0);},true);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(load,120);},{once:true});else setTimeout(load,120);
  window.addEventListener('hashchange',function(){setTimeout(load,120);});document.addEventListener('roomforboth:pageshow',function(){setTimeout(load,120);});
})();
