import { ComponentType, componentMixin, createElement } from "./reconciler";

const CHART_HEIGHT = 200;

const ruler = (y: number, label: string) =>
  createElement("g", {}, [
    createElement("line", {
      x1: "0",
      y1: CHART_HEIGHT - y + "",
      x2: "100%",
      y2: CHART_HEIGHT - y + "",
      "stroke-width": "1",
      stroke: "gray" //need col,
    }),
    createElement(
      "text",
      {
        x: 0,
        y: CHART_HEIGHT - y - 10 + "",
        fill: "gray"
      },
      label
    )
  ]);

export const Ruller: ComponentType = () => ({
  ...componentMixin(),
  state: {
    values: null,
    scale: null,
    status: "initial" as "update" | "ready" | "initial"
  },
  getDeriviedStateFromProps: (props, state) => {
    if (!state.values) return props;
    if (state.values !== props.values) {
      return {
        ...state,
        status: "update"
      };
    }
  },
  render: (props, state) => {
    return createElement(
      "g",
      {},
      props.values.map(y => ruler((y - props.values[0]) * props.scale, y + ""))
    );
  },
  reducer: (action, state) => {
    switch (action) {
      case "update":
        return { ...state, status: "ready" };
    }
  }
});
