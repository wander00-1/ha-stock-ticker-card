'use strict';

const test   = require('node:test');
const assert = require('node:assert/strict');

const { readStockData } = require('../dist/ha-stock-ticker-card.js');

function makeHass(entityId, { state = '2.08', meta = {}, timestamps = [], closes = [] } = {}) {
  return {
    states: {
      [entityId]: {
        state,
        attributes: {
          meta,
          timestamp: timestamps,
          indicators: { quote: [{ close: closes }] },
        },
      },
    },
  };
}

// ── availability ──────────────────────────────────────────────────────────────

test('readStockData: unavailable when entity is missing from hass.states', () => {
  const hass = { states: {} };
  const d = readStockData({ entity: 'sensor.missing' }, hass);
  assert.equal(d.available, false);
});

test('readStockData: unavailable when hass is not yet provided', () => {
  const d = readStockData({ entity: 'sensor.dro' }, null);
  assert.equal(d.available, false);
});

test('readStockData: available when the sensor state parses as a number', () => {
  const hass = makeHass('sensor.dro', { state: '2.08', meta: { previousClose: 2.04 } });
  const d = readStockData({ entity: 'sensor.dro' }, hass);
  assert.equal(d.available, true);
  assert.equal(d.price, 2.08);
});

// ── change / pct ──────────────────────────────────────────────────────────────

test('readStockData: change and pct computed against previousClose', () => {
  const hass = makeHass('sensor.dro', { state: '2.08', meta: { previousClose: 2.04 } });
  const d = readStockData({ entity: 'sensor.dro' }, hass);
  assert.ok(Math.abs(d.change - 0.04) < 1e-9);
  assert.ok(Math.abs(d.pct - (0.04 / 2.04) * 100) < 1e-9);
});

test('readStockData: falls back to chartPreviousClose when previousClose is absent', () => {
  const hass = makeHass('sensor.dro', { state: '2.08', meta: { chartPreviousClose: 2.00 } });
  const d = readStockData({ entity: 'sensor.dro' }, hass);
  assert.ok(Math.abs(d.change - 0.08) < 1e-9);
});

// ── symbol / name resolution ──────────────────────────────────────────────────

test('readStockData: no display name configured -> symbol (bold) is the company name, name (secondary) is the ticker', () => {
  const hass = makeHass('sensor.dro', { meta: { symbol: 'DRO.AX', longName: 'DroneShield Limited' } });
  const d = readStockData({ entity: 'sensor.dro' }, hass);
  assert.equal(d.symbol, 'DroneShield Limited');
  assert.equal(d.name, 'DRO.AX');
});

test('readStockData: no longName available -> symbol falls back to the ticker itself', () => {
  const hass = makeHass('sensor.dro', { meta: { symbol: 'DRO.AX' } });
  const d = readStockData({ entity: 'sensor.dro' }, hass);
  assert.equal(d.symbol, 'DRO.AX');
  assert.equal(d.name, 'DRO.AX');
});

test('readStockData: display name configured -> symbol is the override, name is the ticker', () => {
  const hass = makeHass('sensor.dro', { meta: { symbol: 'DRO.AX', longName: 'DroneShield Limited' } });
  const d = readStockData({ entity: 'sensor.dro', name: 'Drone Shield' }, hass);
  assert.equal(d.symbol, 'Drone Shield');
  assert.equal(d.name, 'DRO.AX');
});

// ── holding / profit-loss ─────────────────────────────────────────────────────

test('readStockData: no shares/purchase_price configured -> not a holding', () => {
  const hass = makeHass('sensor.dro', { meta: { previousClose: 2.04 } });
  const d = readStockData({ entity: 'sensor.dro' }, hass);
  assert.equal(d.hasHolding, false);
  assert.equal(d.plAmount, null);
});

test('readStockData: shares + purchase_price computes cost basis, value, and P/L', () => {
  const hass = makeHass('sensor.dro', { state: '2.08' });
  const d = readStockData({ entity: 'sensor.dro', shares: 250, purchase_price: 2.04 }, hass);
  assert.equal(d.hasHolding, true);
  assert.ok(Math.abs(d.costBasis - 510) < 1e-9);
  assert.ok(Math.abs(d.currentValue - 520) < 1e-9);
  assert.ok(Math.abs(d.plAmount - 10) < 1e-9);
});

test('readStockData: brokerage_fee is added to cost basis', () => {
  const hass = makeHass('sensor.dro', { state: '2.08' });
  const d = readStockData({ entity: 'sensor.dro', shares: 250, purchase_price: 2.04, brokerage_fee: 9.95 }, hass);
  assert.ok(Math.abs(d.costBasis - 519.95) < 1e-9);
});

test('readStockData: brokerage_fee defaults to 0 when not set', () => {
  const hass = makeHass('sensor.dro', { state: '2.08' });
  const d = readStockData({ entity: 'sensor.dro', shares: 250, purchase_price: 2.04 }, hass);
  assert.equal(d.brokerageFee, 0);
});

test('readStockData: shares of 0 does not count as a holding', () => {
  const hass = makeHass('sensor.dro', { state: '2.08' });
  const d = readStockData({ entity: 'sensor.dro', shares: 0, purchase_price: 2.04 }, hass);
  assert.equal(d.hasHolding, false);
});

test('readStockData: shares without purchase_price still counts as a holding (e.g. shares received for free)', () => {
  const hass = makeHass('sensor.dro', { state: '2.08' });
  const d = readStockData({ entity: 'sensor.dro', shares: 250 }, hass);
  assert.equal(d.hasHolding, true);
  assert.ok(Math.abs(d.costBasis - 0) < 1e-9, 'cost basis should be 0 with no purchase price');
  assert.ok(Math.abs(d.currentValue - 520) < 1e-9);
  assert.ok(Math.abs(d.plAmount - 520) < 1e-9, 'P/L should equal the full current value against a $0 cost basis');
  assert.equal(d.plPct, null, 'percentage is undefined against a $0 cost basis, not shown');
});

test('readStockData: brokerage_fee alone (no purchase_price) still contributes to cost basis', () => {
  const hass = makeHass('sensor.dro', { state: '2.08' });
  const d = readStockData({ entity: 'sensor.dro', shares: 250, brokerage_fee: 9.95 }, hass);
  assert.ok(Math.abs(d.costBasis - 9.95) < 1e-9);
});

// ── day range / volume ────────────────────────────────────────────────────────

test('readStockData: passes through regularMarketDayHigh/Low and volume from meta', () => {
  const hass = makeHass('sensor.dro', {
    meta: { regularMarketDayHigh: 2.175, regularMarketDayLow: 2.04, regularMarketVolume: 3245600 },
  });
  const d = readStockData({ entity: 'sensor.dro' }, hass);
  assert.equal(d.dayHigh, 2.175);
  assert.equal(d.dayLow, 2.04);
  assert.equal(d.volume, 3245600);
});
