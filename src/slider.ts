import { createRaf } from "./utils";
import { ComponentType, componentMixin, createElement } from "./reconciler";
import { CHART_WIDTH, CHART_HEIGHT } from "./constant";

const DRAG_HANDLER_NAME = "onSliderDrag";
const DRAG_RESIZE_RIGHT_HANDLER_NAME = "onSliderDragResizeRight";
const DRAG_RESIZE_LEFT_HANDLER_NAME = "onSliderDragResizeLeft";
const START_DRAG_HANDLER_NAME = "onSliderStartDrag";

export const Slider: ComponentType = () => ({
  ...componentMixin(),
  state: {
    left: 0,
    right: CHART_WIDTH
  },
  didMount() {
    let beginClientX;
    let beginLeft;
    let beginRight;
    let compensation;
    let compensationRight;
    window[DRAG_HANDLER_NAME] = createRaf(e => {
      this.send({ type: "updatePos", payload: e.clientX - compensation });
    });
    window[DRAG_RESIZE_RIGHT_HANDLER_NAME] = createRaf((e: DragEvent) => {
      this.send({
        type: "updateRight",
        payload: e.clientX - compensationRight
      });
    });
    window[DRAG_RESIZE_LEFT_HANDLER_NAME] = createRaf((e: DragEvent) => {
      this.send({
        type: "updateLeft",
        payload: e.clientX - compensation
      });
    });
    window[START_DRAG_HANDLER_NAME] = (e: DragEvent) => {
      // e.preventDefault();
      beginClientX = e.clientX;
      beginLeft = this.state.left;
      beginRight = this.state.right;
      compensation = 8 + (beginClientX - beginLeft);
      compensationRight = 8 - (beginRight - beginClientX);
      let dragImage = document.createElement("img");
      dragImage.src =
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
      e.dataTransfer.effectAllowed = "none";
      e.dataTransfer.setDragImage(dragImage, 0, 0);
    };
  },
  didUpdate(prevProps, prevState) {
    const left = this.state.left / CHART_WIDTH;
    const right = this.state.right / CHART_WIDTH;
    if (prevState.left !== this.state.left || prevState.right !== this.state.right) {
      this.props.onChange({left, right})
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
        return { ...state, right: payload };
      case "updateLeft":
        if (payload < 0) return { ...state, left: 0 };
        return { ...state, left: payload };
    }
  },
  render: (props, state) => {
    return createElement(
      "div",
      {
        class: "sliderWrapper",
        style: `left: ${state.left - CHART_WIDTH}px; right: ${-state.right}px;`
      },
      [
        createElement("div", { class: "slider" }, [
          createElement("div", {
            class: "sliderEdge sliderEdgeLeft",
            ondrag: `${DRAG_RESIZE_LEFT_HANDLER_NAME}(event)`,
            ondragstart: `${START_DRAG_HANDLER_NAME}(event)`,
            draggable: "true"
          }),
          createElement("div", {
            class: "sliderCenter",
            ondrag: `${DRAG_HANDLER_NAME}(event)`,
            ondragstart: `${START_DRAG_HANDLER_NAME}(event)`,
            draggable: "true"
          }),
          createElement("div", {
            class: "sliderEdge sliderEdgeRight",
            ondrag: `${DRAG_RESIZE_RIGHT_HANDLER_NAME}(event)`,
            ondragstart: `${START_DRAG_HANDLER_NAME}(event)`,
            draggable: "true"
          })
        ])
      ]
    );
  }
});
