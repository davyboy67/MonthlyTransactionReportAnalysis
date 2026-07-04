/**
 * Minimal RFC 4180 CSV parser: handles quoted fields (commas/newlines inside
 * quotes, "" escapes), CRLF/LF line endings, and a UTF-8 BOM. Cell values are
 * trimmed, matching how bank exports pad columns with whitespace.
 */
export function parseCsv(content: string): string[][] {
  const src = content.replace(/^\uFEFF/, "").trim();
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  const pushCell = () => {
    row.push(cell.trim());
    cell = "";
  };
  const pushRow = () => {
    pushCell();
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
    } else if (ch === '"' && cell.trim() === "") {
      inQuotes = true;
      cell = "";
    } else if (ch === ",") {
      pushCell();
    } else if (ch === "\n") {
      pushRow();
    } else if (ch !== "\r") {
      cell += ch;
    }
  }
  pushRow();

  return rows;
}
