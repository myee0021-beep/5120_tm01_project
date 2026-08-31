from pathlib import Path
import re

p = Path('public/index.html')
s = p.read_text(encoding='utf-8')

# 1) Step numbering: snake warning 0, identify 1, what-to-do 2,
# authority 3, keep-it-findable 4.
s = s.replace('Step 0 · Identification', 'Step 1 · Identification')
s = s.replace('Langkah 0 · Pengenalan', 'Langkah 1 · Pengenalan')
s = s.replace('Step 1 · Immediate Safety', 'Step 2 · Immediate Safety')
s = s.replace('Langkah 1 · Keselamatan Segera', 'Langkah 2 · Keselamatan Segera')
s = s.replace('Step 2 · Who to Contact', 'Step 3 · Who to Contact')
s = s.replace('Langkah 2 · Siapa Perlu Dihubungi', 'Langkah 3 · Siapa Perlu Dihubungi')
s = s.replace('Step 2 · Who deals with this', 'Step 3 · Who deals with this')
s = s.replace('Langkah 2 · Siapa Mengendalikannya', 'Langkah 3 · Siapa Mengendalikannya')
s = s.replace('Step 3 · During the Wait', 'Step 4 · During the Wait')
s = s.replace('Langkah 3 · Semasa Menunggu', 'Langkah 4 · Semasa Menunggu')

# Add an explicit Step 0 badge into the snake-warning gate when it exists.
if 'data-snake-step-label' not in s:
    anchor = "  // ---- AC 1.1.1 / 1.1.2 — snake gate ----\n"
    insert = """  // ---- Step 0 — snake safety gate ----
  var snakeGate = document.getElementById('id_snakeGate');
  if (snakeGate && !snakeGate.querySelector('[data-snake-step-label]')) {
    var snakeStepLabel = document.createElement('div');
    snakeStepLabel.setAttribute('data-snake-step-label', '1');
    snakeStepLabel.className = 'mb-4 inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide text-rose-700';
    snakeStepLabel.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span><span data-en>Step 0 · Snake safety check</span><span data-bm>Langkah 0 · Semakan keselamatan ular</span>';
    var gateInner = snakeGate.querySelector('.rounded-3xl, .bg-white') || snakeGate.firstElementChild || snakeGate;
    gateInner.insertBefore(snakeStepLabel, gateInner.firstChild);
  }

  // ---- AC 1.1.1 / 1.1.2 — snake gate ----
"""
    if anchor in s:
        s = s.replace(anchor, insert, 1)

# 2) Identify: include Snake in candidates, using the same static Naja image.
s = s.replace(
    "var ANIMALS = SPECIES.filter(function (a) { return a.id !== 'snake' && a.id !== 'general'; });",
    "var ANIMALS = SPECIES.filter(function (a) { return a.id !== 'general'; });",
    1,
)

old_thumb = """    var thumb = a.photo
      ? '<img src=\"' + a.photo.dataUri + '\" alt=\"' + a.en + '\" class=\"w-full h-full object-cover\">'
      : '<div style=\"transform:scale(0.55)\">' + (ICONS[a.icon] || ICONS.crow) + '</div>';"""
new_thumb = """    var isSnakeCandidate = a.id === 'snake';
    var thumb = isSnakeCandidate
      ? snakeStaticImageHtml()
      : (a.photo
          ? '<img src=\"' + a.photo.dataUri + '\" alt=\"' + a.en + '\" class=\"w-full h-full object-cover\">'
          : '<div style=\"transform:scale(0.55)\">' + (ICONS[a.icon] || ICONS.crow) + '</div>');"""
if old_thumb in s:
    s = s.replace(old_thumb, new_thumb, 1)

old_caption = """    var caption = a.photo
      ? (a.blurbEn
          ? '<span data-en>' + a.blurbEn + '</span><span data-bm>' + a.blurbBm + '</span>'
          : '<span data-en>' + a.photo.creditEn + '</span><span data-bm>' + a.photo.creditBm + '</span>')
      : '<span data-en>Placeholder photo — photographer &amp; licence pending</span><span data-bm>Foto sementara — jurugambar &amp; lesen belum ditetapkan</span>';"""
new_caption = """    var caption = isSnakeCandidate
      ? '<span data-en>Snake safety route — representative Naja sumatrana photo</span><span data-bm>Laluan keselamatan ular — foto wakil Naja sumatrana</span>'
      : (a.photo
          ? (a.blurbEn
              ? '<span data-en>' + a.blurbEn + '</span><span data-bm>' + a.blurbBm + '</span>'
              : '<span data-en>' + a.photo.creditEn + '</span><span data-bm>' + a.photo.creditBm + '</span>')
          : '<span data-en>Placeholder photo — photographer &amp; licence pending</span><span data-bm>Foto sementara — jurugambar &amp; lesen belum ditetapkan</span>');"""
if old_caption in s:
    s = s.replace(old_caption, new_caption, 1)

old_credit = """    var creditBadge = a.photo
      ? '<a href=\"#\" onclick=\"event.stopPropagation();goTo(\\'about\\');return false;\" title=\"' + a.photo.creditEn.replace(/\"/g, '&quot;') + '\" class=\"absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-black/55 hover:bg-black/75 transition-colors text-white text-[9px] font-bold flex items-center justify-center leading-none\">i</a>'
      : '';"""
new_credit = """    var creditBadge = isSnakeCandidate
      ? '<a href=\"#\" onclick=\"event.stopPropagation();goTo(\\'about\\');return false;\" title=\"Naja sumatrana · iNaturalist\" class=\"absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-black/55 hover:bg-black/75 transition-colors text-white text-[9px] font-bold flex items-center justify-center leading-none\">i</a>'
      : (a.photo
          ? '<a href=\"#\" onclick=\"event.stopPropagation();goTo(\\'about\\');return false;\" title=\"' + a.photo.creditEn.replace(/\"/g, '&quot;') + '\" class=\"absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-black/55 hover:bg-black/75 transition-colors text-white text-[9px] font-bold flex items-center justify-center leading-none\">i</a>'
          : '');"""
if old_credit in s:
    s = s.replace(old_credit, new_credit, 1)

# Confirm on a Snake candidate goes to the dedicated snake safety route.
old_confirm = """      '<a href=\"#\" onclick=\"goTo(&quot;whattodo&quot;,{id:&quot;' + a.id + '&quot;});return false;\" class=\"confirm-btn shrink-0 items-center gap-1.5 rounded-full bg-forest-950 hover:bg-black transition-colors text-white text-xs font-bold px-4 py-2\">' +"""
new_confirm = """      '<a href=\"#\" onclick=\"' + (isSnakeCandidate ? 'goTo(&quot;snakewhattodo&quot;);' : 'goTo(&quot;whattodo&quot;,{id:&quot;' + a.id + '&quot;});') + 'return false;\" class=\"confirm-btn shrink-0 items-center gap-1.5 rounded-full bg-forest-950 hover:bg-black transition-colors text-white text-xs font-bold px-4 py-2\">' +"""
if old_confirm in s:
    s = s.replace(old_confirm, new_confirm, 1)

# Snake keywords should now show the Snake candidate card on Identify rather
# than bypassing the Identify UI entirely.
s = s.replace(
    """    if (SNAKE_TERM_RE.test(text)) {
      grid.innerHTML = renderSnakeRedirectPrompt();
      document.getElementById('id_describeMatches').classList.remove('hidden');
      return;
    }""",
    """    if (SNAKE_TERM_RE.test(text)) {
      var snakeCandidate = SPECIES.filter(function (a) { return a.id === 'snake'; })[0];
      grid.innerHTML = snakeCandidate ? renderMatchCard(snakeCandidate) : renderSnakeRedirectPrompt();
      wireCardSelection(grid);
      document.getElementById('id_describeMatches').classList.remove('hidden');
      setLang(localStorage.getItem('owm-lang') || 'en');
      return;
    }""",
    1,
)
s = s.replace(
    """    if (f && SNAKE_TERM_RE.test(f)) {
      document.getElementById('id_keywordList').innerHTML = renderSnakeRedirectPrompt();
      return;
    }""",
    """    if (f && SNAKE_TERM_RE.test(f)) {
      var snakeCandidate = SPECIES.filter(function (a) { return a.id === 'snake'; })[0];
      var snakeList = document.getElementById('id_keywordList');
      snakeList.innerHTML = snakeCandidate ? renderMatchCard(snakeCandidate) : renderSnakeRedirectPrompt();
      wireCardSelection(snakeList);
      setLang(localStorage.getItem('owm-lang') || 'en');
      return;
    }""",
    1,
)

# 3) Species information: two bottom buttons, back to What to do now + Who deals with it.
old_species_cta = re.compile(
    r'''  <!-- ===================== CTA: What to do now ===================== -->\n  <div class="reveal mt-4 rounded-3xl bg-forest-950 relative overflow-hidden p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-6">.*?  </div>\n\n</main>''',
    re.S,
)
new_species_cta = '''  <!-- ===================== CTA: Continue guidance ===================== -->
  <div class="reveal mt-4 rounded-3xl bg-forest-950 relative overflow-hidden p-8 md:p-10">
    <div class="pointer-events-none absolute -top-16 -right-16 w-64 h-64 rounded-full bg-emerald-500/15 blur-3xl"></div>
    <div class="relative">
      <p class="text-xs font-bold uppercase tracking-wider text-emerald-300 mb-2">
        <span data-en>Continue your guidance</span><span data-bm>Teruskan panduan anda</span>
      </p>
      <h3 class="font-display text-2xl font-bold text-white max-w-xl">
        <span data-en>Go back to immediate actions, or check the responsible agency.</span>
        <span data-bm>Kembali ke tindakan segera, atau semak agensi yang bertanggungjawab.</span>
      </h3>
    </div>
    <div class="relative mt-6 flex flex-col sm:flex-row gap-3">
      <a id="sp_whatToDoBtn" href="#" onclick="goTo('whattodo');return false;" class="flex-1 inline-flex items-center justify-center gap-2.5 rounded-full bg-white/10 border border-white/20 hover:bg-white/15 transition-colors text-white font-bold px-7 py-4">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
        <span data-en>Back to what to do now</span><span data-bm>Kembali ke apa perlu dibuat</span>
      </a>
      <a id="sp_authorityBtn" href="#" onclick="goTo('authority');return false;" class="flex-1 inline-flex items-center justify-center gap-2.5 rounded-full bg-emerald-500 hover:bg-emerald-400 transition-colors text-forest-950 font-bold px-7 py-4">
        <span data-en>Who deals with it</span><span data-bm>Siapa mengendalikannya</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
      </a>
    </div>
  </div>

</main>'''
s, n = old_species_cta.subn(new_species_cta, s, count=1)
if n != 1:
    print('warning: species CTA block not replaced')

# 4) General guidance: give the left icon its own wildlife/compass glyph.
general_svg = '<svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 6.5c2.8 1.2 4.2 3.2 4.2 5.5 0 2.8-1.9 4.7-4.2 5.5-2.3-.8-4.2-2.7-4.2-5.5 0-2.3 1.4-4.3 4.2-5.5z"/><path d="M12 9v6"/><path d="m9.5 12 2.5 1.5 2.5-1.5"/><circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none"/></svg>'
s, n = re.subn(r"    general: '<svg[^\n]*?</svg>',", "    general: '" + general_svg + "',", s, count=1)
if n != 1:
    print('warning: general icon entry not replaced')

p.write_text(s, encoding='utf-8')
print('patched index bytes:', p.stat().st_size)
