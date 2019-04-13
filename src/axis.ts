import { CHART_WIDTH, PRECISION } from "./constant";

interface Bounds {
  scale: number;
  high: number;
  low: number;
  step: number;
  oom: number;
  min: number;
  max: number;
  range: number;
  numberOfSteps: number;
  valueRange: number;
  values: number[];
}

const orderOfMagnitude = function(value) {
  return Math.floor(Math.log(Math.abs(value)) / Math.LN10);
};

export const round = function(value: number, digits: number) {
  var precision = Math.pow(10, digits);
  return Math.round(value * precision) / precision;
};

export const getBounds = function(_: number, high: number, low: number) {
  var bounds = {
    high,
    low
  } as Bounds;

  bounds.valueRange = bounds.high - bounds.low;
  bounds.oom = orderOfMagnitude(bounds.valueRange);
  bounds.step = Math.pow(10, bounds.oom);
  bounds.min = Math.floor(bounds.low / bounds.step) * bounds.step;
  bounds.max = Math.ceil(bounds.high / bounds.step) * bounds.step;
  bounds.range = bounds.max - bounds.min;
  bounds.numberOfSteps = Math.round(bounds.range / bounds.step);

  const step = bounds.range / 5;
  const values2 = [];
  for (let i = 0; i < 6; i++) {
    values2.push(round(bounds.min + i * step,PRECISION));
  }
  bounds.values = values2;
  return bounds;
};

export const getBoundsX = (scale: number, high: number, low: number) => {
  let step = (high - low) / 5;
  if (scale > 1.6) {
    step = step / 2;
  }
  if (scale > 3.2) {
    step = step / 2;
  }
  if (scale > 6.4) {
    step = step / 2;
  }

  const numbers = [low];
  let i = low;
  while (i < high) {
    i = i + step;
    numbers.push(i);
  }
  return numbers;
};
