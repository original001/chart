import { createElement, ComponentType, componentMixin } from "./reconciler";
import { ChartDto } from "./chart_data";
import { prettifyDate, path, createStackedPathAttr } from "./utils";
import { CHART_HEIGHT, CHART_WIDTH } from "./constant";
import { ChartInfo } from "./app";

export interface DotsProps {
  projectChartX: (x: number) => string;
  projectChartY: (y: number, isSecond?: boolean) => string;
  data: ChartDto;
  offset: number;
  extraScale: number;
  showPopupOn: number;
  charts: ChartInfo[];
  dataLength: number;
}

export const Dots: ComponentType = () => ({
  ...componentMixin(),
  render(props: DotsProps) {
    const { projectChartX, projectChartY, data, charts, dataLength, extraScale } = props;
    const popupOffset = 30;
    const textOffset = 15 - popupOffset;

    const showPopupOn = props.showPopupOn;
    if (!showPopupOn) return createElement("span", {});

    const i = charts[0].values.findIndex(
      (dot, i) =>
        Number(projectChartX(i - 0.5)) <= showPopupOn &&
        Number(projectChartX(i + 0.5)) > showPopupOn
    );

    const dot = charts.map(ch => ch.values[i]);
    const date = data.columns[0][i + 1] as number;
    const axises = charts.map(ch => ch.id);

    const getStack = (ar: number[], i: number) =>
      ar.reduce((acc, v, curI) => (curI >= i ? acc : acc + v), 0);

    const stackeddots = createElement(
      "svg",
      {
        x: projectChartX(i),
        y: 0,
        overflow: "visible",
        key: i
      },
      dot.map((v, i, ar) =>
        path(
          createStackedPathAttr([v], x => 0, projectChartY, [getStack(ar, i)]),
          data.colors[axises[i]],
          CHART_WIDTH * extraScale / dataLength + 0.05,
          '',
          true,
        )
      )
    );

    const dots = createElement(
      "svg",
      {
        x: projectChartX(i),
        y: 0,
        overflow: "visible",
        class: "popup-rect"
        // onclick: ""
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
          ...axises.map((axis, i) =>
            createElement("circle", {
              cx: 0,
              cy: projectChartY(dot[i], axis === "y1"),
              r: 4,
              stroke: data.colors[axis],
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
            prettifyDate(date, true)
          ),
          ...dot.map((count, i) =>
            createElement(
              "text",
              {
                x: textOffset + i * 45,
                y: 48,
                fill: data.colors[axises[i]],
                ["font-size"]: 16,
                ["font-weight"]: 600,
                key: `text${i}`
              },
              count + ""
            )
          ),
          ...axises.map((axis, i) =>
            createElement(
              "text",
              {
                x: textOffset + i * 45,
                y: 66,
                fill: data.colors[axis],
                ["font-size"]: 13,
                key: `caption${axis}`
              },
              data.names[axis]
            )
          )
        ])
      ]
    );

    return createElement("g", {}, data.stacked ? [stackeddots] : [dots]);
  }
});
