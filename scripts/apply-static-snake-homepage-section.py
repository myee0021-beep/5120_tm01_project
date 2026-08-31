from pathlib import Path
import re

p = Path('public/index.html')
s = p.read_text(encoding='utf-8')

# 1) Replace DB-backed snake helpers with a static repository asset.
s = re.sub(
    r'/\* DB_SNAKE_PHOTO_V2 \*/.*?function init_home\(\) \{',
    '''/* STATIC_SNAKE_PHOTO_V3 */
var STATIC_SNAKE_PHOTO = '/assets/naja-sumatrana.jpg';
var STATIC_SNAKE_SOURCE = 'https://www.inaturalist.org/taxa/106451-Naja-sumatrana';
function snakeStaticImageHtml() {
  return '<img src="' + STATIC_SNAKE_PHOTO + '" alt="Snake" class="w-full h-full object-cover">';
}
function init_home() {''',
    s,
    count=1,
    flags=re.S,
)

# 2) Make the normal dropdown renderer use the static snake image.
old = '''  function animalThumbHtml(a) {
    if (a.photo && a.photo.dataUri) {'''
new = '''  function animalThumbHtml(a) {
    if (a.id === 'snake') {
      return snakeStaticImageHtml();
    }
    if (a.photo && a.photo.dataUri) {'''
if old not in s:
    raise SystemExit('animalThumbHtml anchor missing')
s = s.replace(old, new, 1)

# Selected thumbnail should simply use the same thumbHtml produced above.
s = re.sub(
    r"\s*var selectedThumbHtml=\(a\.id==='snake'&&window\.DB_SNAKE_MEDIA\)\?snakeDbImageHtml\(window\.DB_SNAKE_MEDIA\):thumbHtml;\s*animalBtnThumb\.innerHTML = selectedThumbHtml;",
    "\n      animalBtnThumb.innerHTML = thumbHtml;",
    s,
    count=1,
)

# Remove the now-obsolete async DB replacement block from Home.
s = re.sub(
    r"\n\s*getSnakeDbMedia\(\)\.then\(function\(media\)\{.*?\n\s*\}\);\n\n\s*var generalSpecies",
    "\n\n  var generalSpecies",
    s,
    count=1,
    flags=re.S,
)

# 3) Add a separate Homepage backgrounds card after Species photos.
if 'id="about_homepagePhotoList"' not in s:
    marker = '''    <div id="about_photoList" class="mt-6 space-y-2.5"></div>
  </div>

  <!-- ===================== SAFETY & PREVENTION SOURCES ===================== -->'''
    replacement = '''    <div id="about_photoList" class="mt-6 space-y-2.5"></div>
  </div>

  <!-- ===================== HOMEPAGE BACKGROUNDS ===================== -->
  <div class="mt-4 rounded-3xl reveal bg-white shadow-[0_30px_80px_-30px_rgba(15,23,42,0.12)] p-7 md:p-9">
    <h2 class="font-display text-xl font-bold tracking-tight text-slate-900">
      <span data-en>Homepage backgrounds</span><span data-bm>Latar halaman utama</span>
    </h2>
    <p class="mt-2 text-sm text-slate-500 max-w-2xl">
      <span data-en>Background images used on the Home page are listed separately here with their licence and original source.</span>
      <span data-bm>Imej latar yang digunakan pada halaman utama disenaraikan secara berasingan di sini bersama lesen dan sumber asal.</span>
    </p>
    <div id="about_homepagePhotoList" class="mt-6 space-y-2.5"></div>
  </div>

  <!-- ===================== SAFETY & PREVENTION SOURCES ===================== -->'''
    if marker not in s:
        raise SystemExit('species photo card anchor missing')
    s = s.replace(marker, replacement, 1)

# 4) Replace the old About block that mixed DB snake + homepage backgrounds into species list.
start = s.find('  if(photoList){\n    getSnakeDbMedia().then(function(media){')
end = s.find('\n\n  var body = document.getElementById(\'about_actionSourceBody\');', start)
if start == -1 or end == -1:
    raise SystemExit('old mixed About photo block missing')

about_block = '''  if (photoList && !photoList.querySelector('[data-static-snake-photo="1"]')) {
    var snakeRow = document.createElement('div');
    snakeRow.setAttribute('data-static-snake-photo', '1');
    snakeRow.className = 'flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3';
    snakeRow.innerHTML =
      '<div class="w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-slate-200 bg-white">' + snakeStaticImageHtml() + '</div>' +
      '<div class="min-w-0 flex-1">' +
        '<div class="font-display font-bold text-sm text-slate-900">Snake <span class="font-normal italic text-slate-400">/ Ular</span></div>' +
        '<div class="text-xs text-slate-500 mt-0.5"><i>Naja sumatrana</i> · iNaturalist</div>' +
      '</div>' +
      '<a href="' + STATIC_SNAKE_SOURCE + '" target="_blank" rel="noopener" class="shrink-0 text-forest-600 hover:text-forest-800 text-xs font-bold inline-flex items-center gap-1">' +
        '<span data-en>View source</span><span data-bm>Lihat sumber</span> ↗' +
      '</a>';
    photoList.appendChild(snakeRow);
  }

  var homepagePhotoList = document.getElementById('about_homepagePhotoList');
  if (homepagePhotoList) {
    homepagePhotoList.innerHTML = '';
    var heroPhotos = [
      ['Homepage background — Malayan Sun Bear','Latar halaman utama — Beruang Matahari Malaya','BirdPhotos.com · CC BY 3.0','https://commons.wikimedia.org/wiki/Special:FilePath/Malaysian_Sun_Bear.jpg?width=240','https://commons.wikimedia.org/wiki/File:Malaysian_Sun_Bear.jpg'],
      ['Homepage background — Malayan Tapir','Latar halaman utama — Tapir Malaya','Just chaos · CC BY 2.0','https://commons.wikimedia.org/wiki/Special:FilePath/Malayan_Tapir4.jpg?width=240','https://commons.wikimedia.org/wiki/File:Malayan_Tapir4.jpg'],
      ['Homepage background — Rhinoceros Hornbill','Latar halaman utama — Enggang Badak','abzahri · CC BY 2.0','https://commons.wikimedia.org/wiki/Special:FilePath/Buceros_rhinoceros_-Kuala_Lumpur_Bird_Park%2C_Malaysia-8a_%282%29.jpg?width=240','https://commons.wikimedia.org/wiki/File:Buceros_rhinoceros_-Kuala_Lumpur_Bird_Park,_Malaysia-8a_(2).jpg']
    ];
    heroPhotos.forEach(function(x){
      var row = document.createElement('div');
      row.className = 'flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3';
      row.innerHTML = '<div class="w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-slate-200 bg-white"><img src="'+x[3]+'" alt="" class="w-full h-full object-cover"></div>' +
        '<div class="min-w-0 flex-1"><div class="font-display font-bold text-sm text-slate-900"><span data-en>'+x[0]+'</span><span data-bm>'+x[1]+'</span></div><div class="text-xs text-slate-500 mt-0.5">'+x[2]+'</div></div>' +
        '<a href="'+x[4]+'" target="_blank" rel="noopener" class="shrink-0 text-forest-600 hover:text-forest-800 text-xs font-bold inline-flex items-center gap-1"><span data-en>View source</span><span data-bm>Lihat sumber</span> ↗</a>';
      homepagePhotoList.appendChild(row);
    });
  }'''
s = s[:start] + about_block + s[end:]

p.write_text(s, encoding='utf-8')
print('patched index bytes:', p.stat().st_size)
