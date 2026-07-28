'use strict';

const test   = require('node:test');
const assert = require('node:assert/strict');

const { buildRow } = require('../dist/ha-stock-ticker-card.js');

function makeHass(entityId, { state = '2.08', meta = {} } = {}) {
  return {
    states: {
      [entityId]: {
        state,
        attributes: { meta, timestamp: [], indicators: { quote: [{ close: [] }] } },
      },
    },
  };
}

test('buildRow: includes a company logo image keyed on the ticker when logos are enabled', () => {
  const hass = makeHass('sensor.dro', { meta: { symbol: 'DRO.AX' } });
  const html = buildRow({ entity: 'sensor.dro' }, 0, hass, false, true);
  assert.match(html, /stock-logo/);
  assert.match(html, /financialmodelingprep\.com\/image-stock\/DRO\.AX\.png/);
});

test('buildRow: omits the logo image when logos are disabled', () => {
  const hass = makeHass('sensor.dro', { meta: { symbol: 'DRO.AX' } });
  const html = buildRow({ entity: 'sensor.dro' }, 0, hass, false, false);
  assert.doesNotMatch(html, /stock-logo/);
});

test('buildRow: omits the logo image when there is no ticker to key it on', () => {
  const hass = makeHass('sensor.dro', { meta: {} });
  const html = buildRow({ entity: 'sensor.dro' }, 0, hass, false, true);
  assert.doesNotMatch(html, /stock-logo/);
});

test('buildRow: logo has an onerror handler so a 404 doesn\'t show a broken-image icon', () => {
  const hass = makeHass('sensor.dro', { meta: { symbol: 'DRO.AX' } });
  const html = buildRow({ entity: 'sensor.dro' }, 0, hass, false, true);
  assert.match(html, /onerror="this\.remove\(\)"/);
});
