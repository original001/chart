import { createRaf } from "./utils";
import { ComponentType, componentMixin, createElement } from "./reconciler";

const DRAG_HANDLER_NAME = "onSliderDrag";
const DRAG_RESIZE_HANDLER_NAME = "onSliderDragResize";
const START_DRAG_HANDLER_NAME = "onSliderStartDrag";

export const Slider: ComponentType = () => ({
  ...componentMixin(),
  state: {
    left: -1000,
    width: 50
  },
  didMount() {
    let beginClientX;
    window[DRAG_HANDLER_NAME] = createRaf(e => {
      // console.log(e.clientX)
      this.send({ type: "updatePos", payload: e.clientX - 1008 });
    });
    window[DRAG_RESIZE_HANDLER_NAME] = createRaf((e: DragEvent) => {
      // console.log(e.clientX)
      e.stopPropagation();
      this.send({ type: "updateWidth", payload: e.clientX - beginClientX });
    });
    window[START_DRAG_HANDLER_NAME] = (e: DragEvent) => {
      // e.preventDefault();
      beginClientX = e.clientX;
      let dragImage = document.createElement("img");
      dragImage.src =
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
      e.dataTransfer.effectAllowed = "none";
      e.dataTransfer.setDragImage(dragImage, 0, 0);
    };
  },
  reducer({ type, payload }, state) {
    switch (type) {
      case "updatePos":
        return { left: payload };
      case "updateWidth":
        return { width: state.width + payload };
    }
  },
  render: (props, state) => {
    return createElement(
      "div",
      {
        class: "sliderWrapper",
        style: `left: ${state.left}px`
      },
      [
        createElement(
          "div",
          {
            class: "slider",
            style: `width: ${state.width}px`
            // ondrag: `${DRAG_HANDLER_NAME}(event)`,
            // ondragstart: `${START_DRAG_HANDLER_NAME}(event)`,
            // draggable: "true"
          },
          [
            createElement("div", {
              class: "sliderEdge sliderEdgeLeft",
              ondrag: `${DRAG_RESIZE_HANDLER_NAME}(event)`,
              ondragstart: `${START_DRAG_HANDLER_NAME}(event)`,
              draggable: "true"
            }),
            createElement("div", {
              class: "sliderEdge sliderEdgeRight",
              ondrag: `${DRAG_RESIZE_HANDLER_NAME}(event)`,
              ondragstart: `${START_DRAG_HANDLER_NAME}(event)`,
              draggable: "true"
            })
          ]
        )
      ]
    );
  }
});
