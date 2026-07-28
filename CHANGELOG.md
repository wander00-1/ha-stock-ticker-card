# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.6.2] - 2026-07-28

### Fixed
- The portfolio summary box had both a 16px outer margin and 14px inner
  padding (30px total indent), while stock rows only have 16px padding —
  their text never actually lined up. The box now spans full width like a
  stock row, with the same 16px padding, so both sides line up exactly.

## [0.6.1] - 2026-07-28

### Fixed
- The "Updated HH:MM" label's left position and the row's own left padding
  were two independently hardcoded `16px` values instead of one shared
  source — they were supposed to match but had no structural guarantee to.
  Now both reference a single `--row-pad-x` custom property so they can't
  drift apart.

## [0.6.0] - 2026-07-28

### Changed
- "Portfolio" title now reuses the same bold/white style as a stock symbol
  (`.stock-symbol`) instead of a small grey uppercase label
- Swapped which line is bold vs. secondary for each stock: the bold line now
  defaults to the company name (`meta.longName`), with the ticker symbol
  always shown as the secondary/grey subtitle beneath it. A configured
  `name` override still takes the bold spot; only the no-override default
  changed

## [0.5.1] - 2026-07-28

### Added
- "Portfolio" title above the invested/current value/movement rows

## [0.5.0] - 2026-07-28

### Added
- Visual divider between the portfolio summary box and the stock list below
  it
- "Prev close" and "Your price" labels in the chart meta line are now
  coloured to match their corresponding reference line (grey / theme accent),
  making the connection between line and label explicit

## [0.4.1] - 2026-07-28

### Fixed
- The previous-close and purchase-price reference lines used different
  stroke widths and dash rhythms — when the two values are close together
  (e.g. purchase price near previous close), they clashed into a jumbled
  mess instead of reading as two clean lines. Both now share the same
  stroke width, dasharray, and opacity, differing only by colour

## [0.4.0] - 2026-07-28

### Added
- Chart view now shows the stock's symbol and a colour-coded trend badge
  (icon + change) at the top — previously the chart gave no indication of
  which stock it belonged to
- A second dashed reference line marks your purchase price on the chart
  (distinct colour from the previous-close line) when a stock has holding
  info, plus a "Your price" label in the chart's meta line
- `dirOf` helper consolidates the up/down/flat colour logic that was
  previously duplicated between the price-change and P/L displays

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
