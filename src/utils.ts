import { createElement } from "./reconciler";
import { ChartInfo } from "./prepareData";

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
export const values = Object.values || (obj => Object.keys(obj).map(k => obj[k]));

export const zipDots = (array: any[][]) => {
  const n = array[0].length;
  let index = -1,
    result = Array(n);

  while (++index < n) {
    result[index] = array.map(dots => dots[index]);
  }
  return result;
};
// xs.reduce((acc, cur, i) => acc.concat([[xs[i], ys[i]]]), []);

export const shallowEqual = (prev: any[], next: any[]) => {
  if (prev.length !== next.length) return false;
  let i = 0;
  while (i < prev.length) {
    if (prev[i] !== next[i]) {
      return false;
    }
    i++;
  }
  return true;
};
export const getStackedMax = (from, to, charts: ChartInfo[]) => {
  let max = -Infinity;
  for (let i = from; i < to; i++) {
    let sum = 0;
    for (let j = 0; j < charts.length; j++) {
      sum += charts[j].values[i] as number;
      max = Math.max(sum, max);
    }
  }
  return max;
};

export const prettifyDate = (timestamp: number, withDate?: boolean) => {
  const [date, month, day] = new Date(timestamp).toString().split(" ");
  return withDate ? `${date}, ${month} ${day}` : `${month} ${day}`;
};

export const path = (
  path: string,
  color: string,
  strokeWidth: number,
  status?,
  isStacked?: boolean,
  isPercentage?: boolean
) =>
  createElement("path", {
    d: path,
    "stroke-width": strokeWidth.toFixed(1),
    stroke: color,
    class: `transition-p ${status}`,
    "vector-effect": !isStacked ? "non-scaling-stroke" : "",
    fill: isPercentage ? color : "none",
    // fill: "none",
    key: color
  });

export const createPathAttr = (
  values: number[],
  projectX: (x: number) => string | number,
  projectY: (y: number) => string | number,
  _: number[]
) =>
  values.reduce(
    (acc, y, i) => (i === 0 ? `M0 ${projectY(y)}` : acc + ` L${projectX(i)} ${projectY(y)}`),
    ""
  );

export const createStackedPathAttr = (
  values: number[],
  projectX: (x: number) => string | number,
  projectY: (y: number) => string | number,
  prevValues: number[]
) =>
  values.reduce(
    (acc, y, i) =>
      acc +
      `M${projectX(i)} ${projectY(prevValues[i])}L${projectX(i)} ${projectY(y + prevValues[i])}`,
    ""
  );

export const createPercentagePathAttr = (
  values: number[],
  projectX: (x: number) => string | number,
  projectY: (y: number) => string | number,
  prevValues: number[]
) =>
  values.reduce(
    (acc, y, i) => acc + `L${projectX(i)} ${projectY(y + prevValues[i])}`,
    `M0 ${projectY(0)}`
  ) + `L${projectX(values.length - 1)} ${projectY(0)}Z`;
