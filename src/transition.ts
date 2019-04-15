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

export const Transition: ComponentType = () => ({
  ...componentMixin(),
  state: {
    status: "entered",
    in: null
  } as State,
  timer: null,
  getDeriviedStateFromProps(props: Props, prevState: State): State {
    const prevStatus = prevState.status;
    if (prevState.in === null) {
      return {
        ...prevState,
        in: props.in,
        status: props.status === "enter" ? "entered" : "entering"
      };
    }
    if (
      !props.in &&
      prevState.in &&
      (prevStatus === "entered" || prevStatus === "entering")
    ) {
      return {
        in: props.in,
        status: "exiting"
      };
    }
    if (
      props.in &&
      !prevState.in &&
      (prevStatus === "exited" || prevStatus === "exiting")
    ) {
      return {
        in: props.in,
        status: "entering"
      };
    }
    return prevState;
  },
  didUpdate() {
    const prevState = this.state as State;
    if (prevState.status === "exiting") {
      clearTimeout(this.timer);
      this.timer = setTimeout(() => {
        this.send({ type: "update" });
      }, this.props.timeout || 200);
    }
    if (prevState.status === "entering") {
      clearTimeout(this.timer);

      this.timer = setTimeout(() => {
      this._innerTree.host.scrollTop
      this.send({ type: "entered" });
      }, 10);
    }
  },
  didMount() {
    const prevState = this.state as State;
    if (prevState.status === "entering") {
      setTimeout(() => {
        this.send({ type: "entered" });
      }, 20);
    }
  },
  render: (props, state: State) => {
    return props.children(state.status, props.passedProps);
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
