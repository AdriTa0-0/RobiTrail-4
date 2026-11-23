import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export type AppRoute =
  | { name: "home"; path: string }
  | { name: "cities"; path: string; cityId?: "chattogram" | "dhaka" | "sylhet" }
  | { name: "games"; path: string; cityId?: "chattogram" | "dhaka" | "sylhet" }
  | {
      name: "game-session";
      path: string;
      cityId: "chattogram" | "dhaka" | "sylhet";
      gameId: string;
    }
  | { name: "discover"; path: string; exhibitId: string }
  | { name: "robi-journey"; path: string }
  | { name: "videos"; path: string }
  | { name: "handbook"; path: string }
  | { name: "research-bangladesh"; path: string }
  | { name: "certification"; path: string }
  | { name: "account"; path: string }
  | { name: "tokens"; path: string }
  | { name: "about"; path: string };

function normalizePath(rawPath: string): string {
  const cleaned = rawPath.split("?")[0].split("#")[0].replace(/\/+$/, "");
  return cleaned === "" ? "/" : cleaned;
}

export function matchRoute(rawPath: string): AppRoute {
  const path = normalizePath(rawPath);

  if (path === "/") return { name: "home", path };
  if (path === "/cities") return { name: "cities", path };
  if (path === "/cities/chattogram" || path === "/cities/dhaka" || path === "/cities/sylhet") {
    const cityId = path.split("/")[2] as "chattogram" | "dhaka" | "sylhet";
    return { name: "cities", path, cityId };
  }
  if (path === "/games") return { name: "games", path };
  if (path === "/games/chattogram" || path === "/games/dhaka" || path === "/games/sylhet") {
    const cityId = path.split("/")[2] as "chattogram" | "dhaka" | "sylhet";
    return { name: "games", path, cityId };
  }

  const gameMatch = path.match(/^\/games\/(chattogram|dhaka|sylhet)\/([a-z0-9-]+)$/);
  if (gameMatch) {
    return {
      name: "game-session",
      path,
      cityId: gameMatch[1] as "chattogram" | "dhaka" | "sylhet",
      gameId: gameMatch[2],
    };
  }

  const discoverMatch = path.match(/^\/discover\/([a-z0-9-]+)$/);
  if (discoverMatch) {
    return { name: "discover", path, exhibitId: discoverMatch[1] };
  }

  if (path === "/robi-journey") return { name: "robi-journey", path };
  if (path === "/videos") return { name: "videos", path };
  if (path === "/handbook") return { name: "handbook", path };
  if (path === "/research/bangladesh") return { name: "research-bangladesh", path };
  if (path === "/about") return { name: "about", path };
  if (path === "/certification") return { name: "certification", path };
  if (path === "/account") return { name: "account", path };
  if (path === "/tokens") return { name: "tokens", path };

  return { name: "home", path: "/" };
}

interface RouterContextValue {
  currentPath: string;
  route: AppRoute;
  navigate: (to: string, options?: { replace?: boolean; skipGuard?: boolean }) => void;
  setActiveMissionDirty: (dirty: boolean) => void;
  pendingExitPath: string | null;
  confirmLeaveMission: () => void;
  cancelLeaveMission: () => void;
}

const RouterContext = createContext<RouterContextValue | null>(null);

export const RouterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentPath, setCurrentPath] = useState<string>(() =>
    typeof window !== "undefined" ? normalizePath(window.location.pathname) : "/",
  );
  const [pendingExitPath, setPendingExitPath] = useState<string | null>(null);
  const dirtyMissionRef = useRef(false);
  const committedPathRef = useRef(currentPath);

  const commitNavigation = useCallback((targetPath: string, replace = false) => {
    const norm = normalizePath(targetPath);
    dirtyMissionRef.current = false;
    setPendingExitPath(null);

    try {
      ScrollTrigger.getAll().forEach((st) => st.kill());
    } catch {
      // Ignore if ScrollTrigger not initialized yet
    }

    if (typeof window !== "undefined") {
      if (replace) {
        window.history.replaceState({ path: norm }, "", norm);
      } else if (normalizePath(window.location.pathname) !== norm) {
        window.history.pushState({ path: norm }, "", norm);
      }
      window.scrollTo({ top: 0, behavior: "auto" });
    }

    committedPathRef.current = norm;
    setCurrentPath(norm);
  }, []);

  const navigate = useCallback(
    (to: string, options?: { replace?: boolean; skipGuard?: boolean }) => {
      const norm = normalizePath(to);
      if (norm === committedPathRef.current && !options?.replace) {
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      if (dirtyMissionRef.current && !options?.skipGuard) {
        setPendingExitPath(norm);
        return;
      }
      commitNavigation(norm, options?.replace);
    },
    [commitNavigation],
  );

  const setActiveMissionDirty = useCallback((dirty: boolean) => {
    dirtyMissionRef.current = dirty;
  }, []);

  const confirmLeaveMission = useCallback(() => {
    if (!pendingExitPath) return;
    const dest = pendingExitPath;
    commitNavigation(dest, false);
  }, [commitNavigation, pendingExitPath]);

  const cancelLeaveMission = useCallback(() => {
    setPendingExitPath(null);
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      const nextPath = normalizePath(window.location.pathname);
      if (dirtyMissionRef.current && nextPath !== committedPathRef.current) {
        // Restore current game URL while user confirms abandoning active mission
        window.history.pushState({ path: committedPathRef.current }, "", committedPathRef.current);
        setPendingExitPath(nextPath);
        return;
      }
      try {
        ScrollTrigger.getAll().forEach((st) => st.kill());
      } catch {
        // Ignore cleanup errors
      }
      committedPathRef.current = nextPath;
      setCurrentPath(nextPath);
      window.scrollTo({ top: 0, behavior: "auto" });
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const route = matchRoute(currentPath);

  return (
    <RouterContext.Provider
      value={{
        currentPath,
        route,
        navigate,
        setActiveMissionDirty,
        pendingExitPath,
        confirmLeaveMission,
        cancelLeaveMission,
      }}
    >
      {children}
    </RouterContext.Provider>
  );
};

export function useAppRouter() {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error("useAppRouter must be used inside RouterProvider");
  return ctx;
}
