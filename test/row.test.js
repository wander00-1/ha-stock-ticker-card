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

// ── day range / volume stats line ─────────────────────────────────────────────

test('buildRow: shows day range and volume when both are present in meta', () => {
  const hass = makeHass('sensor.dro', {
    meta: { regularMarketDayHigh: 2.175, regularMarketDayLow: 2.04, regularMarketVolume: 3245600 },
  });
  const html = buildRow({ entity: 'sensor.dro' }, 0, hass, false, false);
  assert.match(html, /stock-stats/);
  assert.match(html, /Day \$2\.040–\$2\.175/);
  assert.match(html, /Vol 3\.2M/);
});

test('buildRow: omits the stats line entirely when day range/volume are absent', () => {
  const hass = makeHass('sensor.dro', { meta: {} });
  const html = buildRow({ entity: 'sensor.dro' }, 0, hass, false, false);
  assert.doesNotMatch(html, /stock-stats/);
});

// ── holding line for shares with no purchase price ───────────────────────────

test('buildRow: shares with a purchase price show the full "N sh @ $price" line', () => {
  const hass = makeHass('sensor.dro', { state: '2.08' });
  const html = buildRow({ entity: 'sensor.dro', shares: 17, purchase_price: 2.04 }, 0, hass, false, false);
  assert.match(html, /stock-holding">17 sh @ \$2\.040</);
});

test('buildRow: shares with no purchase price show just the share count, not "N sh @ —"', () => {
  const hass = makeHass('sensor.dro', { state: '2.08' });
  const html = buildRow({ entity: 'sensor.dro', shares: 17 }, 0, hass, false, false);
  assert.match(html, /stock-holding">17</);
  assert.doesNotMatch(html, /sh @/);
  assert.doesNotMatch(html, /—/);
});
