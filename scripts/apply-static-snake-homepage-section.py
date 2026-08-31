from pathlib import Path
import re

p = Path('public/index.html')
s = p.read_text(encoding='utf-8')

# Static snake/photo separation may already be installed by the previous run.
# Only apply that migration when the old DB-backed marker is still present.
if '/* STATIC_SNAKE_PHOTO_V3 */' not in s and '/* DB_SNAKE_PHOTO_V2 */' in s:
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

    old = '''  function animalThumbHtml(a) {
    if (a.photo && a.photo.dataUri) {'''
    new = '''  function animalThumbHtml(a) {
    if (a.id === 'snake') {
      return snakeStaticImageHtml();
    }
    if (a.photo && a.photo.dataUri) {'''
    if old in s:
        s = s.replace(old, new, 1)

    s = re.sub(
        r"\s*var selectedThumbHtml=\(a\.id==='snake'&&window\.DB_SNAKE_MEDIA\)\?snakeDbImageHtml\(window\.DB_SNAKE_MEDIA\):thumbHtml;\s*animalBtnThumb\.innerHTML = selectedThumbHtml;",
        "\n      animalBtnThumb.innerHTML = thumbHtml;",
        s,
        count=1,
    )
    s = re.sub(
        r"\n\s*getSnakeDbMedia\(\)\.then\(function\(media\)\{.*?\n\s*\}\);\n\n\s*var generalSpecies",
        "\n\n  var generalSpecies",
        s,
        count=1,
        flags=re.S,
    )

# Add source-tab controller once.
if 'function setAboutPhotoSourceTab(' not in s:
    anchor = 'function render_about() {'
    controller = '''function setAboutPhotoSourceTab(tab) {
  var speciesSection = document.getElementById('about_speciesPhotoSection');
  var homepageSection = document.getElementById('about_homepagePhotoSection');
  var speciesBtn = document.getElementById('about_speciesPhotoTab');
  var homepageBtn = document.getElementById('about_homepagePhotoTab');
  var showHomepage = tab === 'homepage';

  if (speciesSection) speciesSection.classList.toggle('hidden', showHomepage);
  if (homepageSection) homepageSection.classList.toggle('hidden', !showHomepage);

  if (speciesBtn) {
    speciesBtn.classList.toggle('bg-forest-950', !showHomepage);
    speciesBtn.classList.toggle('text-white', !showHomepage);
    speciesBtn.classList.toggle('bg-white', showHomepage);
    speciesBtn.classList.toggle('text-forest-700', showHomepage);
  }
  if (homepageBtn) {
    homepageBtn.classList.toggle('bg-forest-950', showHomepage);
    homepageBtn.classList.toggle('text-white', showHomepage);
    homepageBtn.classList.toggle('bg-white', !showHomepage);
    homepageBtn.classList.toggle('text-forest-700', !showHomepage);
  }
}

function render_about() {'''
    if anchor not in s:
        raise SystemExit('render_about anchor missing')
    s = s.replace(anchor, controller, 1)

# Add tab buttons immediately before Species photos and give both sections IDs.
if 'id="about_speciesPhotoTab"' not in s:
    marker = '''  <!-- ===================== SPECIES PHOTOS ===================== -->'''
    tabs = '''  <!-- ===================== PHOTO SOURCE TABS ===================== -->
  <div class="mt-4 flex flex-wrap gap-2 reveal" role="tablist" aria-label="Photo source categories">
    <button id="about_speciesPhotoTab" type="button" role="tab" onclick="setAboutPhotoSourceTab('species')" class="rounded-full border border-slate-200 bg-forest-950 text-white px-5 py-2.5 text-sm font-bold shadow-sm transition">
      <span data-en>Species photos</span><span data-bm>Foto spesies</span>
    </button>
    <button id="about_homepagePhotoTab" type="button" role="tab" onclick="setAboutPhotoSourceTab('homepage')" class="rounded-full border border-slate-200 bg-white text-forest-700 px-5 py-2.5 text-sm font-bold shadow-sm transition hover:bg-forest-50">
      <span data-en>Homepage backgrounds</span><span data-bm>Latar halaman utama</span>
    </button>
  </div>

  <!-- ===================== SPECIES PHOTOS ===================== -->'''
    if marker not in s:
        raise SystemExit('species photo marker missing')
    s = s.replace(marker, tabs, 1)

# Put IDs on the two cards and hide Homepage by default.
if 'id="about_speciesPhotoSection"' not in s:
    species_open = '''  <div class="mt-4 rounded-3xl reveal bg-white shadow-[0_30px_80px_-30px_rgba(15,23,42,0.12)] p-7 md:p-9">
    <h2 class="font-display text-xl font-bold tracking-tight text-slate-900">
      <span data-en>Species photos</span><span data-bm>Foto spesies</span>'''
    species_new = '''  <div id="about_speciesPhotoSection" class="mt-4 rounded-3xl reveal bg-white shadow-[0_30px_80px_-30px_rgba(15,23,42,0.12)] p-7 md:p-9">
    <h2 class="font-display text-xl font-bold tracking-tight text-slate-900">
      <span data-en>Species photos</span><span data-bm>Foto spesies</span>'''
    if species_open not in s:
        raise SystemExit('species card opening missing')
    s = s.replace(species_open, species_new, 1)

if 'id="about_homepagePhotoSection"' not in s:
    homepage_open = '''  <!-- ===================== HOMEPAGE BACKGROUNDS ===================== -->
  <div class="mt-4 rounded-3xl reveal bg-white shadow-[0_30px_80px_-30px_rgba(15,23,42,0.12)] p-7 md:p-9">'''
    homepage_new = '''  <!-- ===================== HOMEPAGE BACKGROUNDS ===================== -->
  <div id="about_homepagePhotoSection" class="hidden mt-4 rounded-3xl reveal bg-white shadow-[0_30px_80px_-30px_rgba(15,23,42,0.12)] p-7 md:p-9">'''
    if homepage_open not in s:
        raise SystemExit('homepage card opening missing')
    s = s.replace(homepage_open, homepage_new, 1)

# Home carousel credit should route into About and open the Homepage tab.
s = s.replace(
    "a.onclick=function(e){ if(e)e.preventDefault(); goTo('about'); return false; };",
    "a.onclick=function(e){ if(e)e.preventDefault(); goTo('about'); setTimeout(function(){ setAboutPhotoSourceTab('homepage'); }, 0); return false; };",
    1,
)

# Ensure About always starts on Species photos when entered from the normal nav.
if "setAboutPhotoSourceTab('species');\n  setLang" not in s:
    s = s.replace(
        "  setLang(localStorage.getItem('owm-lang') || 'en');\n}\n</script>\n\n<script>\n// ---- one-time bindings",
        "  setAboutPhotoSourceTab('species');\n  setLang(localStorage.getItem('owm-lang') || 'en');\n}\n</script>\n\n<script>\n// ---- one-time bindings",
        1,
    )

p.write_text(s, encoding='utf-8')
print('patched index bytes:', p.stat().st_size)
