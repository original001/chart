import { createElement, ComponentType, componentMixin } from "./reconciler";
import { createRaf } from "./utils";

export const Benchmark: ComponentType = () => ({
  ...componentMixin(),
  state: {
    offset: 0,
    width: 100
  },
  reducer(action, state) {
    switch (action.type) {
      case "update":
        return {
          ...state,
          offset: action.payload,
          width: state.width + action.payload / 100
        };
      case "transition":
        return {
          ...state,
          offset: 200,
          width: 300
        };
    }
  },
  didMount() {
    window[`onmousemovebench${this.props.id}`] = createRaf(e => {
      this.send({ type: "update", payload: e.targetTouches[0].clientX });
    });
    window[`ontouchstartbench${this.props.id}`] = createRaf(e => {
      this.send({ type: "transition", payload: e.targetTouches[0].clientX });
    });
  },
  render(props, state) {
    const { width, offset } = state;
    return createElement("div", {}, [
      createElement(
        "div",
        {
          ontouchmove: `onmousemovebench${props.id}(event)`,
          // ontouchstart: `ontouchstartbench${props.id}(event)`,
          class: "bench-wrapper"
          // width: 100,
          // height: 500
          // style: `width: ${width}px`
          // style: `opacity: ${offset || 0.1}`
          // style: `transform: translateX(${width}px)`
        },
        Array(100)
          .fill(0)
          .map((_, i) =>
            createElement("div", {
              class: "bench",
              // y: i * 5,
              // fill: '#ddd',
              style: `transform: translateX(${offset}px)`
              // style: `opacity: ${offset || 0.1}`
              // style: `opacity: ${10/offset}`
              // x: `${offset}`
              // x: 0
            })
          )
      )
      // createElement("div", {
      //   ontouchmove: `onmousemovebench${props.id}(event)`,
      //   class: "bench-overlay"
      // })
    ]);
  }
});