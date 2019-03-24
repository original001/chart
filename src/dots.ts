import {
  createElement,
  Tree,
  ComponentType,
  componentMixin
} from "./reconciler";
import { ChartDto } from "./chart_data";
import { zipDots, prettifyDate } from "./utils";
import { CHART_HEIGHT } from "./constant";

interface Props {
  columns: (string | number)[][];
  projectChartX: (x: number) => string;
  projectChartY: (y: number) => string;
  data: ChartDto;
  touchEndTimestamp: number;
  scale: number;
}

export const Dots: ComponentType = () => ({
  ...componentMixin(),
  shouldUpdate(nextProps: Props) {
    return (
      nextProps.columns.length !== this.props.columns.length ||
      nextProps.touchEndTimestamp !== this.props.touchEndTimestamp
    );
  },
  state: {
    isShown: false
  },

  render(props: Props, state) {
    const { columns, projectChartX, projectChartY, data } = props;
    const zippedDots = zipDots(columns);
    const axises = zippedDots[0];
    const popupOffset = 30;
    const textOffset = 15 - popupOffset;

    const dots = zippedDots.slice(1).map((dot, i) =>
      createElement(
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
            fill: "transparent",
          }),
          createElement(
            "g",
            {
              style: `transform: scaleX(${1 / props.scale})`
            },
            [
              createElement("line", {
                x1: 0,
                y1: 0,
                x2: 0,
                y2: CHART_HEIGHT,
                stroke: "#eee"
              }),
              ...axises.slice(1).map((axis, i) =>
                createElement("circle", {
                  cx: 0,
                  cy: projectChartY(dot[i + 1]),
                  r: 4,
                  stroke: data.colors[axis],
                  fill: "#fff",
                  ["stroke-width"]: 2
                })
              ),
              createElement("rect", {
                x: -popupOffset,
                y: 0,
                class: 'popup',
                ry: 5,
                rx: 5
              }),
              createElement(
                "text",
                { x: textOffset, y: 22 },
                prettifyDate(dot[0], true)
              ),
              ...dot.slice(1).map((count, i) =>
                createElement(
                  "text",
                  {
                    x: textOffset + i * 45,
                    y: 48,
                    fill: data.colors[axises[i + 1]],
                    ['font-size']: 16,
                    ['font-weight']: 600
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
                    fill: data.colors[axis],
                    ['font-size']: 13
                  },
                  data.names[axis]
                )
              ),
            ]
          )
        ]
      )
    );

    return createElement("g", {}, dots);
  }
});
