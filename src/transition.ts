import { ComponentType, componentMixin, createElement } from "./reconciler";

type Status = "entering" | "entered" | "exiting" | "exited";
interface State {
  status: Status;
  in: boolean;
}
interface Props {
  in: boolean;
  status: "enter" | "appear";
}
let inProccess = false;
export const Transition: ComponentType = () => ({
  ...componentMixin(),
  state: {
    status: "entered",
    in: null
  } as State,
  getDeriviedStateFromProps(props: Props, prevState: State): State {
    // console.log(props)
    if (prevState.in === null) {
      return {
        ...prevState,
        in: props.in,
        status: "entered"
      };
    }
    if (!props.in && prevState.in && prevState.status === "entered") {
      return {
        in: props.in,
        status: "exiting"
      };
    }
    if (props.in && !prevState.in && prevState.status === "exited") {
      return {
        in: props.in,
        status: "entering"
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
      // this.send({ type: "show" });
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
    console.log(state);
    return state.status !== "exited"
      ? props.children(state.status)
      : createElement("notexisted", { key: props.key });
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
          status: "exited"
        };
      case "show":
        return {
          ...state,
          status: "entering"
        };
    }
  }
});
