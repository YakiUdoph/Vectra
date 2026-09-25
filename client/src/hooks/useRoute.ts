import { useCallback, useEffect, useState } from "react";

const supportedPaths = new Set(["/", "/x-ray", "/crash-lab", "/incident", "/compare"]);

function currentPath() {
  return supportedPaths.has(window.location.pathname) ? window.location.pathname : "/";
}

export function useRoute() {
  const [path, setPath] = useState(currentPath);

  useEffect(() => {
    const onPopState = () => setPath(currentPath());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const navigate = useCallback((nextPath: string) => {
    const normalizedPath = supportedPaths.has(nextPath) ? nextPath : "/";
    if (window.location.pathname !== normalizedPath) {
      window.history.pushState(null, "", normalizedPath);
    }
    setPath(normalizedPath);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return [path, navigate] as const;
}
