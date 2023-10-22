import { useEffect, useState } from "react";

export function useDebouncedValue<T>(value: T, delayMS: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delayMS);
    return () => clearTimeout(handle);
  }, [value, delayMS]);

  return debounced;
}
