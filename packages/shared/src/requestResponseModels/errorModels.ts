export class ReportNotFoundError extends Error {
  constructor(date: Date) {
    super(`Report not found for date: ${date.toISOString()}`);
    this.name = "ReportNotFoundError";
  }
}

export class ReportNotSavedError extends Error {
  constructor(date: Date) {
    super(`Failed to save report for date: ${date.toISOString()}`);
    this.name = "ReportNotSavedError";
  }
}

const asDay = (date: Date): string =>
  date.toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" });

export class EmptyStatementError extends Error {
  constructor() {
    super(
      "No transactions could be read from this file. Check that it is an unmodified CSV statement export."
    );
    this.name = "EmptyStatementError";
  }
}

export class NoTransactionsInPeriodError extends Error {
  constructor(windowStart: Date, windowEnd: Date, fileStart: Date, fileEnd: Date) {
    super(
      `No transactions between ${asDay(windowStart)} and ${asDay(windowEnd)}. ` +
        `This file covers ${asDay(fileStart)} - ${asDay(fileEnd)}.`
    );
    this.name = "NoTransactionsInPeriodError";
  }
}
