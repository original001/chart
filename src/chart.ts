import { ComponentType, componentMixin, createElement } from "./reconciler";
import { CHART_WIDTH, CHART_HEIGHT } from "./constant";
import { TransitionGroup } from "./labels";
import { Transition } from "./transition";
import { ChartDto } from "./chart_data";
import { path, createStackedPathAttr, createPercentagePathAttr } from "./utils";
import { ChartInfo } from "./prepareData";
import { round } from "./axis";

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
  showPopupOn: number;
  zoomed: boolean
  scaledX_: (x: number) => number;
  y__:  (f:(y:number) => number) => (x: number) => number;
}

interface State {
  chartPathes: string[];
  zoomed: boolean;
}

export const Chart: ComponentType = () => ({
  ...componentMixin(),
  state: {
    chartPathes: null,
    zoomed: null
  } as State,
  getDeriviedStateFromProps(props: ChartProps, prevState: State) {
    if (!props.data.stacked) return prevState;
    if (!prevState.chartPathes || props.charts.length !== prevState.chartPathes.length || props.zoomed !== prevState.zoomed) {

      if (props.data.percentage) {
        let stackedValues = Array(props.dataLength).fill(0);
        const chartPathes = [];
        const chartsLength = props.charts.length;
        const sumValues = [];
        for (let i = 0; i < props.dataLength; i++) {
          let sum = 0;
          for (let j = 0; j < chartsLength; j++) {
            sum += props.charts[j].values[i];
          }
          sumValues.push(sum);
        }

        for (let chart of props.charts) {
          const dots = chart.dots.map(([x, y], i) => [x, round((y / sumValues[i]) * 100, 1)] as [number, number]);
          const path = createPercentagePathAttr(
            dots,
            props.scaledX_,
            props.y__(y => y),
            stackedValues
          );
          chartPathes.push(path);
          stackedValues = stackedValues.map((v, i) => v + dots[i][1]);
        }
        return { ...prevState, chartPathes };
      } else {
        let stackedValues = Array(props.dataLength).fill(0);
        let nextState: State = { ...prevState, chartPathes: [] };
        const createPath = props.data.percentage ? createPercentagePathAttr : createStackedPathAttr;
        for (let chart of props.charts) {
          const path = createPath(chart.dots, props.scaledX_, props.y__(y => y), stackedValues);
          nextState.chartPathes.push(path);
          stackedValues = stackedValues.map((v, i) => v + chart.values[i]);
        }
        return nextState;
      }
    }
    return prevState;
  },
  render(props: ChartProps, state: State) {
    const {
      charts,
      data,
      extraScale,
      offset,
      getOffset,
      getScale,
      id,
      scaleY,
      offsetY,
      showPopupOn
    } = props;
    const { dataLength } = props;
    const { y_scaled, stacked, percentage } = data;
    const chartOpacity = showPopupOn && stacked && !percentage ? 0.5 : 1;
    return createElement(
      "svg",
      {
        // key: props.zoomed ? 1 : 0,
        width: CHART_WIDTH,
        height: CHART_HEIGHT
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
          charts
            .slice(0)
            .reverse()
            .map(({ color, chartPath, id }, i) =>
              createElement(Transition, {
                key: color,
                timeout: 500,
                children: status =>
                  y_scaled
                    ? createElement(
                        "g",
                        {
                          //prettier-ignore
                          style: `transform: scale(1, ${getScale(id === 'y1')}) translate(0, ${getOffset(id === 'y1')}px); transform-origin: 0 ${CHART_HEIGHT}px; opacity: ${chartOpacity}`,
                          class: "transition-d"
                        },
                        [path(chartPath, color, 2, status)]
                      )
                    : path(
                        stacked ? state.chartPathes[charts.length - 1 - i] : chartPath,
                        color,
                        stacked ? CHART_WIDTH / dataLength + 0.05 : 2,
                        status,
                        stacked,
                        percentage
                      )
              })
            )
        )
      ]
    );
  }
});
