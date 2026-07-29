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

// ── per-pixel gradient colouring ──────────────────────────────────────────────
// The line is coloured by a vertical SVG gradient with a hard stop at the
// reference price (previous close, or the first point if unavailable), not
// one flat colour for the whole line — so a dip below the reference shows
// red even on an overall up day, and vice versa.

function gradientStops(svg) {
  return [...svg.matchAll(/<stop offset="([\d.]+)" stop-color="(var\([^)]*\))"\/>/g)]
    .map(m => ({ offset: parseFloat(m[1]), color: m[2] }));
}

test('buildChart: line and area both reference the same gradient, with an up stop then a down stop at a matching offset', () => {
  const svg = buildChart([1, 2, 3], [2.0, 2.05, 2.1], 2.0);
  const gradientId = svg.match(/<linearGradient id="([^"]+)"/)[1];
  assert.match(svg, new RegExp(`stroke="url\\(#${gradientId}\\)"`));
  assert.match(svg, new RegExp(`fill="url\\(#${gradientId}\\)"`));

  const stops = gradientStops(svg);
  assert.equal(stops.length, 2);
  assert.match(stops[0].color, /--stock-up-color/);
  assert.match(stops[1].color, /--stock-down-color/);
  assert.equal(stops[0].offset, stops[1].offset, 'both stops must sit at the same offset for a hard cutoff, not a fade');
});

test('buildChart: reference at the top of the candle range gives a gradient offset near 0', () => {
  const svg = buildChart([1, 2, 3], [1.0, 1.5, 2.0], 2.0); // prevClose == the day's high
  const [{ offset }] = gradientStops(svg);
  assert.ok(offset < 0.1, `expected offset near 0 (top), got ${offset}`);
});

test('buildChart: reference at the bottom of the candle range gives a gradient offset near 1', () => {
  const svg = buildChart([1, 2, 3], [1.0, 1.5, 2.0], 1.0); // prevClose == the day's low
  const [{ offset }] = gradientStops(svg);
  assert.ok(offset > 0.9, `expected offset near 1 (bottom), got ${offset}`);
});

test('buildChart: reference exactly mid-range gives a gradient offset of 0.5', () => {
  const svg = buildChart([1, 2, 3], [2.0, 2.05, 2.1], 2.05);
  const [{ offset }] = gradientStops(svg);
  assert.ok(Math.abs(offset - 0.5) < 0.01, `expected offset ~0.5, got ${offset}`);
});

test('buildChart: falls back to the first point as the colour reference when prevClose is missing', () => {
  // First point (2.0) is the range's low here, so the reference sits at the bottom.
  const svg = buildChart([1, 2, 3], [2.0, 2.1, 2.2], null);
  const [{ offset }] = gradientStops(svg);
  assert.ok(offset > 0.9, `expected offset near 1 (bottom), got ${offset}`);
});

test('buildChart: each call generates a unique gradient id', () => {
  const svg1 = buildChart([1, 2, 3], [2.0, 2.05, 2.1], 2.0);
  const svg2 = buildChart([1, 2, 3], [2.0, 2.05, 2.1], 2.0);
  const id1 = svg1.match(/<linearGradient id="([^"]+)"/)[1];
  const id2 = svg2.match(/<linearGradient id="([^"]+)"/)[1];
  assert.notEqual(id1, id2, 'two charts rendered on the same page must not collide on gradient id');
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
