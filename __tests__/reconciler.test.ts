import {
  renderComponent,
  ComponentType,
  componentMixin,
  createElement,
  updateComponentByParent,
  render
} from "../src/reconciler";

describe("reconciler", () => {
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
    shouldUpdate(nextProps) {
      if (nextProps.text === "notUpdate" && this.props.text === "test")
        return false;
    },
    render(props, state) {
      return createElement("text", {}, props.text + "," + state.extra);
    }
  });
  it("render component", () => {
    const comp = Inner();
    const tree = renderComponent(comp, { text: "text" }, { extra: "next" });
    expect(tree.props.children).toBe("text,next");
    expect(comp.state["extra"]).toBe("next");
  });
  it("render component with parent", () => {
    const comp = Inner();
    comp.props = { text: "text" };
    comp.state = { extra: "next" };
    const tree = renderComponent(comp, { text: "text2" });
    expect(tree.props.children).toBe("text2,next");
    expect(comp.state["extra"]).toBe("next");
  });
  it("render component with deriving", () => {
    const comp = Inner();
    comp.props = { text: "text" };
    comp.state = { extra: "next" };
    const tree = renderComponent(comp, { text: "test" });
    expect(tree.props.children).toBe("test,wow");
    expect(comp.state["extra"]).toBe("wow");
  });
  it("render component state updating", () => {
    const comp = Inner();
    comp.props = { text: "text" };
    comp.state = { extra: "next" };
    const tree = renderComponent(comp, comp.props, { extra: "next2" });
    expect(tree.props.children).toBe("text,next2");
    expect(comp.state["extra"]).toBe("next2");
  });
});

describe("update children", () => {
  it("update by keys", () => {
    const Inner: ComponentType = () => ({
      ...componentMixin(),
      state: "initial",
      reducer(action, state) {
        switch (action.type) {
          case "update":
            return "remove";
        }
      },
      render(props, state) {
        const update = ar =>
          state === "initial"
            ? ar
            : Array.prototype.slice.call(ar, 1,2);
        const res = createElement("g", {}, update([
          createElement("span", { key: "span" }, '1'),
          createElement("span", { key: "div" }, '2'),
          createElement("span", { key: "span2" }, '3')
        ]));
        // console.log(res)
        return res
      }
    });
    const body = document.body
    const tree = render(createElement(Inner, {}), body);
    expect(body.firstElementChild.firstElementChild.getAttribute('key')).toBe('span')
    const divHost = tree._instance._innerTree.props.children[1].host;
    const inst = tree._instance;
    inst.send({type: 'update'})
    expect(tree._instance._innerTree.props.children[0].host === divHost).toBeTruthy()
  });
});
