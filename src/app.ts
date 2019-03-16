import { getBounds } from "./axis";
import { create } from "domain";
import { data, ChartDto } from "./chart_data";

export const CHART_HEIGHT = 200;
export const CHART_WIDTH = 900;
export const SLIDER_HEIGHT = 50;
const SCALE_X = 10;
const NS = "http://www.w3.org/2000/svg";

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

export const createDots = (chart: Chart, offset: number = 0, color: string) =>
  chart.map(([x, y], i) => createSvgDot(i * 100, y, offset, color));

export const createSvg = (
  type: string,
  attrs: [string, string | number][] = []
) => {
  const svg = document.createElementNS(NS, type);

  attrs.forEach(([caption, value]) => {
    svg.setAttributeNS(null, caption, value + "");
  });
  return svg;
};

export const createSvgGroup = () => createSvg("g");

export const createSvgDot = (
  x: number,
  y: number,
  offset: number,
  color: string
) =>
  createSvg("circle", [
    ["cx", x],
    ["cy", y + offset + ""],
    ["r", "10"],
    ["stroke-width", "2"],
    ["stroke", color],
    ["fill", "#fff"]
  ]);

export const createRootSvg = () => {
  const svg = document.createElementNS(NS, "svg");
  svg.setAttributeNS(null, "width", CHART_WIDTH + "");
  svg.setAttributeNS(null, "height", CHART_HEIGHT + "");
  // svg.setAttributeNS(
  //   null,
  //   "viewBox",
  //   `0 ${-CHART_HEIGHT} ${CHART_WIDTH} ${CHART_HEIGHT}`
  // );
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
  svgLine.setAttributeNS(null, "y1", CHART_HEIGHT - y + "");
  svgLine.setAttributeNS(null, "x2", "100%");
  svgLine.setAttributeNS(null, "y2", CHART_HEIGHT - y + "");
  svgLine.setAttributeNS(null, "stroke-width", "1");
  svgLine.setAttributeNS(null, "stroke", "gray"); //need color
  const svgText = document.createElementNS(NS, "text");
  //innerHTML?
  svgText.setAttributeNS(null, "x", "0");
  svgText.setAttributeNS(null, "y", CHART_HEIGHT - y - 10 + "");
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

export const createRaf = (fn: (...args) => void) => {
  let isRafAvailable = true;
  return (...args) => {
    if (isRafAvailable) {
      isRafAvailable = false;
      requestAnimationFrame(() => {
        fn(...args);
        isRafAvailable = true;
      });
    }
  };
};

export const createSliderMarkup = onUpdate => {
  const wrapper = document.createElement("div");
  wrapper.className = "sliderWrapper";
  wrapper.style.left = "-1000px";
  const onMouseMove = createRaf((e: MouseEvent) => {
    const newPosition = e.clientX - wrapper.parentElement.offsetLeft - 1000;
    wrapper.style.left = newPosition + "px";

    const newData: ChartDto = {
      ...data[0],
      columns: data[0].columns.map(col => col.slice(0))
    };

    newData.columns.forEach(col => {
      col.splice((-newPosition - 1000) / 10);
    });
    onUpdate(newData);
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
  return [highY, lowY, highX, lowX];
};

export const createChart = (data: ChartDto) => {
  document.getElementById("main").innerHTML = "";
  const svg = createRootSvg();
  const charts = getChartsFromData(data);
  const [highY, lowY, highX, lowX] = getHighLow(data);
  const { values, max, min } = getBounds(CHART_HEIGHT, highY, lowY);
  const { values: valuesX } = getBounds(CHART_WIDTH, highX, lowX, 100);
  const labels = valuesX.map((x, i) =>
    createSvgLabel(x, (i * CHART_WIDTH) / valuesX.length)
  );
  const scaleY = getScaleY(CHART_HEIGHT, max, min);
  const scaleX = getScaleX(CHART_WIDTH, data.columns[0].length - 1);
  const svgRulers = createRulers(values, scaleY);

  const svgCharts = charts.map(chart =>
    createSvgPath(
      createPathAttr(
        chart,
        x => x * scaleX,
        y => CHART_HEIGHT - (y - values[0]) * scaleY
      ),
      "gray"
    )
  ); //?
  // const svgDots = charts.map(chart => createDots(chart, values[0], "gray"));
  const scaleYSlider = getScaleY(SLIDER_HEIGHT, max, min);
  const svgChartsInSlider = charts.map(chart =>
    createSvgPath(
      createPathAttr(
        chart,
        x => x * scaleX,
        y => SLIDER_HEIGHT - (y - values[0]) * scaleYSlider
      ),
      "gray"
    )
  ); //?

  const div = document.createElement("div");
  svgRulers.forEach(([line, text]) => {
    svg.append(line, text);
  });
  svg.append.apply(svg, svgCharts);

  div.append(svg);
  const svgLabelsRoot = createSvg("svg", [
    ["width", CHART_WIDTH],
    ["height", "30"]
  ]);
  svgLabelsRoot.append.apply(svgLabelsRoot, labels);
  div.append(svgLabelsRoot);
  const svgSliderRoot = createSvg("svg", [
    ["width", CHART_WIDTH],
    ["height", SLIDER_HEIGHT]
  ]);
  svgSliderRoot.append.apply(svgSliderRoot, svgChartsInSlider);
  const sliderRoot = document.createElement("div");
  sliderRoot.style.position = "relative";
  sliderRoot.style.overflow = "hidden";
  const slider = createSliderMarkup(createChart);
  sliderRoot.append(svgSliderRoot);
  sliderRoot.append(slider);
  div.append(sliderRoot);

  document.getElementById("main").append(div);
};

const start = () => createChart(data[0]);

window["start"] = start;
