'use strict';

var assert = require('node:assert/strict');
var createServer = require('../server').createServer;

async function run() {
  var server = createServer();
  try {
    await new Promise(function (resolve) { server.listen(0, '127.0.0.1', resolve); });
    var baseUrl = 'http://127.0.0.1:' + server.address().port;

    var health = await fetch(baseUrl + '/api/health');
    assert.equal(health.status, 200);
    assert.equal(typeof (await health.json()).configured, 'boolean');

    var home = await fetch(baseUrl + '/');
    var page = await home.text();
    assert.equal(home.status, 200);
    assert.match(page, /Menu Shield/);
    assert.match(page, /Try the demo menu/);

    var invalidImage = await fetch(baseUrl + '/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: 'not-an-image', allergens: ['milk'] })
    });
    assert.equal(invalidImage.status, 400);
    assert.deepEqual(await invalidImage.json(), { error: 'Please upload a PNG, JPG, or WebP menu image.' });

    console.log('Smoke checks passed: health endpoint, page delivery, and input validation.');
  } finally {
    await new Promise(function (resolve) { server.close(resolve); });
  }
}

run().catch(function (error) {
  console.error(error);
  process.exitCode = 1;
});
