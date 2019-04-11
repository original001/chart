import { getBounds, getBoundsX, round } from "./axis";
import { data } from "./chart_data";
import { render, createElement, ComponentType, componentMixin } from "./reconciler";
import { TransitionRuller, RullerProps } from "./ruller";
import { Slider } from "./slider";

import { CHART_HEIGHT, CHART_WIDTH, SLIDER_HEIGHT, PRECISION } from "./constant";
import { TransitionGroup } from "./labels";
import { Transition } from "./transition";
import { prettifyDate, createRaf, getStackedMax, createPathAttr } from "./utils";
import { Dots, DotsProps } from "./dots";
import { Chart, ChartProps } from "./chart";
import { SliderChart, SliderChartProps } from "./sliderChart";
import { Props, ChartInfo, getScaleY, prepareData } from "./prepareData";
require("./app.css");

type Dot = [number, number];
type Chart = Dot[];

const TOGGLE_GRAPH_HANDLER_NAME = "toggleGraphHandler";

const flexLabel = (timestamp: number, offset: number, status: string) =>
  createElement(
    "span",
    {
      class: status + " transition l-text flex-item",
      key: timestamp
    },
    prettifyDate(timestamp)
  );

const TOGGLE_CHART_HANDLER_NAME = "toggleChartHandler";
const TOGGLE_DAY_HANDLER_NAME = "toggleDayHandler";

interface State {
  extraScale: number;
  offset: number;
  sliderPos: { left: number; right: number };
  touchEndTimestamp: number;
  mode: string;
  visibles: { [id: string]: boolean };
  showPopupOn: number;
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
      case "showPopup":
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

    window[TOGGLE_DAY_HANDLER_NAME + id] = () => {
      const nextMode = this.state.mode === "day" ? "night" : "day";
      document.body.setAttribute("class", nextMode);
      this.send({ type: "mode", payload: nextMode });
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
      if (data.percentage) {
        localMaxY = 100;
      } else {
        localMaxY = getStackedMax(
          Math.floor(dataLength * left) + 1,
          Math.ceil(dataLength * right),
          charts
        );
      }
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

    const projectChartXForDots = x =>
      round(x * scaleX * extraScale - offset * CHART_WIDTH, PRECISION);
    const projectChartYForDots = (y: number, isSecond: boolean) =>
      round(CHART_HEIGHT - (y - getOffset(isSecond)) * getScale(isSecond), PRECISION);

    const overlay = createElement("div", {
      class: "abs fw",
      style: `height: ${CHART_HEIGHT}px; z-index: 10`,
      ontouchstart: `${TOGGLE_GRAPH_HANDLER_NAME + id}(event)`,
      ontouchmove: `${TOGGLE_GRAPH_HANDLER_NAME + id}(event)`
    });

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
      scaleY,
      scaleX,
      showPopupOn: state.showPopupOn
    } as ChartProps);

    const dots = createElement(Dots, {
      data,
      charts,
      projectChartX: projectChartXForDots,
      projectChartY: projectChartYForDots,
      extraScale,
      offset,
      showPopupOn: state.showPopupOn,
      dataLength,
      pow
    } as DotsProps);

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
        //prettier-ignore
        createElement(SliderChart, { charts, dataLength, minY, scaleX, isStacked, data } as SliderChartProps)
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
      pow
    } as RullerProps);

    return createElement("div", { class: "rel" }, [
      overlay,
      dots,
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
      createElement(App, prepareData(data[1])),
      createElement(App, prepareData(data[2])),
      createElement(App, prepareData(data[3])),
      createElement(App, prepareData(data[4]))
      // createElement(Benchmark, { id: 1 }),
      // createElement(Benchmark, { id: 2 })
    ]),
    document.getElementById("main")
  );
};

window["start"] = start;
