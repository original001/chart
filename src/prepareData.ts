import { ChartDto } from "./chart_data";
import { CHART_WIDTH, PRECISION, SLIDER_HEIGHT, CHART_HEIGHT } from "./constant";
import { round, getBounds, getBoundsX } from "./axis";
import { createPathAttr, getStackedMax, catValuesByDates, last, rest, min_, max_ } from "./utils";
import { AppState } from "./app";

export interface ChartInfo {
  chartPath: string;
  sliderPath: string;
  values: number[];
  originalValues: number[];
  name: string;
  color: string;
  id: string;
  min: number;
  max: number;
  dots: Dot[];
}

export type Dot = [number, number];

export interface PreparedData {
  charts: ChartInfo[];
  visibles: { [id: string]: boolean };
  scaleX: number;
  maxY: number;
  minY: number;
  minX: number;
  maxX: number;
  data: ChartDto;
  dataLength: number;
  pow: 1 | 1000 | 1000000;
  scaledX_: (x: number) => number;
  y__: (f: (y: number) => number) => (x: number) => number;
}

export const getScaleY = (length: number, max: number, min: number) => length / (max - min);

export const getScaleX = (width, dotsCount) => width / dotsCount;

const powCache = {};

export const prepareData = (
  data: ChartDto,
  index?: number
): PreparedData => {
  const columns = data.columns;
  const dates = columns[0];
  const dataLength = dates.length - 1;
  const firstDate = dates[1];
  const scaleX = getScaleX(CHART_WIDTH, (last(dates) as number) - firstDate);
  const chartInfos: ChartInfo[] = [];
  const getExtremumY = (fn: string) =>
    Math[fn].apply(Math, columns.slice(1).map(ys => Math[fn].apply(Math, ys.slice(1))));
  const extremum = (fn, from, to?) => fn(columns.slice(from, to).map(ys => fn(ys.slice(1))));
  const maxX = extremum(ar => Math.max.apply(Math, ar), 0, 1);
  const minX = extremum(ar => Math.min.apply(Math, ar), 0, 1);
  let maxY = data.percentage ? 100 : getExtremumY("max");
  const pow =
    (index != null && powCache[index]) || maxY / 1000 > 1
      ? maxY / 1000000 > 1
        ? 1000000
        : 1000
      : 1;
  powCache[index] = pow;
  maxY = round(maxY / pow, PRECISION);
  const minY = data.stacked ? 0 : round(getExtremumY("min") / pow, PRECISION);
  let scaleYSlider = getScaleY(SLIDER_HEIGHT, maxY, minY);
  const scaledX_ = (x: number) => round((x - firstDate) * scaleX, 1);
  const y__ = (f: (y: number) => number) => (y: number) => round(CHART_HEIGHT - f(y), PRECISION);
  let i = 1;
  columns.sort((a, b) => (a[1] > b[1] ? -1 : a[1] === b[1] ? 0 : 1));

  const sumValues = [];
  for (let i = 0; i < dataLength; i++) {
    let sum = 0;
    for (let j = 1; j < columns.length; j++) {
      sum += columns[j][i + 1] as number;
    }
    sumValues.push(sum);
  }

  while (i < columns.length) {
    const name = columns[i][0];
    let values = rest(columns[i]);
    const originalValues = values;
    if (data.percentage) {
      values = values.map((v, i) => round(((v as number) / sumValues[i]) * 100, 0));
    } else {
      values = values.map(v => round((v as number) / pow, PRECISION));
    }
    //.map(v => (v > 1000 ? Math.floor(v / 1000) : v));
    const max = Math.max.apply(Math, values);
    const min = Math.min.apply(Math, values);
    // values = pow > 1 ? values : values;
    if (data.y_scaled) {
      scaleYSlider = getScaleY(SLIDER_HEIGHT, max, min);
    }
    //todo: leave only values
    const chartDots = values.map((y, i) => [dates[i + 1], y] as Dot);
    const chartInfo: ChartInfo = {
      name: data.names[name],
      color: data.colors[name],
      chartPath: data.stacked ? null : createPathAttr(chartDots, scaledX_, y__(y => y)),
      sliderPath: data.stacked
        ? null
        : createPathAttr(chartDots, scaledX_, y =>
            round(SLIDER_HEIGHT - (y - (data.y_scaled ? min : minY)) * scaleYSlider, 1)
          ),
      max,
      min,
      id: name,
      values: values as number[],
      originalValues,
      dots: chartDots
    };
    chartInfos.push(chartInfo);

    i++;
  }
  const visibles = {};
  for (let id in data.names) {
    visibles[id] = true;
  }
  return {
    charts: chartInfos,
    visibles,
    maxY,
    minY,
    maxX,
    minX,
    scaleX,
    data,
    dataLength,
    pow,
    scaledX_,
    y__
  } as PreparedData;
};

interface LocalData {
  offsetY: number;
  offsetY2: number;
  scaleY: number;
  scaleY2: number;
  valuesY2: number[];
  valuesY: number[];
  valuesX: number[];
  charts: ChartInfo[];
}

export const localPrepare = (props: PreparedData, state: AppState): LocalData => {
  const { maxX, minX, data, dataLength } = props;
  const {
    visibles,
    sliderPos: { left, right },
    extraScale
  } = state;
  const charts = props.charts.filter(chart => visibles[chart.id]);

  const cuttedCharts = charts.map(ch => ({
    ...ch,
    values: catValuesByDates(data.columns[0], ch.values, left, right, minX, maxX)
  })
  );

  const extrY_ = (
    f: (ar: number[]) => number,
    charts: ChartInfo[]
  ) => f(charts.map(({ values }) => f(values)));

  const isScaled = data.y_scaled;
  const isStacked = data.stacked;
  let localMinY;
  let localMaxY;
  let localMinY2;
  let localMaxY2;
  if (isScaled) {
    const first = cuttedCharts.filter(c => c.id === "y0");
    localMinY = extrY_(min_, first);
    localMaxY = extrY_(max_, first);
    const second = cuttedCharts.filter(c => c.id === "y1");
    localMinY2 = extrY_(min_, second);
    localMaxY2 = extrY_(max_, second);
  } else if (isStacked) {
    localMinY = 0;
    if (data.percentage) {
      localMaxY = 100;
    } else {
      localMaxY = getStackedMax(
        Math.floor(dataLength * left) + 1,
        Math.ceil(dataLength * right),
        charts
      );
    }
  } else {
    localMinY = extrY_(min_, cuttedCharts);
    localMaxY = extrY_(max_, cuttedCharts);
  }

  let { values: valuesY, max: boundsMaxY, min: boundsMinY } = getBounds(
    CHART_HEIGHT,
    localMaxY,
    localMinY
  );
  // valuesY = charts.some(c => c.id === 'y1') ? valuesY : null
  const { values: valuesY2, max: boundsMaxY2, min: boundsMinY2 } = isScaled
    ? getBounds(CHART_HEIGHT, localMaxY2, localMinY2)
    : { values: null, max: 2, min: 1 };

  const valuesX = getBoundsX(extraScale, maxX, minX);
  // console.log(valuesX)
  const scaleY = getScaleY(CHART_HEIGHT, boundsMaxY, boundsMinY);
  const scaleY2 = getScaleY(CHART_HEIGHT, boundsMaxY2, boundsMinY2);

  const offsetY = boundsMinY;
  const offsetY2 = boundsMinY2;

  const localData: LocalData = {
    offsetY,
    offsetY2,
    scaleY,
    scaleY2,
    valuesY2,
    valuesY,
    charts,
    valuesX
  };
  return localData;
};
