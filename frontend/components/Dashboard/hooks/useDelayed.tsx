import { useEffect, useState } from "react";

export function useDelayed(delay: number = 500): boolean {
  const [delayed, setDelayed] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setDelayed(true), delay);
    return () => clearTimeout(timeout);
  }, [delay]);

  return delayed;
}
