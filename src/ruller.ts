import { ComponentType, componentMixin, createElement } from "./reconciler";
import { CHART_HEIGHT } from "./constant";


const ruler = (y: number, label: string) =>
  createElement("g", {}, [
    createElement("line", {
      x1: "0",
      y1: CHART_HEIGHT - y + "",
      x2: "100%",
      y2: CHART_HEIGHT - y + "",
      class: "r-line"
    }),
    createElement(
      "text",
      {
        x: 0,
        y: CHART_HEIGHT - y - 5 + "",
        class: "r-text"
      },
      label
    )
  ]);
type Status = "entering" | "entered" | "exiting" | "exited";
interface State {
  nextValues: number[];
  nextScale: number;
  values: number[];
  scale: number;
  status: Status;
}
    let inProccess = false;
export const TransitionRuller: ComponentType = () => ({
  ...componentMixin(),
  state: {
    nextValues: null,
    nextScale: null,
    values: null,
    scale: null,
    status: null
  } as State,
  getDeriviedStateFromProps(props, prevState: State): State {
    if (prevState.values === null) {
      return {
        ...prevState,
        values: props.values,
        scale: props.scale,
        status: "entered"
      };
    }
    if (props.values[2] !== prevState.values[2] || props.values.length !== prevState.values.length) {
      return {
        values: prevState.values,
        scale: prevState.scale,
        nextValues: props.values,
        nextScale: props.scale,
        status: "exiting"
      };
    }
    return prevState;
  },
  didUpdate() {
    if (inProccess) return;

    const prevState = this.state as State;
    if (prevState.status === "exiting") {
      inProccess = true;
      setTimeout(() => {
        inProccess = false;
        this.send({ type: "update" });
      }, 200);
    }
    if (prevState.status === "exited") {
      this.send({ type: "show" });
    }
    if (prevState.status === "entering") {
      inProccess = true;
      setTimeout(() => {
        inProccess = false;
        this.send({ type: "entered" });
      }, 20);
    }
  },
  render: (props, state: State) => {
    return createElement("g", {}, state.status === 'exited' ? null : [
      createElement(
        "g",
        { class: state.status + " transition translate", secondValue: state.values[1] },
        state.values.slice(0,-1).map(y => ruler((y - state.values[0]) * state.scale, y.toString()))
      )
    ]);
  },
  reducer: (action, state: State): State => {
    switch (action.type) {
      case "entered":
        return {
          ...state,
          status: "entered"
        };
      case "update":
        return {
          ...state,
          status: "exited",
        };
      case "show":
        return {
          ...state,
          status: "entering",
          values: state.nextValues,
          scale: state.nextScale
        };
    }
  }
});
