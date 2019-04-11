import { ComponentType, componentMixin, createElement } from "./reconciler";
import { TransitionGroup } from "./labels";
import { CHART_WIDTH, SLIDER_HEIGHT, CHART_HEIGHT } from "./constant";
import { Transition } from "./transition";
import { getStackedMax, createStackedPathAttr, path, createPercentagePathAttr } from "./utils";
import { getScaleY, ChartInfo } from "./prepareData";
import { ChartDto } from "./chart_data";
import { round } from "./axis";

export interface SliderChartProps {
  minY: number;
  scaleX: number;
  dataLength: number;
  isStacked: boolean;
  charts: ChartInfo[];
  data: ChartDto;
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
      if (props.data.percentage) {
        const maxY = 100;
        let scaleYSlider = getScaleY(SLIDER_HEIGHT, maxY, minY);
        const projectChartX = (x: number) => round(x * scaleX, 1);
        const projectChartY = y => round(SLIDER_HEIGHT - (y - minY) * scaleYSlider, 1);

        let stackedValues = Array(props.dataLength).fill(0);
        const chartsLength = props.charts.length;
        const sumValues = [];
        let nextState: State = { ...prevState, chartPathes: [] };
        for (let i = 0; i < props.dataLength; i++) {
          let sum = 0;
          for (let j = 0; j < chartsLength; j++) {
            sum += props.charts[j].values[i];
          }
          sumValues.push(sum);
        }

        for (let chart of props.charts) {
          const values = chart.values.map((v, i) => round((v / sumValues[i]) * 100, 1));
          const path = createPercentagePathAttr(
            values,
            projectChartX,
            projectChartY,
            stackedValues
          );
          nextState.chartPathes.push(path);
          stackedValues = stackedValues.map((v, i) => v + values[i]);
        }
        return nextState;
      } else {
        const maxY = getStackedMax(0, dataLength, charts);
        let scaleYSlider = getScaleY(SLIDER_HEIGHT, maxY, minY);
        const projectChartX = (x: number) => round(x * scaleX, 1);
        const projectChartY = y => round(SLIDER_HEIGHT - (y - minY) * scaleYSlider, 1);
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
    }
    return prevState;
  },
  render(props: SliderChartProps, state: State) {
    const { charts, isStacked, dataLength, data } = props;
    return createElement(
      TransitionGroup,
      {
        wrapper: children =>
          createElement("svg", { width: CHART_WIDTH, height: SLIDER_HEIGHT }, children)
      },
      charts.slice(0).reverse().map(({ color, sliderPath }, i) =>
        createElement(Transition, {
          key: color,
          children: status =>
            path(
              isStacked ? state.chartPathes[charts.length - 1 - i] : sliderPath,
              color,
              isStacked ? CHART_WIDTH / dataLength : 1,
              status,
              isStacked,
              data.percentage
            )
        })
      )
    );
  }
});
