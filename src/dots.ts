import { createElement, ComponentType, componentMixin } from "./reconciler";
import { ChartDto } from "./chart_data";
import { prettifyDate, path, createStackedPathAttr } from "./utils";
import { CHART_HEIGHT, CHART_WIDTH } from "./constant";
import { ChartInfo } from "./prepareData";

export interface DotsProps {
  projectChartX: (x: number) => number;
  projectChartY: (y: number, isSecond?: boolean) => number;
  data: ChartDto;
  offset: number;
  extraScale: number;
  showPopupOn: number;
  charts: ChartInfo[];
  dataLength: number;
  pow: number;
}

export const Dots: ComponentType = () => ({
  ...componentMixin(),
  render(props: DotsProps) {
    const { projectChartX, projectChartY, data, charts, dataLength, extraScale, pow } = props;
    const popupOffset = 15;
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

    const left = projectChartX(i);
    const isLeftSide = left < CHART_WIDTH / 2;
    const POPUP_WIDTH = 160;
    const popupPos = isLeftSide ? left + popupOffset : left - POPUP_WIDTH - popupOffset;
    const popup = createElement(
      "div",
      {
        class: "popup abs",
        style: `width: ${POPUP_WIDTH}px; top: 10px; left:${popupPos}px`,
      },
      [
        createElement("div", { class: "b p" }, prettifyDate(date, true)),
        ...charts.map(({ values, color, name, originalValues }) =>
          createElement("div", { class: "flex p" }, [
            createElement("span", {}, name),
            createElement("span", { class: "b", style: `color: ${color}` }, originalValues[i] + "")
          ])
        ),
        createElement("div", { class: "flex p" }, [
          createElement("span", {}, "All"),
          createElement(
            "span",
            { class: "b" },
            getStack(charts.map(c => c.originalValues[i]), dot.length) + ""
          )
        ])
      ]
    );

    const stackeddots = createElement(
      "svg",
      {
        overflow: "visible",
        width: CHART_WIDTH,
        height: CHART_HEIGHT,
        key: i
      },
      dot.map((v, _i, ar) =>
        path(
          createStackedPathAttr([v], _ => left, projectChartY, [getStack(ar, _i)]),
          data.colors[axises[_i]],
          (CHART_WIDTH * extraScale) / dataLength + 0.05,
          "",
          true
        )
      )
    );

    const dots = createElement("svg", { overflow: "visible", class: "popup-rect" }, [
      createElement(
        "svg",
        {
          x: left,
          y: 0,
          width: CHART_WIDTH,
          height: CHART_HEIGHT,
          overflow: "visible"
        },
        [
          createElement("line", {
            x1: 0,
            y1: 0,
            x2: 0,
            y2: CHART_HEIGHT,
            "stroke-width": "1",
            stroke: "rgba(115,153,178, .2)",
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
          )
        ]
      )
    ]);

    return createElement(
      "div",
      { class: "abs fw fh top" },
      data.stacked ? [stackeddots, popup] : [dots, popup]
    );
  }
});
