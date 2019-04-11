import { getBounds, getBoundsX, roundWithPrecision } from "./axis";
import { data, ChartDto } from "./chart_data";
import { render, createElement, ComponentType, componentMixin } from "./reconciler";
import { TransitionRuller, RullerProps } from "./ruller";
import { Slider } from "./slider";

import { CHART_HEIGHT, CHART_WIDTH, SLIDER_HEIGHT, PRECISION } from "./constant";
import { TransitionGroup } from "./labels";
import { Transition } from "./transition";
import { prettifyDate, createRaf, getStackedMax } from "./utils";
import { Dots } from "./dots";
import { path, Chart, ChartProps } from "./chart";
import { SliderChart, SliderChartProps } from "./sliderChart";
require("./app.css");

type Dot = [number, number];
type Chart = Dot[];
export interface ChartInfo {
  chartPath: string;
  sliderPath: string;
  values: number[];
  name: string;
  color: string;
  id: string;
  min: number;
  max: number;
}

export interface Props {
  charts: ChartInfo[];
  visibles: { [id: string]: boolean };
  scaleX: number;
  maxY: number;
  minY: number;
  minX: number;
  maxX: number;
  data: ChartDto;
  stackedValues?: number[];
  dataLength: number;
  pow: 1 | 1000 | 1000000
}


export const prepareData = (data: ChartDto): Props => {
  const columns = data.columns;
  const dataLength = data.columns[0].length - 1;
  const scaleX = getScaleX(CHART_WIDTH, dataLength);
  const xs = columns[0];
  const chartInfos: ChartInfo[] = [];
  const getExtremumY = (fn: string) =>
    Math[fn].apply(Math, columns.slice(1).map(ys => Math[fn].apply(Math, ys.slice(1))));
  const extremum = (fn, from, to?) => fn(columns.slice(from, to).map(ys => fn(ys.slice(1))));
  const maxX = extremum(ar => Math.max.apply(Math, ar), 0, 1);
  const minX = extremum(ar => Math.min.apply(Math, ar), 0, 1);
  let maxY = getExtremumY("max");
  const pow = maxY / 1000 > 1 ? maxY / 1000000 > 1 ? 1000000 : 1000 : 1;
  maxY = roundWithPrecision(maxY / pow, PRECISION);
  const minY = data.stacked ? 0 : roundWithPrecision(getExtremumY("min") / pow, PRECISION);
  let scaleYSlider = getScaleY(SLIDER_HEIGHT, maxY, minY);
  const projectChartX = (x: number) => (x * scaleX).toFixed(1);
  const projectChartY = (y: number) => (CHART_HEIGHT - y).toFixed(1);
  let stackedValues = Array(dataLength).fill(0);
  let i = 1;
  columns.sort((a, b) => (a[1] > b[1] ? -1 : a[1] === b[1] ? 0 : 1));
  while (i < columns.length) {
    let values = columns[i];
    const name = values[0] as string;
    values = values.slice(1).map(v => roundWithPrecision(v as number / pow, PRECISION));
    //.map(v => (v > 1000 ? Math.floor(v / 1000) : v));
    const max = Math.max.apply(Math, values);
    const min = Math.min.apply(Math, values);
    // values = pow > 1 ? values : values;
    if (data.y_scaled) {
      scaleYSlider = getScaleY(SLIDER_HEIGHT, max, min);
    }
    //todo: leave only values
    const chartInfo: ChartInfo = {
      name: data.names[name],
      color: data.colors[name],
      chartPath: data.stacked ? null : createPathAttr(values as number[], projectChartX, projectChartY, stackedValues),
      sliderPath: data.stacked ? null : createPathAttr(
        values as number[],
        x => x * scaleX,
        y => SLIDER_HEIGHT - (y - minY) * scaleYSlider,
        stackedValues
      ),
      max,
      min,
      id: name,
      values: values as number[]
    };
    chartInfos.push(chartInfo);
    if (data.stacked) {
      stackedValues = stackedValues.map((v, i) => v + values[i]);
    }
    i++;
  }
  const visibles = {};
  for (let id in data.names) {
    visibles[id] = true;
  }
  return {
    charts: chartInfos,
    visibles,
    maxY,
    minY,
    maxX,
    minX,
    scaleX,
    data,
    stackedValues,
    dataLength,
    pow
  } as Props;
};

export const createPathAttr = (
  values: number[],
  projectX: (x: number) => string | number,
  projectY: (y: number) => string | number,
  _: number[]
) =>
  values.reduce(
    (acc, y, i) => (i === 0 ? `M0 ${projectY(y)}` : acc + ` L${projectX(i)} ${projectY(y)}`),
    ""
  );

export const createStackedPathAttr = (
  values: number[],
  projectX: (x: number) => string | number,
  projectY: (y: number) => string | number,
  prevValues: number[]
) =>
  values.reduce(
    (acc, y, i) =>
      acc +
      `M${projectX(i)} ${projectY(prevValues[i])}L${projectX(i)} ${projectY(y + prevValues[i])}`,
    ""
  );

const flexLabel = (timestamp: number, offset: number, status: string) =>
  createElement(
    "span",
    {
      class: status + " transition l-text flex-item",
      key: timestamp
    },
    prettifyDate(timestamp)
  );

export const getScaleY = (length: number, max: number, min: number) => length / (max - min);

export const getScaleX = (width, dotsCount) => width / dotsCount;

const TOGGLE_CHART_HANDLER_NAME = "toggleChartHandler";
const TOGGLE_DAY_HANDLER_NAME = "toggleDayHandler";

interface State {
  extraScale: number;
  offset: number;
  sliderPos: { left: number; right: number };
  touchEndTimestamp: number;
  mode: string;
  visibles: { [id: string]: boolean };
}

const App: ComponentType = () => ({
  ...componentMixin(),
  id: Date.now(),
  state: {
    extraScale: 4,
    offset: 3,
    sliderPos: { left: 0.75, right: 1 },
    touchEndTimestamp: 0,
    mode: "night", // workaround,
    showPopupOn: null,
    visibles: null
  } as State,
  reducer({ type, payload }, state: State) {
    let scale;
    switch (type) {
      case "updateSlider":
        scale = 1 / (payload.right - payload.left);
        return {
          ...state,
          extraScale: scale,
          offset: payload.left * scale,
          sliderPos: { ...payload }
        };
      case "toggle":
        return {
          ...state,
          visibles: {
            ...state.visibles,
            [payload]: !state.visibles[payload]
          }
        };
      case "touchEnd":
        return {
          ...state,
          touchEndTimestamp: payload
        };
      case "mode":
        return {
          ...state,
          mode: payload
        };
    }
  },
  didMount() {
    const id = this.id;
    window[TOGGLE_CHART_HANDLER_NAME + id] = name => {
      this.send({ type: "toggle", payload: name });
    };

    window[TOGGLE_DAY_HANDLER_NAME + id] = () => {
      const nextMode = this.state.mode === "day" ? "night" : "day";
      document.body.setAttribute("class", nextMode);
      this.send({ type: "mode", payload: nextMode });
    };
  },
  getDeriviedStateFromProps(props, prevState) {
    if (!prevState.visibles) return { ...prevState, visibles: props.visibles };
  },
  render(props: Props, state: State) {
    const id = this.id;
    const { scaleX, maxX, minX, data, dataLength, minY, pow } = props;
    const {
      visibles,
      sliderPos: { left, right },
      extraScale,
      offset
    } = state;
    const charts = props.charts.filter(chart => visibles[chart.id]);

    const getExtremumY = (fn: string, left: number, right: number, charts: ChartInfo[]) =>
      Math[fn].apply(
        Math,
        charts.map(({ values: ys }) =>
          Math[fn].apply(
            Math,
            ys.slice(Math.floor(dataLength * left) + 1, Math.ceil(dataLength * right))
          )
        )
      );

    // if

    const isScaled = data.y_scaled;
    const isStacked = data.stacked;
    let localMinY;
    let localMaxY;
    let localMinY2;
    let localMaxY2;
    if (isScaled) {
      const first = props.charts.filter(c => c.id === "y0");
      localMinY = getExtremumY("min", left, right, first);
      localMaxY = getExtremumY("max", left, right, first);
      const second = props.charts.filter(c => c.id === "y1");
      localMinY2 = getExtremumY("min", left, right, second);
      localMaxY2 = getExtremumY("max", left, right, second);
    } else if (isStacked) {
      localMinY = 0;
      localMaxY = getStackedMax(
        Math.floor(dataLength * left) + 1,
        Math.ceil(dataLength * right),
        charts
      );
    } else {
      localMinY = getExtremumY("min", left, right, charts);
      localMaxY = getExtremumY("max", left, right, charts);
    }

    let { values: valuesY, max: boundsMaxY, min: boundsMinY } = getBounds(
      CHART_HEIGHT,
      localMaxY,
      localMinY
    );
    // valuesY = charts.some(c => c.id === 'y1') ? valuesY : null
    const { values: valuesY2, max: boundsMaxY2, min: boundsMinY2 } = isScaled
      ? getBounds(CHART_HEIGHT, localMaxY2, localMinY2)
      : { values: null, max: 1, min: 1 };

    const valuesX = getBoundsX(extraScale, maxX, minX);
    // console.log(valuesX)
    const scaleY = getScaleY(CHART_HEIGHT, boundsMaxY, boundsMinY);
    const scaleY2 = getScaleY(CHART_HEIGHT, boundsMaxY2, boundsMinY2);

    const offsetY = boundsMinY;
    const offsetY2 = boundsMinY2;
    const getScale = (isSecond: boolean) => (isScaled && isSecond ? scaleY2 : scaleY);
    const getOffset = (isSecond: boolean) => (isScaled && isSecond ? offsetY2 : offsetY);
    // const offsetY = 0;

    const projectChartXForDots: (x: number) => string = x =>
      (x * scaleX * extraScale - offset * CHART_WIDTH).toFixed(1);
    const projectChartYForDots = (y: number, isSecond: boolean) =>
      (CHART_HEIGHT - (y - getOffset(isSecond)) * getScale(isSecond)).toFixed(1);

    const chart = createElement(Chart, {
      charts,
      data,
      dataLength,
      offsetY,
      getScale,
      getOffset,
      offset,
      extraScale,
      id,
      projectChartXForDots,
      projectChartYForDots,
      scaleY,
      scaleX
    } as ChartProps);

    const slider = createElement(
      "div",
      {
        style: `position: relative; overflow: hidden; height: ${SLIDER_HEIGHT}px; width: ${CHART_WIDTH}px`
      },
      [
        createElement(Slider, {
          onChange: payload => this.send({ type: "updateSlider", payload }),
          onTouchEnd: () => this.send({ type: "touchEnd", payload: Date.now() }),
          eventId: id
        }),
        createElement(SliderChart, {
          charts,
          dataLength,
          minY,
          scaleX,
          isStacked
        } as SliderChartProps)
      ]
    );
    const scaledWidth = CHART_WIDTH * state.extraScale;

    const labels = createElement(
      TransitionGroup,
      {
        wrapper: children =>
          createElement("div", { class: "rel w-ch-c", style: "height: 50px" }, [
            createElement(
              "div",
              {
                class: "flex-labels w-ch",
                //prettier-ignore
                // style: `transform: translateX(-${state.offset * CHART_WIDTH}px); width: ${scaledWidth}px`
                style: `left: -${state.sliderPos.left * CHART_WIDTH * state.extraScale}px; right: ${(state.sliderPos.right - 1) * CHART_WIDTH * state.extraScale}px`
              },
              children
            )
          ])
      },
      valuesX.map((x, i) =>
        createElement(Transition, {
          children: status => flexLabel(x, (i * scaledWidth) / valuesX.length, status),
          key: x
        })
      )
    );
    const buttons = createElement(
      "div",
      { class: "buttons" },
      Object.keys(visibles).map(chartId =>
        createElement(
          "span",
          {
            class: "button",
            ontouchstart: `${TOGGLE_CHART_HANDLER_NAME + id}("${chartId}")`
          },
          [
            createElement(
              "span",
              {
                class: "button-label",
                style: `background: ${data.colors[chartId]}`
              },
              [
                createElement("span", {
                  class: `button-icon ${visibles[chartId] ? "" : "active"}`
                })
              ]
            ),
            createElement("span", { class: "button-text" }, data.names[chartId])
          ]
        )
      )
    );
    const nightButton = createElement(
      "div",
      { class: "switch", ontouchstart: `${TOGGLE_DAY_HANDLER_NAME + id}()` },
      "Switch to Nigth Mode"
    );
    const ruller = createElement(TransitionRuller, {
      values: valuesY,
      scale: scaleY,
      offset: offsetY,
      valuesY2,
      charts,
      pow,
    } as RullerProps);

    return createElement("div", { class: "rel" }, [
      ruller,
      chart,
      labels,
      slider,
      buttons,
      nightButton
    ]);
  }
});

const Benchmark: ComponentType = () => ({
  ...componentMixin(),
  state: {
    offset: 0,
    width: 100
  },
  reducer(action, state) {
    switch (action.type) {
      case "update":
        return {
          ...state,
          offset: action.payload,
          width: state.width + action.payload / 100
        };
      case "transition":
        return {
          ...state,
          offset: 200,
          width: 300
        };
    }
  },
  didMount() {
    window[`onmousemovebench${this.props.id}`] = createRaf(e => {
      this.send({ type: "update", payload: e.targetTouches[0].clientX });
    });
    window[`ontouchstartbench${this.props.id}`] = createRaf(e => {
      this.send({ type: "transition", payload: e.targetTouches[0].clientX });
    });
  },
  render(props, state) {
    const { width, offset } = state;
    return createElement("div", {}, [
      createElement(
        "div",
        {
          ontouchmove: `onmousemovebench${props.id}(event)`,
          // ontouchstart: `ontouchstartbench${props.id}(event)`,
          class: "bench-wrapper"
          // width: 100,
          // height: 500
          // style: `width: ${width}px`
          // style: `opacity: ${offset || 0.1}`
          // style: `transform: translateX(${width}px)`
        },
        Array(100)
          .fill(0)
          .map((_, i) =>
            createElement("div", {
              class: "bench",
              // y: i * 5,
              // fill: '#ddd',
              style: `transform: translateX(${offset}px)`
              // style: `opacity: ${offset || 0.1}`
              // style: `opacity: ${10/offset}`
              // x: `${offset}`
              // x: 0
            })
          )
      )
      // createElement("div", {
      //   ontouchmove: `onmousemovebench${props.id}(event)`,
      //   class: "bench-overlay"
      // })
    ]);
  }
});

const start = () => {
  render(
    createElement("div", {}, [
      createElement(App, prepareData(data[0])),
      // createElement(App, prepareData(data[1])),
      createElement(App, prepareData(data[2])),
      // createElement(App, prepareData(data[3])),
      createElement(App, prepareData(data[4]))
      // createElement(Benchmark, { id: 1 }),
      // createElement(Benchmark, { id: 2 })
    ]),
    document.getElementById("main")
  );
};

window["start"] = start;
