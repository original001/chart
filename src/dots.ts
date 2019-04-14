import { createElement, ComponentType, componentMixin } from "./reconciler";
import { ChartDto } from "./chart_data";
import { prettifyDate, path, createStackedPathAttr } from "./utils";
import { CHART_HEIGHT, CHART_WIDTH } from "./constant";
import { ChartInfo } from "./prepareData";
import { round } from "./axis";

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
  onZoom: (date) => void;
  id: number;
  zoomed: boolean;
}
interface State {
  charts: ChartInfo[];
}

const POPUP_CLICK_HANDLER = "popupClickHandler";

export const Dots: ComponentType = () => ({
  ...componentMixin(),
  state: {
    charts: null
  } as State,
  getDeriviedStateFromProps(props: DotsProps, prevState: State) {
    const { charts, data, showPopupOn } = props;
    if (
      data.stacked &&
      data.percentage &&
      prevState.charts &&
      charts.length !== prevState.charts.length &&
      showPopupOn
    ) {
      console.log("run calculus");
      let stackedValues = Array(props.dataLength).fill(0);
      const chartsLength = props.charts.length;
      const sumValues = [];

      for (let i = 0; i < props.dataLength; i++) {
        let sum = 0;
        for (let j = 0; j < chartsLength; j++) {
          sum += props.charts[j].values[i];
        }
        sumValues.push(sum);
      }

      return {
        charts: charts.map(chart => {
          const values = chart.values.map((v, i) => round((v / sumValues[i]) * 100, 0));
          stackedValues = stackedValues.map((v, i) => v + values[i]);
          return {
            ...chart,
            values
          };
        })
      };
    }
    return { charts };
  },
  didMount() {
    window[POPUP_CLICK_HANDLER + this.props.id] = date => {
      this.props.onZoom(date);
    };
  },
  render(props: DotsProps, state: State) {
    const { projectChartX, projectChartY, data, dataLength, extraScale, id, zoomed } = props;
    const { charts } = state;
    const popupOffset = 15;

    const showPopupOn = props.showPopupOn;
    if (!showPopupOn) return createElement("span", {});

    const dates = data.columns[0] as number[];
    const i = (dates as number[]).findIndex(
      (x, i, ar) =>
        i > 1 &&
        Number(projectChartX((x + ar[i - 1]) / 2)) <= showPopupOn &&
        Number(projectChartX((ar[i + 1] + x) / 2)) > showPopupOn
    );
    if (i === -1) return createElement("span", {});

    const dot = charts.map(ch => ch.values[i]);
    const date = dates[i + 1];
    const axises = charts.map(ch => ch.id);

    const getStack = (ar: number[], i: number) =>
      ar.reduce((acc, v, curI) => (curI >= i ? acc : acc + v), 0);

    const left = projectChartX(date);
    const isLeftSide = left < CHART_WIDTH / 2;
    const POPUP_WIDTH = 160;
    const popupPos = isLeftSide ? left + popupOffset : left - POPUP_WIDTH - popupOffset;
    const popup = createElement(
      "div",
      {
        class: "popup abs z-20",
        style: `width: ${POPUP_WIDTH}px; top: 10px; left:${popupPos}px`,
        ontouchstart: zoomed ? '' : `${POPUP_CLICK_HANDLER + id}(${date})`
      },
      [
        createElement('div', {class: 'flex p'}, [
          createElement("span", { class: "b" }, prettifyDate(date, 'dt, d m y')),
          !zoomed && createElement("span", { class: "popup-arrow" }),
        ]),
        ...charts.map(({ values, color, name, originalValues }) =>
          createElement("div", { class: "flex p" }, [
            createElement(
              "span",
              {},
              data.percentage
                ? [
                    createElement("span", { class: "b proc" }, `${values[i]}%`),
                    createElement("span", {}, `${name}`)
                  ]
                : name
            ),
            createElement("span", { class: "b", style: `color: ${color}` }, originalValues[i] + "")
          ])
        ),
        data.stacked &&
          !data.percentage &&
          charts.length !== 1 &&
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
          createStackedPathAttr([[date, v]], _ => left, projectChartY, [getStack(ar, _i)]),
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
          ...(data.percentage
            ? []
            : axises.map((axis, i) =>
                createElement("circle", {
                  cx: 0,
                  cy: projectChartY(dot[i], axis === "y1"),
                  r: 4,
                  stroke: data.colors[axis],
                  class: "n-fill",
                  key: `circle${axis}`,
                  ["stroke-width"]: 2
                })
              ))
        ]
      )
    ]);

    return createElement(
      "div",
      { class: "abs fw top", style: `height: ${CHART_HEIGHT}` },
      data.stacked && !data.percentage ? [stackeddots, popup] : [dots, popup]
    );
  }
});
