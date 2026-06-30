import SVGtoPDF from 'svg-to-pdfkit';
import PDFDocument from 'pdfkit';
import type { IReportAnalysis } from '@transaction-report/shared';
import type { IBudget } from '@transaction-report/shared';
import { formatZar, formatMonthLabel } from '@transaction-report/shared';
import { buildChartSvg, chartHeight } from './ChartBuilder';

const MARGIN = 50;
const PAGE_WIDTH = 595;
const USABLE_WIDTH = PAGE_WIDTH - MARGIN * 2;

const COLOR = {
  dark: '#1a1a2e',
  muted: '#6b7280',
  rule: '#d1d5db',
  green: '#166534',
  red: '#991b1b',
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
    { label: 'Savings', value: fmtCurrency(report.TotalSavings), color: '#1e40af' },
    { label: 'Savings Rate', value: `${savingsRate}%`, color: '#5b21b6' },
  ];

  items.forEach((item, i) => {
    const x = MARGIN + i * (boxW + gap);
    doc.roundedRect(x, startY, boxW, boxH, 6).fill('#f3f4f6');
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
      { label: 'Income',   value: report.TotalIncome,   color: '#166534' },
      { label: 'Expenses', value: report.TotalExpenses, color: '#991b1b' },
      { label: 'Savings',  value: report.TotalSavings,  color: '#1e40af' },
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
    items: top5.map(cs => ({ label: cs.name, value: cs.amount })),
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
    `Generated on ${new Date().toLocaleDateString('en-ZA')} — Transaction Report`,
    MARGIN, footerY, { width: USABLE_WIDTH, align: 'center' },
  );
}
