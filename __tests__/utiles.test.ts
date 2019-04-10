import { getBoundsX, getBounds } from "../src/axis";
import { getScaleY, ChartInfo } from "../src/app";
import { shallowEqual, getStackedMax } from "../src/utils";

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

describe("axis", () => {
  const chartHeight = 300;
  it("get bounds 19-191", () => {
    const { values } = getBounds(chartHeight, 191, 19);
    expect(values).toEqual([0, 40, 80, 120, 160, 200]);
  });
  it("get bounds 190-210", () => {
    const { values } = getBounds(chartHeight, 210, 190);
    expect(values).toEqual([190, 194, 198, 202, 206, 210]);
  });
  it("get bounds 820900-1417200", () => {
    const { values } = getBounds(chartHeight, 1417200, 820900);
    expect(values).toEqual([800000, 940000, 1080000, 1220000, 1360000, 1500000]);
  });
});

describe("shallow equal", () => {
  it("should true", () => {
    const res = shallowEqual([1, 2, 3], [1, 2, 3]);
    expect(res).toBeTruthy();
  });
  it("should false", () => {
    const res = shallowEqual([1, 2, 3], [1, 3, 3]);
    expect(res).toBeFalsy();
  });
});

describe("stacked", () => {
  it("max", () => {
    const res = getStackedMax(0, 3, [
      { values: [1, 2, 4] } as ChartInfo,
      { values: [10, 22, 11] } as ChartInfo,
      { values: [100, 50, 50] } as ChartInfo
    ]);
    expect(res).toBe(111);
  });
});

// describe('get bounds')
