import { ComponentType, componentMixin, createElement } from "./reconciler";
import { CHART_HEIGHT } from "./constant";
import { TransitionGroup } from "./labels";
import { Transition } from "./transition";

const ruler = (projectY: number, y: number, scale: number, status: string) =>
  createElement(
    "div",
    {
      key: y,
      class: `${status} transition translate abs fw r-line`,
      style: `transform: scaleY(${(1 / scale).toFixed(1)}) translateY(${projectY}px); transform-origin: 0 ${projectY - 5}px`
      //prettier-ignore
    },
    y.toString()
    // [createElement('div', {
    //   class: 'r-line abs fw',
    //   style: `top: ${projectY}px`
    // }, y.toString())]
  );

export const TransitionRuller: ComponentType = () => ({
  ...componentMixin(),
  render: (props, state) => {
    return createElement(
      TransitionGroup,
      {
        wrapper: children =>
          createElement(
            "div",
            {
              class: "transition translate rel w-ch-c",
              //prettier-ignore
              style: `transform: scaleY(${props.scale}) translateY(${props.offset}px); transform-origin: 0 ${CHART_HEIGHT}px`
            },
            children
          )
      },
      props.values.map(y =>
        createElement(Transition, {
          timeout: 500,
          key: y,
          children: status => ruler(CHART_HEIGHT - y, y, props.scale, status)
        })
      )
    );
  }
});
