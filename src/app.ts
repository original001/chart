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
import { prettifyDate, createRaf } from "./utils";
import { Dots } from "./dots";
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
}

export const prepareData = (data: ChartDto): Props => {
  const columns = data.columns;
  const dataLength = data.columns[0].length;
  const scaleX = getScaleX(CHART_WIDTH, dataLength - 1);
  const xs = columns[0];
  const chartInfos: ChartInfo[] = [];
  const getExtremumY = (fn: string) =>
    Math[fn].apply(
      Math,
      columns.slice(1).map(ys => Math[fn].apply(Math, ys.slice(1)))
    );
  const extremum = (fn, from, to?) =>
    fn(columns.slice(from, to).map(ys => fn(ys.slice(1))));
  const maxX = extremum(ar => Math.max.apply(Math, ar), 0, 1);
  const minX = extremum(ar => Math.min.apply(Math, ar), 0, 1);
  const maxY = getExtremumY("max");
  const minY = getExtremumY("min");
  const scaleYSlider = getScaleY(SLIDER_HEIGHT, maxY, minY);
  const projectChartX = (x: number) => (x * scaleX).toFixed(1);
  const projectChartY = (y: number) => (CHART_HEIGHT - y).toFixed(1);
  for (let values of columns.slice(1)) {
    const name = values[0] as string;
    values = (values as number[]).slice(1);
    // .map(v => (v > 100000 ? Math.floor(v / 10000) : v));
    const chartDots = values.map((y, i) => [xs[i + 1], y] as Dot);
    const chartInfo: ChartInfo = {
      name: data.names[name],
      color: data.colors[name],
      chartPath: createPathAttr(chartDots, projectChartX, projectChartY),
      sliderPath: createPathAttr(
        chartDots,
        x => x * scaleX,
        y => SLIDER_HEIGHT - (y - minY) * scaleYSlider
      ),
      max: Math.max.apply(Math, values),
      min: Math.min.apply(Math, values),
      id: name,
      values: values as number[]
    };
    chartInfos.push(chartInfo);
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
    data
  };
};

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

export const getScaleY = (length: number, max: number, min: number) =>
  length / (max - min);

export const getScaleX = (width, dotsCount) => width / dotsCount;

const TOGGLE_CHART_HANDLER_NAME = "toggleChartHandler";
const TOGGLE_DAY_HANDLER_NAME = "toggleDayHandler";
const TOGGLE_GRAPH_HANDLER_NAME = "toggleGraphHandler";

interface State {
  extraScale: number;
  offset: number;
  sliderPos: { left: number; right: number };
  touchEndTimestamp: number;
  mode: string;
  showPopupOn: number;
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
    mode: "day", // workaround,
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
      case "showPopup":
        scale = 1 / (state.sliderPos.right - state.sliderPos.left);
        return {
          ...state,
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
    const id = this.id;
    window[TOGGLE_CHART_HANDLER_NAME + id] = name => {
      this.send({ type: "toggle", payload: name });
    };
    window[TOGGLE_GRAPH_HANDLER_NAME + id] = (e: TouchEvent) => {
      const currentTarget = e.currentTarget as Element;
      this.send({
        type: "showPopup",
        payload: e.targetTouches[0].clientX - 10
      });
      const hideHandler = (_e: TouchEvent) => {
        const target = _e.target as Element;
        if (target === currentTarget || currentTarget.contains(target)) {
        } else this.send({ type: "hidePopup" });
        _e.currentTarget.removeEventListener("touchstart", hideHandler);
      };
      setTimeout(() => {
        document.documentElement.addEventListener("touchstart", hideHandler);
      }, 10);
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
    const { scaleX, maxX: maxX, minX: minX, data } = props;
    const columns = data.columns;
    const {
      visibles,
      sliderPos: { left, right },
      extraScale,
      offset
    } = state;
    const charts = props.charts.filter(chart => visibles[chart.id]);

    const dataLength = columns[0].length;

    const getExtremumY = (fn: string, left?: number, right?: number) =>
      Math[fn].apply(
        Math,
        charts.map(({ values: ys }) =>
          Math[fn].apply(
            Math,
            ys.slice(
              Math.floor(dataLength * left) + 1,
              Math.ceil(dataLength * right)
            )
          )
        )
      );
    const localMinY = getExtremumY("min", left, right);
    const localMaxY = getExtremumY("max", left, right);

    const { values: valuesY, max: boundsMaxY, min: boundsMinY } = getBounds(
      CHART_HEIGHT,
      localMaxY,
      localMinY
    );
    const valuesX = getBoundsX(extraScale, maxX, minX);
    // console.log(valuesX)
    const scaleY = getScaleY(CHART_HEIGHT, boundsMaxY, boundsMinY);
    const offsetY = localMinY;
    // const offsetY = 0;

    const projectChartXForDots: (x: number) => string = x =>
      (x * scaleX * extraScale - offset * CHART_WIDTH).toFixed(1);
    const projectChartYForDots: (y: number) => string = y =>
      (CHART_HEIGHT - (y - localMinY) * scaleY).toFixed(1);
    const chart = createElement(
      "svg",
      {
        width: CHART_WIDTH,
        height: CHART_HEIGHT,
        ontouchstart: `${TOGGLE_GRAPH_HANDLER_NAME + id}(event)`,
        class: `w-ch`
      },
      [
        createElement(
          TransitionGroup,
          {
            wrapper: children =>
              createElement(
                "g",
                {
                  style: `transform: translateX(-${offset * CHART_WIDTH}px) scale(${extraScale},1);`,
                  class: "transition-d-0 w-ch"
                },
                [
                  createElement(
                    "g",
                    {
                      transform: `scale(1, ${scaleY}) translate(0, ${offsetY})`,
                      style: `transform-origin: 0 ${CHART_HEIGHT}px`,
                      class: "transition-d"
                    },
                    children
                  )
                ]
              )
          },
          charts.map(({ color, chartPath }) =>
            createElement(Transition, {
              key: color,
              timeout: 500,
              children: status => path(chartPath, color, 2, status)
            })
          )
        ),
        createElement(Dots, {
          data,
          charts,
          projectChartX: projectChartXForDots,
          projectChartY: projectChartYForDots,
          touchEndTimestamp: state.touchEndTimestamp,
          scale: extraScale,
          offset: offset,
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
      charts.map(({ color, sliderPath }) =>
        createElement(Transition, {
          key: color,
          children: status => path(sliderPath, color, 1, status)
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
        createElement('div', {class: 'rel w-ch-c', style: 'height: 50px'}, [

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
          children: status =>
            flexLabel(x, (i * scaledWidth) / valuesX.length, status),
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
      offset: offsetY
    });

    return createElement("div", {class: 'rel'}, [
      ruller,
      chart,
      labels,
      slider,
      buttons,
      nightButton,
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
