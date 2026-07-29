'use strict';

// ── Pure helpers (module scope so the unit tests can require them) ─────────────

const CARD_VERSION = '0.11.0';

function fmtPrice(price, currency) {
  if (price === null || isNaN(price)) return '—';
  const symbol = currency === 'AUD' ? '$' : currency ? `${currency} ` : '$';
  return `${symbol}${price.toFixed(price < 10 ? 3 : 2)}`;
}

function fmtChange(change, pct) {
  if (change === null || isNaN(change)) return '';
  const sign = change > 0 ? '+' : '';
  return `${sign}${change.toFixed(3)} (${sign}${pct.toFixed(2)}%)`;
}

function fmtMoney(amount, currency) {
  if (amount === null || isNaN(amount)) return '—';
  const symbol = currency === 'AUD' ? '$' : currency ? `${currency} ` : '$';
  const neg = amount < 0 ? '-' : '';
  return `${neg}${symbol}${Math.abs(amount).toFixed(2)}`;
}

function fmtPL(amount, pct, currency) {
  if (amount === null || isNaN(amount)) return '';
  const sign = amount > 0 ? '+' : '';
  const pctStr = pct !== null && !isNaN(pct) ? ` (${sign}${pct.toFixed(2)}%)` : '';
  return `${sign}${fmtMoney(amount, currency)}${pctStr}`;
}

function fmtVolume(v) {
  if (v === null || v === undefined || isNaN(v)) return '';
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return String(Math.round(v));
}

const TREND_ICON_PATHS = {
  // Diagonal arrow (shaft + arrowhead), like a stock-chart uptick/downtick
  // rather than a plain triangle glyph. Coloured via currentColor so it
  // always matches the up/down/flat text colour it sits next to.
  up: '<path d="M2 12 L8 6 L14 2"/><path d="M9 2 L14 2 L14 7"/>',
  down: '<path d="M2 4 L8 10 L14 14"/><path d="M9 14 L14 14 L14 9"/>',
  flat: '<path d="M2 8 L14 8"/><path d="M10 4 L14 8 L10 12"/>',
};

function trendIcon(dir) {
  const paths = TREND_ICON_PATHS[dir] || TREND_ICON_PATHS.flat;
  return `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
}

function dirOf(value) {
  return value === null || value === undefined || isNaN(value) ? 'flat' : value > 0 ? 'up' : value < 0 ? 'down' : 'flat';
}

function logoUrl(ticker) {
  // Financial Modeling Prep's image endpoint is keyed directly off the
  // ticker (including exchange suffix, e.g. DRO.AX), needs no API key for
  // this specific image route, and 404s cleanly for unknown symbols instead
  // of returning a misleading placeholder.
  return ticker ? `https://financialmodelingprep.com/image-stock/${encodeURIComponent(ticker)}.png` : '';
}

// Logo cache: ticker -> data URI (loaded) | null (confirmed no logo exists).
// Module-level and shared by every card instance on the page, so a ticker's
// logo is ever fetched once per page session, not once per card per render.
// Stays empty (and unused) under Node — only the browser-only card class
// below ever populates or reads it via cacheLogo()/_loadLogos().
const logoCache = new Map();
const logoFetches = new Map(); // ticker -> in-flight Promise, de-dupes concurrent requests

function cacheLogo(ticker) {
  if (logoCache.has(ticker)) return Promise.resolve(logoCache.get(ticker));
  if (logoFetches.has(ticker)) return logoFetches.get(ticker);

  const promise = fetch(logoUrl(ticker))
    .then(resp => {
      if (!resp.ok) throw new Error('no logo for ticker');
      return resp.blob();
    })
    .then(blob => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    }))
    .then(dataUri => { logoCache.set(ticker, dataUri); return dataUri; })
    .catch(() => { logoCache.set(ticker, null); return null; })
    .finally(() => { logoFetches.delete(ticker); });

  logoFetches.set(ticker, promise);
  return promise;
}

// Each chart needs a unique gradient id (SVG ids must be unique within a
// shadow root, and more than one row's chart can be flipped open at once).
let chartIdSeq = 0;

function buildChart(timestamps, closes, prevClose, purchasePrice) {
  const W = 600, H = 140, pad = 6;
  const pairs = (timestamps || [])
    .map((t, i) => ({ t, c: closes[i] }))
    .filter(p => p.c !== null && p.c !== undefined && !isNaN(p.c));

  if (pairs.length < 2) {
    return '<div class="chart-empty">No chart data yet</div>';
  }

  const hasPurchase = purchasePrice !== null && purchasePrice !== undefined && !isNaN(purchasePrice);

  const values = pairs.map(p => p.c);
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (prevClose !== null && prevClose !== undefined) {
    min = Math.min(min, prevClose);
    max = Math.max(max, prevClose);
  }
  if (hasPurchase) {
    min = Math.min(min, purchasePrice);
    max = Math.max(max, purchasePrice);
  }
  if (min === max) { min -= 1; max += 1; }
  const rangeY = max - min;
  const n = pairs.length;

  const x = i => pad + (i / (n - 1)) * (W - pad * 2);
  const y = v => H - pad - ((v - min) / rangeY) * (H - pad * 2);

  // Colour the line per-pixel by where it sits relative to the same
  // reference used for the day's up/down badge (previous close, or the
  // first point if unavailable), rather than one flat colour for the whole
  // line. A vertical gradient with a hard stop at that price does this
  // without needing to split the line into segments.
  const colorRef = (prevClose !== null && prevClose !== undefined) ? prevClose : pairs[0].c;
  const refOffset = Math.min(1, Math.max(0, y(colorRef) / H)).toFixed(4);
  const gradientId = `stock-chart-grad-${chartIdSeq++}`;
  const strokeColor = `url(#${gradientId})`;
  const gradient = `
<linearGradient id="${gradientId}" x1="0" y1="0" x2="0" y2="${H}" gradientUnits="userSpaceOnUse">
  <stop offset="${refOffset}" stop-color="var(--stock-up-color, #2fbf4f)"/>
  <stop offset="${refOffset}" stop-color="var(--stock-down-color, #e64848)"/>
</linearGradient>`;

  const linePoints = pairs.map((p, i) => `${x(i).toFixed(1)},${y(p.c).toFixed(1)}`).join(' ');
  const areaPoints = `${x(0).toFixed(1)},${(H - pad).toFixed(1)} ${linePoints} ${x(n - 1).toFixed(1)},${(H - pad).toFixed(1)}`;

  // Same stroke-width/dasharray/opacity for both reference lines — only the
  // colour differs — so that when the two values are close together (e.g.
  // purchase price near previous close) they read as two clean parallel
  // lines instead of a jumble of mismatched dash rhythms.
  const REF_LINE_STYLE = 'stroke-width="1.5" stroke-dasharray="5,4" opacity="0.75"';

  const prevY = (prevClose !== null && prevClose !== undefined) ? y(prevClose).toFixed(1) : null;
  const prevLine = prevY !== null
    ? `<line x1="0" y1="${prevY}" x2="${W}" y2="${prevY}" stroke="var(--secondary-text-color, #888)" ${REF_LINE_STYLE}/>`
    : '';

  const purchaseY = hasPurchase ? y(purchasePrice).toFixed(1) : null;
  const purchaseLine = purchaseY !== null
    ? `<line x1="0" y1="${purchaseY}" x2="${W}" y2="${purchaseY}" stroke="var(--primary-color, #7c4dff)" ${REF_LINE_STYLE}/>`
    : '';

  return `
<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" class="stock-chart-svg">
  <defs>${gradient}</defs>
  ${prevLine}
  ${purchaseLine}
  <polyline points="${areaPoints}" fill="${strokeColor}" fill-opacity="0.12" stroke="none"/>
  <polyline points="${linePoints}" fill="none" stroke="${strokeColor}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
</svg>`;
}

function readStockData(stock, hass) {
  const state = hass && stock.entity ? hass.states[stock.entity] : null;
  if (!state) {
    return { available: false, symbol: stock.name || stock.entity || '?', name: '' };
  }
  const meta = state.attributes.meta || {};
  const indicators = state.attributes.indicators || {};
  const timestamps = state.attributes.timestamp || [];
  const closes = (indicators.quote && indicators.quote[0] && indicators.quote[0].close) || [];

  const price = parseFloat(state.state);
  const prevClose = meta.previousClose !== undefined ? meta.previousClose : meta.chartPreviousClose;
  const change = (!isNaN(price) && prevClose !== undefined) ? price - prevClose : null;
  const pct = (change !== null && prevClose) ? (change / prevClose) * 100 : null;

  const shares = parseFloat(stock.shares);
  const purchasePrice = parseFloat(stock.purchase_price);
  const brokerageFee = parseFloat(stock.brokerage_fee) || 0;
  const hasHolding = !isNaN(shares) && shares > 0 && !isNaN(purchasePrice);

  let costBasis = null, currentValue = null, plAmount = null, plPct = null;
  if (hasHolding) {
    costBasis = shares * purchasePrice + brokerageFee;
    if (!isNaN(price)) {
      currentValue = shares * price;
      plAmount = currentValue - costBasis;
      plPct = costBasis !== 0 ? (plAmount / costBasis) * 100 : null;
    }
  }

  return {
    available: !isNaN(price),
    // symbol is the prominent (bold) line, name the secondary (grey) one —
    // prefer a configured display name or the company name for symbol, and
    // always show the ticker as the secondary line.
    symbol: stock.name || meta.longName || meta.shortName || meta.symbol || stock.entity,
    name: meta.symbol || '',
    ticker: meta.symbol || '',
    price,
    currency: meta.currency,
    prevClose,
    change,
    pct,
    timestamps,
    closes,
    asOf: meta.regularMarketTime ? new Date(meta.regularMarketTime * 1000) : null,
    dayHigh: meta.regularMarketDayHigh,
    dayLow: meta.regularMarketDayLow,
    volume: meta.regularMarketVolume,
    shares,
    purchasePrice,
    brokerageFee,
    hasHolding,
    costBasis,
    currentValue,
    plAmount,
    plPct,
  };
}

function buildBackContent(d) {
  const dir = dirOf(d.change);
  const changeStr = fmtChange(d.change, d.pct || 0);
  const asOfStr = d.asOf ? d.asOf.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
  const prevCloseStr = d.prevClose !== undefined
    ? ` · <span class="ref-prev">Prev close ${fmtPrice(d.prevClose, d.currency)}</span>`
    : '';
  const yourPriceStr = d.hasHolding
    ? ` · <span class="ref-purchase">Your price ${fmtPrice(d.purchasePrice, d.currency)}</span>`
    : '';
  const costBreakdown = d.hasHolding
    ? `<div class="stock-chart-meta">Cost: ${fmtMoney(d.shares * d.purchasePrice, d.currency)}${d.brokerageFee ? ` + ${fmtMoney(d.brokerageFee, d.currency)} brokerage` : ''} = ${fmtMoney(d.costBasis, d.currency)} · Now: ${fmtMoney(d.currentValue, d.currency)}</div>`
    : '';

  return `
<div class="chart-header">
  <span class="chart-symbol">${d.symbol}</span>
  <span class="stock-change ${dir}"><span class="trend-icon">${trendIcon(dir)}</span> ${changeStr}</span>
</div>
${buildChart(d.timestamps, d.closes, d.prevClose, d.hasHolding ? d.purchasePrice : null)}
<div class="stock-chart-meta">${asOfStr ? `As of ${asOfStr}` : ''}${prevCloseStr}${yourPriceStr}</div>
${costBreakdown}`;
}

function buildRow(stock, index, hass, expanded, showLogos) {
  const d = readStockData(stock, hass);

  if (!d.available) {
    return `
<div class="stock-row" data-index="${index}">
  <div class="stock-static">
    <div class="stock-info">
      <div class="stock-symbol">${d.symbol}</div>
      <div class="stock-name">Unavailable</div>
    </div>
  </div>
</div>`;
  }

  const dir = dirOf(d.change);
  const changeStr = fmtChange(d.change, d.pct || 0);
  const updatedStr = d.asOf ? d.asOf.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

  const plDir = dirOf(d.plAmount);
  const holdingLine = d.hasHolding
    ? `<div class="stock-holding">${d.shares} sh @ ${fmtPrice(d.purchasePrice, d.currency)}</div>
    <div class="stock-pl ${plDir}">${fmtPL(d.plAmount, d.plPct, d.currency)}</div>`
    : '';

  const statsParts = [];
  if (!isNaN(d.dayLow) && !isNaN(d.dayHigh)) {
    statsParts.push(`Day ${fmtPrice(d.dayLow, d.currency)}–${fmtPrice(d.dayHigh, d.currency)}`);
  }
  if (!isNaN(d.volume)) {
    statsParts.push(`Vol ${fmtVolume(d.volume)}`);
  }
  const statsLine = statsParts.length ? `<div class="stock-stats">${statsParts.join(' · ')}</div>` : '';

  // Never render <img src="remote-url"> directly — that would re-request it
  // on every hass update. Once cacheLogo() has resolved a ticker (data URI or
  // confirmed-missing), reuse that result with no network activity at all;
  // until then, render an empty same-sized placeholder for _loadLogos() to
  // fill in asynchronously (see the card class below).
  let logo = '';
  if (showLogos && d.ticker) {
    const cached = logoCache.get(d.ticker);
    if (cached) {
      logo = `<img class="stock-logo" src="${cached}" alt=""/>`;
    } else if (cached !== null) {
      logo = `<span class="stock-logo stock-logo-slot" data-ticker="${d.ticker}"></span>`;
    }
  }

  return `
<div class="stock-row" data-index="${index}">
  <div class="stock-flip ${expanded ? 'flipped' : ''}">
    <div class="stock-front">
      <div class="stock-front-top">
        <div class="stock-left">
          ${logo}
          <div class="stock-info">
            <div class="stock-symbol">${d.symbol}</div>
            <div class="stock-name">${d.name}</div>
          </div>
        </div>
        <div class="stock-price-block">
          <div class="stock-price">${fmtPrice(d.price, d.currency)}</div>
          <div class="stock-change ${dir}"><span class="trend-icon">${trendIcon(dir)}</span> ${changeStr}</div>
          ${holdingLine}
        </div>
      </div>
      ${statsLine}
      ${updatedStr ? `<div class="stock-updated">Updated ${updatedStr}</div>` : ''}
    </div>
    <div class="stock-back">${expanded ? buildBackContent(d) : ''}</div>
  </div>
</div>`;
}

function buildPortfolioSummary(stocks, hass) {
  let totalCost = 0, totalValue = 0, currency = null, count = 0;
  stocks.forEach(s => {
    const d = readStockData(s, hass);
    if (d.hasHolding && d.currentValue !== null) {
      totalCost += d.costBasis;
      totalValue += d.currentValue;
      currency = currency || d.currency;
      count++;
    }
  });
  if (count === 0) return '';

  const pl = totalValue - totalCost;
  const pct = totalCost !== 0 ? (pl / totalCost) * 100 : null;
  const dir = pl > 0 ? 'up' : pl < 0 ? 'down' : 'flat';

  return `
<div class="portfolio-summary">
  <div class="stock-symbol portfolio-title">Portfolio</div>
  <div class="portfolio-row"><span>Invested</span><span>${fmtMoney(totalCost, currency)}</span></div>
  <div class="portfolio-row"><span>Current value</span><span>${fmtMoney(totalValue, currency)}</span></div>
  <div class="portfolio-row total ${dir}"><span>Movement</span><span>${fmtPL(pl, pct, currency)}</span></div>
</div>
<div class="portfolio-divider"></div>`;
}

const STYLES = `
  :host { display: block; }
  ha-card { overflow: hidden; }
  .card-header {
    padding: 14px 16px 4px;
    font-size: 1.1em;
    font-weight: 600;
    letter-spacing: 0.02em;
    color: var(--primary-text-color);
  }
  .stock-list { padding: 4px 0; }
  .stock-row {
    border-bottom: 1px solid var(--divider-color, rgba(0,0,0,0.08));
  }
  .stock-row:last-child { border-bottom: none; }
  .stock-static {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
  }
  .stock-flip {
    position: relative;
    height: 120px;
    cursor: pointer;
  }
  .stock-flip > * { pointer-events: none; }
  .stock-flip:hover .stock-front { background: var(--secondary-background-color, rgba(0,0,0,0.03)); }
  .stock-front {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 10px 16px;
    opacity: 1;
    transition: opacity 0.15s ease;
  }
  .stock-flip.flipped .stock-front { opacity: 0; }
  .stock-front-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .stock-stats {
    margin-top: 6px;
    font-size: 0.72em;
    color: var(--secondary-text-color);
  }
  .stock-back {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 6px 16px 5px;
    opacity: 0;
    transition: opacity 0.15s ease;
    overflow: hidden;
  }
  .stock-flip.flipped .stock-back { opacity: 1; }
  .chart-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 2px;
    flex-shrink: 0;
  }
  .chart-symbol {
    font-weight: 700;
    font-size: 0.95em;
    letter-spacing: 0.03em;
    color: var(--primary-text-color);
  }
  .stock-left { display: flex; align-items: center; gap: 10px; min-width: 0; }
  .stock-logo {
    display: inline-block;
    width: 32px;
    height: 32px;
    border-radius: 6px;
    object-fit: contain;
    background: #fff;
    flex-shrink: 0;
  }
  .stock-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .stock-symbol {
    font-weight: 700;
    font-size: 1.05em;
    letter-spacing: 0.03em;
    color: var(--primary-text-color);
  }
  .stock-name {
    font-size: 0.8em;
    color: var(--secondary-text-color);
  }
  .stock-updated {
    margin-top: 4px;
    font-size: 0.68em;
    color: var(--secondary-text-color);
    opacity: 0.8;
  }
  .stock-price-block { text-align: right; }
  .stock-price {
    font-weight: 700;
    font-size: 1.15em;
    color: var(--primary-text-color);
  }
  .stock-change { font-size: 0.85em; font-weight: 600; }
  .stock-change.up { color: var(--stock-up-color, #2fbf4f); }
  .stock-change.down { color: var(--stock-down-color, #e64848); }
  .stock-change.flat { color: var(--secondary-text-color, #888); }
  .trend-icon {
    display: inline-flex;
    vertical-align: middle;
    margin-top: -2px;
  }
  .trend-icon svg { width: 12px; height: 12px; display: block; }
  .stock-holding {
    margin-top: 4px;
    font-size: 0.72em;
    color: var(--secondary-text-color);
  }
  .stock-pl { font-size: 0.8em; font-weight: 600; }
  .stock-pl.up { color: var(--stock-up-color, #2fbf4f); }
  .stock-pl.down { color: var(--stock-down-color, #e64848); }
  .stock-pl.flat { color: var(--secondary-text-color, #888); }
  .stock-chart-svg { width: 100%; flex: 1; min-height: 0; display: block; }
  .chart-empty {
    padding: 24px 0;
    text-align: center;
    color: var(--secondary-text-color);
    font-size: 0.85em;
  }
  .stock-chart-meta {
    margin-top: 4px;
    font-size: 0.72em;
    color: var(--secondary-text-color);
    text-align: right;
  }
  .ref-prev { color: var(--secondary-text-color, #888); }
  .ref-purchase { color: var(--primary-color, #7c4dff); }
  .portfolio-summary {
    margin: 4px 0 6px;
    padding: 8px 16px;
    background: var(--secondary-background-color, rgba(0,0,0,0.03));
  }
  .portfolio-title { margin-bottom: 6px; }
  .portfolio-divider {
    height: 1px;
    margin: 0 0 4px;
    background: var(--divider-color, rgba(0,0,0,0.12));
  }
  .portfolio-row {
    display: flex;
    justify-content: space-between;
    font-size: 0.85em;
    color: var(--secondary-text-color);
    padding: 2px 0;
  }
  .portfolio-row.total {
    font-weight: 700;
    font-size: 0.95em;
    color: var(--primary-text-color);
    border-top: 1px solid var(--divider-color, rgba(0,0,0,0.1));
    margin-top: 4px;
    padding-top: 6px;
  }
  .portfolio-row.total.up span:last-child { color: var(--stock-up-color, #2fbf4f); }
  .portfolio-row.total.down span:last-child { color: var(--stock-down-color, #e64848); }
  .portfolio-row.total.flat span:last-child { color: var(--secondary-text-color, #888); }
`;

const EDITOR_STYLES = `
  :host { display: block; padding: 4px 0; }
  .stock-editor-row {
    border: 1px solid var(--divider-color, rgba(0,0,0,0.12));
    border-radius: 8px;
    padding: 12px;
    margin: 8px 0;
  }
  .row-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: 500;
    color: var(--primary-text-color);
    margin-bottom: 4px;
    gap: 8px;
  }
  .row-header span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .row-header-btns { display: flex; gap: 2px; flex-shrink: 0; }
  .icon-btn {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 0.85em;
    padding: 4px 8px;
    border-radius: 4px;
    color: var(--secondary-text-color);
  }
  .settings-btn { font-size: 1em; }
  .settings-btn:hover { background: var(--divider-color, rgba(0,0,0,0.12)); }
  .settings-btn.active { color: var(--primary-color, #1976d2); }
  .remove-btn { color: var(--error-color, #f44336); }
  .remove-btn:hover { background: var(--error-color, #f44336); color: white; }
  .stock-advanced {
    border-top: 1px solid var(--divider-color, rgba(0,0,0,0.12));
    margin-top: 8px;
    padding-top: 8px;
  }
  .add-row { margin-top: 8px; display: flex; justify-content: flex-end; }
`;

const TITLE_SCHEMA = [
  { name: 'title', label: 'Card title', selector: { text: {} } },
  { name: 'show_portfolio', label: 'Show portfolio movement summary', selector: { boolean: {} } },
  { name: 'show_logos', label: 'Show company logos (loaded from financialmodelingprep.com)', selector: { boolean: {} } },
];

const STOCK_SCHEMA = [
  { name: 'name', label: 'Display name (optional, overrides company name)', selector: { text: {} } },
  { name: 'entity', label: 'Stock price sensor', selector: { entity: { domain: 'sensor' } } },
];

const STOCK_ADVANCED_SCHEMA = [
  { name: 'shares', label: 'Shares owned (optional)', selector: { number: { mode: 'box', min: 0, step: 'any' } } },
  { name: 'purchase_price', label: 'Purchase price per share (optional)', selector: { number: { mode: 'box', min: 0, step: 'any' } } },
  { name: 'brokerage_fee', label: 'Brokerage fee paid (optional)', selector: { number: { mode: 'box', min: 0, step: 'any' } } },
];

// Browser bootstrap. Guarded so the file can be require()'d under Node for unit
// testing without a DOM — in Node there is no HTMLElement/customElements/window,
// so we skip straight past registration and only the module-level exports above
// are accessible.
if (typeof HTMLElement !== 'undefined') {
  class HaStockTickerCardEditor extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this._config = null;
      this._hass = null;
    }

    set hass(hass) {
      this._hass = hass;
      this.shadowRoot.querySelectorAll('ha-form').forEach(f => { f.hass = hass; });
    }

    setConfig(config) {
      const newConfig = { stocks: [], ...JSON.parse(JSON.stringify(config)) };
      const needsRender = !this._config ||
        newConfig.stocks.length !== this._config.stocks.length;
      this._config = newConfig;
      if (needsRender) this._render();
    }

    _fire() {
      this.dispatchEvent(new CustomEvent('config-changed', {
        detail: { config: this._config },
        bubbles: true, composed: true,
      }));
    }

    _resolveStockLabel(stock, i) {
      const state = this._hass && stock.entity ? this._hass.states[stock.entity] : null;
      return stock.name
        || state?.attributes?.meta?.longName
        || state?.attributes?.friendly_name
        || stock.entity
        || `Stock ${i + 1}`;
    }

    _render() {
      const shadow = this.shadowRoot;
      shadow.innerHTML = `<style>${EDITOR_STYLES}</style>`;

      const titleForm = document.createElement('ha-form');
      titleForm.hass = this._hass;
      titleForm.data = {
        title: this._config.title || '',
        show_portfolio: this._config.show_portfolio !== false,
        show_logos: this._config.show_logos !== false,
      };
      titleForm.schema = TITLE_SCHEMA;
      titleForm.computeLabel = s => s.label || s.name;
      titleForm.addEventListener('value-changed', e => {
        this._config = { ...this._config, ...e.detail.value };
        this._fire();
      });
      shadow.appendChild(titleForm);

      this._config.stocks.forEach((stock, i) => {
        const row = document.createElement('div');
        row.className = 'stock-editor-row';

        const header = document.createElement('div');
        header.className = 'row-header';
        const label = document.createElement('span');
        label.textContent = this._resolveStockLabel(stock, i);

        const headerBtns = document.createElement('div');
        headerBtns.className = 'row-header-btns';

        const hasAdvanced = stock.shares != null || stock.purchase_price != null || stock.brokerage_fee != null;
        const settingsBtn = document.createElement('button');
        settingsBtn.className = `icon-btn settings-btn${hasAdvanced ? ' active' : ''}`;
        settingsBtn.title = 'Optional settings (shares, purchase price, brokerage fee)';
        settingsBtn.textContent = '⚙';

        const removeBtn = document.createElement('button');
        removeBtn.className = 'icon-btn remove-btn';
        removeBtn.textContent = 'Remove';
        removeBtn.addEventListener('click', () => {
          this._config.stocks.splice(i, 1);
          this._fire();
          this._render();
        });

        headerBtns.appendChild(settingsBtn);
        headerBtns.appendChild(removeBtn);
        header.appendChild(label);
        header.appendChild(headerBtns);
        row.appendChild(header);

        const form = document.createElement('ha-form');
        form.hass = this._hass;
        form.data = { name: stock.name || '', entity: stock.entity || '' };
        form.schema = STOCK_SCHEMA;
        form.computeLabel = s => s.label || s.name;
        form.addEventListener('value-changed', e => {
          this._config.stocks[i] = { ...this._config.stocks[i], ...e.detail.value };
          label.textContent = this._resolveStockLabel(this._config.stocks[i], i);
          this._fire();
        });
        row.appendChild(form);

        const advancedWrap = document.createElement('div');
        advancedWrap.className = 'stock-advanced';
        advancedWrap.style.display = hasAdvanced ? '' : 'none';
        settingsBtn.addEventListener('click', () => {
          const showing = advancedWrap.style.display !== 'none';
          advancedWrap.style.display = showing ? 'none' : '';
          settingsBtn.classList.toggle('active', !showing);
        });

        const advForm = document.createElement('ha-form');
        advForm.hass = this._hass;
        advForm.data = {
          shares: stock.shares ?? null,
          purchase_price: stock.purchase_price ?? null,
          brokerage_fee: stock.brokerage_fee ?? null,
        };
        advForm.schema = STOCK_ADVANCED_SCHEMA;
        advForm.computeLabel = s => s.label || s.name;
        advForm.addEventListener('value-changed', e => {
          this._config.stocks[i] = { ...this._config.stocks[i], ...e.detail.value };
          this._fire();
        });
        advancedWrap.appendChild(advForm);
        row.appendChild(advancedWrap);

        shadow.appendChild(row);
      });

      const addRow = document.createElement('div');
      addRow.className = 'add-row';
      const addBtn = document.createElement('button');
      addBtn.textContent = '+ Add Stock';
      addBtn.style.cssText = 'background:var(--primary-color, #1976d2);color:white;border:none;border-radius:4px;padding:8px 16px;font-size:0.875em;font-weight:500;cursor:pointer;letter-spacing:0.04em;';
      addBtn.addEventListener('click', () => {
        this._config.stocks.push({ name: '', entity: '' });
        this._fire();
        this._render();
      });
      addRow.appendChild(addBtn);
      shadow.appendChild(addRow);
    }
  }

  if (!customElements.get('ha-stock-ticker-card-editor')) {
    customElements.define('ha-stock-ticker-card-editor', HaStockTickerCardEditor);
  }

  class HaStockTickerCard extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this._config = null;
      this._hass = null;
      this._expanded = new Set();
    }

    setConfig(config) {
      if (!config.stocks || !Array.isArray(config.stocks)) {
        throw new Error('ha-stock-ticker-card: "stocks" must be a list');
      }
      this._config = config;
      this._buildDOM();
      if (this._hass) this._update();
    }

    set hass(hass) {
      this._hass = hass;
      if (this._config) this._update();
    }

    getCardSize() {
      return 1 + (this._config?.stocks?.length || 1) * 2;
    }

    _buildDOM() {
      const shadow = this.shadowRoot;
      shadow.innerHTML = `
<style>${STYLES}</style>
<ha-card>
  ${this._config.title ? `<div class="card-header">${this._config.title}</div>` : ''}
  <div class="portfolio-summary-wrap"></div>
  <div class="stock-list"></div>
</ha-card>`;
    }

    _update() {
      const list = this.shadowRoot.querySelector('.stock-list');
      if (!list) return;
      const showLogos = this._config.show_logos !== false;
      list.innerHTML = this._config.stocks
        .map((s, i) => buildRow(s, i, this._hass, this._expanded.has(i), showLogos))
        .join('');
      list.querySelectorAll('.stock-row').forEach(rowEl => {
        const flip = rowEl.querySelector('.stock-flip');
        if (!flip) return;
        const index = parseInt(rowEl.dataset.index, 10);
        flip.addEventListener('click', () => this._toggleExpand(index));
      });

      const summaryWrap = this.shadowRoot.querySelector('.portfolio-summary-wrap');
      if (summaryWrap) {
        summaryWrap.innerHTML = this._config.show_portfolio !== false
          ? buildPortfolioSummary(this._config.stocks, this._hass)
          : '';
      }

      this._loadLogos();
    }

    _loadLogos() {
      this.shadowRoot.querySelectorAll('.stock-logo-slot[data-ticker]').forEach(slot => {
        const ticker = slot.dataset.ticker;
        if (!ticker) return;
        cacheLogo(ticker).then(dataUri => {
          if (!dataUri) return;
          // Re-query at resolve time — _update() may have re-rendered (or
          // this row may have flipped/collapsed) since the fetch started.
          this.shadowRoot.querySelectorAll(`.stock-logo-slot[data-ticker="${ticker}"]`).forEach(s => {
            s.outerHTML = `<img class="stock-logo" src="${dataUri}" alt=""/>`;
          });
        });
      });
    }

    _toggleExpand(index) {
      const nowExpanded = !this._expanded.has(index);
      if (nowExpanded) {
        this._expanded.add(index);
      } else {
        this._expanded.delete(index);
      }

      const row = this.shadowRoot.querySelector(`.stock-row[data-index="${index}"] .stock-flip`);
      if (!row) return;
      row.classList.toggle('flipped', nowExpanded);
      if (nowExpanded) {
        const back = row.querySelector('.stock-back');
        if (back) back.innerHTML = buildBackContent(readStockData(this._config.stocks[index], this._hass));
      }
    }

    static getConfigElement() {
      return document.createElement('ha-stock-ticker-card-editor');
    }

    static getStubConfig() {
      return { stocks: [] };
    }
  }

  if (!customElements.get('ha-stock-ticker-card')) {
    customElements.define('ha-stock-ticker-card', HaStockTickerCard);
    console.info(`%c HA-STOCK-TICKER-CARD %c v${CARD_VERSION} `,
      'background:#2fbf4f;color:#000;font-weight:700;padding:2px 4px;border-radius:3px 0 0 3px',
      'background:#1a1a2e;color:#2fbf4f;font-weight:700;padding:2px 4px;border-radius:0 3px 3px 0');
  }

  window.customCards = window.customCards || [];
  window.customCards.push({
    type: 'ha-stock-ticker-card',
    name: 'Stock Ticker Card',
    description: 'Displays stock prices with tap-to-expand daily charts.',
    preview: true,
  });
}

// Expose module-level exports to the Node test runner. `module` is undefined in
// the browser ES-module context, so this is a no-op there.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    fmtPrice, fmtChange, fmtMoney, fmtPL, fmtVolume, trendIcon, dirOf, logoUrl, logoCache, buildChart,
    readStockData, buildBackContent, buildRow, buildPortfolioSummary,
    TITLE_SCHEMA, STOCK_SCHEMA, STOCK_ADVANCED_SCHEMA,
  };
}
