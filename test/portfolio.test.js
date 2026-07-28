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
