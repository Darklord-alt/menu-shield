'use strict';

var assert = require('node:assert/strict');
var serverModule = require('../server');
var createServer = serverModule.createServer;

async function run() {
  var assessment = serverModule.completeAssessments({dishes:Array.from({length:13}, function (_, index) { return {name:'Item ' + index,matches:[{allergen:'Milk',risk:'possible',evidence:'Ask about recipe'}]}; })}, ['milk','egg']);
  assert.equal(assessment.dishes.length, 13);
  assessment.dishes.forEach(function (dish) { assert.equal(dish.matches.length, 2); assert.equal(dish.matches[1].allergen, 'egg'); assert.equal(dish.matches[1].risk, 'unknown'); });
  assert.equal(assessment.coverage_verified, false);
  assert.throws(function () { serverModule.validateAnalysis({menu_title:'Menu', limitations:'Ask staff', dishes:[{name:'Pasta'}]}); }, /incomplete dish/);
  assert.throws(function () { serverModule.parseAnalysis('{"dishes":['); });
  assert.throws(function () { serverModule.validateAnalysis({menu_title:'Menu',limitations:'Ask staff',dishes:[{name:'Pasta',description:'cheese',uncertainty:'low',matches:[{allergen:'milk',evidence:'cheese',risk:'safe'}]}]}); }, /invalid allergen/);
  assert.deepEqual(serverModule.parseAnalysis('Here are the results:\n```json\n{"menu_title":"Sample","dishes":[],"limitations":"Confirm with staff."}\n```'), {
    menu_title: 'Sample', dishes: [], limitations: 'Confirm with staff.'
  });

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
