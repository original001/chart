import { ComponentType, componentMixin, createElement } from "./reconciler";

export const Animate: ComponentType = () => ({
  ...componentMixin(),
  id: Date.now(),
  state: {
    value: null,
    cache: null
  },
  getDeriviedStateFromProps(props, prevState) {
    if (!prevState.value) {
      return {
        value: props.value,
        cache: props.value
      };
    }
    return {
      cache: prevState.value,
      value: props.value
    };
  },
  didUpdate(prevProps) {
    if (prevProps.value !== this.props.value) {
      // setTimeout(() => {
        (this._innerTree.host as Element).dispatchEvent(new Event("animate"));
      // }, 10);
    }
  },
  render(props, state) {
    return createElement("animate", {
      id: "animate" + this.id,
      attributeName: "d",
      attributeType: "XML",
      begin: `animate${this.id}.animate`,
      from: state.cache,
      to: state.value,
      dur: ".5s",
      fill: "freeze"
    });
  }
});
