import {
  createPathAttr,
  getScaleY,
  prepareData
} from "../src/app";
import { getBounds } from "../src/axis";
import { ChartDto } from "../src/chart_data";
import {
  render,
  createElement,
  ComponentType,
  componentMixin
} from "../src/reconciler";
import { zipDots as zipData } from "../src/utils";

jest.useFakeTimers();

describe("", () => {
  it("create path with offset", () => {
    const path = createPathAttr(
      [[10000, 100], [20000, 105], [30000, 110]],
      x => x * 100,
      y => 200 - (y - 100) * 20
    );
    expect(path).toBe("M0 200 L100 100 L200 0");
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
      ["y0", 56, 142, 124, 114, 64],
      ["y1", 22, 12, 30, 40, 33]
    ],
    types: { y0: "line", y1: "line", x: "x" },
    names: { y0: "#0", y1: "#1" },
    colors: { y0: "#3DC23F", y1: "#F34C44" }
  };
  it("zip data", () => {
    const dots = zipData([[1111, 1112], [1, 2], [2, 3], [4, 5]]);
    expect(dots).toEqual([[1111, 1, 2, 4], [1112, 2, 3, 5]]);
    // expect(dots2).toEqual([]);
  });

  it('prepare data', () => {
    const d = prepareData(data);
    const {min, max} = d.charts[0]
    expect(d.charts.length).toBe(2)
    expect([max, min]).toEqual([142, 56])
    const {min: min2, max: max2} = d.charts[1]
    expect([max2, min2]).toEqual([40, 12])
    expect(d.visibles['#0']).toBe(true)
    expect(d.visibles['#1']).toBe(true)
    expect(d.maxY).toBe(142)
    expect(d.minY).toBe(12)
    expect(d.scaleX).toBe(-4)
  })
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
  const Inner: ComponentType = () => ({
    ...componentMixin(),
    state: {
      extra: ""
    },
    getDeriviedStateFromProps(props, prevState) {
      if (props.text === "test") {
        return { extra: "wow" };
      }
      return prevState;
    },
    render(props, state) {
      return createElement("text", {}, props.text + state.extra);
    }
  });
  const Ruller: ComponentType = () => ({
    ...componentMixin(),
    state: {
      status: "initial" as "update" | "ready" | "initial"
    },
    render: (props, state) => {
      return createElement("g", { status: state.status }, [
        createElement(Inner, {
          text: state.status === "initial" ? "initial" : "test"
        })
      ]);
    },
    reducer: (action, state) => {
      switch (action.type) {
        case "update":
          return { ...state, status: "ready" };
      }
    }
  });
  const ruler = () => {
    return createElement("g", {}, [
      createElement("line", {
        stroke: "gray" //need col,
      }),

      createElement(Ruller, {
        values: [1, 2, 3],
        scale: 1
      })
    ]);
  };
  const body = document.body;
  const tree = render(ruler(), body);
  it("render", () => {
    expect(body.firstElementChild.tagName).toEqual("g");
    expect(body.firstElementChild.firstElementChild.tagName).toEqual("line");
    expect(
      body.firstElementChild.firstElementChild.getAttribute("stroke")
    ).toEqual("gray");

    const rullerElement = body.firstElementChild.lastElementChild;
    expect(rullerElement.tagName).toBe("g");
    expect(rullerElement.getAttribute("status")).toBe("initial");
    const innerComp = rullerElement.firstElementChild;
    expect(innerComp.tagName).toBe("text");
    expect(innerComp.textContent).toBe("initial");

    const rullerInstance = tree.props.children[1]._instance;
    expect(rullerInstance.props).toEqual({ values: [1, 2, 3], scale: 1 });
    expect(rullerInstance.state).toEqual({ status: "initial" });

    rullerInstance.send({ type: "update" });
    expect(rullerInstance.state).toEqual({ status: "ready" });
    expect(rullerElement.getAttribute("status")).toBe("ready");
    expect(innerComp.textContent).toBe("testwow");
    rullerInstance.send({ type: "update" });
  });
});
