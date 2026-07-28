'use strict';

const test   = require('node:test');
const assert = require('node:assert/strict');

const { buildRow, logoCache } = require('../dist/ha-stock-ticker-card.js');

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

test('buildRow: renders a placeholder slot (not yet cached) keyed on the ticker, never the remote URL directly', () => {
  const hass = makeHass('sensor.dro', { meta: { symbol: 'DRO.AX' } });
  const html = buildRow({ entity: 'sensor.dro' }, 0, hass, false, true);
  assert.match(html, /stock-logo-slot/);
  assert.match(html, /data-ticker="DRO\.AX"/);
  assert.doesNotMatch(html, /financialmodelingprep/, 'the remote URL must never be embedded directly - that would re-request it on every render');
});

test('buildRow: uses the cached data URI directly once a ticker has resolved, no remote URL involved', () => {
  logoCache.set('DRO.AX', 'data:image/png;base64,abc123');
  try {
    const hass = makeHass('sensor.dro', { meta: { symbol: 'DRO.AX' } });
    const html = buildRow({ entity: 'sensor.dro' }, 0, hass, false, true);
    assert.match(html, /<img class="stock-logo" src="data:image\/png;base64,abc123"/);
    assert.doesNotMatch(html, /financialmodelingprep/);
  } finally {
    logoCache.delete('DRO.AX');
  }
});

test('buildRow: renders nothing once a ticker is confirmed to have no logo (cached as null)', () => {
  logoCache.set('ZZZZ.AX', null);
  try {
    const hass = makeHass('sensor.zzz', { meta: { symbol: 'ZZZZ.AX' } });
    const html = buildRow({ entity: 'sensor.zzz' }, 0, hass, false, true);
    assert.doesNotMatch(html, /stock-logo/);
  } finally {
    logoCache.delete('ZZZZ.AX');
  }
});

test('buildRow: omits the logo entirely when logos are disabled', () => {
  const hass = makeHass('sensor.dro', { meta: { symbol: 'DRO.AX' } });
  const html = buildRow({ entity: 'sensor.dro' }, 0, hass, false, false);
  assert.doesNotMatch(html, /stock-logo/);
});

test('buildRow: omits the logo when there is no ticker to key it on', () => {
  const hass = makeHass('sensor.dro', { meta: {} });
  const html = buildRow({ entity: 'sensor.dro' }, 0, hass, false, true);
  assert.doesNotMatch(html, /stock-logo/);
});
