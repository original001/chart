import { createPathAttr, createSvgPath } from "../src/app";

describe("", () => {
  it("create path", () => {
    const path = createPathAttr([[1, 1], [2, 2], [3, 3]]);
    expect(path).toBe("M1 1 L2 2 L3 3");
  });
  it("create svgPath", () => {
    const svgPath = createSvgPath("M1 1 L2 2 L3 3", "#3DC23F");
    expect(svgPath.innerHTML).toBe("<path />");
  });
});
