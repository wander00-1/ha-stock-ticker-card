# HA Stock Ticker Card

A Home Assistant Lovelace custom card that displays stock prices. Tap a stock
to expand an intraday line chart for the day. Supports multiple stocks in one
card, and optionally tracks what you paid for each holding to show
per-stock and portfolio-wide profit/loss.

This card is the frontend half of a two-repo pair — it reads price data from
a sensor but doesn't fetch anything itself. Pair it with:

- **[ha-stock-ticker](https://github.com/wander00-1/ha-stock-ticker)** — a
  custom integration with a config flow (add a stock via **Settings →
  Devices & Services → Add Integration**, no YAML), **or**
- your own hand-written `rest` sensor — see that repo's README for the YAML
  if you'd rather not install a custom integration

(These are separate repos because HACS doesn't allow one repository to be
both an *Integration* and a *Dashboard* category.)

---

## Installation

**HACS**
1. In HACS go to **Custom repositories**, add this repository URL, and
   select **Dashboard** as the category.
2. Install **HA Stock Ticker Card** — HACS adds the resource automatically.

**Manual**
1. Download [`dist/ha-stock-ticker-card.js`](dist/ha-stock-ticker-card.js) and copy it to your Home Assistant `/config/www/` directory.
2. In Home Assistant go to **Settings → Dashboards → Resources** and add:
   - **URL:** `/local/ha-stock-ticker-card.js`
   - **Type:** JavaScript module
3. Reload the browser, then add the card via the dashboard editor.

---

## Card configuration

```yaml
type: custom:ha-stock-ticker-card
title: Watchlist          # optional — card header text
show_portfolio: true       # optional — defaults to true, hides if no stock has holding info
show_logos: true           # optional — defaults to true, company logo next to each stock
stocks:
  - name: DroneShield      # optional — defaults to the company name, ticker shown as a subtitle
    entity: sensor.dro_stock_price
    shares: 250             # optional — omit for a watchlist-only entry
    purchase_price: 1.85    # optional — price paid per share
    brokerage_fee: 9.95     # optional — one-off fee for this purchase, default 0
  - entity: sensor.bhp_stock_price
```

### Options

| Key | Type | Required | Description |
|-----|------|----------|-------------|
| `title` | string | No | Card header text |
| `show_portfolio` | boolean | No | Show the aggregate invested/current value/movement summary. Defaults to `true`; automatically hidden if no stock has holding info |
| `show_logos` | boolean | No | Show a company logo next to each stock, loaded from [financialmodelingprep.com](https://financialmodelingprep.com)'s free image endpoint, keyed on the ticker symbol. Defaults to `true`; a logo silently disappears (rather than showing a broken-image icon) if none exists for that ticker |
| `stocks` | list | Yes | One or more stock definitions (see below) |

**Stock definition**

| Key | Type | Required | Description |
|-----|------|----------|-------------|
| `name` | string | No | Bold display label — defaults to the sensor's company name (`meta.longName`), with the ticker symbol always shown as a subtitle below it |
| `entity` | string | Yes | Entity ID of the price sensor for this stock |
| `shares` | number | No | Number of shares held. Omit to treat the row as watchlist-only (no holding shown). `purchase_price` is optional alongside it — see below |
| `purchase_price` | number | No | Price paid per share. Omit for shares received without buying them (e.g. a DRP or gift) — cost basis is then treated as $0 (plus any `brokerage_fee`) |
| `brokerage_fee` | number | No | One-off brokerage fee paid for the purchase, added to cost basis. Defaults to 0 |

The sensor must expose `meta`, `timestamp`, and `indicators` attributes
shaped like Yahoo Finance's chart API response — both the
[ha-stock-ticker integration](https://github.com/wander00-1/ha-stock-ticker)
and the manual `rest` sensor documented there produce this shape.

### Visual editor

Each stock's row in the editor is labelled "Stock N" until you pick a price
sensor, then relabels itself using that sensor's company name (or its HA
friendly name if the sensor doesn't expose one) — or your `name` override, if
set. `shares`/`purchase_price`/`brokerage_fee` are tucked behind the ⚙ button
on each row, collapsed by default; it opens automatically for a stock that
already has any of those set.

### Profit/loss and portfolio movement

When `shares` is set for a stock (with or without `purchase_price`):
- Cost basis = `shares × purchase_price + brokerage_fee`, or just
  `brokerage_fee` (default $0) if `purchase_price` is omitted — e.g. shares
  received via a dividend reinvestment plan or as a gift, never bought
- The row shows your holding (e.g. `250 sh @ $1.85`, or just `74` with no
  purchase price recorded) and P/L in $ under the price, colour-coded the
  same as the daily change. A $ P/L is shown even with a $0 cost basis; the
  % is omitted in that case since a percentage against nothing invested
  isn't meaningful
- Expanding the row's chart also shows a cost/current-value breakdown

The **portfolio summary** (top of the card, unless `show_portfolio: false`)
totals invested cost and current value across every stock with `shares` set
— stocks without `shares` at all are excluded and behave as plain watchlist
rows. The Movement **%** is computed only from stocks that also have a
`purchase_price`, so shares received for free don't distort the ratio (their
dollar value still counts toward Invested/Current value/Movement $ — it's
only the percentage that excludes them). If no stock in the portfolio has a
purchase price, no percentage is shown at all. Totals assume a single
currency across all holdings (fine for an ASX-only portfolio).

---

## Behaviour

- Tap a stock row to flip it between its price view and its intraday chart
  — rows are a fixed height so the two views crossfade in place rather than
  the chart dropping down and pushing other rows around
- Trend icon (▲/▼/–) and price change / % change (vs previous close) shown
  in green (up), red (down), or grey (flat)
- Day range and volume shown below the price/name (e.g. "Day $2.040–$2.175 ·
  Vol 3.2M"), when the sensor provides them
- Small "Updated HH:MM" timestamp below that
- Company logo next to the symbol/name (disable with `show_logos: false`).
  Loaded client-side from a third party keyed on the ticker — that service
  sees which tickers you view if enabled. Fetched once per ticker per page
  session (cached as a data URI and shared across every card instance on the
  page), not re-requested on every price refresh
- The chart view shows the stock's symbol and a colour-coded trend badge at
  the top, so it's clear which stock and which direction you're looking at
- Dashed reference line in the chart marks the previous close; a second,
  differently-coloured dashed line marks your purchase price when the stock
  has `shares`/`purchase_price` set
- The chart line itself is coloured per-pixel by whether it's above or below
  the previous close (or the first point of the day if unavailable) — a dip
  below the reference shows red even on an otherwise up day, not just one
  flat colour for the whole line
- Card colours follow the active HA theme; override the up/down colours with
  `--stock-up-color`/`--stock-down-color` CSS variables in your theme if
  desired

---

## Testing

```
npm test
```

Runs the Node test-runner suite in `test/` — pure formatting, P/L, and chart
logic, no browser or Home Assistant instance required.

## Contributing

Issues and pull requests are welcome. Please update `CHANGELOG.md` and bump
the version in `dist/ha-stock-ticker-card.js` before opening a release PR.

---

## License

MIT
