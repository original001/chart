import { CHART_WIDTH } from "./constant";

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

const PRECISION = 8;
const projectLength = function(axisLength, length, bounds) {
  return (length / bounds.range) * axisLength;
};

const orderOfMagnitude = function(value) {
  return Math.floor(Math.log(Math.abs(value)) / Math.LN10);
};

const rho = function(num: number) {
  if (num === 1) {
    return num;
  }

  function gcd(p, q) {
    if (p % q === 0) {
      return q;
    } else {
      return gcd(q, p % q);
    }
  }

  function f(x) {
    return x * x + 1;
  }

  var x1 = 2,
    x2 = 2,
    divisor;
  if (num % 2 === 0) {
    return 2;
  }

  do {
    x1 = f(x1) % num;
    x2 = f(f(x2)) % num;
    divisor = gcd(Math.abs(x1 - x2), num);
  } while (divisor === 1);

  return divisor;
};

const roundWithPrecision = function(value: number, digits?) {
  var precision = Math.pow(10, digits || PRECISION);
  return Math.round(value * precision) / precision;
};

export const getBounds = function(
  axisLength: number,
  high: number,
  low: number,
  scaleMinSpace = 30,
  onlyInteger = false
) {
  var i,
    optimizationCounter = 0,
    newMin,
    newMax,
    bounds = {
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

  // Optimize scale step by checking if subdivision is possible based on horizontalGridMinSpace
  // If we are already below the scaleMinSpace value we will scale up
  var length = projectLength(axisLength, bounds.step, bounds);
  var scaleUp = length < scaleMinSpace;
  var smallestFactor = onlyInteger ? rho(bounds.range) : 0;

  // First check if we should only use integer steps and if step 1 is still larger than scaleMinSpace so we can use 1
  if (onlyInteger && projectLength(axisLength, 1, bounds) >= scaleMinSpace) {
    bounds.step = 1;
  } else if (
    onlyInteger &&
    smallestFactor < bounds.step &&
    projectLength(axisLength, smallestFactor, bounds) >= scaleMinSpace
  ) {
    // If step 1 was too small, we can try the smallest factor of range
    // If the smallest factor is smaller than the current bounds.step and the projected length of smallest factor
    // is larger than the scaleMinSpace we should go for it.
    bounds.step = smallestFactor;
  } else {
    // Trying to divide or multiply by 2 and find the best step value
    while (true) {
      if (
        scaleUp &&
        projectLength(axisLength, bounds.step, bounds) <= scaleMinSpace
      ) {
        bounds.step *= 2;
      } else if (
        !scaleUp &&
        projectLength(axisLength, bounds.step / 2, bounds) >= scaleMinSpace
      ) {
        bounds.step /= 2;
        if (onlyInteger && bounds.step % 1 !== 0) {
          bounds.step *= 2;
          break;
        }
      } else {
        break;
      }

      if (optimizationCounter++ > 1000) {
        throw new Error(
          "Exceeded maximum number of iterations while optimizing scale step!"
        );
      }
    }
  }

  var EPSILON = 2.221e-16;
  bounds.step = Math.max(bounds.step, EPSILON);
  function safeIncrement(value, increment) {
    // If increment is too small use *= (1+EPSILON) as a simple nextafter
    if (value === (value += increment)) {
      value *= 1 + (increment > 0 ? EPSILON : -EPSILON);
    }
    return value;
  }

  // Narrow min and max based on new step
  newMin = bounds.min;
  newMax = bounds.max;
  while (newMin + bounds.step <= bounds.low) {
    newMin = safeIncrement(newMin, bounds.step);
  }
  while (newMax - bounds.step >= bounds.high) {
    newMax = safeIncrement(newMax, -bounds.step);
  }
  bounds.min = newMin;
  bounds.max = newMax;
  bounds.range = bounds.max - bounds.min;

  var values = [];
  for (i = bounds.min; i <= bounds.max; i = safeIncrement(i, bounds.step)) {
    var value = roundWithPrecision(i);
    if (value !== values[values.length - 1]) {
      values.push(value);
    }
  }
  bounds.values = values;
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
