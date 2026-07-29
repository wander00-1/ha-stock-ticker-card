'use strict';

const test   = require('node:test');
const assert = require('node:assert/strict');

const { buildPortfolioSummary } = require('../dist/ha-stock-ticker-card.js');

function makeHass(entities) {
  const states = {};
  for (const [entityId, { state, meta = {} }] of Object.entries(entities)) {
    states[entityId] = { state, attributes: { meta, timestamp: [], indicators: { quote: [{ close: [] }] } } };
  }
  return { states };
}

test('buildPortfolioSummary: returns empty string when no stock has holding info', () => {
  const hass = makeHass({ 'sensor.dro': { state: '2.08' } });
  const html = buildPortfolioSummary([{ entity: 'sensor.dro' }], hass);
  assert.equal(html, '');
});

test('buildPortfolioSummary: totals cost/value across multiple holdings, ignoring watchlist-only stocks', () => {
  const hass = makeHass({
    'sensor.dro': { state: '2.08' },
    'sensor.bhp': { state: '40.00' },
    'sensor.watch': { state: '5.00' },
  });
  const stocks = [
    { entity: 'sensor.dro', shares: 250, purchase_price: 2.04 },       // cost 510, value 520
    { entity: 'sensor.bhp', shares: 10, purchase_price: 38.00 },        // cost 380, value 400
    { entity: 'sensor.watch' },                                        // no holding, excluded
  ];
  const html = buildPortfolioSummary(stocks, hass);
  assert.match(html, /\$890\.00/); // invested: 510 + 380
  assert.match(html, /\$920\.00/); // current value: 520 + 400
});

test('buildPortfolioSummary: an unavailable sensor with holding fields configured is excluded from totals', () => {
  const hass = makeHass({}); // sensor.dro not present -> unavailable
  const html = buildPortfolioSummary([{ entity: 'sensor.dro', shares: 250, purchase_price: 2.04 }], hass);
  assert.equal(html, '');
});

test('buildPortfolioSummary: includes a divider after the summary box when it renders', () => {
  const hass = makeHass({ 'sensor.dro': { state: '2.08' } });
  const html = buildPortfolioSummary([{ entity: 'sensor.dro', shares: 250, purchase_price: 2.04 }], hass);
  assert.match(html, /portfolio-divider/);
});

test('buildPortfolioSummary: includes a "Portfolio" title', () => {
  const hass = makeHass({ 'sensor.dro': { state: '2.08' } });
  const html = buildPortfolioSummary([{ entity: 'sensor.dro', shares: 250, purchase_price: 2.04 }], hass);
  assert.match(html, /portfolio-title">Portfolio</);
});

test('buildPortfolioSummary: no divider when there is nothing to show', () => {
  const hass = makeHass({ 'sensor.dro': { state: '2.08' } });
  const html = buildPortfolioSummary([{ entity: 'sensor.dro' }], hass);
  assert.doesNotMatch(html, /portfolio-divider/);
});

// ── free shares (no purchase price) ──────────────────────────────────────────

test('buildPortfolioSummary: shares with no purchase price still contribute their current value to the totals', () => {
  const hass = makeHass({
    'sensor.dro': { state: '2.08' },   // 250 sh, cost 510, value 520
    'sensor.rhc': { state: '44.26' },  // 74 sh, no purchase price, cost 0, value 3275.24
  });
  const stocks = [
    { entity: 'sensor.dro', shares: 250, purchase_price: 2.04 },
    { entity: 'sensor.rhc', shares: 74 },
  ];
  const html = buildPortfolioSummary(stocks, hass);
  assert.match(html, /\$510\.00/); // invested: only the costed stock
  assert.match(html, /\$3795\.24/); // current value: both (520 + 3275.24)
});

test('buildPortfolioSummary: Movement % is computed only from stocks with a real purchase price, not blended with free shares', () => {
  const hass = makeHass({
    'sensor.dro': { state: '2.08' },   // 250 sh @ 2.04 -> cost 510, value 520, +1.96%
    'sensor.rhc': { state: '44.26' },  // 74 sh, no cost -> would otherwise blow up the ratio
  });
  const stocks = [
    { entity: 'sensor.dro', shares: 250, purchase_price: 2.04 },
    { entity: 'sensor.rhc', shares: 74 },
  ];
  const html = buildPortfolioSummary(stocks, hass);
  assert.match(html, /\+1\.96%/, 'expected the % to reflect only the DRO position, not a figure inflated by the free RHC shares');
  assert.doesNotMatch(html, /617/, 'the blended (misleading) percentage must not appear');
});

test('buildPortfolioSummary: Movement $ and % colour independently when they disagree in sign', () => {
  const hass = makeHass({
    'sensor.costed': { state: '8.00' }, // 100 sh @ $10 -> cost 1000, value 800, -20%
    'sensor.free': { state: '20.00' },  // 50 sh, no cost -> value 1000, all gain
  });
  const stocks = [
    { entity: 'sensor.costed', shares: 100, purchase_price: 10 },
    { entity: 'sensor.free', shares: 50 },
  ];
  const html = buildPortfolioSummary(stocks, hass);
  // Total value 1800 vs total cost 1000 (only the costed stock has one) =
  // +$800 overall, but the costed-only % is -20% - each must show its own
  // colour, not one shared colour derived from just the dollar sign.
  assert.match(html, /color-up">\+\$800\.00</);
  assert.match(html, /color-down">\(-20\.00%\)</);
});

test('buildPortfolioSummary: no Movement % at all when every holding is free shares', () => {
  const hass = makeHass({ 'sensor.rhc': { state: '44.26' } });
  const html = buildPortfolioSummary([{ entity: 'sensor.rhc', shares: 74 }], hass);
  assert.doesNotMatch(html, /%/);
});
