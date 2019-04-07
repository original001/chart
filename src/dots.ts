import {
  createElement,
  ComponentType,
  componentMixin
} from "./reconciler";
import { ChartDto } from "./chart_data";
import { zipDots, prettifyDate } from "./utils";
import { CHART_HEIGHT} from "./constant";

interface Props {
  columns: (string | number)[][];
  projectChartX: (x: number) => string;
  projectChartY: (y: number) => string;
  data: ChartDto;
  touchEndTimestamp: number;
  offset: number;
  scale: number;
  showPopupOn: number;
}

export const Dots: ComponentType = () => ({
  ...componentMixin(),
  render(props: Props, state) {
    const { columns, projectChartX, projectChartY} = props;
    const zippedDots = zipDots(columns);
    const axises = zippedDots[0];
    const popupOffset = 30;
    const textOffset = 15 - popupOffset;

    const showPopupOn = props.showPopupOn;
    if (!showPopupOn) return createElement("span", {});

    const i = zippedDots
      .slice(1)
      .findIndex(
        (dot, i) =>
          Number(projectChartX(i - 0.5)) <= showPopupOn &&
          Number(projectChartX(i + 0.5)) > showPopupOn
      );

    const dot = zippedDots[i + 1];

    const dots = createElement(
      "svg",
      {
        x: projectChartX(i),
        y: 0,
        overflow: "visible",
        class: "popup-rect",
        onclick: ""
      },
      [
        createElement("rect", {
          x: projectChartX(-0.5),
          y: 0,
          width: projectChartX(1),
          height: CHART_HEIGHT,
          fill: "transparent"
        }),
        createElement("g", {}, [
          createElement("line", {
            x1: 0,
            y1: 0,
            x2: 0,
            y2: CHART_HEIGHT,
            class: "r-line",
            key: "line"
          }),
          ...axises.slice(1).map((axis, i) =>
            createElement("circle", {
              cx: 0,
              cy: projectChartY(dot[i + 1]),
              r: 4,
              // stroke: data.colors[axis],
              class: "n-fill",
              key: `circle${axis}`,
              ["stroke-width"]: 2
            })
          ),
          createElement("rect", {
            x: -popupOffset,
            y: 0,
            class: "popup n-fill",
            ry: 5,
            rx: 5,
            key: "rect"
          }),
          createElement(
            "text",
            { x: textOffset, y: 22, class: "n-text", key: "text" },
            prettifyDate(dot[0], true)
          ),
          ...dot.slice(1).map((count, i) =>
            createElement(
              "text",
              {
                x: textOffset + i * 45,
                y: 48,
                // fill: data.colors[axises[i + 1]],
                ["font-size"]: 16,
                ["font-weight"]: 600,
                key: `text${i}`
              },
              count + ""
            )
          ),
          ...axises.slice(1).map((axis, i) =>
            createElement(
              "text",
              {
                x: textOffset + i * 45,
                y: 66,
                // fill: data.colors[axis],
                ["font-size"]: 13,
                key: `caption${axis}`
              },
              // data.names[axis]
            )
          )
        ])
      ]
    );

    return createElement("g", {}, [dots]);
  }
});
