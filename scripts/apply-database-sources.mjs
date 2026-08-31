import fs from 'node:fs';

const workerPath = 'src/worker.js';
const indexPath = 'public/index.html';

let worker = fs.readFileSync(workerPath, 'utf8');
let html = fs.readFileSync(indexPath, 'utf8');

// About > Spine datasets stays intentionally static: only GBIF + MyBIS.
worker = worker.replace('<script src="/data-sources.js" defer></script>', '');

const staticSpineBody = `<tbody class="divide-y divide-slate-100">
          <tr>
            <td class="py-4 pr-4 font-display font-bold text-forest-950 whitespace-nowrap">GBIF occurrence records</td>
            <td class="py-4 pr-4 text-slate-600"><span data-en>Which species occur, aggregated to state level</span><span data-bm>Spesies yang wujud, digabung mengikut negeri</span></td>
            <td class="py-4 pr-4"><span class="rounded-full bg-emerald-50 text-forest-700 text-[11px] font-bold px-2.5 py-0.5 border border-emerald-200 whitespace-nowrap">CC BY 4.0 / CC0</span></td>
            <td class="py-4"><a href="https://gbif.org" target="_blank" rel="noopener" class="text-forest-600 hover:text-forest-800 font-semibold inline-flex items-center gap-1">gbif.org <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7"/><path d="M7 7h10v10"/></svg></a></td>
          </tr>
          <tr>
            <td class="py-4 pr-4 font-display font-bold text-forest-950 whitespace-nowrap">MyBIS</td>
            <td class="py-4 pr-4 text-slate-600"><span data-en>Malay and English names, protected status</span><span data-bm>Nama Melayu dan Inggeris, status dilindungi</span></td>
            <td class="py-4 pr-4"><span class="rounded-full bg-amber-50 text-amber-700 text-[11px] font-bold px-2.5 py-0.5 border border-amber-200 whitespace-nowrap"><span data-en>Non-commercial</span><span data-bm>Bukan komersial</span></span></td>
            <td class="py-4"><a href="https://mybis.gov.my" target="_blank" rel="noopener" class="text-forest-600 hover:text-forest-800 font-semibold inline-flex items-center gap-1">mybis.gov.my <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7"/><path d="M7 7h10v10"/></svg></a></td>
          </tr>
        </tbody>`;

html = html.replace(/<tbody id="about_database_sources"[^>]*>[\s\S]*?<\/tbody>/, staticSpineBody);

// Remove the extra injected "Step 0 · Snake safety check" badge. Keep the
// original "Step 0 · One question first" already present in the gate markup.
html = html.replace(
  /\n\s*\/\/ ---- Step 0 — snake safety gate ----[\s\S]*?gateInner\.insertBefore\(snakeStepLabel, gateInner\.firstChild\);\n\s*\}/,
  ''
);

const oldIdentity = `    if (s.id === 'snake') {
      iconBox.innerHTML = ICONS.alert;
      nameEn.innerHTML = '<span data-en>' + neutralEn + '</span><span data-bm>' + neutralBm + '</span>';
      nameBm.innerHTML = '';
    } else {`;
const newIdentity = `    if (s.id === 'snake') {
      iconBox.innerHTML = '<img src="/assets/naja-sumatrana.jpg" alt="Snake" class="w-full h-full object-cover">';
      nameEn.innerHTML = '<span data-en>' + neutralEn + '</span><span data-bm>' + neutralBm + '</span>';
      nameBm.innerHTML = '';
    } else {`;
html = html.replace(oldIdentity, newIdentity);

const oldPhotoFunction = `  function renderPhotoIcon(prefix, s) {
    var iconBox = document.getElementById(prefix + '_iconBox');
    var credit = document.getElementById(prefix + '_photoCredit');
    if (!credit) return; // stopback's markup doesn't have a credit slot
    if (s.photo && s.id !== 'snake') {
      iconBox.innerHTML = '<img src="' + s.photo.dataUri + '" alt="' + s.en + '" class="w-full h-full object-cover">';
      credit.classList.remove('hidden');
    } else {
      credit.classList.add('hidden');
    }
  }`;
const newPhotoFunction = `  function renderPhotoIcon(prefix, s) {
    var iconBox = document.getElementById(prefix + '_iconBox');
    var credit = document.getElementById(prefix + '_photoCredit');
    if (!credit) return;
    var sourceLink = document.getElementById(prefix + '_photoSourceLink');

    if (s.id === 'snake') {
      iconBox.innerHTML = '<img src="/assets/naja-sumatrana.jpg" alt="Snake" class="w-full h-full object-cover">';
      credit.classList.remove('hidden');
      if (sourceLink) {
        sourceLink.href = 'https://www.inaturalist.org/taxa/106451-Naja-sumatrana';
        sourceLink.target = '_blank';
        sourceLink.rel = 'noopener';
        sourceLink.onclick = null;
      }
    } else if (s.photo) {
      iconBox.innerHTML = '<img src="' + s.photo.dataUri + '" alt="' + s.en + '" class="w-full h-full object-cover">';
      credit.classList.remove('hidden');
    } else {
      credit.classList.add('hidden');
    }
  }`;
html = html.replace(oldPhotoFunction, newPhotoFunction);

const oldSnakeHero = `      <div class="shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-rose-500/10 border border-rose-400/30 flex items-center justify-center backdrop-blur text-rose-300">
        <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 2 20h20L12 3z"/><line x1="12" y1="10" x2="12" y2="14.5"/><circle cx="12" cy="17.3" r=".6" fill="currentColor" stroke="none"/></svg>
      </div>`;
const newSnakeHero = `      <div class="shrink-0 flex flex-col items-center gap-1.5 w-20 sm:w-24">
        <div class="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white/5 border border-white/10 overflow-hidden backdrop-blur">
          <img src="/assets/naja-sumatrana.jpg" alt="Snake" class="w-full h-full object-cover">
        </div>
        <div class="text-center leading-tight">
          <p class="text-[9px] text-slate-400"><span data-en>iNaturalist photo</span><span data-bm>Foto iNaturalist</span></p>
          <a href="https://www.inaturalist.org/taxa/106451-Naja-sumatrana" target="_blank" rel="noopener" class="text-[9px] font-semibold text-emerald-300 hover:text-emerald-200 transition-colors">
            <span data-en>View source</span><span data-bm>Lihat sumber</span> ↗
          </a>
        </div>
      </div>`;
html = html.replace(oldSnakeHero, newSnakeHero);

// Snake's dedicated What-to-do page: source links go straight to Bomba.
const snakeStart = html.indexOf('function render_snakewhattodo()');
const snakeEnd = html.indexOf('</script>', snakeStart);
if (snakeStart >= 0 && snakeEnd > snakeStart) {
  let snakeBlock = html.slice(snakeStart, snakeEnd);
  snakeBlock = snakeBlock.replace(
    `? '<a href="#" onclick="goTo(\\'about\\');return false;" class="mt-1 inline-block text-[11px] text-slate-400 hover:text-forest-700 underline underline-offset-2"><span data-en>' + s.safetySource.en + '</span><span data-bm>' + s.safetySource.bm + '</span></a>'`,
    `? '<a href="https://www.bomba.gov.my/" target="_blank" rel="noopener" class="mt-1 inline-block text-[11px] text-slate-400 hover:text-forest-700 underline underline-offset-2"><span data-en>' + s.safetySource.en + '</span><span data-bm>' + s.safetySource.bm + '</span></a>'`
  );
  html = html.slice(0, snakeStart) + snakeBlock + html.slice(snakeEnd);
}

// Home selector used to send every animal, including Snake, to the shared
// What-to-do page. Route Snake to the dedicated snake page so Home and
// Identify/keyword entry paths behave identically.
html = html.replace(
  `      warning.classList.add('hidden');\n      goTo('whattodo', { id: animalVal, state: stateVal });`,
  `      warning.classList.add('hidden');\n      if (animalVal === 'snake') {\n        APP.speciesId = 'snake';\n        APP.stateId = stateVal;\n        goTo('snakewhattodo');\n        return;\n      }\n      goTo('whattodo', { id: animalVal, state: stateVal });`
);

// Defence in depth: if Snake ever reaches the shared What-to-do renderer,
// its safety source must still be an external Bomba link rather than About.
const sharedStart = html.indexOf('function render_whattodo()');
const sharedEnd = html.indexOf('</script>', sharedStart);
if (sharedStart >= 0 && sharedEnd > sharedStart) {
  let sharedBlock = html.slice(sharedStart, sharedEnd);
  sharedBlock = sharedBlock.replace(
    `    var src = s.safetySource\n      ? '<a href="#" onclick="goTo(\\'about\\');return false;" class="mt-1 inline-block text-[11px] text-slate-400 hover:text-forest-700 underline underline-offset-2"><span data-en>' + s.safetySource.en + '</span><span data-bm>' + s.safetySource.bm + '</span></a>'\n      : '';`,
    `    var src = s.safetySource\n      ? (s.id === 'snake'\n          ? '<a href="https://www.bomba.gov.my/" target="_blank" rel="noopener" class="mt-1 inline-block text-[11px] text-slate-400 hover:text-forest-700 underline underline-offset-2"><span data-en>' + s.safetySource.en + '</span><span data-bm>' + s.safetySource.bm + '</span></a>'\n          : '<a href="#" onclick="goTo(\\'about\\');return false;" class="mt-1 inline-block text-[11px] text-slate-400 hover:text-forest-700 underline underline-offset-2"><span data-en>' + s.safetySource.en + '</span><span data-bm>' + s.safetySource.bm + '</span></a>')\n      : '';`
  );
  html = html.slice(0, sharedStart) + sharedBlock + html.slice(sharedEnd);
}

fs.writeFileSync(workerPath, worker);
fs.writeFileSync(indexPath, html);
console.log('Unified Snake Home/keyword flow and external source links.');
