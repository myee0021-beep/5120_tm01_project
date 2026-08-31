from pathlib import Path

p = Path('public/index.html')
s = p.read_text(encoding='utf-8')
MARK = '/* DB_SNAKE_PHOTO_V2 */'
if MARK in s:
    print('V1.2 photo fix already applied')
    raise SystemExit(0)

anchor = '<script>\nfunction init_home() {'
insert = '''<script>
/* DB_SNAKE_PHOTO_V2 */
var snakeDbMediaPromise = null;
function getSnakeDbMedia() {
  if (!snakeDbMediaPromise) {
    snakeDbMediaPromise = fetch('/api/species-media?species_id=7', {headers:{'Accept':'application/json'}})
      .then(function(r){ if(!r.ok) throw new Error('HTTP '+r.status); return r.json(); })
      .then(function(d){ var m=(d&&d.media)||[]; for(var i=0;i<m.length;i++){ if(m[i]&&m[i].image_url) return m[i]; } return null; })
      .catch(function(e){ console.warn('[RoomForBoth] species 7 photo unavailable', e.message); return null; });
  }
  return snakeDbMediaPromise;
}
function snakeDbImageHtml(m) {
  return m&&m.image_url ? '<img src="'+String(m.image_url).replace(/"/g,'&quot;')+'" alt="Snake" class="w-full h-full object-cover">' : '';
}
function init_home() {'''
assert anchor in s, 'init_home anchor missing'
s = s.replace(anchor, insert, 1)

old = "      creditEl.innerHTML = slides[i].dataset.creditEn;"
new = old + """
      creditEl.querySelectorAll('a').forEach(function(a){
        a.removeAttribute('target'); a.href='#';
        a.onclick=function(e){ if(e)e.preventDefault(); goTo('about'); return false; };
      });"""
assert old in s, 'carousel credit anchor missing'
s = s.replace(old, new, 1)

old = "      animalBtnThumb.innerHTML = thumbHtml;"
new = """      var selectedThumbHtml=(a.id==='snake'&&window.DB_SNAKE_MEDIA)?snakeDbImageHtml(window.DB_SNAKE_MEDIA):thumbHtml;
      animalBtnThumb.innerHTML = selectedThumbHtml;"""
assert old in s, 'selected thumbnail anchor missing'
s = s.replace(old, new, 1)

old = """  SPECIES.filter(function (a) { return a.id !== 'general'; }).forEach(function (a) {
    addAnimalOption(a, a.en, a.bm);
  });

  var generalSpecies = SPECIES.filter(function (a) { return a.id === 'general'; })[0];"""
new = """  SPECIES.filter(function (a) { return a.id !== 'general'; }).forEach(function (a) {
    addAnimalOption(a, a.en, a.bm);
  });

  getSnakeDbMedia().then(function(media){
    if(!media) return;
    window.DB_SNAKE_MEDIA=media;
    var row=animalListEl.querySelector('[data-value="snake"]');
    if(row){ var t=row.querySelector('span.w-7.h-7'); if(t)t.innerHTML=snakeDbImageHtml(media); }
    if(animalSelectEl.value==='snake'){
      animalBtnThumb.innerHTML=snakeDbImageHtml(media);
      animalBtnThumb.classList.remove('hidden'); animalBtnThumb.classList.add('flex');
    }
  });

  var generalSpecies = SPECIES.filter(function (a) { return a.id === 'general'; })[0];"""
assert old in s, 'species loop anchor missing'
s = s.replace(old, new, 1)

old = "  var body = document.getElementById('about_actionSourceBody');"
new = """  if(photoList){
    getSnakeDbMedia().then(function(media){
      if(!media||photoList.querySelector('[data-db-snake-photo="1"]')) return;
      var src=media.source_url||media.stored_image_url||media.image_url;
      var credit=media.photographer?'Photo: '+media.photographer:'Database photo — species ID 7';
      if(media.licence) credit+=' · '+media.licence;
      var row=document.createElement('div');
      row.setAttribute('data-db-snake-photo','1');
      row.className='flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3';
      row.innerHTML='<div class="w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-slate-200 bg-white">'+snakeDbImageHtml(media)+'</div>'+
        '<div class="min-w-0 flex-1"><div class="font-display font-bold text-sm text-slate-900">Snake <span class="font-normal italic text-slate-400">/ Ular</span></div><div class="text-xs text-slate-500 mt-0.5">'+credit+'</div></div>'+
        '<a href="'+src+'" target="_blank" rel="noopener" class="shrink-0 text-forest-600 hover:text-forest-800 text-xs font-bold inline-flex items-center gap-1"><span data-en>View source</span><span data-bm>Lihat sumber</span> ↗</a>';
      photoList.appendChild(row); setLang(localStorage.getItem('owm-lang')||'en');
    });

    var heroPhotos=[
      ['Homepage background — Malayan Sun Bear','Latar halaman utama — Beruang Matahari Malaya','BirdPhotos.com · CC BY 3.0','https://commons.wikimedia.org/wiki/Special:FilePath/Malaysian_Sun_Bear.jpg?width=240','https://commons.wikimedia.org/wiki/File:Malaysian_Sun_Bear.jpg'],
      ['Homepage background — Malayan Tapir','Latar halaman utama — Tapir Malaya','Just chaos · CC BY 2.0','https://commons.wikimedia.org/wiki/Special:FilePath/Malayan_Tapir4.jpg?width=240','https://commons.wikimedia.org/wiki/File:Malayan_Tapir4.jpg'],
      ['Homepage background — Rhinoceros Hornbill','Latar halaman utama — Enggang Badak','abzahri · CC BY 2.0','https://commons.wikimedia.org/wiki/Special:FilePath/Buceros_rhinoceros_-Kuala_Lumpur_Bird_Park%2C_Malaysia-8a_%282%29.jpg?width=240','https://commons.wikimedia.org/wiki/File:Buceros_rhinoceros_-Kuala_Lumpur_Bird_Park,_Malaysia-8a_(2).jpg']
    ];
    heroPhotos.forEach(function(x){
      var row=document.createElement('div'); row.setAttribute('data-home-hero-source','1');
      row.className='flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3';
      row.innerHTML='<div class="w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-slate-200 bg-white"><img src="'+x[3]+'" alt="" class="w-full h-full object-cover"></div>'+
        '<div class="min-w-0 flex-1"><div class="font-display font-bold text-sm text-slate-900"><span data-en>'+x[0]+'</span><span data-bm>'+x[1]+'</span></div><div class="text-xs text-slate-500 mt-0.5">'+x[2]+'</div></div>'+
        '<a href="'+x[4]+'" target="_blank" rel="noopener" class="shrink-0 text-forest-600 hover:text-forest-800 text-xs font-bold inline-flex items-center gap-1"><span data-en>View source</span><span data-bm>Lihat sumber</span> ↗</a>';
      photoList.appendChild(row);
    });
  }

  var body = document.getElementById('about_actionSourceBody');"""
assert old in s, 'about body anchor missing'
s = s.replace(old, new, 1)

p.write_text(s, encoding='utf-8')
print('patched', p.stat().st_size, 'bytes')
