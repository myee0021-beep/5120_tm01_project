(function(){
  'use strict';
  function j(res){return res.json().then(function(x){if(!res.ok||x.ok===false)throw new Error(x.error||('HTTP '+res.status));return x;});}
  function reviewerHeaders(key){return {'x-reviewer-key':String(key||'')};}
  function stateRecordSummary(state){
    try{
      var all=window.OCCURRENCES_ALL_YEARS||[];
      var key=String(state||'').toLowerCase();
      var rows=all.filter(function(r){return String(r.state||r.state_key||'').toLowerCase()===key;});
      if(!rows.length)return null;
      var by={},total=0;
      rows.forEach(function(r){
        var n=Number(r.count||r.records||r.total||0)||0;
        var sp=String(r.species||r.species_id||'unknown');
        by[sp]=(by[sp]||0)+n;
        total+=n;
      });
      var top=Object.keys(by).sort(function(a,b){return by[b]-by[a];})[0]||null;
      return {total:total,top:top,topCount:top?by[top]:0};
    }catch(e){return null;}
  }
  window.CommunityAPI={
    listPublished:function(q){var p=new URLSearchParams();if(q&&q.state)p.set('state',q.state);if(q&&q.district)p.set('district',q.district);return fetch('/api/community/reports?'+p.toString(),{cache:'no-store'}).then(j).then(function(x){return x.reports||[];});},
    getReport:function(id){return fetch('/api/community/reports/'+encodeURIComponent(id),{cache:'no-store'}).then(function(r){if(r.status===404)return null;return j(r).then(function(x){return x.report||null;});});},
    submit:function(report,photoBlob){if(photoBlob){var fd=new FormData();fd.append('report',JSON.stringify(report||{}));fd.append('photo',photoBlob,'community.jpg');return fetch('/api/community/reports',{method:'POST',body:fd}).then(j);}return fetch('/api/community/reports',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(report||{})}).then(j);},
    verifyKey:function(key){return fetch('/api/community/review/session',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({key:key})}).then(function(r){return r.json();}).then(function(x){return !!x.ok;});},
    listQueue:function(key){return fetch('/api/community/review/queue',{headers:reviewerHeaders(key),cache:'no-store'}).then(j).then(function(x){return x.reports||[];});},
    decide:function(key,id,decision,reason){return fetch('/api/community/review/'+encodeURIComponent(id),{method:'POST',headers:{'content-type':'application/json',...reviewerHeaders(key)},body:JSON.stringify({decision:decision,reason:reason})}).then(j).then(function(x){return x.report;});},
    listLog:function(key){return fetch('/api/community/review/log',{headers:reviewerHeaders(key),cache:'no-store'}).then(j).then(function(x){return x.rows||[];});},
    parse:function(sentence){return fetch('/api/community/parse',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({text:String(sentence||'')})}).then(j).then(function(x){delete x.ok;delete x.prompt_version;return x;});},
    stateRecordSummary:stateRecordSummary
  };
})();
