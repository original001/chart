import { ComponentType, componentMixin, createElement } from "./reconciler";
import { CHART_WIDTH, CHART_HEIGHT, PRECISION } from "./constant";
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
  zoomed: boolean;
  scaledX_: (x: number) => number;
  y__: (f: (y: number) => number) => (x: number) => number;
}

interface State {
  chartPathes: string[];
  zoomed: boolean;
  relScaleX: number;
  relScaleY: number;
  rescaled: boolean;
}

export const Chart: ComponentType = () => ({
  ...componentMixin(),
  state: {
    chartPathes: null,
    zoomed: null,
    relScaleX: null,
    relScaleY: null,
    rescaled: false,
  } as State,
  getDeriviedStateFromProps(props: ChartProps, state: State) {
    const prevState = { ...state };
    if (!prevState.relScaleX) {
      prevState.relScaleX = props.extraScale;
      prevState.relScaleY = props.scaleY;
    }
    if (!props.data.stacked) return prevState;
    if (
      !prevState.chartPathes ||
      props.charts.length !== prevState.chartPathes.length ||
      props.zoomed != prevState.zoomed
    ) {
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
          const dots = chart.dots.map(
            ([x, y], i) => [x, round((y / sumValues[i]) * 100, 1)] as [number, number]
          );
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
  timer: null,
  reducer(action, prevState: State): State {
    switch (action.type) {
      case "scale2":
        return {
          ...prevState,
          rescaled: false
        };
      case "scale":
        return {
          ...prevState,
          rescaled: true,
          relScaleX: action.payload.scaleX,
          relScaleY: action.payload.scaleY
        };
    }
  },
  didUpdate() {
    const props = this.props as ChartProps;
    const state = this.state as State;
    if (props.data.y_scaled || props.data.stacked ) return;
    if (state.rescaled) {
      setTimeout(() => {
        this.send({ type: 'scale2' })
      }, 100)
      return;
    }
    if (this.timer) {
      clearTimeout(this.timer);
    }
    if (state.relScaleX === props.extraScale && state.relScaleY === props.scaleY) return;
    // return;
    this.timer = setTimeout(() => {
      clearTimeout(this.timer);
      this.send({
        type: "scale",
        payload: { scaleX: props.extraScale, scaleY: props.scaleY }
      });
    }, 500);
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
      showPopupOn,
      zoomed
    } = props;
    const { dataLength } = props;
    const { relScaleX, relScaleY } = state;
    const { y_scaled, stacked, percentage } = data;
    const chartOpacity = showPopupOn && stacked && !percentage ? 0.5 : 1;
    const offsetX = offset * CHART_WIDTH;
    const wrapperScaleX = round(extraScale / relScaleX, PRECISION);
    const wrapperScaleY = round(scaleY / relScaleY, PRECISION);
    const divWrapper = children =>
      y_scaled ? children : createElement(
        "div",
        {
          style: `
          height: ${CHART_HEIGHT}px;
          transform: scaleX(${wrapperScaleX}) translateX(-${offsetX / wrapperScaleX}px);
          transform-origin: 0 ${CHART_HEIGHT}px;
          opacity: ${chartOpacity}`
        },
        [
          createElement(
            "div",
            {
              //prettier-ignore
              style: `transform: scaleY(${wrapperScaleY}) translateY(${offsetY * relScaleY}px);transform-origin: 0 ${CHART_HEIGHT}px;`,
              class: state.rescaled ? "" : "transition-d"
            },
            [children]
          )
        ]
      );

    return divWrapper(
      createElement(
        TransitionGroup,
        {
          wrapper: children =>
            createElement(
              "svg",
              {
                width: CHART_WIDTH,
                height: CHART_HEIGHT,
                overflow: "visible",
                viewBox: `${y_scaled ? offsetX / extraScale : 0} 0 ${y_scaled ? CHART_WIDTH / extraScale : CHART_WIDTH} ${CHART_HEIGHT}`,
                preserveAspectRatio: "none"
              },
              y_scaled
                ? children
                : [createElement(
                    "g",
                    {
                      style: `transform: scale(${relScaleX} ,${relScaleY}); transform-origin: 0 ${CHART_HEIGHT}px;`
                    },
                    children
                  )]
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
                        style: `
                          transform: scaleY(${getScale(id === 'y1')}) translateY(${getOffset(id === 'y1')}px);
                          transform-origin: 0 ${CHART_HEIGHT}px;
                          opacity: ${chartOpacity}`,
                        class: "transition-d"
                      },
                      [path(chartPath, color, 2, status)]
                    )
                  : path(
                      stacked ? state.chartPathes[charts.length - 1 - i] : chartPath,
                      color,
                      stacked ? zoomed ? CHART_WIDTH / 168 + 0.05 : CHART_WIDTH / dataLength + 0.05 : 2,
                      status,
                      stacked,
                      percentage
                    )
            })
          )
      )
    );
  }
});
