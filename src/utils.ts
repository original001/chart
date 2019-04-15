import { createElement } from "./reconciler";
import { ChartInfo, Dot } from "./prepareData";
import { ChartDto, Column } from "./chart_data";
import { Animate } from "./animate";

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

// setTimeout(() => alert(time), 3000)
//prettier-ignore
var MONTH_NAMES = [ "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec" ];
var DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const prettifyDate = (
  timestamp: number,
  format: "m d" | "dt, d m y" | "d m y" | "h:m" | "dr m y"
) => {
  const d = new Date(timestamp);
  const date = DAY_NAMES[d.getDay()];
  const day = d.getDate();
  const month = MONTH_NAMES[d.getMonth()];
  const year = d.getFullYear();
  switch (format) {
    case "d m y":
      return `${day} ${month} ${year}`;
    case "dr m y":
      return `${month} ${year}`;
    case "dt, d m y":
      return `${date}, ${day} ${month} ${year}`;
    case "m d":
      return `${month} ${day}`;
    case "h:m":
      const h = d.getUTCHours();
      const m = d.getUTCMinutes();
      return `${h > 9 ? "" : "0"}${h}:${m > 9 ? "" : "0"}${m}`;
  }
};

export const repeat = <T>(count: number, value: T) => {
  const res = [] as T[];
  for (let i = 0; i < count; i++) {
    res.push(value);
  }
  return res;
};

export const path = (
  path: string,
  color: string,
  strokeWidth: number,
  status?,
  isStacked?: boolean,
  isPercentage?: boolean
) =>
  createElement(
    "path",
    {
      d: path,
      "stroke-width": strokeWidth.toFixed(1),
      stroke: color,
      class: `transition ${status}`,
      "vector-effect": !isStacked ? "non-scaling-stroke" : "",
      "stroke-linejoin": !isStacked ? "round" : "",
      fill: isPercentage ? color : "none",
      key: color,
      calcMode: 'paced'
    },
    [createElement(Animate, { value: path })]
  );

export const createPathAttr = (
  dots: Dot[],
  projectX: (x: number) => string | number,
  projectY: (y: number) => string | number
) =>
  dots.reduce((acc, [x, y], i) => {
    return i === 0 ? `M0 ${projectY(y)}` : acc + ` L${projectX(x)} ${projectY(y)}`;
  }, "");

export const createStackedPathAttr = (
  dots: Dot[],
  projectX: (x: number) => string | number,
  projectY: (y: number) => string | number,
  prevValues: number[]
) =>
  dots.reduce(
    (acc, [x, y], i) =>
      acc +
      `M${projectX(x)} ${projectY(prevValues[i])}L${projectX(x)} ${projectY(y + prevValues[i])}`,
    ""
  );

export const createPercentagePathAttr = (
  dots: Dot[],
  projectX: (x: number) => string | number,
  projectY: (y: number) => string | number,
  prevValues: number[]
) =>
  dots.reduce(
    (acc, [x, y], i) => acc + `L${projectX(x)} ${projectY(y + prevValues[i])}`,
    `M0 ${projectY(0)}`
  ) + `L${projectX(dots[dots.length - 1][0])} ${projectY(0)}Z`;

export const max_ = <T>(ar: T[]): number => Math.max.apply(Math, ar);
export const min_ = <T>(ar: T[]): number => Math.min.apply(Math, ar);
export const last = <T>(ar: T[]) => ar[ar.length - 1];
export const rest = <T>(ar: [any, ...T[]]) => {
  const [_, ...rest] = ar;
  return rest;
};

export const catValuesByDates = (
  dates: Column,
  values: number[],
  left: number,
  right: number,
  min?: number,
  max?: number
) => {
  const _max = max || max_(values);
  const _min = min || min_(values);
  const range = _max - _min;
  return values.filter(
    (_, i) => dates[i + 1] >= _min + range * left && dates[i + 1] <= _min + range * right
  );
};

export const catValues = (
  values: number[],
  left: number,
  right: number,
  min?: number,
  max?: number
) => {
  const _max = max || max_(values);
  const _min = min || min_(values);
  const range = _max - _min;
  return values.filter(v => v >= _min + range * left && v <= _min + range * right);
};
