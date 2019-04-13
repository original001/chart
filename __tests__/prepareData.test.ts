import { prepareData, localPrepare } from "../src/prepareData";
import { CHART_WIDTH } from "../src/constant";
import { ChartDto } from "../src/chart_data";
import { defaultAppState } from "../src/app";

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

describe("prepare data", () => {
  const expected = (d, isPercentage?) => {
    expect(d.charts.length).toBe(2);
    expect(d.visibles["y0"]).toBe(true);
    expect(d.visibles["y1"]).toBe(true);
    expect(d.zoomed).toBe(false);
    expect(d.scaledX_(1551744000000)).toBe(25);
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
    expect(d.charts[1].sliderPath).toBe("M0 44.7 L25 45 L50 44.4 L75 44.1 L100 44.3");
    expect(d.charts[0].sliderPath).toBe("M0 27.5 L25 0 L50 5.8 L75 8.9 L100 24.9");
    expect(d.charts[0].chartPath).toBe("M0 314.44 L25 313.58 L50 313.76 L75 313.86 L100 314.36");
    expect(d.charts[1].chartPath).toBe("M0 314.978 L25 314.988 L50 314.97 L75 314.96 L100 314.967");
    expect(d.minY).toBe(0.012);
  });

  it("y scaled", () => {
    const d = prepareData({ ...data, y_scaled: true }, () => {}, false);
    expected(d);
    expect(d.charts[1].sliderPath).toBe("M0 28.9 L25 45 L50 16.1 L75 0 L100 11.3");
    expect(d.charts[0].sliderPath).toBe("M0 45 L25 0 L50 9.4 L75 14.7 L100 40.8");
    expect(d.charts[0].chartPath).toBe("M0 314.44 L25 313.58 L50 313.76 L75 313.86 L100 314.36");
    expect(d.charts[1].chartPath).toBe("M0 314.978 L25 314.988 L50 314.97 L75 314.96 L100 314.967");
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

describe("localPrepare", () => {
  const expectedX = [
    1551657600000,
    1551674880000,
    1551692160000,
    1551709440000,
    1551726720000,
    1551744000000,
    1551761280000,
    1551778560000,
    1551795840000,
    1551813120000,
    1551830400000,
    1551847680000,
    1551864960000,
    1551882240000,
    1551899520000,
    1551916800000,
    1551934080000,
    1551951360000,
    1551968640000,
    1551985920000,
    1552003200000
  ];
  it("default", () => {
    const p = prepareData(data, () => {}, false);
    const localData = localPrepare(p, {
      ...defaultAppState,
      visibles: p.visibles,
      sliderPos: { left: 0.5, right: 1 }
    });
    expect(localData).toEqual({
      charts: p.charts,
      offsetY: 0,
      offsetY2: 1,
      scaleY: 157.5,
      scaleY2: 315,
      valuesX: expectedX,
      valuesY: [0, 0.4, 0.8, 1.2, 1.6, 2],
      valuesY2: null
    });
  });
  it("y_scaled", () => {
    const p = prepareData({ ...data, y_scaled: true }, () => {}, false);
    const localData = localPrepare(p, {
      ...defaultAppState,
      visibles: p.visibles,
      sliderPos: { left: 0.5, right: 1 }
    });
    expect(localData).toEqual({
      charts: p.charts,
      offsetY: 0.6000000000000001,
      offsetY2: 0.03,
      scaleY: 450.00000000000006,
      scaleY2: 31499.999999999993,
      valuesX: expectedX,
      valuesY: [0.6, 0.74, 0.88, 1.02, 1.16, 1.3],
      valuesY2: [0.03, 0.032, 0.034, 0.036, 0.038, 0.04]
    });
  });

  it("stacked", () => {
    const p = prepareData({ ...data, stacked: true }, () => {}, false);
    const localData = localPrepare(p, {
      ...defaultAppState,
      visibles: p.visibles,
      sliderPos: { left: 0.5, right: 1 }
    });
    expect(localData).toEqual({
      charts: p.charts,
      valuesX: expectedX,
      offsetY: 0,
      offsetY2: 1,
      scaleY: 157.5,
      scaleY2: 315,
      valuesY: [0, 0.4, 0.8, 1.2, 1.6, 2],
      valuesY2: null
    });
  });
  it("stacked", () => {
    const p = prepareData({ ...data, percentage: true }, () => {}, false);
    const localData = localPrepare(p, {
      ...defaultAppState,
      visibles: p.visibles,
      sliderPos: { left: 0.5, right: 1 }
    });
    expect(localData).toEqual({
      charts: p.charts,
      valuesX: expectedX,
      offsetY: 0,
      offsetY2: 1,
      scaleY: 3.15,
      scaleY2: 315,
      valuesY: [0, 20, 40, 60, 80, 100],
      valuesY2: null
    });
  });
});
