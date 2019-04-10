import { ComponentType, componentMixin, createElement } from "./reconciler";
import { CHART_WIDTH, CHART_HEIGHT } from "./constant";
import { TransitionGroup } from "./labels";
import { Transition } from "./transition";
import { Dots } from "./dots";
import { ChartInfo, createStackedPathAttr } from "./app";
import { ChartDto } from "./chart_data";
import { statement } from "@babel/template";

const TOGGLE_GRAPH_HANDLER_NAME = "toggleGraphHandler";

export interface ChartProps {
  id: number;
  charts: ChartInfo[];
  offset: number;
  offsetY: number;
  scaleY: number;
  scaleX: number;
  extraScale: number;
  data: ChartDto;
  dataLength: number;
  getScale: (isScale: boolean) => number;
  getOffset: (isScale: boolean) => number;
  projectChartXForDots: (x: number) => string;
  projectChartYForDots: (y: number, isSecond?: boolean) => string;
}

interface State {
  showPopupOn: boolean;
  chartPathes: string[];
}

export const path = (
  path: string,
  color: string,
  strokeWidth: number,
  status?,
  isStacked?: boolean
) =>
  createElement("path", {
    d: path,
    "stroke-width": strokeWidth.toFixed(1),
    stroke: color,
    class: `transition-p ${status}`,
    "vector-effect": !isStacked ? "non-scaling-stroke" : "",
    fill: "none",
    key: color
  });

export const Chart: ComponentType = () => ({
  ...componentMixin(),
  state: {
    showPopupOn: null,
    chartPathes: null
  } as State,
  reducer(action, state: State) {
    switch (action.type) {
      case "showPopup":
        return {
          ...state,
          showPopupOn: action.payload
        };
      case "hidePopup":
        return {
          ...state,
          showPopupOn: null
        };
    }
  },
  didMount() {
    window[TOGGLE_GRAPH_HANDLER_NAME + this.props.id] = (e: TouchEvent) => {
      const currentTarget = e.currentTarget as Element;
      this.send({
        type: "showPopup",
        payload: e.targetTouches[0].clientX - 10
      });
      const hideHandler = (_e: TouchEvent) => {
        const target = _e.target as Element;
        if (target === currentTarget || currentTarget.contains(target)) {
        } else this.send({ type: "hidePopup" });
        _e.currentTarget.removeEventListener("touchstart", hideHandler);
      };
      setTimeout(() => {
        document.documentElement.addEventListener("touchstart", hideHandler);
      }, 10);
    };
  },
  getDeriviedStateFromProps(props: ChartProps, prevState: State) {
    if (!props.data.stacked) return prevState;
    if (!prevState.chartPathes || props.charts.length !== prevState.chartPathes.length) {
      const projectChartX = (x: number) => (x * props.scaleX).toFixed(1);
      const projectChartY = (y: number) => (CHART_HEIGHT - y).toFixed(1);

      let stackedValues = Array(props.dataLength).fill(0);
      let nextState: State = { ...prevState, chartPathes: [] };
      for (let chart of props.charts) {
        const path = createStackedPathAttr(
          chart.values,
          projectChartX,
          projectChartY,
          stackedValues
        );
        nextState.chartPathes.push(path);
        stackedValues = stackedValues.map((v, i) => v + chart.values[i]);
      }
      return nextState;
    }
    return prevState;
  },
  render(props: ChartProps, state: State) {
    const { charts, data, extraScale, offset, getOffset, getScale, id, scaleY, offsetY } = props;
    const { projectChartXForDots, projectChartYForDots, dataLength } = props;
    const { y_scaled, stacked } = data;
    return createElement(
      "svg",
      {
        width: CHART_WIDTH,
        height: CHART_HEIGHT,
        ontouchstart: `${TOGGLE_GRAPH_HANDLER_NAME + id}(event)`
        // class: `w-ch`
      },
      [
        createElement(
          TransitionGroup,
          {
            wrapper: children =>
              createElement(
                "g",
                {
                  style: `transform: translateX(-${offset *
                    CHART_WIDTH}px) scale(${extraScale},1);`,
                  class: "transition-d-0"
                },
                y_scaled
                  ? children
                  : [
                      createElement(
                        "g",
                        {
                          //prettier-ignore
                          style: `transform: scale(1, ${scaleY}) translate(0, ${offsetY}px); transform-origin: 0 ${CHART_HEIGHT}px`,
                          class: "transition-d"
                        },
                        children
                      )
                    ]
              )
          },
          charts.map(({ color, chartPath, id }, i) =>
            createElement(Transition, {
              key: color,
              timeout: 500,
              children: status =>
                y_scaled
                  ? createElement(
                      "g",
                      {
                        //prettier-ignore
                        transform: `scale(1, ${getScale(id === 'y1')}) translate(0, ${getOffset(id === 'y1')})`,
                        style: `transform-origin: 0 ${CHART_HEIGHT}px`,
                        class: "transition-d"
                      },
                      [path(chartPath, color, 2, status)]
                    )
                  : path(
                      stacked ? state.chartPathes[i] : chartPath,
                      color,
                      stacked ? CHART_WIDTH / dataLength + 0.05 : 2,
                      status,
                      stacked
                    )
            })
          )
        ),
        createElement(Dots, {
          data,
          charts,
          projectChartX: projectChartXForDots,
          projectChartY: projectChartYForDots,
          scale: extraScale,
          offset: offset,
          showPopupOn: state.showPopupOn
        })
      ]
    );
  }
});
