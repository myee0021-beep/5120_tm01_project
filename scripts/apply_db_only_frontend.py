from pathlib import Path
import re

INDEX = Path('public/index.html')
html = INDEX.read_text(encoding='utf-8')
original = html

# 1) Remove the legacy embedded business dataset in one block.
start_marker = '// EPIC 4 / AC 4.1.1'
start = html.find(start_marker)
icons = html.find('  var ICONS = {', start if start >= 0 else 0)
if start >= 0 and icons > start:
    replacement = '''// Business data is loaded from Neon through /api/* by /api-data.js.
// There is intentionally no embedded species/state/authority/action/media fallback.
var AUTHORITY_TABLE = {};
var SPECIES = [];
var STATES = [];

function getSpecies(id) {
  return SPECIES.find(function (s) { return s.id === id; }) ||
    SPECIES.find(function (s) { return s.id === 'general'; });
}
function getState(id) {
  return STATES.find(function (s) { return s.id === id; }) || null;
}
function getTopSpeciesForState() { return []; }

'''
    html = html[:start] + replacement + html[icons:]

# 2) Home state selector: remove embedded Malaysian state rows. Neon repopulates it.
def clean_home_state(match):
    opening, body, closing = match.group(1), match.group(2), match.group(3)
    return opening + '''\n            <option value="" data-en>Select state…</option>\n            <option value="" data-bm>Pilih negeri…</option>\n          ''' + closing

html = re.sub(
    r'(<select\s+id="home_stateSelect"[^>]*>)(.*?)(</select>)',
    clean_home_state,
    html,
    count=1,
    flags=re.S,
)

# 3) Replace the old immediate startup with database-first startup.
old_boot = re.compile(
    r'<script>\s*// ---- one-time bindings[\s\S]*?goTo\(\'home\'\);\s*</script>',
    re.M,
)
new_boot = '''<script src="/api-data.js"></script>
<script src="/v12-ui.js"></script>
<script>
// Iteration 1 V1.2 boots only after verified Neon business data is available.
setLang(localStorage.getItem('owm-lang') || 'en');
RoomForBothDB.ready.then(function () {
  if (window.RoomForBothV12) RoomForBothV12.prepare();
  init_home();
  init_identify();
  RoomForBothDB.installRenderHooks();
  goTo('home');
}).catch(function (err) {
  console.error('Verified database content could not be loaded.', err);
  var home = document.getElementById('page-home');
  if (home) home.classList.remove('hidden');
});
</script>'''

if old_boot.search(html):
    html = old_boot.sub(new_boot, html, count=1)
elif '/api-data.js' not in html:
    html = html.replace('</body>', new_boot + '\n</body>')

# 4) Make the V1.2 source intent explicit. UI text/layout stays in HTML;
# all content defined by the project ERD is loaded from Neon.
html = html.replace(
    '<body class="bg-sand-50 text-forest-950 antialiased">',
    '<body class="bg-sand-50 text-forest-950 antialiased" data-business-source="neon">',
    1,
)

# Safety check: the production source must not retain the known legacy objects.
for forbidden in ('safetySteps:', 'checklist:', 'data:image/jpeg;base64'):
    if forbidden in html:
        raise SystemExit(f'Legacy business fallback still present: {forbidden}')

INDEX.write_text(html, encoding='utf-8')
print('public/index.html updated' if html != original else 'public/index.html already DB-only')
