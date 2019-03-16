import { getBounds } from "./axis";
import { create } from "domain";
import { data, ChartDto } from "./chart_data";

export const CHART_HEIGHT = 200;
export const CHART_WIDTH = 900;
const SCALE_X = 10;
const NS = "http://www.w3.org/2000/svg";

type Dot = [number, number];
type Chart = Dot[];

export const createPathAttr = (
  chart: Chart,
  scaleX: number,
  scaleY: number,
  offsetY: number = 0,
  offsetX: number = 0
): string =>
  chart.reduce(
    (acc, [x, y], i) =>
    i === 0 ? `M0 ${(y - offsetY) * scaleY}` :
      acc + ` L${(i) * scaleX + offsetX} ${(y - offsetY) * scaleY}`,
    ""
  );

export const createDots = (chart: Chart, offset: number = 0, color: string) =>
  chart.map(([x, y], i) => createSvgDot(i * 100, y, offset, color));

export const createSvgDot = (
  x: number,
  y: number,
  offset: number,
  color: string
) => {
  const svgDot = document.createElementNS(NS, "circle");
  //innerHTML?
  svgDot.setAttributeNS(null, "cx", x + "");
  svgDot.setAttributeNS(null, "cy", y + offset + "");
  svgDot.setAttributeNS(null, "r", "10");
  svgDot.setAttributeNS(null, "stroke-width", "2");
  svgDot.setAttributeNS(null, "stroke", color); //need color
  svgDot.setAttributeNS(null, "fill", "#fff"); //need color
  return svgDot;
};

export const createSvg = () => {
  const svg = document.createElementNS(NS, "svg");
  svg.setAttributeNS(null, "width", "100%");
  svg.setAttributeNS(null, "height", CHART_HEIGHT + 50 + "");
  svg.setAttributeNS(
    null,
    "viewBox",
    `0 ${-CHART_HEIGHT} ${CHART_WIDTH} ${CHART_HEIGHT}`
  );
  return svg;
};

export const createSvgPath = (path: string, color: string): SVGElement => {
  const svgPath = document.createElementNS(NS, "path");
  //innerHTML?
  svgPath.setAttributeNS(null, "d", path);
  svgPath.setAttributeNS(null, "stroke-width", "2");
  svgPath.setAttributeNS(null, "stroke", color); //need color
  svgPath.setAttributeNS(null, "fill", "none");
  return svgPath;
};

export const createRulers = (values: number[], scale: number) => {
  const offset = values[0];
  return values.map(y => createSvgRuler((y - offset) * scale, y.toString()));
};

export const createSvgRuler = (y: number, label: string) => {
  const svgLine = document.createElementNS(NS, "line");
  //innerHTML?
  svgLine.setAttributeNS(null, "x1", "0");
  svgLine.setAttributeNS(null, "y1", y + "");
  svgLine.setAttributeNS(null, "x2", "100%");
  svgLine.setAttributeNS(null, "y2", y + "");
  svgLine.setAttributeNS(null, "stroke-width", "1");
  svgLine.setAttributeNS(null, "stroke", "gray"); //need color
  const svgText = document.createElementNS(NS, "text");
  //innerHTML?
  svgText.setAttributeNS(null, "x", "0");
  svgText.setAttributeNS(null, "y", y - 10 + "");
  svgText.setAttributeNS(null, "fill", "gray"); //need color
  svgText.innerHTML = label;
  return [svgLine, svgText];
};

export const createSvgLabel = (timestamp: number, offset: number) => {
  const svgText = document.createElementNS(NS, "text");
  //innerHTML?
  svgText.setAttributeNS(null, "x", offset + "");
  svgText.setAttributeNS(null, "y", 20 + "");
  svgText.setAttributeNS(null, "fill", "gray"); //need color
  const [_, month, day] = new Date(timestamp).toString().split(" ");
  svgText.innerHTML = `${month} ${day}`;
  return svgText;
};

export const createLabels = () => {};

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
  return [highY, lowY, highX, lowY];
};

export const createChart = (data: ChartDto) => {
  const svg = createSvg();
  const charts = getChartsFromData(data);
  const [highY, lowY, highX, lowX] = getHighLow(data);
  const { values, max, min } = getBounds(CHART_HEIGHT, highY, lowY);
  const { values: valuesX } = getBounds(CHART_WIDTH, highX, lowX, 100);
  const labels = valuesX.map((x, i) =>
    createSvgLabel(x, (i * CHART_WIDTH) / valuesX.length)
  );
  const scaleY = getScaleY(CHART_HEIGHT, max, min);
  const scaleX = getScaleX(CHART_WIDTH, data.columns[0].length - 1);
  const reversedScaleY = -scaleY;
  const svgRulers = createRulers(values, reversedScaleY);
  const svgCharts = charts.map(chart =>
    createSvgPath(
      createPathAttr(chart, scaleX, reversedScaleY, values[0]),
      "gray"
    )
  ); //?
  // const svgDots = charts.map(chart => createDots(chart, values[0], "gray"));

  svgRulers.forEach(([line, text]) => {
    svg.append(line, text);
  });
  svg.append.apply(svg, svgCharts);
  svg.append.apply(svg, labels);
  // svg.append.apply(svg, svgDots.reduce((acc, dots) => acc.concat(dots), []));
  return svg;
  // createLabels()
  // createTooltip()
  // const chart = document.createElement("div");
  // chart.addEventListener("mousemove", e => {
  //   updateSvgInDom({ activeLabelIndex: e.clientX });
  //   //updatebutton
  // });
};

const start = () =>
  document.getElementById("main").append(createChart(data[0]));

window["start"] = start;

interface State {
  xScale: number;
  yScale: number;
  rulers: number[];
  labels: number[];
  offset: number;
  visibility: { [x: string]: boolean };
  activeLabelIndex: number;
}

export const updateSvgInDom = (state: Partial<State>) => {
  // xScale, yScale, rulers, labels, position, dots, tooltip -> update attrs
  // if rulers !== nextRulers
  //   moveup or movedown and hide rulers than remove
  // ...
  // raf(appendToDom)
};

export const createSlider = svgChart => {
  const SCALE = 100;
  // create dom element
  // add eventListeners
  const slider = document.createElement("div");
  slider.addEventListener("mousemove", e => {
    updateSvgInDom({ offset: e.clientX });
    //updatebutton
  });
};

export const createButtons = (chartDto: ChartDto) => {
  //create buttons
  // add eventListeners per button
  const button = document.createElement("div");
  button.addEventListener("click", () => {
    updateSvgInDom({ visibility: { y: false } });
    //updatebutton
  });
};
