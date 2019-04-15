import { componentMixin, createElement, render } from "../src/reconciler";
import { Transition } from "../src/transition";
import { TransitionGroup } from "../src/labels";

jest.useFakeTimers();

describe("animation", () => {
  beforeEach(() => {
    if (document.body.firstChild)
      document.body.removeChild(document.body.firstChild);
  });
  it("transition", () => {
    const Helper = () => ({
      ...componentMixin(),
      state: {
        status: 'enter'
      },
      reducer(action) {
        switch (action.type) {
          case "1":
            return {status: 'appear'};
          case "2":
            return {status: 'exit'};
        }
      },
      render(props, state) {
        // console.log(state)
        return createElement(Transition, {
          children: status => createElement("g", { status }),
          in: state.status !== "appear",
          status: state.status
        });
      }
    });

    const body = document.body;
    const tree = render(createElement(Helper, {}), body);

    const helperInst = tree._instance;
    // expect(body.firstElementChild).toBe({});
    expect(body.firstElementChild.tagName).toBe("g");
    helperInst.send({ type: "1" });
    expect(body.firstElementChild.getAttribute("status")).toBe("exiting");
    jest.runOnlyPendingTimers();
    expect(body.firstElementChild.getAttribute("status")).toBe("exited");
    helperInst.send({ type: "2" });
    expect(body.firstElementChild.getAttribute("status")).toBe("entering");
    jest.runOnlyPendingTimers();
    expect(body.firstElementChild.getAttribute("status")).toBe("entered");
    // expect(body.firstElementChild.getAttribute('status')).toBe('entered')
  });
  it("transition group", () => {
    const Helper = () => ({
      ...componentMixin(),
      state: {
        elements: [1, 2, 3],
        data: "a"
      },
      reducer(action) {
        switch (action.type) {
          case "1":
            return {
              elements: [2, 3],
              data: "b"
            };
          case "2":
            return {
              elements: [1, 2, 3],
              data: "c"
            };
          case "3":
            return {
              elements: [1, 2, 3, 4],
              data: "d"
            };
          case "4":
            return {
              elements: [1, 5, 3, 4],
              data: "d"
            };
        }
      },
      render(props, state) {
        // console.log(state)
        const g = x =>
          createElement(Transition, {
            children: status =>
              createElement("g", { status, key: x, data: state.data }),
            key: x
          });
        return createElement(
          TransitionGroup,
          { wrapper: children => createElement("g", {}, children) },
          state.elements.map(g)
        );
      }
    });

    const body = document.body;
    const tree = render(createElement(Helper, {}), body);

    const helperInst = tree._instance;
    const root = body.firstElementChild;
    expect(root.firstElementChild.tagName).toBe("g");
    expect(root.firstElementChild.getAttribute("status")).toBe("entered");
    helperInst.send({ type: "1" });
    // expect(root).toBe({});
    expect(root.firstElementChild.getAttribute("status")).toBe("exiting");
    jest.runOnlyPendingTimers();
    // expect(root).toBe({});
    expect(root.firstElementChild.getAttribute("status")).toBe("exited");
    // expect(root.lastElementChild.tagName).toBe('notexisted');
    helperInst.send({ type: "2" });
    // expect(root).toBe({});
    expect(root.firstElementChild.getAttribute("status")).toBe("entering");
    jest.runOnlyPendingTimers(); //20
    expect(root.firstElementChild.getAttribute("status")).toBe("entered");
    helperInst.send({ type: "3" });
    expect(root.lastElementChild.getAttribute("status")).toBe("entering");
    jest.runOnlyPendingTimers(); //20
    expect(root.lastElementChild.getAttribute("status")).toBe("entered");
    helperInst.send({ type: "2" });
    expect(root.lastElementChild.getAttribute("status")).toBe("exiting");
    jest.runOnlyPendingTimers(); //20
    expect(root.lastElementChild.getAttribute("status")).toBe("exited");
    helperInst.send({ type: "1" });
    helperInst.send({ type: "2" });
    expect(root.firstElementChild.getAttribute("status")).toBe("entering");
    jest.runOnlyPendingTimers(); //20
    expect(root.firstElementChild.getAttribute("status")).toBe("entered");
    helperInst.send({ type: "3" });
    helperInst.send({ type: "2" });
    expect(root.lastElementChild.getAttribute("status")).toBe("exiting");
    jest.runOnlyPendingTimers(); //20
    expect(root.lastElementChild.getAttribute("status")).toBe("exited");
  });
});
