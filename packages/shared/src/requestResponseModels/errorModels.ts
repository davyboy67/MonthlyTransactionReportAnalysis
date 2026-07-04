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

export class UnsupportedStatementFormatError extends Error {
  constructor(detail: string) {
    super(`Unsupported statement format: ${detail}`);
    this.name = "UnsupportedStatementFormatError";
  }
}
