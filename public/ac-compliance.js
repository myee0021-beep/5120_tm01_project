(function(){
  'use strict';

  var SNAPSHOT_KEY = 'roomForBoth.currentPlanSnapshot';
  var timer = null;
  var attractantsChecked = false;

  function clean(v){ return String(v == null ? '' : v).replace(/\s+/g,' ').trim(); }
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

  function applyDataCorrections(){
    replaceVisibleText(document.body, [
      ['5,807', '5,153'],
      ['1960 to 2026', '1860 to 2026'],
      ['1960 hingga 2026', '1860 hingga 2026'],
      [' and now fines feeding birds up to RM2,000', ''],
      [' dan kini mendenda pemberian makanan sehingga RM2,000', '']
    ]);
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

  function readSnapshot(){
    try { return JSON.parse(sessionStorage.getItem(SNAPSHOT_KEY) || 'null'); }
    catch(e){ return null; }
  }

  function renderPrintFromSnapshot(){
    if(currentPage() !== 'plan-print') return;
    var actionsWrap = document.getElementById('plan-print__sheetActions');
    var speciesWrap = document.getElementById('plan-print__sheetSpecies');
    if(!actionsWrap || !speciesWrap) return;

    var snapshot = readSnapshot();
    actionsWrap.innerHTML = '';
    speciesWrap.innerHTML = '';

    var stateEl = document.getElementById('plan-print__sheetState');
    var summaryEl = document.getElementById('plan-print__sheetSummary');
    var emergencyHeading = document.getElementById('plan-print__sheetEmergencyHeading');
    var emergencyLine = document.getElementById('plan-print__sheetEmergencyLine');

    if(!snapshot || !Array.isArray(snapshot.actions)){
      if(stateEl) stateEl.textContent = '—';
      if(summaryEl) summaryEl.textContent = currentLanguage()==='bm'
        ? 'Kembali ke pelan dan jana pelan sebelum mencetak.'
        : 'Return to the plan and generate it before printing.';
      if(emergencyHeading) emergencyHeading.parentElement.style.display = 'none';
      return;
    }

    if(stateEl) stateEl.textContent = clean(snapshot.stateLabel || snapshot.state) || '—';
    if(summaryEl) summaryEl.textContent = clean(snapshot.summaryLine);

    if(snapshot.signalsText){
      var signal = document.createElement('div');
      signal.className = 'text-xs text-slate-700 whitespace-pre-line leading-relaxed';
      signal.textContent = snapshot.signalsText;
      speciesWrap.appendChild(signal);
    }

    if(snapshot.seasonText){
      var season = document.createElement('div');
      season.className = 'mt-2 text-xs text-slate-500 whitespace-pre-line leading-relaxed';
      season.textContent = snapshot.seasonText;
      speciesWrap.appendChild(season);
    }

    snapshot.actions.forEach(function(a){
      var text = clean(a.action_text);
      var source = clean(a.source_person || a.source_institution || a.source_url);
      if(a.source_person && a.source_institution && clean(a.source_person)!==clean(a.source_institution)){
        source = clean(a.source_person) + ' · ' + clean(a.source_institution);
      }
      var verified = clean(a.date_verified);
      if(!text || !source || !verified) return;

      var row = document.createElement('div');
      row.className = 'action-row';
      row.setAttribute('data-print-prevention-id', clean(a.prevention_id));
      row.innerHTML = '<span class="action-box"></span><span>' + esc(text) +
        '<br><span class="action-source">Source: ' + esc(source) + ' · Verified ' + esc(verified) + '</span></span>';
      actionsWrap.appendChild(row);
    });

    // AC 2.2.1: do not introduce a print-only emergency instruction.
    if(emergencyHeading && emergencyHeading.parentElement) emergencyHeading.parentElement.style.display = 'none';
    if(emergencyLine) emergencyLine.textContent = '';
  }

  function ensureNeighbourPrintButton(){
    if(currentPage() !== 'plan-result') return;
    var card = document.getElementById('plan-result__neighbourCard');
    if(!card || document.getElementById('i2-neighbour-print-btn')) return;

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
    enforceAttractantOptions();
    renderPrintFromSnapshot();
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
