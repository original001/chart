import { ComponentType, componentMixin, createElement } from "./reconciler";
import { CHART_HEIGHT } from "./constant";
import { TransitionGroup } from "./labels";
import { Transition } from "./transition";

const ruler = (projectY: number, y: number, scale: number, status: string) =>
  createElement(
    "g",
    {
      key: y,
      class: `${status} transition translate`,
      style: `transform: scaleY(${1 / scale}); transform-origin: 0 ${projectY -
        5}px`
    },
    [
      createElement("line", {
        x1: "0",
        y1: projectY + "",
        x2: "100%",
        y2: projectY + "",
        class: "r-line"
      }),
      createElement(
        "text",
        { x: 0, y: projectY - 5 + "", class: `r-text` },
        y.toString()
      )
    ]
  );

export const TransitionRuller: ComponentType = () => ({
  ...componentMixin(),
  render: (props, state) => {
    return createElement(
      TransitionGroup,
      {
        wrapper: children =>
          createElement(
            "g",
            {
              class: "transition translate",
              //prettier-ignore
              style: `transform: scaleY(${props.scale}) translateY(${props.offset}px); transform-origin: 0 ${CHART_HEIGHT}px`
            },
            children
          )
      },
      props.values.slice(0, -1).map(y =>
        createElement(Transition, {
          timeout: 500,
          key: y,
          children: status =>
            ruler(CHART_HEIGHT - y, y, props.scale, status)
        })
      )
    );
  }
});
