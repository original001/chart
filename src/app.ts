import { getBounds } from "./axis";
import { data, ChartDto } from "./chart_data";
import {
  render,
  createElement,
  ComponentType,
  componentMixin
} from "./reconciler";
import { TransitionRuller } from "./ruller";
import { Slider } from "./slider";

import { CHART_HEIGHT, CHART_WIDTH, SLIDER_HEIGHT } from "./constant";
import { statement } from "@babel/template";
import { TransitionLabels } from "./labels";
import { Transition } from "./transition";

type Dot = [number, number];
type Chart = Dot[];

export const createPathAttr = (
  chart: Chart,
  projectX: (x: number) => number,
  projectY: (y: number) => number
) =>
  chart.reduce(
    (acc, [x, y], i) =>
      i === 0 ? `M0 ${projectY(y)}` : acc + ` L${projectX(i)} ${projectY(y)}`,
    ""
  );

const prettifyDate = (timestamp: number) => {
  const [_, month, day] = new Date(timestamp).toString().split(" ");
  return `${month} ${day}`;
};

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
      x: offset,
      y: 20,
      fill: "gray",
      class: status + " transition"
    },
    prettifyDate(timestamp)
  );

export const zipDots = (xs: number[], ys: number[]) =>
  xs.reduce((acc, cur, i) => acc.concat([[xs[i], ys[i]]]), []);

export const getChartsFromData = (data: ChartDto) => {
  const xs = data.columns[0];
  return data.columns
    .slice(1)
    .map(values => values.slice(1).map((y, i) => [xs[i + 1], y] as Dot));
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

const App: ComponentType = () => ({
  ...componentMixin(),
  state: {
    extraScale: 1,
    offset: 0,
    sliderPos: { left: 0, right: 1 } // workaround
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
    }
  },
  render(props, state) {
    const data = props.data as ChartDto;
    const charts = getChartsFromData(data);
    // const [highY, lowY, highX, lowX] = getHighLow(data);

    const extremum = (fn, from, to?) =>
      fn(data.columns.slice(from, to).map(ys => fn(ys.slice(1))));
    // const highY = extremum(ar => Math.max.apply(Math, ar), 1);
    // const lowY = extremum(ar => Math.min.apply(Math, ar), 1);
    const highX = extremum(ar => Math.max.apply(Math, ar), 0, 1);
    const lowX = extremum(ar => Math.min.apply(Math, ar), 0, 1);

    const dataLength = data.columns[0].length;

    const highY = Math.max.apply(
      Math,
      data.columns
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
      data.columns
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
    const scaleY = getScaleY(CHART_HEIGHT, max, min);
    const scaleX = getScaleX(CHART_WIDTH, data.columns[0].length - 1);
    const scaleYSlider = getScaleY(SLIDER_HEIGHT, max, min);

    const chart = createElement(
      "svg",
      { width: CHART_WIDTH, height: CHART_HEIGHT },
      [
        createElement(TransitionRuller, { values, scale: scaleY }),
        createElement(
          "g",
          { style: `transform: translateX(-${state.offset * CHART_WIDTH}px)` },
          charts.map(chart =>
            path(
              createPathAttr(
                chart,
                x => x * scaleX * state.extraScale,
                y => CHART_HEIGHT - (y - values[0]) * scaleY
              ),
              "gray"
            )
          )
        )
      ]
    );
    const sliderChart = createElement(
      "svg",
      { width: CHART_WIDTH, height: SLIDER_HEIGHT },
      charts.map(chart =>
        path(
          createPathAttr(
            chart,
            x => x * scaleX,
            y => SLIDER_HEIGHT - (y - values[0]) * scaleYSlider
          ),
          "gray"
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
              children: status => label(x, (i * scaledWidth) / valuesX.length, status),
              key: x
            })
          )
        )
      ]
    );
    return createElement("div", {}, [chart, labels, slider]);
  }
});

const start = () => {
  render(
    createElement(App, { data: data[0] }),
    document.getElementById("main")
  );
};

window["start"] = start;
