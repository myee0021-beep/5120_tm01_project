(function () {
  function sessionId() {
    try {
      var key = 'room_for_both_session_id';
      var existing = sessionStorage.getItem(key);
      if (existing) return existing;
      var value = (crypto && crypto.randomUUID) ? crypto.randomUUID() : ('s_' + Date.now() + '_' + Math.random().toString(36).slice(2));
      sessionStorage.setItem(key, value);
      return value;
    } catch (e) {
      return 'session_' + Date.now();
    }
  }

  function appValue(name) {
    try {
      return (window.APP && window.APP[name]) || null;
    } catch (e) {
      return null;
    }
  }

  function track(eventType, metadata) {
    var payload = {
      sessionId: sessionId(),
      eventType: eventType,
      page: appValue('currentPage') || location.hash || 'home',
      speciesId: appValue('speciesId'),
      stateId: appValue('stateId'),
      language: document.documentElement.lang || 'en',
      metadata: metadata || {}
    };

    fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true
    }).catch(function (err) {
      console.warn('[Room for Both] backend event save failed:', err && err.message ? err.message : err);
    });
  }

  window.RoomForBothBackend = {
    track: track,
    health: function () {
      return fetch('/api/health').then(function (r) { return r.json(); });
    }
  };

  window.addEventListener('DOMContentLoaded', function () {
    track('page_view');

    document.addEventListener('click', function (event) {
      var target = event.target && event.target.closest ? event.target.closest('button, a, [data-species-id], [data-snake-answer]') : null;
      if (!target) return;

      var label = (target.innerText || target.getAttribute('aria-label') || target.id || '').trim().replace(/\s+/g, ' ').slice(0, 120);
      var metadata = {
        element_id: target.id || null,
        label: label || null,
        href: target.getAttribute('href') || null,
        species_id: target.getAttribute('data-species-id') || null,
        snake_answer: target.getAttribute('data-snake-answer') || null
      };
      track('click', metadata);
    }, true);

    document.addEventListener('change', function (event) {
      var target = event.target;
      if (!target || !target.matches || !target.matches('select, input[type="checkbox"], input[type="radio"]')) return;
      track('input_change', {
        element_id: target.id || null,
        name: target.name || null,
        value: target.type === 'checkbox' ? !!target.checked : String(target.value || '').slice(0, 120)
      });
    }, true);
  });
})();
