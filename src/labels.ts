import { ComponentType, componentMixin } from "./reconciler";
import {
  ChildMapping,
  getNextChildMapping,
  getInitialChildMapping
} from "./childmapping";
import { values } from "./utils";

interface State {
  children?: ChildMapping;
  isFirstRender: boolean;
}
export const TransitionGroup: ComponentType = () => ({
  ...componentMixin(),
  state: {
    isFirstRender: true
  } as State,
  getDeriviedStateFromProps(props, prevState: State): State {
    // console.log(props.children)
    const nextState = {
      children: prevState.isFirstRender
        ? getInitialChildMapping(props.children)
        : getNextChildMapping(props.children, prevState.children, props.passedProps),
      isFirstRender: false
    };
    // console.log(nextState.children['1'])
    return nextState;
  },
  render: (props, state: State) => {
    return props.wrapper(values(state.children));
  }
});
