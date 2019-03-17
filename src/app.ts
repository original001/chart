import { getBounds } from "./axis";
import { data, ChartDto } from "./chart_data";
import { render, createElement } from "./reconciler";
import { Ruller } from "./ruller";
import { Slider } from "./slider";

export const CHART_HEIGHT = 200;
export const CHART_WIDTH = 900;
export const SLIDER_HEIGHT = 50;

type Dot = [number, number];
type Chart = Dot[];

export const createPathAttr = (
  chart: Chart,
  projectX: (x: number) => number,
  projectY: (y: number) => number
) =>
  chart.reduce(
    (acc, [x, y], i) =>
      i === 0 ? `M0 ${projectY(y)}` : acc + ` L${projectX(i)} ${projectY(y)}`,
    ""
  );

const prettifyDate = (timestamp: number) => {
  const [_, month, day] = new Date(timestamp).toString().split(" ");
  return `${month} ${day}`;
};

const path = (path: string, color: string) =>
  createElement("path", {
    d: path,
    "stroke-width": 2,
    stroke: color,
    fill: "none"
  });

const label = (timestamp: number, offset: number) =>
  createElement(
    "text",
    {
      x: offset,
      y: 20,
      fill: "gray"
    },
    prettifyDate(timestamp)
  );

export const zipDots = (xs: number[], ys: number[]) =>
  xs.reduce((acc, cur, i) => acc.concat([[xs[i], ys[i]]]), []);

export const getChartsFromData = (data: ChartDto) => {
  const xs = data.columns[0];
  return data.columns
    .slice(1)
    .map(values => values.slice(1).map((y, i) => [xs[i + 1], y] as Dot));
};

export const getScaleY = (length: number, max: number, min: number) =>
  length / (max - min);

export const getScaleX = (width, dotsCount) => width / dotsCount;

export const getHighLow = (data: ChartDto) => {
  const extremum = (fn, from, to?) =>
    fn(data.columns.slice(from, to).map(ys => fn(ys.slice(1))));
  const highY = extremum(ar => Math.max.apply(Math, ar), 1);
  const lowY = extremum(ar => Math.min.apply(Math, ar), 1);
  const highX = extremum(ar => Math.max.apply(Math, ar), 0, 1);
  const lowX = extremum(ar => Math.min.apply(Math, ar), 0, 1);
  return [highY, lowY, highX, lowX];
};

export const createChart = (data: ChartDto) => {
  const charts = getChartsFromData(data);
  const [highY, lowY, highX, lowX] = getHighLow(data);
  const { values, max, min } = getBounds(CHART_HEIGHT, highY, lowY);
  const { values: valuesX } = getBounds(CHART_WIDTH, highX, lowX, 100);
  const scaleY = getScaleY(CHART_HEIGHT, max, min);
  const scaleX = getScaleX(CHART_WIDTH, data.columns[0].length - 1);
  const scaleYSlider = getScaleY(SLIDER_HEIGHT, max, min);

  const chart = createElement(
    "svg",
    {
      width: CHART_WIDTH,
      height: CHART_HEIGHT
    },
    [
      createElement(Ruller, { values, scale: scaleY }),
      ...charts.map(chart =>
        path(
          createPathAttr(
            chart,
            x => x * scaleX,
            y => CHART_HEIGHT - (y - values[0]) * scaleY
          ),
          "gray"
        )
      )
    ]
  );
  const sliderChart = createElement(
    "svg",
    {
      width: CHART_WIDTH,
      height: SLIDER_HEIGHT
    },
    charts.map(chart =>
      path(
        createPathAttr(
          chart,
          x => x * scaleX,
          y => SLIDER_HEIGHT - (y - values[0]) * scaleYSlider
        ),
        "gray"
      )
    )
  );
  const slider = createElement(
    "div",
    {
      style: `position: relative; overflow: hidden; height: ${SLIDER_HEIGHT}px; width: ${CHART_WIDTH}px`
    },
    [createElement(Slider, {}), sliderChart]
  );
  const labels = createElement(
    "svg",
    { width: CHART_WIDTH, height: 30 },
    valuesX.map((x, i) => label(x, (i * CHART_WIDTH) / valuesX.length))
  );
  render(
    createElement("div", {}, [chart, labels, slider]),
    document.getElementById("main")
  );
};

const start = () => createChart(data[0]);

window["start"] = start;
