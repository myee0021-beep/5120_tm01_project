(function(){
  'use strict';

  var timer=null;
  var SNAPSHOT_KEY='roomForBoth.currentPlanSnapshot';
  var SPECIES={
    macaque:{en:'Long-tailed macaque',bm:'Kera'},
    boar:{en:'Wild boar',bm:'Babi hutan'},
    myna:{en:'Common myna',bm:'Gembala kerbau'},
    python:{en:'Reticulated python',bm:'Ular sawa batik'},
    crow:{en:'House crow',bm:'Gagak rumah'},
    monitor:{en:'Water monitor lizard',bm:'Biawak air'},
    cobra:{en:'Equatorial spitting cobra',bm:'Ular senduk sembur'}
  };

  function clean(v){return String(v==null?'':v).replace(/\s+/g,' ').trim();}
  function norm(v){return clean(v).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');}
  function lang(){var l=String(document.documentElement.lang||'').toLowerCase();return(l==='bm'||l==='ms')?'bm':'en';}
  function currentPage(){return String(location.hash||'#index').replace(/^#/,'').split('?')[0]||'index';}
  function answers(){try{return JSON.parse(sessionStorage.getItem('roomForBoth.homeAnswers')||'null')||{};}catch(e){return {};}}
  function values(v){if(v==null)return[];return Array.isArray(v)?v:[v];}

  function speciesCodes(){
    var a=answers(),raw=a.speciesSeen||a.species_seen||a.species||[],out=[];
    if(!Array.isArray(raw))raw=[raw];
    raw.forEach(function(v){
      var n=norm(v);if(!n||n==='none'||n==='not-sure')return;
      if(n==='snake'||n==='snakes'||n==='ular'){out.push('python','cobra');return;}
      Object.keys(SPECIES).forEach(function(code){
        if(n===code||n.indexOf(code)!==-1||(code==='macaque'&&n.indexOf('long-tailed-macaque')!==-1)||(code==='monitor'&&(n.indexOf('water-monitor')!==-1||n.indexOf('monitor-lizard')!==-1))){out.push(code);}
      });
    });
    return out.filter(function(v,i,a2){return a2.indexOf(v)===i;});
  }

  function factorLabels(){
    var a=answers(),out=[],seen={};
    function add(v,key){
      var n=norm(v);if(!n||n==='no'||n==='false'||n==='none'||n==='not-sure'||n==='unknown'||n==='yes'||n==='true')return;
      if(key==='wasteStorage'&&(n==='closed-bins'||n==='covered-bins'||n==='secured-bins'||n==='bins-with-lids'||n==='kept-indoors'||n==='indoors'))return;
      var label=n.replace(/-/g,' ');if(seen[label])return;seen[label]=1;out.push(label);
    }
    ['foodSources','wasteStorage','attractants'].forEach(function(key){values(a[key]).forEach(function(v){add(v,key);});});
    var feed=norm(a.neighboursFeed||a.neighborsFeed||'');
    if(feed==='yes'||feed==='true'||feed==='feeding'||feed==='neighbour-feeding'||feed==='neighbor-feeding'){
      var label=lang()==='bm'?'jiran memberi makan haiwan':'a neighbour feeds animals';
      if(!seen[label]){seen[label]=1;out.push(label);}
    }
    return out;
  }

  function buildSummaryLine(){
    var l=lang(),codes=speciesCodes(),parts=[];
    if(codes.length){
      var names=codes.map(function(code){return SPECIES[code]?(l==='bm'?SPECIES[code].bm:SPECIES[code].en):code;});
      var joined=names.length===1?names[0]:names.slice(0,-1).join(', ')+' '+(l==='bm'?'dan':'and')+' '+names[names.length-1];
      parts.push(l==='bm'?joined+' dilihat':joined+' seen');
    }
    factorLabels().forEach(function(x){parts.push(x);});
    return parts.length?parts.join(' · ')+'.':'';
  }

  function syncSummaryLine(){
    if(currentPage()!=='plan-result')return;
    var el=document.getElementById('plan-result__summaryLine');if(!el)return;
    var line=buildSummaryLine();if(!line)return;
    if(clean(el.textContent)!==line)el.textContent=line;
    try{
      var snap=JSON.parse(sessionStorage.getItem(SNAPSHOT_KEY)||'null');
      if(snap&&snap.summaryLine!==line){snap.summaryLine=line;sessionStorage.setItem(SNAPSHOT_KEY,JSON.stringify(snap));}
    }catch(e){}
  }

  function correctStaticCopy(){
    if(!document.body)return;
    var w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT),nodes=[];
    while(w.nextNode())nodes.push(w.currentNode);
    nodes.forEach(function(node){
      var p=node.parentElement;if(!p||p.closest('script,style,noscript'))return;
      var old=node.nodeValue||'',next=old.split('GRIS').join('GRIIS');
      if(next!==old)node.nodeValue=next;
    });
  }

  function apply(){correctStaticCopy();syncSummaryLine();}
  function schedule(){clearTimeout(timer);timer=setTimeout(apply,40);}

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
  window.addEventListener('hashchange',schedule);
  window.addEventListener('popstate',schedule);
  window.addEventListener('roomforboth:db-plan-ready',schedule);
  window.addEventListener('roomforboth:signals-ready',schedule);
  document.addEventListener('roomforboth:pageshow',schedule);
  new MutationObserver(schedule).observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['lang','hidden','class']});
})();