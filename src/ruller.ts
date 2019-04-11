import { ComponentType, componentMixin, createElement } from "./reconciler";
import { CHART_HEIGHT, PRECISION } from "./constant";
import { TransitionGroup } from "./labels";
import { Transition } from "./transition";
import { shallowEqual } from "./utils";
import { roundWithPrecision } from "./axis";
import { ChartInfo } from "./prepareData";

export interface RullerProps {
  values: number[];
  valuesY2: number[];
  scale: number;
  offset: number;
  charts: ChartInfo[];
  pow: 1 | 1000 | 1000000
}

export const TransitionRuller: ComponentType = () => ({
  ...componentMixin(),
  shouldUpdate(nextProps: RullerProps) {
    if (nextProps.valuesY2) return true;
    return !shallowEqual(nextProps.values, this.props.values)
  },
  render: (props: RullerProps, state) => {
    const { values, valuesY2, charts, pow } = props;
    const powToNumber = (v, pow) => {
      if (v === 0) return v + '';
      switch (pow) {
        case 1:
          return v;
        case 1000:
          return `${v}K`
        case 1000000:
          return `${v}M`
      }
    }
    let color1;
    let color2;
    if (valuesY2) {
      const first = charts.find(c => c.id === "y0");
      const second = charts.find(c => c.id === "y1");
      color1 = first && first.color;
      color2 = second && second.color;
    }
    const key = `${values[0]}-${values[values.length - 1]}`;
    return createElement(
      TransitionGroup,
      {
        wrapper: children =>
          createElement(
            "div",
            {
              class: "transition translate rel w-ch-c",
              //prettier-ignore
              style: `transform: scaleY(${props.scale}) translateY(${props.offset - 12.5 / props.scale}px); transform-origin: 0 ${CHART_HEIGHT}px`
            },
            children
          )
      },
      [
        createElement(Transition, {
          timeout: 500,
          key: key,
          children: status =>
            createElement(
              "div",
              {
                key,
                class: `${status} transition abs fw`
              },
              values.map((v, i) =>
                createElement(
                  "div",
                  {
                    class: `r-line abs fw`,
                    style: `transform: scaleY(${roundWithPrecision(1 / props.scale, PRECISION)}) translateY(${CHART_HEIGHT - v}px); transform-origin: 0 ${CHART_HEIGHT -
                      v}px`
                  },
                  //prettier-ignore
                  !valuesY2
                    ? powToNumber(v, pow)
                    : [
                        createElement("span", { style: `color: ${color1}`, class: `${!color1 ? 'exited' : 'entered'} transition` }, powToNumber(v, pow)),
                        createElement("span", { style: `color: ${color2}`, class: `${!color2 ? 'exited' : 'entered'} transition`  }, powToNumber(valuesY2[i], pow))
                      ]
                )
              )
            )
        })
      ]
    );
  }
});
