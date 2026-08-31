from pathlib import Path
import re

p = Path('public/api-data.js')
s = p.read_text(encoding='utf-8')

# Add helpers that preserve every distinct database source for a species.
if 'function uniqueSourceRows(' not in s:
    anchor = '''  function sourceLinkHtml(row) {'''
    helper = '''  function uniqueSourceRows(rows) {
    var seen = {};
    return (rows || []).filter(function (row) {
      if (!row) return false;
      var key = [
        visibleText(row.source_url),
        visibleText(row.source_institution),
        visibleText(row.source_person),
        visibleText(row.date_verified)
      ].join('|');
      if (!key.replace(/\\|/g, '')) return false;
      if (seen[key]) return false;
      seen[key] = true;
      return true;
    });
  }

  function sourceLinksHtml(rows) {
    var unique = uniqueSourceRows(rows);
    if (!unique.length) return '<span class="text-slate-300">—</span>';
    return '<div class="space-y-1.5">' + unique.map(function (row) {
      return '<div>' + sourceLinkHtml(row) + '</div>';
    }).join('') + '</div>';
  }

  function sourceLinkHtml(row) {'''
    if anchor not in s:
        raise SystemExit('sourceLinkHtml anchor not found')
    s = s.replace(anchor, helper, 1)

# About the Data: aggregate ALL distinct immediate/prevention sources,
# instead of silently taking actions[0].
old = '''          var actionRow = (results[0].actions || [])[0] || null;
          var preventionRow = (results[1].actions || [])[0] || null;
          return { en: a.en, actionHtml: sourceLinkHtml(actionRow), preventionHtml: sourceLinkHtml(preventionRow) };'''
new = '''          var actionRows = results[0].actions || [];
          var preventionRows = results[1].actions || [];
          return {
            en: a.en,
            actionHtml: sourceLinksHtml(actionRows),
            preventionHtml: sourceLinksHtml(preventionRows)
          };'''
if old not in s:
    raise SystemExit('first-row About source logic not found')
s = s.replace(old, new, 1)

# Make DB rendering resilient to SPA navigation. The static page renderer can
# repaint fallback safetySteps after api-data.js has loaded; always re-apply
# the live DB section immediately after goTo() completes.
if 'function refreshCurrentDbPage(' not in s:
    anchor = '''  function installRenderHooks() {'''
    helper = '''  function refreshCurrentDbPage() {
    var page = '';
    try { page = (window.APP && window.APP.currentPage) || ''; } catch (e) {}

    if (page === 'whattodo') return renderImmediateActionsFromDb();
    if (page === 'findable') return renderBehaviourAndPreventionFromDb();
    if (page === 'about') return renderActionSourcesFromDb();
    return Promise.resolve(false);
  }

  function scheduleDbRefresh() {
    setTimeout(function () {
      Promise.resolve(window.RoomForBothDB && window.RoomForBothDB.ready)
        .then(refreshCurrentDbPage)
        .catch(function (err) {
          console.warn('[Room for Both] DB refresh after navigation failed.', err && err.message ? err.message : err);
        });
    }, 0);
  }

  function installRenderHooks() {'''
    if anchor not in s:
        raise SystemExit('installRenderHooks anchor not found')
    s = s.replace(anchor, helper, 1)

# Add goTo wrapper before installRenderHooks closes.
needle = '''    if (typeof window.render_about === 'function' && !window.render_about.__dbWrapped) {
      var originalAbout = window.render_about;
      window.render_about = function () {
        var result = originalAbout.apply(this, arguments);
        Promise.resolve(window.RoomForBothDB.ready).then(renderActionSourcesFromDb);
        return result;
      };
      window.render_about.__dbWrapped = true;
    }
  }
'''
replacement = '''    if (typeof window.render_about === 'function' && !window.render_about.__dbWrapped) {
      var originalAbout = window.render_about;
      window.render_about = function () {
        var result = originalAbout.apply(this, arguments);
        Promise.resolve(window.RoomForBothDB.ready).then(renderActionSourcesFromDb);
        return result;
      };
      window.render_about.__dbWrapped = true;
    }

    if (typeof window.goTo === 'function' && !window.goTo.__dbWrapped) {
      var originalGoTo = window.goTo;
      window.goTo = function () {
        var result = originalGoTo.apply(this, arguments);
        scheduleDbRefresh();
        return result;
      };
      window.goTo.__dbWrapped = true;
    }
  }
'''
if needle not in s:
    raise SystemExit('render_about/installRenderHooks block not found')
s = s.replace(needle, replacement, 1)

# Re-render once as soon as DB base data is ready as well, covering an already
# open What-to-do/About page after a hard refresh.
old = '''  installRenderHooks();
  window.addEventListener('DOMContentLoaded', installRenderHooks);
})();'''
new = '''  installRenderHooks();
  window.addEventListener('DOMContentLoaded', function () {
    installRenderHooks();
    scheduleDbRefresh();
  });
  window.addEventListener('roomforboth:db-ready', scheduleDbRefresh);
})();'''
if old not in s:
    raise SystemExit('api-data footer not found')
s = s.replace(old, new, 1)

p.write_text(s, encoding='utf-8')
print('patched api-data.js bytes:', p.stat().st_size)
