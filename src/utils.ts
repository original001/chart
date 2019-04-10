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
export const values =
  Object.values || (obj => Object.keys(obj).map(k => obj[k]));

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
      return false
    }
    i++;
  }
  return true;
}

export const prettifyDate = (timestamp: number, withDate?: boolean) => {
  const [date, month, day] = new Date(timestamp).toString().split(" ");
  return withDate ? `${date}, ${month} ${day}` : `${month} ${day}`;
};

