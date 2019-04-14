import { round } from "./axis";
import { createElement, ComponentType, componentMixin } from "./reconciler";
import { TransitionRuller, RullerProps } from "./ruller";
import { Slider } from "./slider";

import { CHART_HEIGHT, CHART_WIDTH, SLIDER_HEIGHT, PRECISION } from "./constant";
import { TransitionGroup } from "./labels";
import { Transition } from "./transition";
import { prettifyDate, prettifyHours } from "./utils";
import { Dots, DotsProps } from "./dots";
import { Chart, ChartProps } from "./chart";
import { SliderChart, SliderChartProps } from "./sliderChart";
import { PreparedData, localPrepare } from "./prepareData";
require("./app.css");

const TOGGLE_GRAPH_HANDLER_NAME = "toggleGraphHandler";
const TOGGLE_CHART_HANDLER_NAME = "toggleChartHandler";
const TOGGLE_DAY_HANDLER_NAME = "toggleDayHandler";
const UNZOOM_HANDLER_NAME = "unzoomHandler";

const flexLabel = (timestamp: number, offset: number, status: string, zoomed) =>
  createElement(
    "span",
    {
      class: status + " transition l-text flex-item",
      key: timestamp
    },
    zoomed ? prettifyHours(timestamp) : prettifyDate(timestamp)
  );

export interface AppState {
  extraScale: number;
  offset: number;
  sliderPos: { left: number; right: number };
  touchEndTimestamp: number;
  mode: string;
  visibles: { [id: string]: boolean };
  showPopupOn: number;
}

export const defaultAppState: AppState = {
  extraScale: 4,
  offset: 3,
  sliderPos: { left: 0.75, right: 1 },
  touchEndTimestamp: 0,
  mode: "night", // workaround,
  showPopupOn: null,
  visibles: null
};

export interface AppProps extends PreparedData {
  onZoom: (date) => void;
  onUnzoom: () => void;
  zoomed: boolean;
}

const times = [];
let averageFps;
let fps;

// setTimeout(() => alert(averageFps), 5000)

function refreshLoop() {
  window.requestAnimationFrame(() => {
    const now = performance.now();
    while (times.length > 0 && times[0] <= now - 1000) {
      times.shift();
    }
    times.push(now);
    fps = times.length;
    averageFps = averageFps ? Math.round((averageFps + fps) / 2) : fps
    refreshLoop();
  });
}

refreshLoop();

export const App: ComponentType = () => ({
  ...componentMixin(),
  id: Date.now(),
  state: defaultAppState,
  reducer({ type, payload }, state: AppState) {
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
        return { ...state, touchEndTimestamp: payload };
      case "mode":
        return { ...state, mode: payload };
      case "showPopup":
        return { ...state, showPopupOn: payload };
      case "hidePopup":
        return { ...state, showPopupOn: null };
    }
  },
  didMount() {
    const id = this.id;
    window[TOGGLE_CHART_HANDLER_NAME + id] = name => {
      this.send({ type: "toggle", payload: name });
    };

    window[UNZOOM_HANDLER_NAME + id] = () => {
      this.props.onUnzoom();
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
  getDeriviedStateFromProps(props: AppProps, prevState) {
    if (!prevState.visibles) return { ...prevState, visibles: props.visibles };
    const visibles = {};
    props.charts.forEach(c => {
      visibles[c.id] = prevState.visibles[c.id] != null ? prevState.visibles[c.id] : true;
    });
    return { ...prevState, visibles };
  },
  render(props: AppProps, state: AppState) {
    const id = this.id;
    //prettier-ignore
    const { scaleX, data, dataLength, minY, pow, onZoom, zoomed, scaledX_, y__ } = props;
    const {
      visibles,
      sliderPos: { left, right },
      extraScale,
      offset
    } = state;
    const isScaled = data.y_scaled;
    const isStacked = data.stacked;

    const { charts, scaleY, scaleY2, offsetY, offsetY2, valuesY, valuesY2, valuesX } = localPrepare(
      props,
      state
    );

    const getScale = (isSecond: boolean) => (isScaled && isSecond ? scaleY2 : scaleY);
    const getOffset = (isSecond: boolean) => (isScaled && isSecond ? offsetY2 : offsetY);
    // const offsetY = 0;

    const projectChartXForDots = x =>
      round(scaledX_(x) * extraScale - offset * CHART_WIDTH, PRECISION);
    const projectChartYForDots = (y: number, isSecond: boolean) =>
      round(y__(y => (y - getOffset(isSecond)) * getScale(isSecond))(y), PRECISION);

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
      showPopupOn: state.showPopupOn,
      zoomed,
      scaledX_,
      y__
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
      pow,
      onZoom,
      id,
      zoomed
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
        createElement(SliderChart, { charts, dataLength, minY, scaleX, isStacked, data, scaledX_, y__, zoomed } as SliderChartProps)
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
                style: `left: -${left * CHART_WIDTH * state.extraScale}px; right: ${(right - 1) * CHART_WIDTH * state.extraScale}px`
              },
              children
            )
          ])
      },
      valuesX.map((x, i) =>
        createElement(Transition, {
          children: status => flexLabel(x, (i * scaledWidth) / valuesX.length, status, zoomed),
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
            ontouchstart: `${TOGGLE_CHART_HANDLER_NAME + id}("${chartId}")`,
            // onmousedown: `${TOGGLE_CHART_HANDLER_NAME + id}("${chartId}")`
          },
          [
            createElement(
              "span",
              { class: "button-label", style: `background: ${data.colors[chartId]}` },
              [createElement("span", { class: `button-icon ${visibles[chartId] ? "" : "active"}` })]
            ),
            createElement("span", { class: "button-text" }, data.names[chartId])
          ]
        )
      )
    );
    const nightButton = createElement(
      "div",
      {
        class: "switch",
        ontouchstart: `${TOGGLE_DAY_HANDLER_NAME + id}()`,
        // onmousedown: `${TOGGLE_DAY_HANDLER_NAME + id}()`
      },
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
    const header = zoomed
      ? createElement(
          "div",
          { class: "header zoomout", ontouchstart: `${UNZOOM_HANDLER_NAME + id}()` },
          "Zoom Out"
        )
      : createElement("div", { class: "header" }, "Followers");

    return createElement("div", { class: "rel" }, [
      header,
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
