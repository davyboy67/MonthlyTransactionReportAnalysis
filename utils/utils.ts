
export class utils {
    static filterCsvData(csvData: string[][], rowsToSkip: number): string[][] {
        return csvData.slice(rowsToSkip);
    }
}