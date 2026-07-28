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
