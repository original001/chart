interface ChartDto {
  columns: number[][];
  types: { [id: string]: "line" | "x" };
  names: { [id: string]: string };
  colors: { [id: string]: string };
}

export const CHART_HEIGHT = 200;
const NS = "http://www.w3.org/2000/svg";

type Dot = [number, number];
type Chart = Dot[];

// export const createSvgLine = (x: Dot, y: Dot) => {};

export const createPathAttr = (chart: Chart): string =>
  chart.reduce(
    (acc, [x, y], i) => (i === 0 ? `M${x} ${y}` : acc + ` L${x} ${y}`),
    ""
  );

export const createSvg = () => {
  const svg = document.createElementNS(NS, "svg");
  svg.setAttributeNS(null, "width", "100%");
  svg.setAttributeNS(null, "height", "100%");
  return svg;
};

export const createSvgPath = (path: string, color: string): SVGElement => {
  const svgPath = document.createElementNS(NS, "path");
  svgPath.setAttributeNS(null, "path", path);
  svgPath.setAttributeNS(null, "stroke-width", "2");
  svgPath.setAttributeNS(null, "stroke", color); //need color
  return svgPath;
};

export const calculateScale = (charts: Chart[]) => {}; // find min and max, then calc proportion

// # pretify coords

// miny = absCeil miny, true, 2, true
// maxy = absCeil maxy, true, 2, true
// delta = absCeil(maxy-miny)/10
// dl = absCeil delta/ky, false, 3

// ext = -miny + absCeil miny, true, 0
// ext = absCeil ext, true, 2

// dlExt = Math.abs absCeil ext/ky, false, 3

export const createRulers = () => {};

export const createLabels = () => {};

export const createChart = (svgs: SVGAElement[]) => {
  // createSvgChart();
  // calculateScale()
  // pretify coords
  // createRulers()
  // createLabels()
  // createTooltip()
  const chart = document.createElement("div");
  chart.addEventListener("mousemove", e => {
    updateSvgInDom({ activeLabelIndex: e.clientX });
    //updatebutton
  });
};

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
