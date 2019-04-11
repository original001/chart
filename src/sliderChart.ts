import { ComponentType, componentMixin, createElement } from "./reconciler";
import { TransitionGroup } from "./labels";
import { CHART_WIDTH, SLIDER_HEIGHT, CHART_HEIGHT } from "./constant";
import { Transition } from "./transition";
import { getStackedMax, createStackedPathAttr, path } from "./utils";
import { getScaleY, ChartInfo } from "./prepareData";

export interface SliderChartProps {
  minY: number;
  scaleX: number;
  dataLength: number;
  isStacked: boolean;
  charts: ChartInfo[];
}

interface State {
  showPopupOn: boolean;
  chartPathes: string[];
}

export const SliderChart: ComponentType = () => ({
  ...componentMixin(),
  state: {
    chartPathes: null
  } as State,
  getDeriviedStateFromProps(props: SliderChartProps, prevState: State) {
    if (!props.isStacked) return prevState;
    if (!prevState.chartPathes || props.charts.length !== prevState.chartPathes.length) {
      const { dataLength, charts, minY, scaleX } = props;
      const maxY = getStackedMax(0, dataLength, charts);
      let scaleYSlider = getScaleY(SLIDER_HEIGHT, maxY, minY);
      const projectChartX = (x: number) => (x * scaleX).toFixed(1);
      const projectChartY = y => SLIDER_HEIGHT - (y - minY) * scaleYSlider;

      let stackedValues = Array(dataLength).fill(0);
      let nextState: State = { ...prevState, chartPathes: [] };
      for (let chart of charts) {
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
  render(props: SliderChartProps, state: State) {
    const { charts, isStacked, dataLength } = props;
    return createElement(
      TransitionGroup,
      {
        wrapper: children =>
          createElement("svg", { width: CHART_WIDTH, height: SLIDER_HEIGHT }, children)
      },
      charts.map(({ color, sliderPath }, i) =>
        createElement(Transition, {
          key: color,
          children: status =>
            path(
              isStacked ? state.chartPathes[i] : sliderPath,
              color,
              isStacked ? CHART_WIDTH / dataLength : 1,
              status,
              isStacked
            )
        })
      )
    );
  }
});
