'use strict';

const test   = require('node:test');
const assert = require('node:assert/strict');

const { fmtPrice, fmtChange, fmtMoney, fmtPL, fmtPLSplit, fmtVolume, trendIcon, dirOf, logoUrl } = require('../dist/ha-stock-ticker-card.js');

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

test('fmtPL: amount and pct with opposite signs never stack a + in front of a negative pct', () => {
  // Can legitimately happen when amount and pct are derived from different
  // subsets of stocks (see the portfolio Movement % fix) - amount up
  // overall, pct down for the costed subset, or vice versa.
  assert.equal(fmtPL(686.22, -12.73, 'AUD'), '+$686.22 (-12.73%)');
  assert.equal(fmtPL(-686.22, 12.73, 'AUD'), '-$686.22 (+12.73%)');
});

// ── fmtPLSplit ────────────────────────────────────────────────────────────────

test('fmtPLSplit: colours the $ and % portions independently when their signs agree', () => {
  const html = fmtPLSplit(686.22, 12.73, 'AUD');
  assert.match(html, /color-up">\+\$686\.22</);
  assert.match(html, /color-up">\(\+12\.73%\)</);
});

test('fmtPLSplit: colours the $ and % portions independently when their signs disagree', () => {
  // The exact scenario reported: portfolio up in $ overall, but the costed
  // subset's % is down - each figure must show its own true colour, not one
  // shared colour derived from just the dollar amount.
  const html = fmtPLSplit(686.22, -12.73, 'AUD');
  assert.match(html, /color-up">\+\$686\.22</);
  assert.match(html, /color-down">\(-12\.73%\)</);
});

test('fmtPLSplit: omits the % span entirely when pct is null, no stray parentheses', () => {
  const html = fmtPLSplit(5, null, 'AUD');
  assert.match(html, /color-up">\+\$5\.00</);
  assert.doesNotMatch(html, /\(/);
});

test('fmtPLSplit: null amount returns empty string', () => {
  assert.equal(fmtPLSplit(null, null, 'AUD'), '');
});

// ── trendIcon ─────────────────────────────────────────────────────────────────

test('trendIcon: returns an inline SVG for up/down/flat, each with a distinct path', () => {
  const up = trendIcon('up');
  const down = trendIcon('down');
  const flat = trendIcon('flat');
  for (const svg of [up, down, flat]) {
    assert.match(svg, /<svg/);
    assert.match(svg, /stroke="currentColor"/, 'should inherit colour from the surrounding text');
  }
  assert.notEqual(up, down);
  assert.notEqual(up, flat);
  assert.notEqual(down, flat);
});

test('trendIcon: unknown/missing direction falls back to the flat icon', () => {
  assert.equal(trendIcon('nonsense'), trendIcon('flat'));
  assert.equal(trendIcon(undefined), trendIcon('flat'));
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

// ── logoUrl ───────────────────────────────────────────────────────────────────

test('logoUrl: builds a financialmodelingprep.com image URL keyed on the ticker', () => {
  assert.equal(logoUrl('DRO.AX'), 'https://financialmodelingprep.com/image-stock/DRO.AX.png');
});

test('logoUrl: empty/falsy ticker returns empty string', () => {
  assert.equal(logoUrl(''), '');
  assert.equal(logoUrl(null), '');
  assert.equal(logoUrl(undefined), '');
});

// ── fmtVolume ─────────────────────────────────────────────────────────────────

test('fmtVolume: scales to B/M/K with one decimal place', () => {
  assert.equal(fmtVolume(1_234_000_000), '1.2B');
  assert.equal(fmtVolume(3_245_600), '3.2M');
  assert.equal(fmtVolume(45_600), '45.6K');
});

test('fmtVolume: below 1000 shows the raw rounded number', () => {
  assert.equal(fmtVolume(842), '842');
  assert.equal(fmtVolume(0), '0');
});

test('fmtVolume: null, undefined, and NaN return empty string', () => {
  assert.equal(fmtVolume(null), '');
  assert.equal(fmtVolume(undefined), '');
  assert.equal(fmtVolume(NaN), '');
});
