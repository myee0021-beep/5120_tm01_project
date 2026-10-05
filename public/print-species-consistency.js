(function(){
  'use strict';

  var SNAPSHOT_KEY='roomForBoth.currentPlanSnapshot';
  var ANSWERS_KEY='roomForBoth.homeAnswers';

  var LABELS={
    macaque:'Long-tailed macaque',
    boar:'Wild boar',
    myna:'Common myna',
    python:'Reticulated python',
    crow:'House crow',
    monitor:'Common water monitor',
    cobra:'Equatorial spitting cobra'
  };

  function page(){
    return String(location.hash||'').replace(/^#/,'').split('?')[0];
  }

  function norm(v){
    return String(v==null?'':v).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  }

  function readAnswers(){
    try{return JSON.parse(sessionStorage.getItem(ANSWERS_KEY)||'null')||{};}catch(e){return {};}
  }

  function selectedSpecies(){
    var a=readAnswers();
    var raw=a.speciesSeen||a.species_seen||a.species||[];
    if(!Array.isArray(raw))raw=[raw];
    var out=[];
    raw.forEach(function(v){
      var n=norm(v);
      if(!n||n==='none'||n==='not-sure')return;
      if(n==='snake'||n==='snakes'||n==='ular'){
        out.push('python','cobra');
        return;
      }
      if(n==='macaque'||n.indexOf('long-tailed-macaque')!==-1||n==='monkey'||n==='kera')out.push('macaque');
      else if(n==='boar'||n.indexOf('wild-boar')!==-1||n==='babi-hutan')out.push('boar');
      else if(n==='myna'||n.indexOf('common-myna')!==-1||n.indexOf('common-mynah')!==-1)out.push('myna');
      else if(n==='python'||n.indexOf('reticulated-python')!==-1)out.push('python');
      else if(n==='crow'||n.indexOf('house-crow')!==-1)out.push('crow');
      else if(n==='monitor'||n.indexOf('water-monitor')!==-1||n.indexOf('monitor-lizard')!==-1)out.push('monitor');
      else if(n==='cobra'||n.indexOf('spitting-cobra')!==-1)out.push('cobra');
    });
    return out.filter(function(v,i,a2){return a2.indexOf(v)===i;});
  }

  function joinNames(codes){
    var names=codes.map(function(code){return LABELS[code]||code;});
    if(names.length===1)return names[0];
    if(names.length===2)return names[0]+' and '+names[1];
    return names.slice(0,-1).join(', ')+', and '+names[names.length-1];
  }

  function replacementLines(){
    var codes=selectedSpecies();
    if(!codes.length)return null;
    return {
      first:'Species selected in the questionnaire: '+joinNames(codes)+'.',
      second:'These signals come from the resident\'s questionnaire answers; no additional species is inferred.'
    };
  }

  function updateSnapshot(lines){
    if(!lines)return;
    try{
      var snap=JSON.parse(sessionStorage.getItem(SNAPSHOT_KEY)||'null');
      if(!snap)return;
      var next=lines.first+' '+lines.second;
      if(snap.signalsText!==next){
        snap.signalsText=next;
        sessionStorage.setItem(SNAPSHOT_KEY,JSON.stringify(snap));
      }
    }catch(e){}
  }

  function replaceText(lines){
    if(!lines||page()!=='plan-print')return;
    var walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
    var nodes=[];
    while(walker.nextNode())nodes.push(walker.currentNode);

    var replacedFirst=false,replacedSecond=false;
    nodes.forEach(function(node){
      var text=String(node.nodeValue||'').replace(/\s+/g,' ').trim();
      if(!text)return;
      if(text.indexOf('No species was selected in the questionnaire')!==-1){
        node.nodeValue=node.nodeValue.replace(/No species was selected in the questionnaire\.?(?: No species signal is invented\.?)?/i,lines.first);
        replacedFirst=true;
      }
      if(text.indexOf('Select at least one species to view monthly profiles of dated records')!==-1){
        node.nodeValue=node.nodeValue.replace(/Select at least one species to view monthly profiles of dated records\.?/i,lines.second);
        replacedSecond=true;
      }
    });

    // Fallback for print templates that render the signals block as one element.
    if(!replacedFirst||!replacedSecond){
      var candidates=Array.from(document.querySelectorAll('p,div,span'));
      candidates.forEach(function(el){
        if(el.children.length)return;
        var t=String(el.textContent||'').replace(/\s+/g,' ').trim();
        if(!replacedFirst&&t.indexOf('No species was selected in the questionnaire')!==-1){
          el.textContent=lines.first;replacedFirst=true;
        }else if(!replacedSecond&&t.indexOf('Select at least one species to view monthly profiles of dated records')!==-1){
          el.textContent=lines.second;replacedSecond=true;
        }
      });
    }
  }

  function apply(){
    if(page()!=='plan-print')return;
    var lines=replacementLines();
    if(!lines)return;
    updateSnapshot(lines);
    replaceText(lines);
  }

  function run(){
    apply();
    setTimeout(apply,80);
    setTimeout(apply,250);
    setTimeout(apply,700);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});
  else run();

  window.addEventListener('hashchange',run);
  window.addEventListener('roomforboth:print-snapshot-ready',run);
  document.addEventListener('roomforboth:pageshow',run);
})();