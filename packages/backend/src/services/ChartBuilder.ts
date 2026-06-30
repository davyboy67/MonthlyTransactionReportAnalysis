import { formatZar } from '@transaction-report/shared';

const W = 495;

const PALETTE = ['#166534', '#1e40af', '#92400e', '#991b1b', '#5b21b6'];
const GREEN = '#166534';
const RED = '#991b1b';
const GREY = '#d1d5db';
const TEXT = '#2d2d2d';
const MUTED = '#6b7280';

export interface VerticalBarItem {
  label: string;
  value: number;
  color: string;
}

export interface HorizontalBarItem {
  label: string;
  value: number;
  color?: string;
}

export interface ComparisonBarItem {
  label: string;
  actual: number;
  budget: number;
}

export type ChartConfig =
  | { type: 'vertical-bar'; items: VerticalBarItem[] }
  | { type: 'horizontal-bar'; items: HorizontalBarItem[] }
  | { type: 'horizontal-comparison'; items: ComparisonBarItem[] };

export function buildChartSvg(config: ChartConfig): string {
  switch (config.type) {
    case 'vertical-bar':
      return renderVerticalBar(config.items);
    case 'horizontal-bar':
      return renderHorizontalBar(config.items);
    case 'horizontal-comparison':
      return renderHorizontalComparison(config.items);
  }
}

export function chartHeight(config: ChartConfig): number {
  switch (config.type) {
    case 'vertical-bar':
      return 180;
    case 'horizontal-bar':
      return config.items.length * 32 + 10;
    case 'horizontal-comparison':
      return config.items.length * 36 + 32;
  }
}

function fmt(v: number): string {
  return formatZar(v, 0);
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function clip(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

function renderVerticalBar(items: VerticalBarItem[]): string {
  const H = 180;
  const maxBarH = 120;
  const maxVal = Math.max(...items.map(i => i.value), 1);
  const barW = Math.floor((W - 40) / items.length - 20);
  const totalBarsW = items.length * barW;
  const gap = (W - totalBarsW) / (items.length + 1);
  const baseline = H - 36;

  const rects = items
    .map((item, i) => {
      const bH = Math.max(Math.round((item.value / maxVal) * maxBarH), 2);
      const x = gap + i * (barW + gap);
      const y = baseline - bH;
      return `
    <rect x="${x}" y="${y}" width="${barW}" height="${bH}" rx="4" fill="${item.color}" opacity="0.9"/>
    <text x="${x + barW / 2}" y="${baseline + 14}" text-anchor="middle" font-family="Helvetica" font-size="9" fill="${MUTED}">${esc(item.label)}</text>
    <text x="${x + barW / 2}" y="${baseline + 26}" text-anchor="middle" font-family="Helvetica-Bold" font-size="8" fill="${TEXT}">${esc(fmt(item.value))}</text>`;
    })
    .join('');

  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <line x1="0" y1="${baseline}" x2="${W}" y2="${baseline}" stroke="${GREY}" stroke-width="1"/>
  ${rects}
</svg>`;
}

function renderHorizontalBar(items: HorizontalBarItem[]): string {
  const labelW = 120;
  const amountW = 70;
  const barAreaW = W - labelW - amountW - 12;
  const rowH = 32;
  const barH = 14;
  const H = items.length * rowH + 10;
  const maxVal = Math.max(...items.map(i => i.value), 1);

  const rows = items
    .map((item, i) => {
      const bW = Math.max(Math.round((item.value / maxVal) * barAreaW), 2);
      const barY = i * rowH + (rowH - barH) / 2;
      const color = item.color ?? PALETTE[i % PALETTE.length];
      return `
    <text x="0" y="${barY + 11}" font-family="Helvetica" font-size="10" fill="${TEXT}">${esc(clip(item.label, 18))}</text>
    <rect x="${labelW}" y="${barY}" width="${barAreaW}" height="${barH}" rx="3" fill="${GREY}" opacity="0.5"/>
    <rect x="${labelW}" y="${barY}" width="${bW}" height="${barH}" rx="3" fill="${color}" opacity="0.9"/>
    <text x="${labelW + barAreaW + 6}" y="${barY + 11}" font-family="Helvetica" font-size="9" fill="${MUTED}">${esc(fmt(item.value))}</text>`;
    })
    .join('');

  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  ${rows}
</svg>`;
}

function renderHorizontalComparison(items: ComparisonBarItem[]): string {
  const labelW = 120;
  const overW = 36;
  const barAreaW = W - labelW - overW - 8;
  const rowH = 36;
  const trackH = 10;
  const H = items.length * rowH + 32;
  const maxVal = Math.max(...items.map(i => Math.max(i.budget, i.actual)), 1);

  const legend = `
  <rect x="0" y="0" width="12" height="10" rx="2" fill="${GREY}"/>
  <text x="16" y="9" font-family="Helvetica" font-size="9" fill="${MUTED}">Budget</text>
  <rect x="62" y="0" width="12" height="10" rx="2" fill="${GREEN}"/>
  <text x="78" y="9" font-family="Helvetica" font-size="9" fill="${MUTED}">Actual</text>`;

  const rows = items
    .map((item, i) => {
      const y = i * rowH + 26;
      const barY = y + (rowH - trackH) / 2 - 8;
      const budgetW = Math.max(Math.round((item.budget / maxVal) * barAreaW), 2);
      const rawActualW = Math.round((item.actual / maxVal) * barAreaW);
      const actualW = Math.max(Math.min(rawActualW, barAreaW), 2);
      const over = item.actual > item.budget;
      const fillColor = over ? RED : GREEN;

      const overLabel = over
        ? `<text x="${labelW + barAreaW + 4}" y="${barY + 9}" font-family="Helvetica-Bold" font-size="7" fill="${RED}">OVER</text>`
        : '';

      return `
    <text x="0" y="${barY + 9}" font-family="Helvetica" font-size="10" fill="${TEXT}">${esc(clip(item.label, 18))}</text>
    <rect x="${labelW}" y="${barY}" width="${budgetW}" height="${trackH}" rx="3" fill="${GREY}" opacity="0.6"/>
    <rect x="${labelW}" y="${barY}" width="${actualW}" height="${trackH}" rx="3" fill="${fillColor}" opacity="0.85"/>
    ${overLabel}
    <text x="${labelW}" y="${barY + trackH + 10}" font-family="Helvetica" font-size="8" fill="${MUTED}">${esc(fmt(item.actual))} / ${esc(fmt(item.budget))}</text>`;
    })
    .join('');

  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  ${legend}
  ${rows}
</svg>`;
}
