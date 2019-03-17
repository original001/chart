import {
  createPathAttr,
  createSvgPath,
  zipDots,
  getChartsFromData,
  createChart,
  getScaleY,
  getHighLow
} from "../src/app";
import { getBounds } from "../src/axis";
import { ChartDto } from "../src/chart_data";
import {
  Tree,
  render,
  Component,
  Ruller,
  createElement,
  renderComponent
} from "../src/reconciler";

describe("", () => {
  // it("create path", () => {
  //   const path = createPathAttr([[1, 1], [2, 2], [3, 3]], 100, 1);
  //   expect(path).toBe("M0 1 L100 2 L200 3");
  // });
  it("create path with offset", () => {
    const path = createPathAttr(
      [[10000, 100], [20000, 105], [30000, 110]],
      x => x * 100,
      y => 200 - (y - 100) * 20
    );
    expect(path).toBe("M0 200 L100 100 L200 0");
  });
  xit("create svgPath", () => {
    const svgPath = createSvgPath("M1 1 L2 2 L3 3", "#3DC23F");
    expect(svgPath).toBe(
      '<path path="M1 1 L2 2 L3 3" stroke="#3DC23F" stroke-width="2" />'
    );
  });
});

describe("utils", () => {
  const data: ChartDto = {
    columns: [
      [
        "x",
        1551657600000,
        1551744000000,
        1551830400000,
        1551916800000,
        1552003200000
      ],
      ["y1", 56, 142, 124, 114, 64],
      ["y2", 22, 12, 30, 40, 33]
    ],
    types: { y0: "line", y1: "line", x: "x" },
    names: { y0: "#0", y1: "#1" },
    colors: { y0: "#3DC23F", y1: "#F34C44" }
  };
  it("zip", () => {
    const dots = zipDots([1, 2, 3, 4, 5], [10, 20, 10, 20, 20]);
    expect(dots).toEqual([[1, 10], [2, 20], [3, 10], [4, 20], [5, 20]]);
  });
  it("getHighLow", () => {
    const [high, low] = getHighLow(data);
    expect([high, low]).toEqual([142, 12]);
  });
  xit("getCharts", () => {
    const charts = getChartsFromData(data);
    expect(charts).toEqual([]);
  });
  xit("createChart", () => {
    const chart = createChart(data);
    expect(chart).toBe("<svg/>");
  });
});

describe("axis", () => {
  it("get bounds 19-191", () => {
    const { values, min, max } = getBounds(200, 191, 19);
    const scaleY = getScaleY(200, max, min);
    expect(values).toEqual([0, 50, 100, 150, 200]);
    expect(scaleY).toEqual(1);
  });
  it("get bounds 190-210", () => {
    const { values } = getBounds(200, 210, 190);
    expect(values).toEqual([190, 195, 200, 205, 210]);
  });
  it("get bounds 820900-1417200", () => {
    const { values } = getBounds(200, 1417200, 820900);
    expect(values).toEqual([800000, 1000000, 1200000, 1400000]);
  });
});

describe("render", () => {
  const ruler = (y, label) =>
    createElement("g", {}, [
      // createElement("line", {
      //   x1: "0",
      //   y1: y + "",
      //   x2: "100%",
      //   y2: y + "",
      //   "stroke-width": "1",
      //   stroke: "gray" //need col,
      // }),
      // createElement("text", {
      //   x: 0,
      //   y: y - 10 + "",
      //   fill: "gray",
      //   caption: label
      // }),
      createElement(Ruller, {
        values: [1, 2, 3],
        scale: 1
      })
    ]);
  xit("", () => {
    expect(render(ruler(1, "1"), document.body)).toEqual({});
  });
  it("", () => {
    const tree = render(ruler(1, "1"), document.body);
    // expect(tree).toEqual({})
    // Ruller.send('update');
    expect(tree).toEqual({})
  });
  xit("renderComponent", () => {
    expect(
      renderComponent(createElement(Ruller, { values: [1, 2, 3], scale: 1 }))
    ).toEqual({});
  });

  xit("createElement", () => {
    expect(ruler(1, "1")).toBe({});
  });
});