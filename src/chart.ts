import { ComponentType, componentMixin, createElement } from "./reconciler";
import { CHART_WIDTH, CHART_HEIGHT } from "./constant";
import { TransitionGroup } from "./labels";
import { Transition } from "./transition";
import { Dots, DotsProps } from "./dots";
import { ChartInfo } from "./app";
import { ChartDto } from "./chart_data";
import { path, createStackedPathAttr } from "./utils";


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
  showPopupOn: number;
}

interface State {
  chartPathes: string[];
}

export const Chart: ComponentType = () => ({
  ...componentMixin(),
  state: {
    chartPathes: null
  } as State,
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
    const { charts, data, extraScale, offset, getOffset, getScale, id, scaleY, offsetY, showPopupOn } = props;
    const { projectChartXForDots, projectChartYForDots, dataLength } = props;
    const { y_scaled, stacked } = data;
    const chartOpacity = showPopupOn && stacked ? .6 : 1
    return createElement(
      "svg",
      {
        width: CHART_WIDTH,
        height: CHART_HEIGHT,
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
                          style: `transform: scale(1, ${scaleY}) translate(0, ${offsetY}px); transform-origin: 0 ${CHART_HEIGHT}px; opacity: ${chartOpacity}`,
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
          extraScale,
          offset,
          showPopupOn: showPopupOn,
          dataLength
        } as DotsProps)
      ]
    );
  }
});
