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
export const values = Object.values || (obj => Object.keys(obj).map(k => obj[k]))
