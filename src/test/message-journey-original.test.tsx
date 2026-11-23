import React from "react";
import * as THREE from "three";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type {
  HarnessApi,
  InteractiveStation,
  ObstacleBox,
} from "@/robi/components/game/chattogram3d/ThreeMissionHarness";
import { RobiTrailProvider } from "@/robi/context/RobiTrailContext";
import { RouterProvider } from "@/robi/router/RouterContext";
import { getTrailById } from "@/robi/data/trails/trails";

const harnessCapture: {
  scene: THREE.Scene | null;
  stations: InteractiveStation[];
  obstacles: ObstacleBox[];
  frameUpdater: ((delta: number, elapsed: number) => void) | null;
  cameraGoals: Array<{ pos: THREE.Vector3 | null; target: THREE.Vector3 | null }>;
  props: {
    cityBackdrop?: string;
    bounds?: { minX: number; maxX: number; minZ: number; maxZ: number };
    initialPlayerPos?: [number, number, number];
    initialCameraOffset?: [number, number, number];
  } | null;
} = {
  scene: null,
  stations: [],
  obstacles: [],
  frameUpdater: null,
  cameraGoals: [],
  props: null,
};

vi.mock("@/robi/components/game/chattogram3d/ThreeMissionHarness", async () => {
  const actual = await vi.importActual<
    typeof import("@/robi/components/game/chattogram3d/ThreeMissionHarness")
  >("@/robi/components/game/chattogram3d/ThreeMissionHarness");

  const MockThreeMissionHarness: React.FC<{
    bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
    initialPlayerPos: [number, number, number];
    initialCameraOffset: [number, number, number];
    cityBackdrop?: string;
    onSceneReady: (api: HarnessApi) => () => void;
    onStationInteract: (id: string) => void;
    onFallbackView?: React.ReactNode;
  }> = (props) => {
    const readyRef = React.useRef(false);
    React.useEffect(() => {
      if (readyRef.current) return;
      readyRef.current = true;
      harnessCapture.props = {
        cityBackdrop: props.cityBackdrop,
        bounds: props.bounds,
        initialPlayerPos: props.initialPlayerPos,
        initialCameraOffset: props.initialCameraOffset,
      };
      const scene = new THREE.Scene();
      harnessCapture.scene = scene;
      harnessCapture.stations = [];
      harnessCapture.obstacles = [];
      harnessCapture.cameraGoals = [];
      harnessCapture.frameUpdater = null;

      const api = {
        scene,
        camera: new THREE.PerspectiveCamera(),
        controls: {} as HarnessApi["controls"],
        playerGroup: new THREE.Group(),
        setPlayerTarget: vi.fn(),
        teleportPlayer: vi.fn(),
        setCameraGoal: (pos: THREE.Vector3 | null, target?: THREE.Vector3 | null) => {
          harnessCapture.cameraGoals.push({
            pos: pos ? pos.clone() : null,
            target: target ? target.clone() : null,
          });
        },
        registerStations: (stations: InteractiveStation[]) => {
          harnessCapture.stations = stations;
        },
        registerObstacles: (obstacles: ObstacleBox[]) => {
          harnessCapture.obstacles = obstacles;
        },
        registerDraggables: vi.fn(),
        setFrameUpdater: (fn: (delta: number, elapsed: number) => void) => {
          harnessCapture.frameUpdater = fn;
        },
      } as HarnessApi;

      const cleanup = props.onSceneReady(api);
      return () => {
        cleanup();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return <div data-testid="mock-three-mission-harness" />;
  };

  return {
    ...actual,
    ThreeMissionHarness: MockThreeMissionHarness,
  };
});

import { ChattogramTrailEngine } from "@/robi/components/game/ChattogramTrails";

describe("Restored Original The Message Journey (ctg-4)", () => {
  it("preserves exact original Bangla & English Trail Config metadata under ctg-4", () => {
    const trail = getTrailById("ctg-4");
    expect(trail).toBeDefined();
    expect(trail?.cityId).toBe("chattogram");
    expect(trail?.order).toBe(4);
    expect(trail?.title).toEqual({ en: "The Message Journey", bn: "বার্তার যাত্রাপথ" });
    expect(trail?.subtitle).toEqual({
      en: "3D Street Network Routing",
      bn: "৩ডি সড়ক নেটওয়ার্ক রাউটিং",
    });
    expect(trail?.landmarkLabel).toEqual({
      en: "Agrabad Relay Street",
      bn: "আগ্রাবাদ রিলে সড়ক",
    });
    expect(trail?.worldAnchor).toEqual([-7, 2.5, -5]);
    expect(trail?.tryPrompt.en).toBe(
      "Step onto the left Sender Phone pad first—look for the glowing ring.",
    );
    expect(trail?.nextTeaser?.targetTrailId).toBe("dhk-1");
  });

  it("runs the full 5-station sequence, rejects out-of-order clicks, launches packet with camera follow, and completes", () => {
    const onProgress = vi.fn();
    const onComplete = vi.fn();

    render(
      <RouterProvider>
        <RobiTrailProvider>
          <ChattogramTrailEngine trailId="ctg-4" onProgress={onProgress} onComplete={onComplete} />
        </RobiTrailProvider>
      </RouterProvider>,
    );

    // Original harness & Chattogram city backdrop verified
    expect(screen.getByTestId("mock-three-mission-harness")).toBeInTheDocument();
    expect(harnessCapture.props?.cityBackdrop).toBe("chattogram");
    expect(harnessCapture.props?.bounds).toEqual({ minX: -18, maxX: 18, minZ: -8, maxZ: 9 });
    expect(harnessCapture.props?.initialPlayerPos).toEqual([-13, 0, 6.5]);
    expect(harnessCapture.stations.map((s) => s.id)).toEqual([
      "sender",
      "tower-a",
      "core",
      "tower-b",
      "receiver",
    ]);
    // 3 background harbor buildings + 5 interactive station collision boxes
    expect(harnessCapture.obstacles).toHaveLength(8);

    // 4 overhead link cylinder beams start hidden until nodes activate
    const linkMeshes = harnessCapture.scene!.children.filter(
      (c): c is THREE.Mesh =>
        c instanceof THREE.Mesh && c.geometry instanceof THREE.CylinderGeometry,
    );
    expect(linkMeshes).toHaveLength(4);
    expect(linkMeshes.every((l) => l.visible === false)).toBe(true);

    // Reject out-of-order activation (clicking Core Switching Hub first)
    fireEvent.click(screen.getByRole("button", { name: /Core Switching Hub/i }));
    expect(screen.getByText("Wait! Next link needed is Sender Phone.")).toBeInTheDocument();
    expect(harnessCapture.stations.find((s) => s.id === "core")?.state).toBe("invalid");
    expect(onProgress).not.toHaveBeenCalled();

    // Activate all 5 stations in exact sequence
    fireEvent.click(screen.getByRole("button", { name: /Sender Phone/i }));
    expect(onProgress).toHaveBeenLastCalledWith(16);

    fireEvent.click(screen.getByRole("button", { name: /Agrabad Tower/i }));
    expect(onProgress).toHaveBeenLastCalledWith(32);
    expect(linkMeshes[0].visible).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: /Core Switching Hub/i }));
    expect(onProgress).toHaveBeenLastCalledWith(48);
    expect(linkMeshes[1].visible).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: /Patenga Tower/i }));
    expect(onProgress).toHaveBeenLastCalledWith(64);
    expect(linkMeshes[2].visible).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: /Receiver Phone/i }));
    expect(onProgress).toHaveBeenLastCalledWith(80);
    expect(linkMeshes.every((l) => l.visible === true)).toBe(true);

    // Launch Packet button now visible
    const launchBtn = screen.getByRole("button", { name: /Launch Packet/i });
    fireEvent.click(launchBtn);
    expect(
      screen.getByText("Message packet traveling across Agrabad corridor..."),
    ).toBeInTheDocument();

    // Advance packet frame updater to verify camera-follow updates and final delivery
    act(() => {
      harnessCapture.frameUpdater?.(2.0, 2.0); // ~48% of journey
    });
    expect(harnessCapture.cameraGoals.length).toBeGreaterThan(0);
    expect(harnessCapture.cameraGoals[0]?.pos).not.toBeNull();
    expect(harnessCapture.cameraGoals[0]?.target).not.toBeNull();
    expect(onComplete).not.toHaveBeenCalled();

    act(() => {
      harnessCapture.frameUpdater?.(3.0, 5.0); // finishes journey (>= 1.0)
    });

    expect(harnessCapture.cameraGoals.at(-1)?.pos).toBeNull();
    expect(onProgress).toHaveBeenLastCalledWith(100);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Delivered!")).toBeInTheDocument();
  });
});
