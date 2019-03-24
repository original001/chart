import { getBounds, getBoundsX } from "./axis";
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
import { TransitionGroup } from "./labels";
import { Transition } from "./transition";
import { prettifyDate } from "./utils";
import { Dots } from "./dots";
require("./app.css");

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
const path = (path: string, color: string, strokeWidth: number, status?) =>
  createElement("path", {
    d: path,
    "stroke-width": strokeWidth,
    stroke: color,
    class: "transition-p" + " " + status,
    "vector-effect": "non-scaling-stroke",
    fill: "none",
    key: color
  });

const label = (timestamp: number, offset: number, status: string) =>
  createElement(
    "text",
    {
      x: Math.round(offset),
      y: 15,
      class: status + " transition r-text",
      key: timestamp
    },
    prettifyDate(timestamp)
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
    extraScale: 4,
    offset: 3,
    sliderPos: { left: 0.75, right: 1 },
    hiddenNames: [],
    touchEndTimestamp: 0 // workaround
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
      case "touchEnd":
        return {
          ...state,
          touchEndTimestamp: payload
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

    const getExtremumY = (fn: string, all?: boolean) =>
      Math[fn].apply(
        Math,
        columns
          .slice(1)
          .map(ys =>
            Math[fn].apply(
              Math,
              all
                ? ys.slice(1)
                : ys.slice(
                    Math.floor(dataLength * state.sliderPos.left) + 1,
                    Math.ceil(dataLength * state.sliderPos.right)
                  )
            )
          )
      );

    const highY = getExtremumY("max");
    const lowY = getExtremumY("min");
    const highYall = getExtremumY("max", true);
    const lowYall = getExtremumY("min", true);
    const { max: maxYall, min: minYall } = getBounds(
      CHART_HEIGHT,
      highYall,
      lowYall
    );

    const { values, max, min } = getBounds(CHART_HEIGHT, highY, lowY);
    const valuesX = getBoundsX(state.extraScale, highX, lowX);
    // console.log(valuesX)
    const scaleY = getScaleY(CHART_HEIGHT, max, min);
    const scaleX = getScaleX(CHART_WIDTH, columns[0].length - 1);
    const scaleYSlider = getScaleY(SLIDER_HEIGHT, maxYall, minYall);

    const projectChartX: (x: number) => string = x => (x * scaleX).toFixed(1);
    const projectChartXForDots: (x: number) => string = x =>
      (x * scaleX * state.extraScale).toFixed(1);
    const projectChartY: (y: number) => string = y =>
      (CHART_HEIGHT - (y - values[0])).toFixed(1);
    const projectChartYForDots: (y: number) => string = y =>
      (CHART_HEIGHT - (y - values[0]) * scaleY).toFixed(1);
    const chart = createElement(
      "svg",
      { width: CHART_WIDTH, height: CHART_HEIGHT, overflow: "visible" },
      [
        createElement(TransitionRuller, { values, scale: scaleY }),
        createElement("g", {}, [
          createElement(
            TransitionGroup,
            {
              wrapper: children =>
                createElement(
                  "g",
                  {
                    style: `transform: scaleY(${scaleY}); transform-origin: 0 ${CHART_HEIGHT}px;`,
                    class: "transition-d"
                  },
                  [
                    createElement(
                      "g",
                      {
                        style: `transform: translateX(-${state.offset *
                          CHART_WIDTH}px) scale(${state.extraScale},1);`
                      },
                      children
                    )
                  ]
                )
            },
            charts.map(({ chart, color }) =>
              createElement(Transition, {
                key: color,
                children: status =>
                  path(
                    createPathAttr(chart, projectChartX, projectChartY),
                    color,
                    2,
                    status
                  )
              })
            )
          ),
          createElement(Dots, {
            data,
            columns,
            projectChartX: projectChartXForDots,
            projectChartY: projectChartYForDots,
            touchEndTimestamp: state.touchEndTimestamp
          })
        ])
      ]
    );
    const sliderChart = createElement(
      TransitionGroup,
      {
        wrapper: children =>
          createElement(
            "svg",
            { width: CHART_WIDTH, height: SLIDER_HEIGHT },
            children
          )
      },
      charts.map(({ chart, color }) =>
        createElement(Transition, {
          key: color,
          children: status =>
            path(
              createPathAttr(
                chart,
                x => x * scaleX,
                y => SLIDER_HEIGHT - (y - values[0]) * scaleYSlider
              ),
              color,
              1,
              status
            )
        })
      )
    );

    const slider = createElement(
      "div",
      {
        style: `position: relative; overflow: hidden; height: ${SLIDER_HEIGHT}px; width: ${CHART_WIDTH}px`
      },
      [
        createElement(Slider, {
          onChange: payload => this.send({ type: "updateSlider", payload }),
          onTouchEnd: () => this.send({ type: "touchEnd", payload: Date.now() })
        }),
        sliderChart
      ]
    );
    const scaledWidth = CHART_WIDTH * state.extraScale;

    const labels = createElement(
      TransitionGroup,
      {
        wrapper: children =>
          createElement(
            "div",
            {
              class: "flex-labels",
              //prettier-ignore
              style: `transform: translateX(-${state.offset * CHART_WIDTH}px); width: ${scaledWidth}px`
            },
            children
          )
      },
      valuesX.map((x, i) =>
        createElement(Transition, {
          children: status =>
            flexLabel(x, (i * scaledWidth) / valuesX.length, status),
          key: x
        })
      )
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
