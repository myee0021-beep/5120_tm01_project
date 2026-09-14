(function(){
  'use strict';

  var ID_MAP={
    1:'macaque',
    2:'wild-boar',
    3:'common-myna',
    5:'house-crow',
    6:'water-monitor'
  };

  function normalizeIds(value){
    if(!Array.isArray(value))return value;
    return value.map(function(id){
      var key=String(id);
      return ID_MAP[key]||id;
    });
  }

  function patchWindow(win){
    if(!win||win.__r4bDescribeIdCompat)return;
    var original=win.fetch;
    if(typeof original!=='function')return;
    win.__r4bDescribeIdCompat=true;
    win.fetch=function(input,init){
      return original.call(this,input,init).then(function(response){
        try{
          var url=typeof input==='string'?input:(input&&input.url)||'';
          if(String(url).indexOf('/api/identify-describe')===-1)return response;
          return response.clone().json().then(function(data){
            if(!data||!data.ok||!Array.isArray(data.species_ids))return response;
            data.species_ids=normalizeIds(data.species_ids);
            if(Array.isArray(data.matches)){
              data.matches=data.matches.map(function(m){
                if(!m||typeof m!=='object')return m;
                var next=Object.assign({},m);
                next.species_id=ID_MAP[String(m.species_id)]||m.species_id;
                return next;
              });
            }
            return new Response(JSON.stringify(data),{
              status:response.status,
              statusText:response.statusText,
              headers:response.headers
            });
          }).catch(function(){return response;});
        }catch(e){return response;}
      });
    };
  }

  function patchFrame(){
    var frame=document.getElementById('emergency__frame');
    if(!frame)return;
    try{patchWindow(frame.contentWindow);}catch(e){}
  }

  function init(){
    patchWindow(window);
    var frame=document.getElementById('emergency__frame');
    if(frame&&!frame.__r4bDescribeCompatLoadBound){
      frame.__r4bDescribeCompatLoadBound=true;
      frame.addEventListener('load',function(){setTimeout(patchFrame,0);setTimeout(patchFrame,100);});
    }
    setTimeout(patchFrame,0);
    setTimeout(patchFrame,150);
    setTimeout(patchFrame,600);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
  window.addEventListener('hashchange',init);
  document.addEventListener('roomforboth:pageshow',init);
})();
