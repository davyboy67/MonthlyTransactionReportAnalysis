import { utils } from "../src/utils/utils";

describe("utils.filterCsvData", () => {
  const rows = [
    ["h0"],
    ["h1"],
    ["h2"],
    ["r1", "a"],
    ["r2", "b"],
  ];

  it("should drop the first N rows", () => {
    const result = utils.filterCsvData(rows, 3);

    expect(result).toEqual([
      ["r1", "a"],
      ["r2", "b"],
    ]);
  });

  it("should return the whole array when skipping 0 rows", () => {
    expect(utils.filterCsvData(rows, 0)).toEqual(rows);
  });

  it("should return an empty array when skipping more rows than exist", () => {
    expect(utils.filterCsvData(rows, 99)).toEqual([]);
  });

  it("should not mutate the original array", () => {
    const copy = [...rows];
    utils.filterCsvData(rows, 2);
    expect(rows).toEqual(copy);
  });
});
