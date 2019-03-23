import {
  renderComponent,
  ComponentType,
  componentMixin,
  createElement
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
    render(props, state) {
      return createElement("text", {}, props.text + ',' + state.extra);
    }
  });
  it("render component", () => {
    const comp = Inner();
    const tree  = renderComponent(comp, {text: "text"}, {extra: 'next'})
    expect(tree.props.children).toBe('text,next')
    expect(comp.state['extra']).toBe('next')
  });
  it("render component with parent", () => {
    const comp = Inner();
    comp.props = {text: 'text'}
    comp.state = {extra: 'next'}
    const tree  = renderComponent(comp, {text: "text2"})
    expect(tree.props.children).toBe('text2,next')
    expect(comp.state['extra']).toBe('next')
  });
  it("render component with deriving", () => {
    const comp = Inner();
    comp.props = {text: 'text'}
    comp.state = {extra: 'next'}
    const tree  = renderComponent(comp, {text: "test"})
    expect(tree.props.children).toBe('test,wow')
    expect(comp.state['extra']).toBe('wow')
  });
  it("render component state updating", () => {
    const comp = Inner();
    comp.props = {text: 'text'}
    comp.state = {extra: 'next'}
    const tree  = renderComponent(comp, comp.props, {extra: 'next2'})
    expect(tree.props.children).toBe('text,next2')
    expect(comp.state['extra']).toBe('next2')
  });
});
