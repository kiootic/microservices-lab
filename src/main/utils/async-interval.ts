export function setAsyncInternal(
  handler: () => Promise<void>,
  timeout: number,
): () => void {
  let disposed = false;
  let handle: number | null;

  const timeoutHandler = () => {
    handle = null;
    const start = Date.now();
    void handler().finally(() => {
      if (!disposed) {
        const elapsed = Date.now() - start;
        handle = setTimeout(timeoutHandler, Math.max(0, timeout - elapsed));
      }
    });
  };
  handle = setTimeout(timeoutHandler, timeout);

  return () => {
    if (handle != null) {
      clearTimeout(handle);
      handle = null;
    }
    disposed = true;
  };
}
