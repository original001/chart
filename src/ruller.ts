import { ComponentType, componentMixin, createElement } from "./reconciler";
import { CHART_HEIGHT, PRECISION } from "./constant";
import { TransitionGroup } from "./labels";
import { Transition } from "./transition";
import { shallowEqual, last } from "./utils";
import { round } from "./axis";
import { ChartInfo } from "./prepareData";

export interface RullerProps {
  values: number[];
  valuesY2: number[];
  scale: number;
  offset: number;
  charts: ChartInfo[];
  pow: 1 | 1000 | 1000000;
}

interface State {
  values: number[];
  valuesY2: number[];
  scaleDirection: "up" | "down";
  transformOrigin: number;
}

export const TransitionRuller: ComponentType = () => ({
  ...componentMixin(),
  state: {
    values: null,
    valuesY2: null,
    scaleDirection: null,
    transformOrigin: null
  } as State,
  shouldUpdate(nextProps: RullerProps) {
    if (nextProps.valuesY2) return true;
    return !shallowEqual(nextProps.values, this.props.values);
  },
  getDeriviedStateFromProps(props: RullerProps, prevState: State): State {
    if (!props.values.length) {
      if (!prevState.valuesY2) {
        return { ...prevState, valuesY2: props.valuesY2 };
      }
      if (props.valuesY2.length) {
        const range = last(props.valuesY2) - props.valuesY2[0];
        const prevRange = last(prevState.valuesY2) - prevState.valuesY2[0];
        if (prevRange !== range) {
          const firstDiff = props.valuesY2[0] - prevState.valuesY2[0];
          const lastDiff = last(props.valuesY2) - last(prevState.valuesY2);
          const transformOrigin = firstDiff / (firstDiff + lastDiff);
          return {
            ...prevState,
            valuesY2: props.valuesY2,
            scaleDirection: prevRange > range ? "up" : "down",
            transformOrigin
          };
        }
      }
      return prevState;
    }
    if (!prevState.values) {
      return { ...prevState, values: props.values };
    }
    const range = last(props.values) - props.values[0];
    const prevRange = last(prevState.values) - prevState.values[0];
    if (prevRange !== range) {
      const firstDiff = props.values[0] - prevState.values[0];
      const lastDiff = last(props.values) - last(prevState.values);
      const transformOrigin = firstDiff / (firstDiff + lastDiff);
      return {
        ...prevState,
        values: props.values,
        scaleDirection: prevRange > range ? "up" : "down",
        transformOrigin
      };
    }
    return prevState;
  },
  render: (props: RullerProps, state: State) => {
    const { values, valuesY2, charts, pow } = props;
    const powToNumber = (v, pow) => {
      if (v == null || isNaN(v)) return "";
      if (v === 0) return v + "";
      switch (pow) {
        case 1:
          return v + "";
        case 1000:
          return `${v}K`;
        case 1000000:
          return `${v}M`;
      }
    };
    let color1;
    let color2;
    let valuesY2Intp = [];
    if (valuesY2) {
      const first = charts.find(c => c.id === "y0");
      const second = charts.find(c => c.id === "y1");
      color1 = first && first.color;
      color2 = second && second.color;
      const range = last(valuesY2) - valuesY2[0];
      const valuesLength = values.length || state.values.length;
      if (valuesLength) {
        const step = range / (valuesLength - 1);
        // valuesY2Intp = values.map((_, i) => Math.round((valuesY2[0] + i * step) * 2) / 2);
        for (let i = 0; i < valuesLength; i++ ){
          valuesY2Intp.push(Math.round((valuesY2[0] + i * step) * 2) / 2)
        }
      } else {
        valuesY2Intp = valuesY2;
      }
    }
    const key =
      !values.length && valuesY2
        ? `${valuesY2[0]}-${last(valuesY2)}`
        : `${values[0]}-${last(values)}`;
    return createElement(
      TransitionGroup,
      {
        wrapper: children =>
          createElement("div", { class: `rel scale-${state.scaleDirection} z-5` }, children),
        passedProps: {
          t: state.transformOrigin
        }
      },
      [
        charts.length > 0 &&
          createElement(Transition, {
            timeout: 500,
            key: key,
            children: (status, passedProps) =>
              createElement(
                "div",
                {
                  key,
                  class: `${status} flex column abs fw fh`,
                  //prettier-ignore
                  style: `height: ${CHART_HEIGHT}px; transform-origin: 0 ${CHART_HEIGHT * (1 - (passedProps && passedProps.t != null ? passedProps.t : state.transformOrigin || 0))}px`
                },
                (values.length ? values : valuesY2Intp).map((v, i) =>
                  createElement(
                    "div",
                    {
                      class: `r-line fw`
                    },
                    //prettier-ignore
                    !valuesY2
                    ? powToNumber(v, pow)
                    : [
                        createElement("span", { style: `color: ${color1}`, class: `${!color1 ? 'exited' : 'entered'} transition` }, powToNumber(v, pow)),
                        createElement("span", { style: `color: ${color2}`, class: `${!color2 ? 'exited' : 'entered'} transition`  }, powToNumber(valuesY2Intp[i], pow))
                      ]
                  )
                )
              )
          })
      ]
    );
  }
});
