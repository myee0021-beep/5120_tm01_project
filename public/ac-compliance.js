(function(){
  'use strict';

  var timer = null;
  var attractantsChecked = false;

  function clean(v){ return String(v == null ? '' : v).replace(/\s+/g,' ').trim(); }
  function plainDate(v){ var s=clean(v),m=s.match(/^(\d{4}-\d{2}-\d{2})/); return m?m[1]:s; }
  function esc(v){ return String(v == null ? '' : v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;'); }
  function currentPage(){ return String(location.hash || '#index').replace(/^#/,'').split('?')[0] || 'index'; }
  function currentLanguage(){
    var l = String(document.documentElement.lang || '').toLowerCase();
    try { if(!l) l = String(localStorage.getItem('owm-lang') || '').toLowerCase(); } catch(e) {}
    return (l === 'bm' || l === 'ms') ? 'bm' : 'en';
  }
  function replaceVisibleText(root, replacements){
    root = root || document.body;
    if(!root) return;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    var nodes = [];
    while(walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function(node){
      var parent = node.parentElement;
      if(!parent || parent.closest('script,style,noscript')) return;
      var value = node.nodeValue || '';
      var next = value;
      replacements.forEach(function(pair){ next = next.split(pair[0]).join(pair[1]); });
      if(next !== value) node.nodeValue = next;
    });
  }

  function replaceVisibleTextRegex(root, replacements){
    root = root || document.body;
    if(!root) return;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    var nodes=[];
    while(walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function(node){
      var parent=node.parentElement;
      if(!parent || parent.closest('script,style,noscript')) return;
      var value=node.nodeValue||'';
      var next=value;
      replacements.forEach(function(pair){ next=next.replace(pair[0],pair[1]); });
      if(next!==value) node.nodeValue=next;
    });
  }

  function applyDataCorrections(){
    replaceVisibleText(document.body, [
      ['1960 to 2026', '1860 to 2026'],
      ['1960 hingga 2026', '1860 hingga 2026']
    ]);
  }

  function cleanResidentFacingCopy(){
    document.title = 'Room for Both — Coexistence Planning';

    var methodBadge=document.getElementById('plan-result__methodBadge');
    if(methodBadge) methodBadge.style.display='none';

    var preventionDescription=document.getElementById('plan-result__preventionDescription');
    if(preventionDescription){
      preventionDescription.textContent=currentLanguage()==='bm'
        ? 'Disusun mengikut bahaya kemudian kekerapan. Setiap tindakan mempunyai sumber Malaysia dan tarikh pengesahan. Tiada tindakan meminta anda mengendalikan atau mencederakan haiwan.'
        : 'Ordered by harm then frequency. Every action has a Malaysian source and a verified date. Nothing asks you to handle or harm an animal.';
    }

    document.querySelectorAll('#invasive__entryView p').forEach(function(p){
      var t=clean(p.textContent);
      if(/file an invasive sighting in Community|memfailkan penampakan invasif di Komuniti/i.test(t)){
        p.innerHTML=currentLanguage()==='bm'
          ? '<span>Disemak berdasarkan GRIIS Malaysia, Daftar Global Spesies Diperkenalkan dan Invasif.</span>'
          : '<span>Checked against GRIIS Malaysia, the Global Register of Introduced and Invasive Species.</span>';
      }
    });

    var aliasHelp=document.querySelector('#invasive__nameInput + p');
    if(aliasHelp){
      aliasHelp.innerHTML=currentLanguage()==='bm'
        ? '<span>Anda boleh mencari menggunakan nama Inggeris, Melayu atau saintifik. Nama di luar tujuh spesies yang diliputi akan dipaparkan sebagai “tidak diliputi” dengan pautan GRIIS.</span>'
        : '<span>You can search using an English, Malay or scientific name. Names outside the seven covered species are shown as “not covered” with a GRIIS link.</span>';
    }

    replaceVisibleTextRegex(document.body,[
      [/\s*·\s*E\d+(?:\s*(?:to|hingga|-)\s*E?\d+)?(?:\s*,\s*E\d+)*/g,''],
      [/\bE\d+(?:\s*(?:to|hingga|-)\s*E?\d+)?(?:\s*,\s*E\d+)*\b/g,''],
      [/\s*\(E\d+ profile\)/g,''],
      [/\s*\(profil E\d+\)/g,'']
    ]);

    replaceVisibleText(document.body,[
      ['attractant_rule table, one Malaysian source per row','documented home factors, each with a Malaysian source'],
      ['attractant_rule: Room for Both table, every row sourced and dated','Documented home factors: every item is sourced and dated'],
      ['attractant_rule','documented home factors'],
      ['prevention_action row','verified prevention action'],
      ['prevention_action rows','verified prevention actions'],
      ['Method v1','']
    ]);
  }

  function fixStatePlaceholders(){
    ['index__home_stateSelect','plan__plan_stateSelect'].forEach(function(id){
      var sel=document.getElementById(id);
      if(!sel) return;

      var desired=currentLanguage()==='bm'?'Pilih negeri…':'Select state…';
      var emptyOptions=Array.prototype.filter.call(sel.options,function(o){return o.value==='';});
      var first=emptyOptions[0] || null;

      if(emptyOptions.length===1 && first===sel.options[0] && first.disabled && clean(first.textContent)===desired){
        return;
      }

      var current=sel.value;
      emptyOptions.forEach(function(o){ o.remove(); });

      var opt=document.createElement('option');
      opt.value='';
      opt.disabled=true;
      opt.textContent=desired;
      if(!current) opt.selected=true;
      sel.insertBefore(opt,sel.firstChild);

      if(current && Array.prototype.some.call(sel.options,function(o){return o.value===current;})){
        sel.value=current;
      }
    });
  }

  function sourcedAndVerified(row){
    if(!row) return false;
    var source = clean(row.source_url || row.reference_url || row.url || row.source || row.source_institution || row.source_name);
    var verified = clean(row.date_verified || row.verified_date || row.last_verified);
    return !!(source && verified);
  }

  function rowText(row){
    if(!row) return '';
    var fields = [
      row.attractant_key,row.attractant,row.attractant_name,row.signal_key,row.cause_group,row.cause,
      row.option_value,row.value,row.label,row.label_en,row.label_ms,row.description,row.description_en,row.description_ms,
      row.guidance,row.action_text,row.action_text_en,row.action_text_ms
    ];
    return fields.map(clean).join(' ').toLowerCase().replace(/[_-]+/g,' ');
  }

  function setPetFoodVisible(visible){
    var btn = document.querySelector('#plan__q3_pills [data-value="outdoor-pet-food"]');
    if(btn){
      btn.hidden = !visible;
      btn.style.display = visible ? '' : 'none';
      if(!visible){
        btn.classList.remove('selected','active');
        btn.setAttribute('aria-pressed','false');
      }
    }
    if(!visible){
      var area = document.getElementById('plan__q3_pills');
      var helper = area && area.nextElementSibling;
      if(helper){
        Array.prototype.forEach.call(helper.querySelectorAll('[data-en],[data-bm]'), function(span){
          var t = clean(span.textContent);
          t = t.replace(/\s*Pet food is shown only once a Malaysian source is found\.?/i,'');
          t = t.replace(/\s*Makanan haiwan peliharaan ditunjukkan hanya apabila sumber Malaysia dijumpai\.?/i,'');
          span.textContent = t;
        });
      }
    }
  }

  function enforceAttractantOptions(){
    if(attractantsChecked) return;
    var btn = document.querySelector('#plan__q3_pills [data-value="outdoor-pet-food"]');
    if(!btn) return;
    attractantsChecked = true;
    setPetFoodVisible(false);
    fetch('/api/i2/attractants',{headers:{accept:'application/json'},cache:'no-store'})
      .then(function(res){ return res.json().then(function(body){ return {ok:res.ok,body:body}; }); })
      .then(function(result){
        var rows = result.ok && Array.isArray(result.body && result.body.rows) ? result.body.rows : [];
        var valid = rows.some(function(row){
          var text = rowText(row);
          return sourcedAndVerified(row) && (/\bpet\s*food\b/.test(text) || /\boutdoor\s*pet\s*food\b/.test(text));
        });
        setPetFoodVisible(valid);
      })
      .catch(function(){ setPetFoodVisible(false); });
  }

  function ensureNeighbourPrintButton(){
    if(currentPage() !== 'plan-result') return;
    var card = document.getElementById('plan-result__neighbourCard');
    if(!card) return;
    var existingBtn = document.getElementById('i2-neighbour-print-btn');
    // Never add/keep this button on a card the species gate has hidden
    // (macaque-only content) — it must not survive into a later render of
    // an unrelated species' plan.
    if(card.classList.contains('hidden')){ if(existingBtn) existingBtn.remove(); return; }
    if(existingBtn) return;

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'i2-neighbour-print-btn';
    btn.className = 'mt-3 inline-flex items-center rounded-full border border-emerald-200 bg-white px-4 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-50';
    btn.textContent = currentLanguage()==='bm' ? 'Cetak kad untuk jiran' : 'Print card for neighbour';
    btn.addEventListener('click', function(){
      var title = clean(document.getElementById('plan-result__neighbourTitle') && document.getElementById('plan-result__neighbourTitle').textContent);
      var body = clean(document.getElementById('plan-result__neighbourBody') && document.getElementById('plan-result__neighbourBody').textContent);
      var foot = clean(document.getElementById('plan-result__neighbourFootnote') && document.getElementById('plan-result__neighbourFootnote').textContent);

      var old = document.getElementById('i2-neighbour-print-card');
      if(old) old.remove();
      var sheet = document.createElement('section');
      sheet.id = 'i2-neighbour-print-card';
      sheet.innerHTML = '<h1>' + esc(title) + '</h1><p>' + esc(body) + '</p><p class="foot">' + esc(foot) + '</p>';
      document.body.appendChild(sheet);

      var style = document.getElementById('i2-neighbour-print-style');
      if(!style){
        style = document.createElement('style');
        style.id = 'i2-neighbour-print-style';
        style.textContent = '@media screen{#i2-neighbour-print-card{display:none}}@media print{@page{size:A5;margin:14mm}body *{visibility:hidden!important}#i2-neighbour-print-card,#i2-neighbour-print-card *{visibility:visible!important}#i2-neighbour-print-card{display:block!important;position:absolute;left:0;top:0;width:100%;font-family:Arial,sans-serif;color:#111}#i2-neighbour-print-card h1{font-size:20pt;margin:0 0 12mm}#i2-neighbour-print-card p{font-size:11pt;line-height:1.55;margin:0 0 7mm}#i2-neighbour-print-card .foot{font-size:9pt;color:#555;border-top:1px solid #ddd;padding-top:5mm}}';
        document.head.appendChild(style);
      }
      window.print();
      setTimeout(function(){ var s=document.getElementById('i2-neighbour-print-card'); if(s)s.remove(); },500);
    });
    card.appendChild(btn);
  }

  function apply(){
    applyDataCorrections();
    cleanResidentFacingCopy();
    fixStatePlaceholders();
    enforceAttractantOptions();
    ensureNeighbourPrintButton();
  }

  function schedule(){ clearTimeout(timer); timer=setTimeout(apply,80); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',schedule,{once:true});
  else schedule();
  window.addEventListener('hashchange',schedule);
  window.addEventListener('popstate',schedule);
  window.addEventListener('roomforboth:db-plan-ready',schedule);
  document.addEventListener('roomforboth:pageshow',schedule);
  new MutationObserver(schedule).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','class','lang']});
})();
