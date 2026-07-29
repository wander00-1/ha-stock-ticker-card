'use strict';

const test   = require('node:test');
const assert = require('node:assert/strict');

const { readStockData, buildBackContent } = require('../dist/ha-stock-ticker-card.js');

function makeHass(entityId, { state = '2.08', meta = {} } = {}, timestamps = [1, 2, 3], closes = [2.0, 2.05, 2.1]) {
  return {
    states: {
      [entityId]: {
        state,
        attributes: { meta, timestamp: timestamps, indicators: { quote: [{ close: closes }] } },
      },
    },
  };
}

test('buildBackContent: includes the stock symbol so the chart identifies which stock it is', () => {
  const hass = makeHass('sensor.dro', { meta: { symbol: 'DRO.AX', previousClose: 2.0 } });
  const d = readStockData({ entity: 'sensor.dro' }, hass);
  const html = buildBackContent(d);
  assert.match(html, /chart-symbol">DRO\.AX</);
});

test('buildBackContent: shows a colour-coded trend badge matching the daily change direction', () => {
  const hass = makeHass('sensor.dro', { meta: { symbol: 'DRO.AX', previousClose: 2.0 } });
  const d = readStockData({ entity: 'sensor.dro' }, hass);
  const html = buildBackContent(d);
  assert.match(html, /stock-change up/);
});

test('buildBackContent: passes the purchase price through to the chart when holding info is set', () => {
  const hass = makeHass('sensor.dro', { meta: { symbol: 'DRO.AX', previousClose: 2.0 } });
  const d = readStockData({ entity: 'sensor.dro', shares: 250, purchase_price: 1.85 }, hass);
  const html = buildBackContent(d);
  assert.match(html, /--primary-color/, 'expected the purchase-price reference line to be drawn');
  assert.match(html, /Your price \$1\.850/);
});

test('buildBackContent: no purchase-price line or "Your price" text for a watchlist-only stock', () => {
  const hass = makeHass('sensor.dro', { meta: { symbol: 'DRO.AX', previousClose: 2.0 } });
  const d = readStockData({ entity: 'sensor.dro' }, hass);
  const html = buildBackContent(d);
  assert.doesNotMatch(html, /--primary-color/);
  assert.doesNotMatch(html, /Your price/);
});

test('buildBackContent: "Prev close" and "Your price" labels are wrapped so they can be coloured to match their reference lines', () => {
  const hass = makeHass('sensor.dro', { meta: { symbol: 'DRO.AX', previousClose: 2.0 } });
  const d = readStockData({ entity: 'sensor.dro', shares: 250, purchase_price: 1.85 }, hass);
  const html = buildBackContent(d);
  assert.match(html, /ref-prev">Prev close/);
  assert.match(html, /ref-purchase">Your price/);
});

// ── free shares (no purchase price) ──────────────────────────────────────────

test('buildBackContent: no "Your price" line for shares with no purchase price', () => {
  const hass = makeHass('sensor.dro', { meta: { symbol: 'DRO.AX', previousClose: 2.0 } });
  const d = readStockData({ entity: 'sensor.dro', shares: 250 }, hass);
  const html = buildBackContent(d);
  assert.doesNotMatch(html, /Your price/);
  assert.doesNotMatch(html, /--primary-color/, 'no purchase price means no purchase-price reference line either');
});

test('buildBackContent: cost breakdown shows just the $0 cost basis, not "— = $0.00"', () => {
  const hass = makeHass('sensor.dro', { meta: { symbol: 'DRO.AX', previousClose: 2.0 } });
  const d = readStockData({ entity: 'sensor.dro', shares: 250 }, hass);
  const html = buildBackContent(d);
  assert.match(html, /Cost: \$0\.00 · Now:/);
  assert.doesNotMatch(html, /—/);
});
