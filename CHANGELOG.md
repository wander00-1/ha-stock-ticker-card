# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.12.0] - 2026-07-29

### Fixed
- `shares` without a `purchase_price` (e.g. shares received via a DRP or
  gift, never bought) were excluded from the portfolio entirely — `shares`
  alone now counts as a holding, with cost basis treated as $0 (plus any
  `brokerage_fee`) when no purchase price is set, so the row and portfolio
  total both reflect its current value.
- The portfolio's Movement **%** is now computed only from stocks that have
  a real purchase price. Blending free shares' full current value in as
  pure "gain" against a near-$0 cost basis produced meaningless, wildly
  inflated percentages (e.g. "+617%") even though the dollar figures
  (Invested / Current value / Movement $) were already correct — those
  still total every holding, only the percentage's inputs changed.

## [0.11.0] - 2026-07-29

### Added
- Editor row labels now update from "Stock N" to the sensor's resolved
  company name (or HA friendly name, or your `name` override) as soon as a
  price sensor is selected, instead of staying generic forever
- `shares`/`purchase_price`/`brokerage_fee` moved behind a ⚙ button per row,
  collapsed by default; auto-expands for a stock that already has any of
  them set. `STOCK_SCHEMA` (name/entity) and the new `STOCK_ADVANCED_SCHEMA`
  (shares/purchase_price/brokerage_fee) are separate exports now

## [0.10.0] - 2026-07-29

### Changed
- The chart line is now coloured per-pixel by whether it's above or below
  the previous close, instead of one flat colour for the whole line based
  on the current day's overall direction. A dip below the reference now
  shows red even on an otherwise up day, and vice versa. Implemented as a
  vertical SVG gradient with a hard colour stop at the reference price's
  position — no line-segment splitting needed. When previous close isn't
  available, falls back to the first point in the chart, same as before.

## [0.9.0] - 2026-07-28

### Added
- Day range and volume (e.g. "Day $2.040–$2.175 · Vol 3.2M") shown on the
  front (price) view, sourced from `meta.regularMarketDayHigh/Low/Volume` —
  already present in the sensor's attributes, no integration changes needed.
  Fills the row's remaining space with more information rather than shrinking
  further.

### Changed
- `.stock-updated` ("Updated HH:MM") is no longer absolutely positioned —
  it's now a normal line below the new stats row. Retires the
  `--row-pad-x` custom property from a few versions back; it turned out to
  never actually link `.portfolio-summary`'s padding to `.stock-front`'s
  (custom properties only cascade to descendants, and they aren't related in
  the DOM) — both sides just coincidentally shared the same literal
  fallback, so this replaces it with a plain value in both places.

## [0.8.2] - 2026-07-28

### Changed
- Trimmed more of the empty space around and inside each row: row height
  168px → 140px → 120px, front/back padding reduced, and less margin around
  the portfolio summary box and its divider

## [0.8.1] - 2026-07-28

### Fixed
- Editor's "+ Add Stock" button used a hardcoded blue (`#1976d2`) instead of
  `var(--primary-color)` — the one place in the card that didn't follow the
  active theme's accent colour

## [0.8.0] - 2026-07-28

### Changed
- Logos were previously re-embedded as `<img src="remote-url">` on every
  hass update, relying on the browser's own HTTP cache (a cheap conditional
  request at best, since the server sends no `Cache-Control`/`Expires`).
  Now fetched at most once per ticker per page session: the image is
  fetched, converted to a data URI, and cached in a module-level map shared
  by every card instance on the page. Every subsequent render (e.g. each
  5-minute price refresh) reuses that data URI directly with zero network
  involvement. A ticker confirmed to have no logo is also cached as such, so
  it isn't re-attempted either.

## [0.7.1] - 2026-07-28

### Changed
- Trend icon replaced with a small inline SVG diagonal arrow (shaft +
  arrowhead) instead of a plain ▲/▼/– character, closer to a typical stock
  chart uptick/downtick icon. Coloured via `currentColor` so it still
  automatically matches the up/down/flat text colour

## [0.7.0] - 2026-07-28

### Added
- Company logo next to each stock's symbol/name, loaded client-side from
  financialmodelingprep.com's free image endpoint keyed on the ticker
  (no API key, no backend involvement — plain `<img>` loading isn't subject
  to CORS the way the price data fetch was). 404s for unknown tickers are
  handled gracefully (the `<img>` removes itself) rather than showing a
  broken-image icon. Toggle with `show_logos` (default `true`)

### Changed
- Reduced row height (168px → 140px) and chart height to cut down on the
  empty space in the front (price) view — the chart SVG now flexes to fill
  whatever space remains after the header/meta text instead of a fixed
  height, so it can't overflow its row if the balance shifts

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
