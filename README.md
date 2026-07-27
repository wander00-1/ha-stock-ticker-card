# HA Stock Ticker Card

A Home Assistant Lovelace custom card that displays stock prices. Tap a stock
to expand an intraday line chart for the day. Supports multiple stocks in one
card.

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
stocks:
  - name: DroneShield      # optional — defaults to the ticker symbol
    entity: sensor.dro_stock_price
  - entity: sensor.bhp_stock_price
```

### Options

| Key | Type | Required | Description |
|-----|------|----------|-------------|
| `title` | string | No | Card header text |
| `stocks` | list | Yes | One or more stock definitions (see below) |

**Stock definition**

| Key | Type | Required | Description |
|-----|------|----------|-------------|
| `name` | string | No | Display label — defaults to the ticker symbol from the sensor |
| `entity` | string | Yes | Entity ID of the price sensor for this stock |

The sensor must expose `meta`, `timestamp`, and `indicators` attributes
shaped like Yahoo Finance's chart API response — both the
[ha-stock-ticker integration](https://github.com/wander00-1/ha-stock-ticker)
and the manual `rest` sensor documented there produce this shape.

---

## Behaviour

- Tap a stock row to expand/collapse its intraday chart
- Price change and % change (vs previous close) shown in green (up), red
  (down), or grey (flat)
- Dashed reference line in the chart marks the previous close
- Card colours follow the active HA theme; override the up/down colours with
  `--stock-up-color`/`--stock-down-color` CSS variables in your theme if
  desired

---

## Contributing

Issues and pull requests are welcome. Please update `CHANGELOG.md` and bump
the version in `dist/ha-stock-ticker-card.js` before opening a release PR.

---

## License

MIT
