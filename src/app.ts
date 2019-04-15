import { round } from "./axis";
import { createElement, ComponentType, componentMixin } from "./reconciler";
import { TransitionRuller, RullerProps } from "./ruller";
import { Slider } from "./slider";

import { CHART_HEIGHT, CHART_WIDTH, SLIDER_HEIGHT, PRECISION } from "./constant";
import { TransitionGroup } from "./labels";
import { Transition } from "./transition";
import { prettifyDate, catValues, rest, last } from "./utils";
import { Dots, DotsProps } from "./dots";
import { Chart, ChartProps } from "./chart";
import { SliderChart, SliderChartProps } from "./sliderChart";
import { PreparedData, localPrepare } from "./prepareData";
require("./app.css");

const TOGGLE_GRAPH_HANDLER_NAME = "toggleGraphHandler";
const TOGGLE_PRESS_CHART_HANDLER_NAME = "togglePressChartHandler";
const TOGGLE_UNPRESS_CHART_HANDLER_NAME = "toggleUnPressChartHandler";
const TOGGLE_DAY_HANDLER_NAME = "toggleDayHandler";
const UNZOOM_HANDLER_NAME = "unzoomHandler";

const flexLabel = (timestamp: number, offset: number, status: string, zoomed) =>
  createElement(
    "span",
    {
      class: "l-text flex-item",
      key: timestamp
    },
    prettifyDate(timestamp, zoomed ? "h:m" : "m d")
  );

export interface AppState {
  extraScale: number;
  offset: number;
  sliderPos: { left: number; right: number };
  touchEndTimestamp: number;
  mode: string;
  visibles: { [id: string]: boolean };
  showPopupOn: number;
  cachedSliderPos: { left: number; right: number };
}

export const defaultAppState: AppState = {
  extraScale: 4,
  offset: 3,
  sliderPos: { left: 0.75, right: 1 },
  cachedSliderPos: null,
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
      case "toggleAll":
        const nextVisibles = {};
        Object.keys(state.visibles).forEach(key => {
          if (key === payload) {
            nextVisibles[key] = true;
          } else {
            nextVisibles[key] = false;
          }
        });
        return {
          ...state,
          visibles: nextVisibles
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
    let pressed = false;
    let timer;
    window[TOGGLE_PRESS_CHART_HANDLER_NAME + id] = (name, e) => {
      e.preventDefault();
      pressed = true;
      timer = setTimeout(() => {
        pressed = false;
        this.send({ type: "toggleAll", payload: name });
      }, 500);
    };

    window[TOGGLE_UNPRESS_CHART_HANDLER_NAME + id] = name => {
      if (pressed) {
        clearTimeout(timer);
        this.send({ type: "toggle", payload: name });
      }
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
  getDeriviedStateFromProps(props: AppProps, prevState: AppState): AppState {
    if (!prevState.visibles) return { ...prevState, visibles: props.visibles };
    const visibles = {};
    props.charts.forEach(c => {
      visibles[c.id] = prevState.visibles[c.id] != null ? prevState.visibles[c.id] : true;
    });
    if (props.zoomed && !prevState.cachedSliderPos) {
      const nextState = {
        visibles,
        cachedSliderPos: prevState.sliderPos
      }
      return this.reducer({type: 'updateSlider', payload: {left: 3/7, right: 4/7}}, nextState) 
    }
    if (!props.zoomed && prevState.cachedSliderPos) {
      const nextState = {
        visibles,
        cachedSliderPos: null
      }
      return this.reducer({type: 'updateSlider', payload: prevState.cachedSliderPos}, nextState) 
    }
    return { ...prevState, visibles };
  },
  render(props: AppProps, state: AppState) {
    const id = this.id;
    //prettier-ignore
    const { scaleX, data, dataLength, minY, pow, onZoom, zoomed, scaledX_, y__, minX, maxX } = props;
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

    const chartWrapper = createElement("div", { class: "fw-wrapper w-ch" }, [chart]);

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
        class: "sliderWrapper",
        style: `height: ${SLIDER_HEIGHT}px; width: ${CHART_WIDTH}px`
      },
      [
        createElement(Slider, {
          onChange: payload => this.send({ type: "updateSlider", payload }),
          onTouchEnd: () => this.send({ type: "touchEnd", payload: Date.now() }),
          eventId: id,
          ...state.sliderPos
        }),
        //prettier-ignore
        createElement(SliderChart, { charts, dataLength, minY, scaleX, isStacked, data, scaledX_, y__, zoomed } as SliderChartProps)
      ]
    );
    const scaledWidth = CHART_WIDTH * state.extraScale;
    
    const cuttedDates = catValues(rest(data.columns[0]), left, right, minX, maxX);
    const isLessThanDay = (last(cuttedDates) - cuttedDates[0]) / 3600000 / 24 < 3
    const labels = createElement(
      TransitionGroup,
      {
        wrapper: children =>
          createElement("div", { class: "rel", style: "height: 30px; margin-top: 5px" }, [
            createElement(
              "div",
              {
                //prettier-ignore
                class: 'flex-labels-wrapper w-ch',
                // style: `left: -${left * CHART_WIDTH * state.extraScale}px; right: ${(right - 1) * CHART_WIDTH * state.extraScale}px`
                style: `width: ${CHART_WIDTH * state.extraScale}px; transform: translateX(${- CHART_WIDTH * state.offset}px)`
              },
              children
            )
          ])
      },
      [createElement(Transition, {
        children: status =>
          createElement(
            "div",
            { class: `flex-labels fw fh ${status} transition` },
            valuesX.map((x, i) => flexLabel(x, (i * scaledWidth) / valuesX.length, status, zoomed && isLessThanDay))
          ),
        key: valuesX.length
      })]
    );
    const buttons = createElement(
      "div",
      { class: "buttons" },
      Object.keys(visibles).map(chartId =>
        createElement(
          "span",
          {
            class: `button ${visibles[chartId] ? "active" : ""}`,
            style: `border-color: ${data.colors[chartId]}; color: ${data.colors[chartId]}`,
            ontouchstart: `${TOGGLE_PRESS_CHART_HANDLER_NAME + id}("${chartId}", event)`,
            ontouchend: `${TOGGLE_UNPRESS_CHART_HANDLER_NAME + id}("${chartId}")`
          },
          [
            createElement("span", {
              class: `button-label ${visibles[chartId] ? "active" : ""}`,
              style: `background: ${data.colors[chartId]}`
            }),
            createElement("span", { class: `button-icon ${visibles[chartId] ? '' : 'hidden'}` }),
            createElement("span", { class: "rel" }, data.names[chartId])
          ]
        )
      )
    );
    const nightButton = createElement(
      "div",
      {
        class: "switch",
        ontouchstart: `${TOGGLE_DAY_HANDLER_NAME + id}()`
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
    const firstDate = prettifyDate(cuttedDates[0], "dr m y");
    const lastDate = prettifyDate(last(cuttedDates), "dr m y");
    const midDate = prettifyDate(cuttedDates[Math.floor(cuttedDates.length / 2)], "dt, d m y");
    const headerWrapper = createElement("div", { class: "flex" }, [
      zoomed
        ? createElement(
            "div",
            { class: "header zoomout rel z-20", ontouchstart: `${UNZOOM_HANDLER_NAME + id}()` },
            "Zoom Out"
          )
        : createElement("div", { class: "header" }, "Followers"),
      createElement("div", { class: "b" }, zoomed ? `${midDate}` : `${firstDate} - ${lastDate}`)
    ]);

    return createElement("div", { class: "rel" }, [
      headerWrapper,
      overlay,
      dots,
      ruller,
      chartWrapper,
      labels,
      slider,
      buttons,
      nightButton
    ]);
  }
});
