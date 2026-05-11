
export const throttle = (fn: Function, delay = 500) => {
  let lastCall = 0;

  return async (...args: any[]) => {
    const now = Date.now();
    if (now - lastCall < delay) return;

    lastCall = now;
    return await fn(...args);
  };
};

export const debounce = (fn: Function, delay = 500) => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  return (...args: any[]) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      fn(...args);
    }, delay);
  };
};
