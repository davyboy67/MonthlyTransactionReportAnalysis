import { buildReportPdf } from '../src/services/PdfReportBuilder';
import { IReportAnalysis, ICategorySummary, TransactionType } from '@transaction-report/shared';

const makeReport = (categorySummaries: ICategorySummary[]): IReportAnalysis => ({
  Date: new Date('2026-07-31'),
  TotalIncome: 5000,
  TotalExpenses: 2000,
  TotalSavings: 500,
  CategorySummaries: categorySummaries,
});

const makeIncomeSummary = (sources: Array<{ merchant: string; amount: number }>): ICategorySummary => ({
  CategoryName: 'Income',
  TotalAmount: sources.reduce((sum, s) => sum + s.amount, 0),
  Transactions: sources.map(s => ({
    Date: new Date('2026-07-01'),
    Description: s.merchant,
    Amount: s.amount,
    Category: 'Income',
    Merchant: s.merchant,
    Month: '7',
    Type: TransactionType.Income,
  })),
});

// pdfkit compresses its content streams by default, so the section text isn't a plain
// substring of the buffer — these are smoke tests (does it resolve, does adding a
// section grow the output) rather than assertions on rendered content.
describe('buildReportPdf — income breakdown section', () => {
  it('resolves to a valid PDF buffer when there is no Income category at all', async () => {
    const report = makeReport([]);

    const buffer = await buildReportPdf(report, null, 'Dave', 7, 2026);

    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
  });

  it('does not throw when the Income category has zero transactions', async () => {
    const report = makeReport([{ CategoryName: 'Income', TotalAmount: 0, Transactions: [] }]);

    await expect(buildReportPdf(report, null, 'Dave', 7, 2026)).resolves.toBeInstanceOf(Buffer);
  });

  it('produces a larger PDF when income transactions are present than when absent', async () => {
    const withoutIncome = await buildReportPdf(makeReport([]), null, 'Dave', 7, 2026);
    const withIncome = await buildReportPdf(
      makeReport([makeIncomeSummary([{ merchant: 'Employer', amount: 5000 }])]),
      null,
      'Dave',
      7,
      2026,
    );

    expect(withIncome.length).toBeGreaterThan(withoutIncome.length);
  });

  it('does not throw when there are more than 5 income sources', async () => {
    const sources = Array.from({ length: 8 }, (_, i) => ({ merchant: `Source ${i}`, amount: i + 1 }));
    const report = makeReport([makeIncomeSummary(sources)]);

    await expect(buildReportPdf(report, null, 'Dave', 7, 2026)).resolves.toBeInstanceOf(Buffer);
  });
});
