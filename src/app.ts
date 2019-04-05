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
const TOGGLE_DAY_HANDLER_NAME = "toggleDayHandler";
const TOGGLE_GRAPH_HANDLER_NAME = "toggleGraphHandler";

const App: ComponentType = () => ({
  ...componentMixin(),
  state: {
    extraScale: 4,
    offset: 3,
    sliderPos: { left: 0.75, right: 1 },
    hiddenNames: [],
    touchEndTimestamp: 0,
    mode: "day", // workaround,
    showPopupOn: null
  },
  reducer({ type, payload }, state) {
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
          hiddenNames: state.hiddenNames.includes(payload)
            ? state.hiddenNames.filter(name => name !== payload)
            : state.hiddenNames.concat([payload])
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
      case "showPopup":
        scale = 1 / (state.sliderPos.right - state.sliderPos.left);
        return {
          ...state,
          // showPopupOn: payload + ((payload*state.extraScale - payload) + state.offset * CHART_WIDTH)/state.extraScale
          showPopupOn: payload
        };
      case "hidePopup":
        return {
          ...state,
          showPopupOn: null
        };
    }
  },
  didMount() {
    const id = this.props.data.columns[1][1];
    window[TOGGLE_CHART_HANDLER_NAME + id] = name => {
      this.send({ type: "toggle", payload: name });
    };
    window[TOGGLE_GRAPH_HANDLER_NAME + id] = (e: TouchEvent) => {
      this.send({
        type: "showPopup",
        payload: e.targetTouches[0].clientX - 10
      });
      // const hideHandler = () => {
      //   this.send({ type: "hidePopup" });
      //   document.documentElement.removeEventListener("touchstart", hideHandler);
      // };
      // setTimeout(() => {
      //   document.documentElement.addEventListener("touchstart", hideHandler);
      // }, 0);
    };
    window[TOGGLE_DAY_HANDLER_NAME + id] = () => {
      const nextMode = this.state.mode === "day" ? "night" : "day";
      document.body.setAttribute("class", nextMode);
      this.send({ type: "mode", payload: nextMode });
    };
  },
  render(props, state) {
    const id = props.data.columns[1][1];
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
    const { values, max: maxYall, min: minYall } = getBounds(
      CHART_HEIGHT,
      highYall,
      lowYall
    );

    const { values: valuesY, max, min } = getBounds(CHART_HEIGHT, highY, lowY);
    const valuesX = getBoundsX(state.extraScale, highX, lowX);
    // console.log(valuesX)
    const scaleY = getScaleY(CHART_HEIGHT, max, min);
    const scaleX = getScaleX(CHART_WIDTH, columns[0].length - 1);
    const scaleYSlider = getScaleY(SLIDER_HEIGHT, maxYall, minYall);

    const projectChartX: (x: number) => string = x => (x * scaleX).toFixed(1);
    const projectChartXForDots: (x: number) => string = x =>
      (x * scaleX * state.extraScale - state.offset * CHART_WIDTH).toFixed(1);
    const projectChartY: (y: number) => string = y =>
      (CHART_HEIGHT - (y - values[0])).toFixed(1);
    const projectChartYForDots: (y: number) => string = y =>
      (CHART_HEIGHT - (y - valuesY[0]) * scaleY).toFixed(1);
    const chart = createElement(
      "svg",
      {
        width: CHART_WIDTH,
        height: CHART_HEIGHT,
        overflow: "visible",
        ontouchstart: `${TOGGLE_GRAPH_HANDLER_NAME + id}(event)`
      },
      [
        createElement(TransitionRuller, {
          values: valuesY,
          scale: scaleY,
          offset: min - minYall
        }),

        createElement(
          TransitionGroup,
          {
            wrapper: children =>
              createElement(
                "g",
                {
                  style: `transform: scaleY(${scaleY}) translateY(${min -
                    minYall}px); transform-origin: 0 ${CHART_HEIGHT}px;`,
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
              timeout: 500,
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
          touchEndTimestamp: state.touchEndTimestamp,
          scale: state.extraScale,
          offset: state.offset,
          showPopupOn: state.showPopupOn
        })
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
          onTouchEnd: () =>
            this.send({ type: "touchEnd", payload: Date.now() }),
          eventId: id
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
            ontouchstart: `${TOGGLE_CHART_HANDLER_NAME + id}("${
              data.names[name]
            }")`
          },
          [
            createElement(
              "span",
              {
                class: "button-label",
                style: `background: ${data.colors[name]}`
              },
              [
                createElement("span", {
                  class: `button-icon ${
                    state.hiddenNames.includes(data.names[name]) ? "active" : ""
                  }`
                })
              ]
            ),
            createElement("span", { class: "button-text" }, name)
          ]
        )
      )
    );
    const nightButton = createElement(
      "div",
      { class: "switch", ontouchstart: `${TOGGLE_DAY_HANDLER_NAME + id}()` },
      "Switch to Nigth Mode"
    );
    return createElement("div", {}, [
      chart,
      labels,
      slider,
      buttons,
      nightButton
    ]);
  }
});

const start = () => {
  render(
    createElement("div", {}, [
      createElement(App, { data: data[0] }),
      createElement(App, { data: data[1] }),
      createElement(App, { data: data[2] }),
      createElement(App, { data: data[3] }),
      createElement(App, { data: data[4] })
    ]),
    document.getElementById("main")
  );
};

window["start"] = start;
