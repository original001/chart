import { getBoundsX } from "../src/axis";

describe("dates values", () => {
  it("", () => {
    const values = getBoundsX(1, 12, 2);
    expect(values).toEqual([2, 4, 6, 8, 10, 12]);
  });
  it("", () => {
    const values = getBoundsX(2.5, 12, 2);
    expect(values).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });
  xit("", () => {
    const values = getBoundsX(4.5, 12, 2);
    expect(values).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });
});
