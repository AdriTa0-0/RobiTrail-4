import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HarbourLoseModal } from "@/robi/components/game/chattogram3d/HarbourLoseModal";
import {
  computeHarbourProgressPct,
  computeHarbourSpeed,
  detectHarbourHazardCollision,
  getChancesRemainingAfterRetry,
  HARBOUR_BOOST_RING_POSITIONS,
  HARBOUR_CRANE_Z_POSITIONS,
  HARBOUR_DECK_CENTER_Z,
  HARBOUR_DECK_LENGTH,
  HARBOUR_DISTANCE_MARKERS,
  HARBOUR_FINISH_Z,
  HARBOUR_GATEWAY_Z,
  HARBOUR_INTERFERENCE_ZONES,
  HARBOUR_LORRY_CONFIGS,
  HARBOUR_MAX_RETRY_CHANCES,
  HARBOUR_PRACTICE_RING_POS,
  HARBOUR_START_Z,
  HARBOUR_STATIC_CONTAINER_PLACEMENTS,
  HARBOUR_STEER_LIMIT_X,
  HARBOUR_TOTAL_DISTANCE_M,
  HARBOUR_WORLD_BOUNDS,
  type HarbourCraneBox,
  type HarbourObstacleBox,
} from "@/robi/components/game/chattogram3d/harbourChaseLogic";

describe("Harbour Packet Chase collision & retry chances", () => {
  const obstacles: HarbourObstacleBox[] = [
    { x: -4.8, z: 44, halfW: 1.45, halfD: 2.35, kind: "container" },
    { x: 0, z: 16, halfW: 1.35, halfD: 2.9, kind: "truck" },
  ];
  const cranes: HarbourCraneBox[] = [{ x: 1.5, z: 4 }];

  it("detects truck, container block, and crane hook collisions immediately", () => {
    expect(detectHarbourHazardCollision(-4.6, 43.5, obstacles, cranes)).toBe("container");
    expect(detectHarbourHazardCollision(0.2, 16.0, obstacles, cranes)).toBe("truck");
    expect(detectHarbourHazardCollision(1.8, 4.2, obstacles, cranes)).toBe("crane");
    expect(detectHarbourHazardCollision(5.5, 60.0, obstacles, cranes)).toBeNull();
  });

  it("computes consistent 240m route progress from start to relocated gateway", () => {
    expect(HARBOUR_TOTAL_DISTANCE_M).toBe(240);
    expect(computeHarbourProgressPct(HARBOUR_START_Z)).toBe(0);
    expect(computeHarbourProgressPct(HARBOUR_START_Z - 120)).toBe(50);
    expect(computeHarbourProgressPct(HARBOUR_FINISH_Z + 1)).toBeLessThan(100);
    expect(computeHarbourProgressPct(HARBOUR_FINISH_Z)).toBe(100);
  });

  it("smoothly ramps speed upward as distance increases", () => {
    const startSpeed = computeHarbourSpeed(0, {
      tutorialActive: false,
      boostActive: false,
      inputBoost: false,
      inputBrake: false,
    });
    const midSpeed = computeHarbourSpeed(50, {
      tutorialActive: false,
      boostActive: false,
      inputBoost: false,
      inputBrake: false,
    });
    const endSpeed = computeHarbourSpeed(100, {
      tutorialActive: false,
      boostActive: false,
      inputBoost: false,
      inputBrake: false,
    });
    expect(midSpeed).toBeGreaterThan(startSpeed);
    expect(endSpeed).toBeGreaterThan(midSpeed);
  });

  it("keeps all six boost rings, obstacles, cranes, interference zones, and gateway within bounds with wide dodging gaps", () => {
    const deckMinZ = HARBOUR_DECK_CENTER_Z - HARBOUR_DECK_LENGTH / 2;
    const deckMaxZ = HARBOUR_DECK_CENTER_Z + HARBOUR_DECK_LENGTH / 2;

    expect(HARBOUR_BOOST_RING_POSITIONS).toHaveLength(6);
    expect(HARBOUR_GATEWAY_Z).toBeGreaterThan(deckMinZ);
    expect(HARBOUR_START_Z).toBeLessThan(deckMaxZ);
    expect(HARBOUR_PRACTICE_RING_POS.z).toBe(60);

    for (const [rx, rz] of HARBOUR_BOOST_RING_POSITIONS) {
      expect(rx).toBeGreaterThanOrEqual(HARBOUR_WORLD_BOUNDS.minX);
      expect(rx).toBeLessThanOrEqual(HARBOUR_WORLD_BOUNDS.maxX);
      expect(rz).toBeGreaterThan(HARBOUR_FINISH_Z);
      expect(rz).toBeLessThan(HARBOUR_START_Z);
    }

    for (const [ox, oz] of HARBOUR_STATIC_CONTAINER_PLACEMENTS) {
      expect(ox).toBeGreaterThanOrEqual(HARBOUR_WORLD_BOUNDS.minX);
      expect(ox).toBeLessThanOrEqual(HARBOUR_WORLD_BOUNDS.maxX);
      expect(oz).toBeGreaterThan(HARBOUR_FINISH_Z);
      expect(oz).toBeLessThan(HARBOUR_START_Z);
      // Every static container maintains >= 15m Z-gap from every patrolling lorry
      for (const lorry of HARBOUR_LORRY_CONFIGS) {
        expect(Math.abs(oz - lorry.z)).toBeGreaterThanOrEqual(15);
      }
    }

    for (const lorry of HARBOUR_LORRY_CONFIGS) {
      expect(lorry.amp).toBeLessThan(HARBOUR_WORLD_BOUNDS.maxX);
      // Even at extreme lateral sweep, at least 2m clear side lane remains within steer limits
      expect(HARBOUR_STEER_LIMIT_X - (lorry.amp + 1.35)).toBeGreaterThanOrEqual(2.0);
      expect(lorry.z).toBeGreaterThan(HARBOUR_FINISH_Z);
      expect(lorry.z).toBeLessThan(HARBOUR_START_Z);
    }

    for (const cz of HARBOUR_CRANE_Z_POSITIONS) {
      expect(cz).toBeGreaterThan(HARBOUR_FINISH_Z);
      expect(cz).toBeLessThan(HARBOUR_START_Z);
    }

    for (const [ix, iz] of HARBOUR_INTERFERENCE_ZONES) {
      expect(ix).toBeGreaterThanOrEqual(HARBOUR_WORLD_BOUNDS.minX);
      expect(ix).toBeLessThanOrEqual(HARBOUR_WORLD_BOUNDS.maxX);
      expect(iz).toBeGreaterThan(HARBOUR_FINISH_Z);
      expect(iz).toBeLessThan(HARBOUR_START_Z);
    }

    for (const marker of HARBOUR_DISTANCE_MARKERS) {
      expect(marker.z).toBeGreaterThan(HARBOUR_FINISH_Z);
      expect(marker.z).toBeLessThan(HARBOUR_START_Z);
    }
  });

  it("starts with 2 retry chances and decrements down to 0", () => {
    expect(HARBOUR_MAX_RETRY_CHANCES).toBe(2);
    expect(getChancesRemainingAfterRetry(2)).toBe(1);
    expect(getChancesRemainingAfterRetry(1)).toBe(0);
    expect(getChancesRemainingAfterRetry(0)).toBe(0);
  });

  it("renders lose modal showing 2 chances left with Retry and City Games buttons on first clash", () => {
    const onRetry = vi.fn();
    const onRestartGame = vi.fn();
    const onExitToCity = vi.fn();

    render(
      <HarbourLoseModal
        lang="en"
        chancesLeft={2}
        crashCause="truck"
        onRetry={onRetry}
        onRestartGame={onRestartGame}
        onExitToCity={onExitToCity}
      />,
    );

    expect(screen.getByText("#3 · Harbour Packet Chase")).toBeInTheDocument();
    expect(screen.getByText("You Lost the Game!")).toBeInTheDocument();
    expect(screen.getByText("You have 2 chances left.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRestartGame).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "City Games" }));
    expect(onExitToCity).toHaveBeenCalledTimes(1);
  });

  it("shows 1 chance left on second clash and offers Restart Game + City Games at 0 chances left", () => {
    const onRetry = vi.fn();
    const onRestartGame = vi.fn();
    const onExitToCity = vi.fn();

    const { rerender } = render(
      <HarbourLoseModal
        lang="en"
        chancesLeft={1}
        crashCause="container"
        onRetry={onRetry}
        onRestartGame={onRestartGame}
        onExitToCity={onExitToCity}
      />,
    );

    expect(screen.getByText("You have 1 chance left.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();

    rerender(
      <HarbourLoseModal
        lang="en"
        chancesLeft={0}
        crashCause="crane"
        onRetry={onRetry}
        onRestartGame={onRestartGame}
        onExitToCity={onExitToCity}
      />,
    );

    expect(screen.getByText("You have 0 chances left.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Restart Game" }));
    expect(onRestartGame).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "City Games" }));
    expect(onExitToCity).toHaveBeenCalledTimes(1);
  });
});
