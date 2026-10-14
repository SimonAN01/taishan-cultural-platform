import test from 'node:test';
import assert from 'node:assert/strict';
import { places, routes, summitPaths } from '../src/home-data.js';

test('homepage exposes the four requested routes', () => {
  assert.deepEqual(routes.map(route => route.id), ['hongmen', 'tianwai', 'taohua', 'dongyu']);
});

test('every route node resolves to a landmark', () => {
  for (const route of routes) {
    assert.ok(route.nodes.length >= 8, `${route.name} should retain its full itinerary`);
    for (const id of route.nodes) assert.ok(places[id], `${route.name} references missing place ${id}`);
  }
});

test('summit branches connect South Gate to the two summit destinations', () => {
  assert.deepEqual(summitPaths[0][0], [52.6, 37.4]);
  assert.deepEqual(summitPaths[0].at(-1), [51.4, 15.3]);
  assert.deepEqual(summitPaths[1].at(-1), [78.3, 30]);
});

test('every landmark with close-up artwork opens an immersive scene', () => {
  const illustratedPlaces = Object.values(places).filter(place => place.asset);

  assert.equal(illustratedPlaces.length, 14);
  for (const place of illustratedPlaces) {
    assert.equal(place.immersive, true, `${place.name} should open an immersive close-up`);
  }
});

test('Tianjie and Taohuayuan expose the new two-level scenic journeys', () => {
  assert.equal(places.tianjie.immersive, true);
  assert.equal(places.tianjie.asset, 'H-ND-05-gate');
  assert.equal(places.taoyuan.immersive, true);
  assert.equal(places.taoyuan.asset, 'H-ND-13-station');
});

test('Tianjie, Taohuayuan and East Gate expose panorama landmark icons', () => {
  assert.equal(places.tianjie.mapIcon.asset, 'H-ND-05-gate');
  assert.equal(places.taoyuan.mapIcon.asset, 'H-ND-13-station');
  assert.equal(places.dongtian.mapIcon.asset, 'H-ND-14');
});
