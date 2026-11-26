import React from "react";
import * as THREE from "three";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { APP_CONFIG } from "@/robi/config/appConfig";
import { getTrailById } from "@/robi/data/trails/trails";
import {
  isFreeIntroTrail,
  resolveTrailAccess,
  setConfigurableAccessConfig,
  resetConfigurableAccessConfig,
} from "@/robi/services/tokens/GameAccessService";
import {
  createInitialDataDetectiveState,
  evaluateDataDetective,
} from "@/robi/components/game/dhaka/dataDetectiveLogic";
import type {
  HarnessApi,
  InteractiveStation,
} from "@/robi/components/game/chattogram3d/ThreeMissionHarness";

const harnessState: {
  stations: InteractiveStation[];
  onStationInteract: ((id: string) => void) | null;
  cityBackdrop?: string;
} = {
  stations: [],
  onStationInteract: null,
};

vi.mock("@/robi/components/game/chattogram3d/ThreeMissionHarness", async () => {
  const actual = await vi.importActual<
    typeof import("@/robi/components/game/chattogram3d/ThreeMissionHarness")
  >("@/robi/components/game/chattogram3d/ThreeMissionHarness");

  const MockThreeMissionHarness: React.FC<{
    cityBackdrop?: string;
    onSceneReady: (api: HarnessApi) => () => void;
    onStationInteract: (id: string) => void;
  }> = (props) => {
    harnessState.onStationInteract = props.onStationInteract;
    harnessState.cityBackdrop = props.cityBackdrop;
    const mountedRef = React.useRef(false);

    React.useEffect(() => {
      if (mountedRef.current) return;
      mountedRef.current = true;
      const scene = new THREE.Scene();
      const api = {
        scene,
        camera: new THREE.PerspectiveCamera(),
        controls: {} as HarnessApi["controls"],
        playerGroup: new THREE.Group(),
        setPlayerTarget: vi.fn(),
        teleportPlayer: vi.fn(),
        setCameraGoal: vi.fn(),
        registerStations: (stations: InteractiveStation[]) => {
          harnessState.stations = stations;
        },
        registerObstacles: vi.fn(),
        registerDraggables: vi.fn(),
        setFrameUpdater: vi.fn(),
      } as HarnessApi;

      const cleanup = props.onSceneReady(api);
      return () => cleanup();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return <div data-testid="mock-dhaka-harness" />;
  };

  return {
    ...actual,
    ThreeMissionHarness: MockThreeMissionHarness,
  };
});

import { RobiTrailProvider, useRobiTrail } from "@/robi/context/RobiTrailContext";
import { RouterProvider } from "@/robi/router/RouterContext";
import { GamesDirectoryPage } from "@/robi/components/pages/GamesDirectoryPage";
import { DhakaGame1DataDetective3D } from "@/robi/components/game/dhaka/Dhaka3DScenes";

const ActiveCityProbe: React.FC = () => {
  const { activeCity } = useRobiTrail();
  return <div data-testid="active-city-probe">{activeCity.id}</div>;
};

describe("Data Detective unlock, Dhaka landing default & upgraded audit workflow", () => {
  beforeEach(() => {
    localStorage.clear();
    resetConfigurableAccessConfig();
  });

  it("keeps Data Detective (dhk-1) permanently unlocked for all users even in token preview mode", () => {
    const dhk1 = getTrailById("dhk-1")!;
    expect(isFreeIntroTrail(dhk1)).toBe(true);

    setConfigurableAccessConfig({
      tokenLockedTrailIds: ["dhk-1", "dhk-2"],
      accountRequiredForAllNonIntro: true,
    });

    const guestAccess = resolveTrailAccess({
      trail: dhk1,
      signedIn: false,
      devTestingMode: false,
      tokenPreviewMode: true,
      unlockedTrailIds: [],
      completedTrailIds: [],
      subscriptionActive: false,
    });

    expect(guestAccess).toMatchObject({
      tier: "free_intro",
      accessible: true,
      requiresRegistration: false,
      requiresTokenUnlock: false,
      unlockCost: 0,
    });
  });

  it("defaults landing city to Dhaka across config, context, and GamesDirectoryPage", () => {
    expect(APP_CONFIG.defaultCityId).toBe("dhaka");

    render(
      <RouterProvider>
        <RobiTrailProvider>
          <ActiveCityProbe />
          <GamesDirectoryPage />
        </RobiTrailProvider>
      </RouterProvider>,
    );

    expect(screen.getByTestId("active-city-probe")).toHaveTextContent("dhaka");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/Dhaka/i);
    expect(screen.getByRole("button", { name: /All Cities/i })).toBeInTheDocument();
  });

  it("evaluates dual MB + Mbps + 4-station audit constraints accurately", () => {
    const init = createInitialDataDetectiveState();
    const initialMetrics = evaluateDataDetective(init);
    expect(initialMetrics.totalMb).toBe(1440);
    expect(initialMetrics.studyMbps).toBe(2);
    expect(initialMetrics.canVerify).toBe(false);

    const solvedState = {
      ...init,
      auditedStations: ["phone", "monitor", "router", "tv"] as const,
      videoRes: "480p" as const,
      hotspotTether: false,
      autoPlay: false,
      qosMode: "study" as const,
      studyClassActive: true,
      wifiBand: "5ghz" as const,
      cloudSync: false,
      bgUpdates: false,
      tvSource: "fiber" as const,
      tvAmbientLoop: false,
    };
    const finalMetrics = evaluateDataDetective({
      ...solvedState,
      auditedStations: [...solvedState.auditedStations],
    });
    expect(finalMetrics.totalMb).toBe(270);
    expect(finalMetrics.studyMbps).toBe(16);
    expect(finalMetrics.canVerify).toBe(true);
  });

  it("runs the 4-station Dhaka apartment interactive workflow end-to-end", () => {
    const onProgress = vi.fn();
    const onComplete = vi.fn();

    render(
      <RouterProvider>
        <RobiTrailProvider>
          <DhakaGame1DataDetective3D onProgress={onProgress} onComplete={onComplete} />
        </RobiTrailProvider>
      </RouterProvider>,
    );

    expect(harnessState.cityBackdrop).toBe("dhaka");
    expect(harnessState.stations.map((s) => s.id)).toEqual(["phone", "monitor", "router", "tv"]);
    expect(screen.getByText("1440 MB")).toBeInTheDocument();
    expect(screen.getByText("2 Mbps")).toBeInTheDocument();
    expect(screen.getByText("0/4")).toBeInTheDocument();

    // Premature verify warns user
    fireEvent.click(screen.getByRole("button", { name: /Verify & Lock Plan/i }));
    expect(screen.getByRole("alert")).toHaveTextContent(/Inspect all 4 apartment stations/i);
    expect(onComplete).not.toHaveBeenCalled();

    // 1. Phone station
    act(() => harnessState.onStationInteract?.("phone"));
    fireEvent.click(screen.getByRole("button", { name: /480p/i }));
    fireEvent.click(screen.getByRole("button", { name: /Disable/i }));

    // 2. Workstation station
    act(() => harnessState.onStationInteract?.("monitor"));
    fireEvent.click(screen.getByRole("button", { name: /Pause/i }));
    fireEvent.click(screen.getByRole("button", { name: /Set Study QoS/i }));

    // 3. Router station
    act(() => harnessState.onStationInteract?.("router"));
    fireEvent.click(screen.getByRole("button", { name: /Switch 5 GHz/i }));
    fireEvent.click(screen.getByRole("button", { name: /Wi-Fi Only/i }));
    fireEvent.click(screen.getByRole("button", { name: /Schedule Night/i }));

    // 4. Smart TV station
    act(() => harnessState.onStationInteract?.("tv"));
    fireEvent.click(screen.getByRole("button", { name: /Move to Fiber/i }));
    fireEvent.click(screen.getByRole("button", { name: /Static Clock/i }));

    expect(screen.getByText("270 MB")).toBeInTheDocument();
    expect(screen.getByText("16 Mbps")).toBeInTheDocument();
    expect(screen.getByText("4/4")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Confirm Audit/i }));
    expect(onProgress).toHaveBeenLastCalledWith(100);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
