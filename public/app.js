(function () {
  'use strict';

  var state = { image: null, allergens: [], result: null };
  var DEMO_RESULT = {
    menu_title: 'Harbor & Hearth — Dinner',
    limitations: 'This demo uses a sample menu. In a real scan, confirm recipes, substitutions, fryer oil, and cross-contact procedures with restaurant staff.',
    dishes: [
      { name: 'Charred Broccolini', description: 'Lemon, chili, toasted almonds', uncertainty: 'low', matches: [{ allergen: 'tree nuts', evidence: '“toasted almonds” is listed in the dish description.', risk: 'likely' }] },
      { name: 'Crispy Fish Tacos', description: 'Cabbage slaw, crema, lime', uncertainty: 'medium', matches: [{ allergen: 'milk', evidence: '“crema” commonly contains dairy; the menu does not specify a dairy-free version.', risk: 'possible' }] },
      { name: 'Roasted Tomato Rigatoni', description: 'Basil, garlic, parmesan', uncertainty: 'low', matches: [{ allergen: 'milk', evidence: '“parmesan” is explicitly listed.', risk: 'likely' }, { allergen: 'wheat', evidence: 'Rigatoni is typically wheat pasta, but ask whether a gluten-free option is available.', risk: 'possible' }] },
      { name: 'Grilled Market Vegetables', description: 'Herb oil, sea salt', uncertainty: 'high', matches: [] }
    ]
  };

  function byId(id) { return document.getElementById(id); }
  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }
  function titleCase(value) { return value.replace(/\b\w/g, function (letter) { return letter.toUpperCase(); }); }
  function riskClass(risk) { return risk === 'likely' ? 'risk-likely' : risk === 'possible' ? 'risk-possible' : 'risk-neutral'; }

  function renderAllergens() {
    byId('allergen-chips').innerHTML = state.allergens.map(function (allergen) {
      return '<span class="chip">' + escapeHtml(titleCase(allergen)) + '<button type="button" data-remove="' + escapeHtml(allergen) + '" aria-label="Remove ' + escapeHtml(allergen) + '">×</button></span>';
    }).join('');
    byId('allergen-chips').querySelectorAll('[data-remove]').forEach(function (button) {
      button.addEventListener('click', function () {
        state.allergens = state.allergens.filter(function (item) { return item !== button.dataset.remove; });
        renderAllergens(); renderScanButton();
      });
    });
  }

  function addAllergen(value) {
    var cleaned = String(value || '').trim().toLowerCase();
    if (cleaned && state.allergens.indexOf(cleaned) === -1) state.allergens.push(cleaned);
    byId('allergen-input').value = '';
    renderAllergens(); renderScanButton();
  }

  function renderScanButton() {
    byId('scan-button').disabled = !state.image || !state.allergens.length;
  }

  function setStatus(message, kind) {
    var status = byId('scan-status');
    status.textContent = message || '';
    status.className = 'scan-status' + (kind ? ' ' + kind : '');
  }

  function clearImage() {
    state.image = null;
    byId('menu-image').value = '';
    byId('image-preview').hidden = true;
    byId('image-preview').removeAttribute('src');
    byId('upload-prompt').hidden = false;
    byId('remove-image').hidden = true;
    renderScanButton();
  }

  function loadImage(file) {
    if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) { setStatus('Choose a PNG, JPG, or WebP image.', 'error'); return; }
    if (file.size > 8 * 1024 * 1024) { setStatus('Choose an image smaller than 8 MB.', 'error'); return; }
    var reader = new FileReader();
    reader.onload = function () {
      state.image = reader.result;
      byId('image-preview').src = reader.result;
      byId('image-preview').hidden = false;
      byId('upload-prompt').hidden = true;
      byId('remove-image').hidden = false;
      setStatus(''); renderScanButton();
    };
    reader.readAsDataURL(file);
  }

  function relevantMatches(dish) {
    return (dish.matches || []).filter(function (match) {
      return match.risk === 'likely' || match.risk === 'possible';
    });
  }

  function renderResult(result) {
    state.result = result;
    var dishes = Array.isArray(result.dishes) ? result.dishes : [];
    var flagged = dishes.filter(function (dish) { return relevantMatches(dish).length; });
    byId('results-title').textContent = result.menu_title || 'Menu results';
    byId('results-limitations').textContent = result.limitations || 'Confirm recipes and cross-contact with restaurant staff.';
    byId('summary-bar').innerHTML = '<div><strong>' + dishes.length + '</strong><span>dishes read</span></div><div class="summary-alert"><strong>' + flagged.length + '</strong><span>need a staff check</span></div><div><strong>' + (dishes.length - flagged.length) + '</strong><span>with no stated match</span></div>';
    byId('dish-list').innerHTML = dishes.map(function (dish) {
      var matches = relevantMatches(dish);
      var matchHtml = matches.length ? matches.map(function (match) {
        return '<li class="' + riskClass(match.risk) + '"><span>' + escapeHtml(match.risk === 'likely' ? 'Likely match' : 'Possible match') + '</span><strong>' + escapeHtml(titleCase(match.allergen)) + '</strong><p>' + escapeHtml(match.evidence) + '</p></li>';
      }).join('') : '<li class="clear"><span>No stated match</span><p>No requested allergen was identified in the readable description. This is not a safety guarantee.</p></li>';
      return '<article class="dish ' + (matches.length ? 'dish-flagged' : '') + '"><div class="dish-title"><div><h3>' + escapeHtml(dish.name) + '</h3><p>' + escapeHtml(dish.description || 'No description readable') + '</p></div><span class="uncertainty">Text confidence: ' + escapeHtml(dish.uncertainty || 'unknown') + '</span></div><ul class="match-list">' + matchHtml + '</ul></article>';
    }).join('') || '<p class="empty-result">No dishes could be read. Try a brighter, straighter photo of the menu.</p>';
    byId('results').hidden = false;
    byId('results').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function scanMenu() {
    if (!state.image || !state.allergens.length) return;
    var button = byId('scan-button');
    button.disabled = true; button.innerHTML = 'Reading menu <span class="spinner" aria-hidden="true"></span>';
    setStatus('Scanning the menu text…');
    try {
      var response = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image: state.image, allergens: state.allergens }) });
      var payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'The menu could not be scanned.');
      renderResult(payload); setStatus('');
    } catch (error) {
      setStatus(error.message, 'error');
    } finally {
      button.textContent = 'Scan menu →'; renderScanButton();
    }
  }

  byId('allergen-form').addEventListener('submit', function (event) { event.preventDefault(); addAllergen(byId('allergen-input').value); });
  document.querySelectorAll('[data-add]').forEach(function (button) { button.addEventListener('click', function () { addAllergen(button.dataset.add); }); });
  byId('menu-image').addEventListener('change', function (event) { loadImage(event.target.files[0]); });
  byId('remove-image').addEventListener('click', clearImage);
  byId('scan-button').addEventListener('click', scanMenu);
  byId('demo-button').addEventListener('click', function () { renderResult(DEMO_RESULT); setStatus('Showing sample results — no photo was uploaded.'); });
  byId('new-scan').addEventListener('click', function () { byId('results').hidden = true; byId('menu-image').focus(); });
  byId('drop-zone').addEventListener('dragover', function (event) { event.preventDefault(); byId('drop-zone').classList.add('dragging'); });
  byId('drop-zone').addEventListener('dragleave', function () { byId('drop-zone').classList.remove('dragging'); });
  byId('drop-zone').addEventListener('drop', function (event) { event.preventDefault(); byId('drop-zone').classList.remove('dragging'); loadImage(event.dataTransfer.files[0]); });
}());
