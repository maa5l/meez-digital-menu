/** تأخير تنفيذ الدالة حتى توقف الاستدعاءات المتتالية */
export function debounce<T extends (...args: never[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return ((...args: never[]) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  }) as T;
}

/** تنفيذ مرة واحدة على الأكثر كل ms */
export function throttle<T extends (...args: never[]) => void>(fn: T, ms: number): T {
  let last = 0;
  let trailing: ReturnType<typeof setTimeout> | undefined;

  return ((...args: never[]) => {
    const now = Date.now();
    const elapsed = now - last;

    const run = () => {
      last = Date.now();
      fn(...args);
    };

    if (elapsed >= ms) {
      if (trailing) clearTimeout(trailing);
      run();
      return;
    }

    if (!trailing) {
      trailing = setTimeout(() => {
        trailing = undefined;
        run();
      }, ms - elapsed);
    }
  }) as T;
}
