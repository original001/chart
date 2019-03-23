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
