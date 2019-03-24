import { ComponentType, componentMixin, createElement } from "./reconciler";
import { CHART_WIDTH } from "./constant";
import {
  ChildMapping,
  getChildMapping,
  getNextChildMapping,
  getInitialChildMapping
} from "./childmapping";
import { values } from "./utils";

interface State {
  children?: ChildMapping;
  isFirstRender: boolean;
}
export const TransitionLabels: ComponentType = () => ({
  ...componentMixin(),
  state: {
    isFirstRender: true
  } as State,
  getDeriviedStateFromProps(props, prevState: State): State {
    // console.log(props.children)
    const nextState = {
      children: prevState.isFirstRender
        ? getInitialChildMapping(props.children)
        : getNextChildMapping(props.children, prevState.children),
      isFirstRender: false
    };
    // console.log(nextState.children['1'])
    return nextState;
  },
  render: (props, state: State) => {
    const a = createElement(
      "div",
      {
        class: "flex-labels",
        //prettier-ignore
        style: `transform: translateX(-${props.offset * CHART_WIDTH}px); width: ${props.scaledWidth}px`
      },
      values(state.children)
    );
    // console.log(a);
    return a;
  }
});
