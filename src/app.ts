import { getBounds } from "./axis";
import { data, ChartDto } from "./chart_data";
import {
  render,
  createElement,
  ComponentType,
  componentMixin,
  Tree
} from "./reconciler";
import { TransitionRuller } from "./ruller";
import { Slider } from "./slider";

import { CHART_HEIGHT, CHART_WIDTH, SLIDER_HEIGHT } from "./constant";
import { statement } from "@babel/template";
import { TransitionLabels } from "./labels";
import { Transition } from "./transition";
import { zipDots, prettifyDate } from "./utils";
import { Dots } from "./dots";

type Dot = [number, number];
type Chart = Dot[];
interface ChartInfo {
  chart: Chart;
  name: string;
  color: string;
}

export const createPathAttr = (
  chart: Chart,
  projectX: (x: number) => string | number,
  projectY: (y: number) => string | number
) =>
  chart.reduce(
    (acc, [x, y], i) =>
      i === 0 ? `M0 ${projectY(y)}` : acc + ` L${projectX(i)} ${projectY(y)}`,
    ""
  );
const path = (path: string, color: string) =>
  createElement("path", {
    d: path,
    "stroke-width": 2,
    stroke: color,
    fill: "none"
  });

const label = (timestamp: number, offset: number, status: string) =>
  createElement(
    "text",
    {
      x: Math.round(offset),
      y: 20,
      fill: "gray",
      class: status + " transition",
      key: timestamp
    },
    prettifyDate(timestamp)
  );

export const getChartsFromData = (
  data: ChartDto,
  columns: ChartDto["columns"]
): ChartInfo[] => {
  const xs = columns[0];
  const chartInfos: ChartInfo[] = [];
  for (let values of columns.slice(1)) {
    const name = values[0] as string;
    const chart = values.slice(1).map((y, i) => [xs[i + 1], y] as Dot);
    const chartInfo = {
      name: data.names[name],
      color: data.colors[name],
      chart
    };
    chartInfos.push(chartInfo);
  }
  return chartInfos;
};

export const getScaleY = (length: number, max: number, min: number) =>
  length / (max - min);

export const getScaleX = (width, dotsCount) => width / dotsCount;

export const getHighLow = (data: ChartDto) => {
  const extremum = (fn, from, to?) =>
    fn(data.columns.slice(from, to).map(ys => fn(ys.slice(1))));
  const highY = extremum(ar => Math.max.apply(Math, ar), 1);
  const lowY = extremum(ar => Math.min.apply(Math, ar), 1);
  const highX = extremum(ar => Math.max.apply(Math, ar), 0, 1);
  const lowX = extremum(ar => Math.min.apply(Math, ar), 0, 1);
  return [highY, lowY, highX, lowX];
};

const TOGGLE_CHART_HANDLER_NAME = "toggleChartHandler";

const App: ComponentType = () => ({
  ...componentMixin(),
  state: {
    extraScale: 1,
    offset: 0,
    sliderPos: { left: 0, right: 1 },
    hiddenNames: [] // workaround
  },
  reducer({ type, payload }, state) {
    switch (type) {
      case "updateSlider":
        const scale = 1 / (payload.right - payload.left);
        return {
          ...state,
          extraScale: scale,
          offset: payload.left * scale,
          sliderPos: { ...payload }
        };
      case "toggle":
        return {
          ...state,
          hiddenNames: state.hiddenNames.includes(payload)
            ? state.hiddenNames.filter(name => name !== payload)
            : state.hiddenNames.concat([payload])
        };
    }
  },
  didMount() {
    window[TOGGLE_CHART_HANDLER_NAME] = name => {
      this.send({ type: "toggle", payload: name });
    };
  },
  render(props, state) {
    const data: ChartDto = props.data;
    const names = data.names;
    const columns = data.columns.filter(
      col => !state.hiddenNames.includes(data.names[col[0]])
    );
    const charts = getChartsFromData(data, columns);
    // const [highY, lowY, highX, lowX] = getHighLow(data);

    const extremum = (fn, from, to?) =>
      fn(columns.slice(from, to).map(ys => fn(ys.slice(1))));
    // const highY = extremum(ar => Math.max.apply(Math, ar), 1);
    // const lowY = extremum(ar => Math.min.apply(Math, ar), 1);
    const highX = extremum(ar => Math.max.apply(Math, ar), 0, 1);
    const lowX = extremum(ar => Math.min.apply(Math, ar), 0, 1);

    const dataLength = columns[0].length;

    const highY = Math.max.apply(
      Math,
      columns
        .slice(1)
        .map(ys =>
          Math.max.apply(
            Math,
            ys.slice(
              Math.floor(dataLength * state.sliderPos.left) + 1,
              Math.ceil(dataLength * state.sliderPos.right)
            )
          )
        )
    );

    const lowY = Math.min.apply(
      Math,
      columns
        .slice(1)
        .map(ys =>
          Math.min.apply(
            Math,
            ys.slice(
              Math.floor(dataLength * state.sliderPos.left) + 1,
              Math.ceil(dataLength * state.sliderPos.right)
            )
          )
        )
    );

    const { values, max, min } = getBounds(CHART_HEIGHT, highY, lowY);
    const { values: valuesX } = getBounds(
      CHART_WIDTH * state.extraScale,
      highX,
      lowX,
      100
    );
    // console.log(valuesX)
    const scaleY = getScaleY(CHART_HEIGHT, max, min);
    const scaleX = getScaleX(CHART_WIDTH, columns[0].length - 1);
    const scaleYSlider = getScaleY(SLIDER_HEIGHT, max, min);

    const projectChartX: (x: number) => string = x =>
      (x * scaleX * state.extraScale).toFixed(1);
    const projectChartY: (y: number) => string = y =>
      (CHART_HEIGHT - (y - values[0]) * scaleY).toFixed(1);
    const chart = createElement(
      "svg",
      { width: CHART_WIDTH, height: CHART_HEIGHT },
      [
        createElement(TransitionRuller, { values, scale: scaleY }),
        createElement(
          "g",
          { style: `transform: translateX(-${state.offset * CHART_WIDTH}px)` },
          charts
            .map(({ chart, color }) =>
              path(createPathAttr(chart, projectChartX, projectChartY), color)
            )
            .concat([createElement(Dots, {data, columns, projectChartX, projectChartY})])
        )
      ]
    );
    const sliderChart = createElement(
      "svg",
      { width: CHART_WIDTH, height: SLIDER_HEIGHT },
      charts.map(({ chart, color }) =>
        path(
          createPathAttr(
            chart,
            x => x * scaleX,
            y => SLIDER_HEIGHT - (y - values[0]) * scaleYSlider
          ),
          color
        )
      )
    );
    const slider = createElement(
      "div",
      {
        style: `position: relative; overflow: hidden; height: ${SLIDER_HEIGHT}px; width: ${CHART_WIDTH}px`
      },
      [
        createElement(Slider, {
          onChange: payload => this.send({ type: "updateSlider", payload })
        }),
        sliderChart
      ]
    );
    const scaledWidth = CHART_WIDTH * state.extraScale;
    const labels = createElement(
      "svg",
      {
        width: scaledWidth,
        height: 30,
        style: `transform: translateX(-${state.offset * CHART_WIDTH}px)`
      },
      [
        createElement(
          TransitionLabels,
          {},
          valuesX.map((x, i) =>
            createElement(Transition, {
              children: status =>
                label(x, (i * scaledWidth) / valuesX.length, status),
              key: x
            })
          )
        )
      ]
    );
    const buttons = createElement(
      "div",
      { class: "buttons" },
      Object.keys(names).map(name =>
        createElement(
          "span",
          {
            class: "button",
            style: `background: ${data.colors[name]}`,
            onclick: `${TOGGLE_CHART_HANDLER_NAME}("${data.names[name]}")`
          },
          name
        )
      )
    );
    return createElement("div", {}, [chart, labels, slider, buttons]);
  }
});

const start = () => {
  render(
    createElement(App, { data: data[0] }),
    document.getElementById("main")
  );
};

window["start"] = start;
