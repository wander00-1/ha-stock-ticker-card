'use strict';

const test   = require('node:test');
const assert = require('node:assert/strict');

const { buildChart } = require('../dist/ha-stock-ticker-card.js');

test('buildChart: fewer than 2 usable points renders the empty state', () => {
  assert.match(buildChart([], [], null), /chart-empty/);
  assert.match(buildChart([1], [2.0], null), /chart-empty/);
});

test('buildChart: null/undefined closes are filtered out before counting points', () => {
  // Only 1 real point survives filtering, even though 3 timestamps are given.
  assert.match(buildChart([1, 2, 3], [2.0, null, undefined], null), /chart-empty/);
});

test('buildChart: upward trend (last close >= previous close) uses the up colour', () => {
  const svg = buildChart([1, 2, 3], [2.0, 2.05, 2.1], 2.0);
  assert.match(svg, /--stock-up-color/);
});

test('buildChart: downward trend uses the down colour', () => {
  const svg = buildChart([1, 2, 3], [2.0, 1.95, 1.9], 2.0);
  assert.match(svg, /--stock-down-color/);
});

test('buildChart: falls back to comparing against the first point when prevClose is missing', () => {
  const svg = buildChart([1, 2, 3], [2.0, 2.1, 2.2], null);
  assert.match(svg, /--stock-up-color/);
});

test('buildChart: draws a dashed reference line only when prevClose is known', () => {
  const withPrev = buildChart([1, 2, 3], [2.0, 2.05, 2.1], 2.0);
  const withoutPrev = buildChart([1, 2, 3], [2.0, 2.05, 2.1], null);
  assert.match(withPrev, /stroke-dasharray/);
  assert.doesNotMatch(withoutPrev, /stroke-dasharray/);
});

test('buildChart: flat series (all closes equal, no prevClose) still renders without dividing by zero', () => {
  const svg = buildChart([1, 2, 3], [2.0, 2.0, 2.0], null);
  assert.match(svg, /<svg/);
  assert.doesNotMatch(svg, /NaN/);
});

// ── purchase-price reference line ────────────────────────────────────────────

test('buildChart: draws a second reference line when a purchase price is given', () => {
  const svg = buildChart([1, 2, 3], [2.0, 2.05, 2.1], 2.0, 1.85);
  const dashedLines = svg.match(/stroke-dasharray/g) || [];
  assert.equal(dashedLines.length, 2, 'expected both the prevClose and purchase-price lines');
  assert.match(svg, /--primary-color/);
});

test('buildChart: omits the purchase-price line when none is given', () => {
  const svg = buildChart([1, 2, 3], [2.0, 2.05, 2.1], 2.0, null);
  assert.doesNotMatch(svg, /--primary-color/);
});

test('buildChart: purchase price outside the candle range still renders without NaN', () => {
  const svg = buildChart([1, 2, 3], [2.0, 2.05, 2.1], 2.0, 0.5);
  assert.doesNotMatch(svg, /NaN/);
});
