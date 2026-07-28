'use strict';

const test   = require('node:test');
const assert = require('node:assert/strict');

const { fmtPrice, fmtChange, fmtMoney, fmtPL, trendIcon, dirOf } = require('../dist/ha-stock-ticker-card.js');

// ── fmtPrice ──────────────────────────────────────────────────────────────────

test('fmtPrice: AUD under $10 shows 3 decimals', () => {
  assert.equal(fmtPrice(2.08, 'AUD'), '$2.080');
});

test('fmtPrice: AUD at or above $10 shows 2 decimals', () => {
  assert.equal(fmtPrice(10, 'AUD'), '$10.00');
  assert.equal(fmtPrice(123.456, 'AUD'), '$123.46');
});

test('fmtPrice: non-AUD currency shows currency code prefix', () => {
  assert.equal(fmtPrice(5, 'USD'), 'USD 5.000');
});

test('fmtPrice: null or NaN price returns em dash', () => {
  assert.equal(fmtPrice(null, 'AUD'), '—');
  assert.equal(fmtPrice(NaN, 'AUD'), '—');
});

// ── fmtChange ─────────────────────────────────────────────────────────────────

test('fmtChange: positive change gets a + sign on both value and pct', () => {
  assert.equal(fmtChange(0.04, 1.96), '+0.040 (+1.96%)');
});

test('fmtChange: negative change has no extra + sign (toFixed keeps the -)', () => {
  assert.equal(fmtChange(-0.04, -1.96), '-0.040 (-1.96%)');
});

test('fmtChange: null change returns empty string', () => {
  assert.equal(fmtChange(null, 0), '');
});

// ── fmtMoney ──────────────────────────────────────────────────────────────────

test('fmtMoney: positive AUD amount', () => {
  assert.equal(fmtMoney(519.95, 'AUD'), '$519.95');
});

test('fmtMoney: negative amount puts the minus before the currency symbol', () => {
  assert.equal(fmtMoney(-23.5, 'AUD'), '-$23.50');
});

test('fmtMoney: null or NaN returns em dash', () => {
  assert.equal(fmtMoney(null), '—');
  assert.equal(fmtMoney(NaN), '—');
});

test('fmtMoney: defaults to $ when currency is not AUD/undefined-safe', () => {
  assert.equal(fmtMoney(10, undefined), '$10.00');
});

// ── fmtPL ─────────────────────────────────────────────────────────────────────

test('fmtPL: positive P/L gets + sign on both amount and pct', () => {
  assert.equal(fmtPL(0.05, 0.01, 'AUD'), '+$0.05 (+0.01%)');
});

test('fmtPL: negative P/L renders a single minus, not a double negative', () => {
  assert.equal(fmtPL(-23, -4.4, 'AUD'), '-$23.00 (-4.40%)');
});

test('fmtPL: null amount returns empty string', () => {
  assert.equal(fmtPL(null, null, 'AUD'), '');
});

test('fmtPL: omits the percentage when pct is null', () => {
  assert.equal(fmtPL(5, null, 'AUD'), '+$5.00');
});

// ── trendIcon ─────────────────────────────────────────────────────────────────

test('trendIcon: up/down/flat map to distinct icons', () => {
  assert.equal(trendIcon('up'), '▲');
  assert.equal(trendIcon('down'), '▼');
  assert.equal(trendIcon('flat'), '–');
});

// ── dirOf ─────────────────────────────────────────────────────────────────────

test('dirOf: positive/negative/zero map to up/down/flat', () => {
  assert.equal(dirOf(0.5), 'up');
  assert.equal(dirOf(-0.5), 'down');
  assert.equal(dirOf(0), 'flat');
});

test('dirOf: null, undefined, and NaN all map to flat', () => {
  assert.equal(dirOf(null), 'flat');
  assert.equal(dirOf(undefined), 'flat');
  assert.equal(dirOf(NaN), 'flat');
});
