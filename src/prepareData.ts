import { ChartDto } from "./chart_data";
import { CHART_WIDTH, PRECISION, SLIDER_HEIGHT, CHART_HEIGHT } from "./constant";
import { round } from "./axis";
import { createPathAttr } from "./utils";

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
}

export interface Props {
  charts: ChartInfo[];
  visibles: { [id: string]: boolean };
  scaleX: number;
  maxY: number;
  minY: number;
  minX: number;
  maxX: number;
  data: ChartDto;
  stackedValues?: number[];
  dataLength: number;
  pow: 1 | 1000 | 1000000;
}

export const getScaleY = (length: number, max: number, min: number) => length / (max - min);

export const getScaleX = (width, dotsCount) => width / dotsCount;

export const prepareData = (data: ChartDto): Props => {
  const columns = data.columns;
  const dataLength = data.columns[0].length - 1;
  const scaleX = getScaleX(CHART_WIDTH, dataLength);
  const xs = columns[0];
  const chartInfos: ChartInfo[] = [];
  const getExtremumY = (fn: string) =>
    Math[fn].apply(Math, columns.slice(1).map(ys => Math[fn].apply(Math, ys.slice(1))));
  const extremum = (fn, from, to?) => fn(columns.slice(from, to).map(ys => fn(ys.slice(1))));
  const maxX = extremum(ar => Math.max.apply(Math, ar), 0, 1);
  const minX = extremum(ar => Math.min.apply(Math, ar), 0, 1);
  let maxY = data.percentage ? 100 : getExtremumY("max");
  const pow = maxY / 1000 > 1 ? (maxY / 1000000 > 1 ? 1000000 : 1000) : 1;
  maxY = round(maxY / pow, PRECISION);
  const minY = data.stacked ? 0 : round(getExtremumY("min") / pow, PRECISION);
  let scaleYSlider = getScaleY(SLIDER_HEIGHT, maxY, minY);
  const projectChartX = (x: number) => (x * scaleX).toFixed(1);
  const projectChartY = (y: number) => (CHART_HEIGHT - y).toFixed(1);
  let stackedValues = Array(dataLength).fill(0);
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
    let values = columns[i];
    const name = values[0] as string;
    values = values.slice(1)
    const originalValues = values as number[];
    if (data.percentage) {
      values = values.map((v, i) => round((v as number / sumValues[i]) * 100, 0));
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
    const chartInfo: ChartInfo = {
      name: data.names[name],
      color: data.colors[name],
      chartPath: data.stacked
        ? null
        : createPathAttr(values as number[], projectChartX, projectChartY, stackedValues),
      sliderPath: data.stacked
        ? null
        : createPathAttr(
            values as number[],
            x => x * scaleX,
            y => SLIDER_HEIGHT - (y - (data.y_scaled ? min : minY)) * scaleYSlider,
            stackedValues
          ),
      max,
      min,
      id: name,
      values: values as number[],
      originalValues
    };
    chartInfos.push(chartInfo);
    if (data.stacked) {
      stackedValues = stackedValues.map((v, i) => v + values[i]);
    }
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
    stackedValues,
    dataLength,
    pow
  } as Props;
};
