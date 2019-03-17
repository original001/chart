import { ChartDto } from "./chart_data";
import { createRaf } from "./utils";
import { ComponentType, componentMixin, createElement } from "./reconciler";

export const createSliderMarkup = onUpdate => {
  const wrapper = document.createElement("div");
  wrapper.className = "sliderWrapper";
  wrapper.style.left = "-1000px";
  const onMouseMove = createRaf((e: MouseEvent) => {
    const newPosition = e.clientX - wrapper.parentElement.offsetLeft - 1000;
    wrapper.style.left = newPosition + "px";

    onUpdate();
  });
  const slider = document.createElement("div");
  slider.className = "slider";
  slider.addEventListener("mousedown", e => {
    document.addEventListener("mousemove", onMouseMove);
  });
  document.addEventListener("mouseup", e => {
    document.removeEventListener("mousemove", onMouseMove);
  });
  wrapper.append(slider);
  return wrapper;
};

export const Slider: ComponentType = () => ({
  ...componentMixin(),
  render: (props, state) => {
    return createElement(
      "div",
      { class: "sliderWrapper", style: "left: -1000px" },
      [createElement("div", { class: "slider" }), props.children]
    );
  }
});
