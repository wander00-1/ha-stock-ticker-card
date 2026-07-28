# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2026-07-28

### Changed
- Tapping a stock row now flips it (crossfade between price view and chart
  view) instead of dropping the chart down below the row — same interaction
  as `ha-air-quality-card`'s tiles. Rows are now a fixed height at all times
  to leave room for the chart to fade in, rather than growing on expand
- Click handling now keys off each row's `data-index` instead of positional
  order in the DOM, fixing a latent mismatch that could toggle the wrong
  stock if an earlier stock's sensor was unavailable

### Added
- Small trend icon (▲/▼/–) next to the daily change, colour-matched to
  up/down/flat
- "Updated HH:MM" shown in small text at the bottom-left of each row
- Unit test suite (`test/`, run via `npm test`) covering formatting helpers,
  P/L math, chart edge cases, and editor schema integrity. The pure logic is
  no longer wrapped in an IIFE, so `dist/ha-stock-ticker-card.js` can be
  `require()`'d directly under Node — the browser-only class definitions and
  `customElements` registration are now guarded behind a
  `typeof HTMLElement !== 'undefined'` check instead

## [0.2.2] - 2026-07-28

### Fixed
- 0.2.1 switched the unset default for the number fields from `''` to
  `undefined`, which still didn't render — `ha-air-quality-card`'s editor
  (same `ha-form` number-selector pattern) uses `null` for unset optional
  numbers, so this now matches that.

## [0.2.1] - 2026-07-28

### Fixed
- Editor's `shares`/`purchase_price`/`brokerage_fee` fields were bound to an
  empty string when unset, which `ha-form`'s number selector doesn't accept
  — the fields could fail to render for any stock that didn't already have
  them set. Now left `undefined` when absent.

## [0.2.0] - 2026-07-28

### Added
- Optional `shares`, `purchase_price`, and `brokerage_fee` per stock — when
  set, the row shows your holding and profit/loss in $ and %, colour-coded
  green/red
- Portfolio movement summary (invested / current value / overall P/L) shown
  above the stock list, aggregating every stock that has holding info;
  toggle with `show_portfolio`
- Expanded chart view now shows a cost vs. current-value breakdown for
  stocks with holding info

## [0.1.0] - 2026-07-28

### Added
- Initial release, split out from the combined `ha-stock-ticker` repo (that
  repo now holds the companion `ha_stock_ticker` integration only — HACS
  doesn't allow one repository to be both an Integration and a Dashboard
  category)
- Displays price, change, and %change per stock, colour-coded green/down red
- Tap a stock row to expand an intraday line chart for the day
- Support for multiple stocks in one card, added/removed via the visual editor
- Reads price and 5-minute intraday candles from a sensor's `meta`,
  `timestamp`, and `indicators` attributes — works with either the
  [ha_stock_ticker integration](https://github.com/wander00-1/ha-stock-ticker)
  or a hand-written `rest` sensor
- `getStubConfig` for the Lovelace card picker preview
- HACS-compatible `hacs.json`
