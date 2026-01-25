import { useState } from "react";

export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") return initialValue;
    const item = window.localStorage.getItem(key);
    return item ? JSON.parse(item) : initialValue;
  });

  const setValue: React.Dispatch<React.SetStateAction<T>> = (
    value
  ) => {
    setStoredValue((prev) => {
      const valueToStore =
        value instanceof Function ? value(prev) : value;

      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          key,
          JSON.stringify(valueToStore)
        );
      }

      return valueToStore;
    });
  };

  return [storedValue, setValue];
}
