import { useEffect, useState, type RefObject } from "react";

export function useVisibilityPause(ref: RefObject<HTMLElement | null>): boolean {
  const [onScreen, setOnScreen] = useState(true);
  const [tabVisible, setTabVisible] = useState(true);

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => setOnScreen(entries.some((entry) => entry.isIntersecting)),
      { threshold: 0.05 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  useEffect(() => {
    const handleVisibilityChange = () => setTabVisible(document.visibilityState !== "hidden");
    handleVisibilityChange();
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  return onScreen && tabVisible;
}
