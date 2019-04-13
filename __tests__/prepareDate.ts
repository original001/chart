import { prepareData } from "../src/prepareData";
import { CHART_WIDTH } from "../src/constant";
import { ChartDto } from "../src/chart_data";

describe("prepare data", () => {
  const data: ChartDto = {
    columns: [
      ["x", 1551657600000, 1551744000000, 1551830400000, 1551916800000, 1552003200000],
      ["y0", 560, 1420, 1240, 1140, 640],
      ["y1", 22, 12, 30, 40, 33]
    ],
    types: { y0: "line", y1: "line", x: "x" },
    names: { y0: "#0", y1: "#1" },
    colors: { y0: "#3DC23F", y1: "#F34C44" }
  };

  const expected = (d, isPercentage?) => {
    expect(d.charts.length).toBe(2);
    expect(d.visibles["y0"]).toBe(true);
    expect(d.visibles["y1"]).toBe(true);
    expect(d.zoomed).toBe(false);
    expect(d.scaledX_(1551744000000)).toBe(-5);
    expect(d.charts.length).toBe(2);
    expect(d.scaleX).toBe(CHART_WIDTH / (1552003200000 - 1551657600000));
    if (!isPercentage) {
    const { min, max, name, color } = d.charts[0];
    const { min: min2, max: max2, name: name2, color: color2 } = d.charts[1];
    expect(d.charts[0].dots).toEqual([
      [1551657600000, 0.56],
      [1551744000000, 1.42],
      [1551830400000, 1.24],
      [1551916800000, 1.14],
      [1552003200000, 0.64]
    ]);
    expect(d.charts[0].values).toEqual([0.56, 1.42, 1.24, 1.14, 0.64]);
    expect(d.charts[1].values).toEqual([0.022, 0.012, 0.03, 0.04, 0.033]);

    expect(d.maxY).toBe(1.42);
    expect(d.pow).toBe(1000);
    expect([max, min, name, color]).toEqual([1.42, 0.56, "#0", "#3DC23F"]);
    expect([max2, min2, name2, color2]).toEqual([0.04, 0.012, "#1", "#F34C44"]);
    }
  };

  it("default", () => {
    const d = prepareData(data, () => {}, false);
    expected(d);
    expect(d.charts[1].sliderPath).toBe("M0 44.7 L-5 45 L-10 44.4 L-15 44.1 L-20 44.3");
    expect(d.charts[0].sliderPath).toBe("M0 27.5 L-5 0 L-10 5.8 L-15 8.9 L-20 24.9");
    expect(d.charts[0].chartPath).toBe("M0 314.44 L-5 313.58 L-10 313.76 L-15 313.86 L-20 314.36");
    expect(d.charts[1].chartPath).toBe(
      "M0 314.978 L-5 314.988 L-10 314.97 L-15 314.96 L-20 314.967"
    );
    expect(d.minY).toBe(0.012);
  });

  it("y scaled", () => {
    const d = prepareData({ ...data, y_scaled: true }, () => {}, false);
    expected(d);
    expect(d.charts[1].sliderPath).toBe("M0 28.9 L-5 45 L-10 16.1 L-15 0 L-20 11.3");
    expect(d.charts[0].sliderPath).toBe("M0 45 L-5 0 L-10 9.4 L-15 14.7 L-20 40.8");
    expect(d.charts[0].chartPath).toBe("M0 314.44 L-5 313.58 L-10 313.76 L-15 313.86 L-20 314.36");
    expect(d.charts[1].chartPath).toBe(
      "M0 314.978 L-5 314.988 L-10 314.97 L-15 314.96 L-20 314.967"
    );
    expect(d.minY).toBe(0.012);
  });
  it("stacked", () => {
    const d = prepareData({ ...data, stacked: true }, () => {}, false);
    expected(d);
    expect(d.charts[1].sliderPath).toBe(null);
    expect(d.charts[0].sliderPath).toBe(null);
    expect(d.charts[0].chartPath).toBe(null);
    expect(d.charts[1].chartPath).toBe(null);
    expect(d.minY).toBe(0);
  });
  it("percentages", () => {
    const d = prepareData({ ...data, stacked: true, percentage: true }, () => {}, false);
    expected(d, true);
    const { min, max, name, color } = d.charts[0];
    const { min: min2, max: max2, name: name2, color: color2 } = d.charts[1];
    expect([max, min, name, color]).toEqual([99, 95, "#0", "#3DC23F"]);
    expect([max2, min2, name2, color2]).toEqual([5, 1, "#1", "#F34C44"]);
    expect(d.charts[0].values).toEqual([96, 99, 98, 97, 95]);
    expect(d.charts[1].values).toEqual([4, 1, 2, 3, 5]);
    expect(d.charts[1].sliderPath).toBe(null);
    expect(d.charts[0].sliderPath).toBe(null);
    expect(d.charts[0].chartPath).toBe(null);
    expect(d.charts[1].chartPath).toBe(null);
    expect(d.charts[0].dots).toEqual([
      [1551657600000, 96],
      [1551744000000, 99],
      [1551830400000, 98],
      [1551916800000, 97],
      [1552003200000, 95]
    ]);
    expect(d.maxY).toBe(100);
    expect(d.minY).toBe(0);
    expect(d.pow).toBe(1);
  });
});