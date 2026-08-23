import SVGtoPDF from 'svg-to-pdfkit';
import PDFDocument from 'pdfkit';
import type { IReportAnalysis } from '@transaction-report/shared';
import type { IBudget } from '@transaction-report/shared';
import {
  formatZar,
  formatMonthLabel,
  formatPercent,
  formatLongDate,
  categoryColor,
  THEME,
} from '@transaction-report/shared';
import { buildChartSvg, chartHeight } from './ChartBuilder';

const MARGIN = 50;
const PAGE_WIDTH = 595;
const USABLE_WIDTH = PAGE_WIDTH - MARGIN * 2;

// Shared with the web app and the email. A PDF page is white, so the light
// theme is the correct one here whatever the user has selected in the app.
const T = THEME.light;
const COLOR = {
  dark: T.textPrimary,
  muted: T.textSecondary,
  rule: T.borderStrong,
  green: T.income,
  red: T.expenses,
};

function fmtCurrency(v: number): string {
  return formatZar(v, 0);
}

function rule(doc: PDFKit.PDFDocument, y: number): void {
  doc.moveTo(MARGIN, y).lineTo(PAGE_WIDTH - MARGIN, y).strokeColor(COLOR.rule).lineWidth(0.5).stroke();
}

function embedSvg(doc: PDFKit.PDFDocument, svg: string, height: number, gap = 16): void {
  SVGtoPDF(doc, svg, MARGIN, doc.y, { width: USABLE_WIDTH, assumePt: true });
  doc.y += height + gap;
}

export async function buildReportPdf(
  report: IReportAnalysis,
  budget: IBudget | null,
  firstName: string,
  month: number,
  year: number,
): Promise<Buffer> {
  const doc = new PDFDocument({ autoFirstPage: true, size: 'A4', margin: MARGIN });

  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    drawHeader(doc, firstName, month, year);
    drawSummaryRow(doc, report);
    drawNetPositionChart(doc, report);
    drawBudgetSection(doc, report, budget);
    drawIncomeBreakdown(doc, report);
    drawTopCategories(doc, report);
    drawFooter(doc);

    doc.end();
  });
}

function drawHeader(doc: PDFKit.PDFDocument, firstName: string, month: number, year: number): void {
  doc.font('Helvetica').fontSize(9).fillColor(COLOR.muted)
    .text('MONTHLY FINANCIAL REPORT', MARGIN, MARGIN, { characterSpacing: 1.5 });
  doc.font('Helvetica-Bold').fontSize(24).fillColor(COLOR.dark)
    .text(formatMonthLabel(month, year), MARGIN, MARGIN + 18);
  doc.font('Helvetica').fontSize(11).fillColor(COLOR.muted)
    .text(`Prepared for: ${firstName}`, MARGIN, doc.y + 4);
  rule(doc, doc.y + 10);
  doc.y += 24;
}

function drawSummaryRow(doc: PDFKit.PDFDocument, report: IReportAnalysis): void {
  const boxW = (USABLE_WIDTH - 12) / 4;
  const boxH = 68;
  const gap = 4;
  const startY = doc.y;
  const savingsRate =
    report.TotalIncome > 0 ? Math.round((report.TotalSavings / report.TotalIncome) * 100) : 0;

  const items = [
    { label: 'Income', value: fmtCurrency(report.TotalIncome), color: COLOR.green },
    { label: 'Expenses', value: fmtCurrency(report.TotalExpenses), color: COLOR.red },
    { label: 'Savings', value: fmtCurrency(report.TotalSavings), color: T.savings },
    { label: 'Savings Rate', value: formatPercent(savingsRate, 0), color: T.palette[4] },
  ];

  items.forEach((item, i) => {
    const x = MARGIN + i * (boxW + gap);
    doc.roundedRect(x, startY, boxW, boxH, 6).fill(T.surfaceSunken);
    doc.font('Helvetica-Bold').fontSize(15).fillColor(item.color)
      .text(item.value, x + 8, startY + 14, { width: boxW - 16, align: 'center' });
    doc.font('Helvetica').fontSize(9).fillColor(COLOR.muted)
      .text(item.label, x + 8, startY + 44, { width: boxW - 16, align: 'center' });
  });

  doc.y = startY + boxH + 20;
}

function drawNetPositionChart(doc: PDFKit.PDFDocument, report: IReportAnalysis): void {
  doc.font('Helvetica-Bold').fontSize(13).fillColor(COLOR.dark).text('Net Position', MARGIN, doc.y);
  rule(doc, doc.y + 6);
  doc.y += 14;

  const config = {
    type: 'vertical-bar' as const,
    items: [
      { label: 'Income',   value: report.TotalIncome,   color: T.income },
      { label: 'Expenses', value: report.TotalExpenses, color: T.expenses },
      { label: 'Savings',  value: report.TotalSavings,  color: T.savings },
    ],
  };
  embedSvg(doc, buildChartSvg(config), chartHeight(config));
}

function drawBudgetSection(
  doc: PDFKit.PDFDocument,
  report: IReportAnalysis,
  budget: IBudget | null,
): void {
  if (doc.y + 80 > 792 - MARGIN) { doc.addPage(); doc.y = MARGIN; }

  doc.font('Helvetica-Bold').fontSize(13).fillColor(COLOR.dark).text('Budget vs Actual Spending', MARGIN, doc.y);
  rule(doc, doc.y + 6);
  doc.y += 14;

  if (!budget || budget.categories.length === 0) {
    doc.font('Helvetica').fontSize(10).fillColor(COLOR.muted).text('No budget set for this month.', MARGIN, doc.y);
    doc.y += 24;
    return;
  }

  const items = budget.categories
    .filter(cat => cat.amount > 0)
    .map(cat => ({
      name: cat.category_name,
      budget: cat.amount,
      actual: report.CategorySummaries.find(
        cs => cs.CategoryName.toLowerCase().trim() === cat.category_name.toLowerCase().trim(),
      )?.TotalAmount ?? 0,
    }));

  const config = {
    type: 'horizontal-comparison' as const,
    items: items.map(i => ({ label: i.name, budget: i.budget, actual: i.actual })),
  };
  if (doc.y + chartHeight(config) > 792 - MARGIN) { doc.addPage(); doc.y = MARGIN; }
  embedSvg(doc, buildChartSvg(config), chartHeight(config));
}

function drawIncomeBreakdown(doc: PDFKit.PDFDocument, report: IReportAnalysis): void {
  const incomeTransactions = report.CategorySummaries.filter(
    cs => cs.CategoryName.toLowerCase() === 'income',
  ).flatMap(cs => cs.Transactions ?? []);

  if (incomeTransactions.length === 0) return;

  const bySource = new Map<string, number>();
  for (const t of incomeTransactions) {
    const name = t.Merchant || t.Description;
    bySource.set(name, (bySource.get(name) ?? 0) + t.Amount);
  }

  const sources = [...bySource.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, amount]) => ({ label: name, value: amount }));

  const config = { type: 'horizontal-bar' as const, items: sources };
  if (doc.y + chartHeight(config) + 40 > 792 - MARGIN) { doc.addPage(); doc.y = MARGIN; }

  doc.font('Helvetica-Bold').fontSize(13).fillColor(COLOR.dark).text('Income Breakdown', MARGIN, doc.y);
  rule(doc, doc.y + 6);
  doc.y += 14;

  embedSvg(doc, buildChartSvg(config), chartHeight(config));
}

function drawTopCategories(doc: PDFKit.PDFDocument, report: IReportAnalysis): void {
  const EXCLUDED = new Set(['income', 'savings']);
  const top5 = [...report.CategorySummaries]
    .filter(cs => !EXCLUDED.has(cs.CategoryName.toLowerCase()))
    .sort((a, b) => b.TotalAmount - a.TotalAmount)
    .slice(0, 5)
    .map(cs => ({ name: cs.CategoryName, amount: cs.TotalAmount }));

  if (top5.length === 0) return;

  const config = {
    type: 'horizontal-bar' as const,
    // These labels are category names, so they get the stable colour the web
    // app uses. Income sources above are merchants and keep the positional one.
    items: top5.map(cs => ({
      label: cs.name,
      value: cs.amount,
      color: categoryColor(cs.name, 'light'),
    })),
  };
  if (doc.y + chartHeight(config) + 40 > 792 - MARGIN) { doc.addPage(); doc.y = MARGIN; }

  doc.font('Helvetica-Bold').fontSize(13).fillColor(COLOR.dark).text('Top Spending Categories', MARGIN, doc.y);
  rule(doc, doc.y + 6);
  doc.y += 14;

  embedSvg(doc, buildChartSvg(config), chartHeight(config));
}

function drawFooter(doc: PDFKit.PDFDocument): void {
  const footerY = 842 - MARGIN - 12;
  rule(doc, footerY - 6);
  doc.font('Helvetica').fontSize(8).fillColor(COLOR.muted).text(
    `Generated on ${formatLongDate(new Date())}. Transaction Report.`,
    MARGIN, footerY, { width: USABLE_WIDTH, align: 'center' },
  );
}
