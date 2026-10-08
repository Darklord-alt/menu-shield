(function () {
  'use strict';

  var state = { image: null, allergens: [], result: null, scanning: false };
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
    byId('allergen-count').textContent = state.allergens.length ? state.allergens.length + ' allergen' + (state.allergens.length === 1 ? '' : 's') + ' selected — all included in the scan' : 'No allergens selected';
    document.querySelectorAll('[data-add]').forEach(function (button) {
      button.checked = state.allergens.indexOf(button.dataset.add) !== -1;
    });
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
    String(value || '').split(/[,;\n]/).forEach(function (item) {
      var cleaned = item.trim().toLowerCase();
      if (cleaned && cleaned.length <= 80 && state.allergens.indexOf(cleaned) === -1 && state.allergens.length < 20) state.allergens.push(cleaned);
    });
    byId('allergen-input').value = '';
    renderAllergens(); renderScanButton();
  }

  function renderScanButton() {
    byId('scan-button').disabled = state.scanning || !state.image || !state.allergens.length;
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
      var decoded = new Image();
      decoded.onload = function () {
      var scale = Math.min(1, 2560 / Math.max(decoded.width, decoded.height));
      var canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(decoded.width * scale));
      canvas.height = Math.max(1, Math.round(decoded.height * scale));
      var context = canvas.getContext('2d');
      context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(decoded, 0, 0, canvas.width, canvas.height);
      state.image = scale === 1 && file.size <= 2 * 1024 * 1024 ? reader.result : canvas.toDataURL('image/jpeg', 0.94);
      byId('image-preview').src = state.image;
      byId('image-preview').hidden = false;
      byId('upload-prompt').hidden = true;
      byId('remove-image').hidden = false;
      setStatus(''); renderScanButton();
      };
      decoded.onerror = function () { setStatus('This image could not be opened. Try a JPG or PNG.', 'error'); };
      decoded.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  function relevantMatches(dish) {
    return (dish.matches || []).filter(function (match) {
      return match.risk === 'likely' || match.risk === 'possible';
    });
  }

  function renderResult(result, scannedAllergens) {
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
    var allergens = scannedAllergens || [];
    var namedAllergens = allergens.map(titleCase).join(' and ');
    byId('staff-introduction').textContent = 'Start with: “I need to avoid ' + (namedAllergens || 'these allergens') + '. Could you check with the kitchen before I order?”';
    var questions = flagged.slice(0, 4).map(function (dish) {
      var names = relevantMatches(dish).map(function (match) { return match.allergen; }).filter(function (name, index, list) { return list.indexOf(name) === index; });
      return 'For ' + dish.name + ', can the kitchen confirm whether the full recipe contains ' + names.join(' or ') + ', including sauces, garnishes and substitutions?';
    });
    questions.push('Could you check ingredient labels for ' + (namedAllergens || 'my allergens') + ', including sauces, dressings and cooking oils?');
    questions.push('Are utensils, preparation surfaces, grills or fryers shared with foods containing ' + (namedAllergens || 'my allergens') + '? How do you prevent cross-contact?');
    questions.push('If a dish cannot be prepared to meet my allergy needs, can the chef suggest another option and confirm its ingredients and preparation?');
    byId('staff-question-list').innerHTML = questions.map(function (question) { return '<li>' + escapeHtml(question) + '</li>'; }).join('');
    byId('results').hidden = false;
    byId('results').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function scanMenu() {
    if (!state.scanning && byId('allergen-input').value.trim()) addAllergen(byId('allergen-input').value);
    if (state.scanning || !state.image || !state.allergens.length) return;
    state.scanning = true;
    var scannedAllergens = state.allergens.slice();
    byId('results').hidden = true;
    var button = byId('scan-button');
    button.disabled = true; button.innerHTML = 'Reading menu <span class="spinner" aria-hidden="true"></span>';
    setStatus('Scanning the menu text… This can take up to two minutes.');
    var slowTimer = setTimeout(function () { setStatus('Still reading the photo… Large menus take longer. Keep this page open.'); }, 30000);
    try {
      var response = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image: state.image, allergens: scannedAllergens }) });
      var payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'The menu could not be scanned.');
      renderResult(payload, scannedAllergens); setStatus('');
    } catch (error) {
      setStatus(error.message, 'error');
    } finally {
      clearTimeout(slowTimer); state.scanning = false;
      button.textContent = 'Scan menu →'; renderScanButton();
    }
  }

  byId('allergen-form').addEventListener('submit', function (event) { event.preventDefault(); addAllergen(byId('allergen-input').value); });
  document.querySelectorAll('[data-add]').forEach(function (button) { button.addEventListener('change', function () {
    if (!button.checked) {
      state.allergens = state.allergens.filter(function (item) { return item !== button.dataset.add; });
      renderAllergens(); renderScanButton();
    } else addAllergen(button.dataset.add);
  }); });
  byId('menu-image').addEventListener('change', function (event) { loadImage(event.target.files[0]); });
  byId('remove-image').addEventListener('click', clearImage);
  byId('scan-button').addEventListener('click', scanMenu);
  byId('demo-button').addEventListener('click', function () { renderResult(DEMO_RESULT, ['tree nuts', 'milk', 'wheat']); setStatus('Showing sample results — no photo was uploaded.'); });
  byId('new-scan').addEventListener('click', function () { byId('results').hidden = true; byId('menu-image').focus(); });
  byId('drop-zone').addEventListener('dragover', function (event) { event.preventDefault(); byId('drop-zone').classList.add('dragging'); });
  byId('drop-zone').addEventListener('dragleave', function () { byId('drop-zone').classList.remove('dragging'); });
  byId('drop-zone').addEventListener('drop', function (event) { event.preventDefault(); byId('drop-zone').classList.remove('dragging'); loadImage(event.dataTransfer.files[0]); });
  renderAllergens();
}());
