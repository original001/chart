import { createRaf } from "./utils";
import { ComponentType, componentMixin, createElement } from "./reconciler";
import { CHART_WIDTH } from "./constant";

const TOUCH_HANDLER_NAME = "onSliderTouch";
const TOUCH_END_HANDLER_NAME = "onSliderTouchEnd";
const TOUCH_RESIZE_RIGHT_HANDLER_NAME = "onSliderTouchResizeRight";
const TOUCH_RESIZE_LEFT_HANDLER_NAME = "onSliderTouchResizeLeft";
const START_TOUCH_HANDLER_NAME = "onSliderStartTouch";
const MAX_SLIDER_SIZE = 50;

export const Slider: ComponentType = () => ({
  ...componentMixin(),
  state: {
    left: (CHART_WIDTH * 3) / 4,
    right: CHART_WIDTH
  },
  didMount() {
    let beginClientX;
    let beginLeft;
    let beginRight;
    let compensation;
    let compensationRight;
    const id = this.props.eventId;
    const makeCompensation = (clientX: number) => {
      const { left, right } = this.state;
      beginClientX = clientX;
      beginLeft = left;
      beginRight = right;
      compensation = 10 + (clientX - beginLeft);
      compensationRight = 10 - (beginRight - clientX);
    };
    window[TOUCH_HANDLER_NAME + id] = createRaf((e: TouchEvent) => {
      e.preventDefault();
      this.send({
        type: "updatePos",
        payload: e.targetTouches[0].clientX - compensation
      });
    });
    window[TOUCH_RESIZE_RIGHT_HANDLER_NAME + id] = createRaf((e: TouchEvent) => {
      this.send({
        type: "updateRight",
        payload: e.targetTouches[0].clientX - compensationRight
      });
    });
    window[TOUCH_RESIZE_LEFT_HANDLER_NAME + id] = createRaf((e: TouchEvent) => {
      this.send({
        type: "updateLeft",
        payload: e.targetTouches[0].clientX - compensation
      });
    });
    window[START_TOUCH_HANDLER_NAME + id] = (e: TouchEvent) => {
      e.preventDefault();
      makeCompensation(e.targetTouches[0].clientX);
    };
    window[TOUCH_END_HANDLER_NAME + id] = () => {
      this.props.onTouchEnd();
    };
  },
  didUpdate(prevProps, prevState) {
    const left = this.state.left / CHART_WIDTH;
    const right = this.state.right / CHART_WIDTH;
    if (prevState.left !== this.state.left || prevState.right !== this.state.right) {
      this.props.onChange({ left, right });
    }
  },
  reducer({ type, payload }, state) {
    switch (type) {
      case "updatePos":
        const size = state.right - state.left;
        if (payload < 0) return { left: 0, right: size };
        else if (payload + size > CHART_WIDTH)
          return { left: CHART_WIDTH - size, right: CHART_WIDTH };
        return { left: payload, right: size + payload };
      case "updateRight":
        if (payload > CHART_WIDTH) return { ...state, right: CHART_WIDTH };
        if (payload < MAX_SLIDER_SIZE + state.left)
          return { ...state, right: MAX_SLIDER_SIZE + state.left };
        return { ...state, right: payload };
      case "updateLeft":
        if (payload < 0) return { ...state, left: 0 };
        if (payload > state.right - MAX_SLIDER_SIZE)
          return { ...state, left: state.right - MAX_SLIDER_SIZE };
        return { ...state, left: payload };
    }
  },
  render: (props, state) => {
    const id = props.eventId;
    return createElement("div", { class: "sliderWrapper abs fw" }, [
      createElement("div", {
        ontouchstart: `${START_TOUCH_HANDLER_NAME + id}(event)`,
        ontouchend: `${TOUCH_END_HANDLER_NAME + id}()`,
        ontouchcancel: `${TOUCH_END_HANDLER_NAME + id}()`,
        ontouchmove: `${TOUCH_HANDLER_NAME + id}(event)`,
        class: "sliderWrapper abs fw"
      }),
      createElement(
        "div",
        { style: `transform: translateX(${state.right}px)`, class: "sliderEdgeBg right" },
        [
          createElement("div", {
            class: "sliderEdge right",
            ontouchstart: `${START_TOUCH_HANDLER_NAME + id}(event)`,
            ontouchend: `${TOUCH_END_HANDLER_NAME + id}()`,
            ontouchcancel: `${TOUCH_END_HANDLER_NAME + id}()`,
            ontouchmove: `${TOUCH_RESIZE_RIGHT_HANDLER_NAME + id}(event)`
          })
        ]
      ),
      createElement(
        "div",
        {
          style: `transform: translateX(${state.left}px)`,
          class: "sliderEdgeBg left"
        },
        [
          createElement("div", {
            class: "sliderEdge left",
            ontouchstart: `${START_TOUCH_HANDLER_NAME + id}(event)`,
            ontouchend: `${TOUCH_END_HANDLER_NAME + id}()`,
            ontouchcancel: `${TOUCH_END_HANDLER_NAME + id}()`,
            ontouchmove: `${TOUCH_RESIZE_LEFT_HANDLER_NAME + id}(event)`
          })
        ]
      )
    ]);
  }
});
