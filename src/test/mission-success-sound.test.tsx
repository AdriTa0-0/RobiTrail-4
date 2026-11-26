import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";

const mockEngineProps = vi.hoisted(() => ({
  onComplete: null as (() => void) | null,
}));

vi.mock("@/robi/components/game/DhakaTrails", () => ({
  DhakaTrailEngine: (props: { onComplete: () => void }) => {
    mockEngineProps.onComplete = props.onComplete;
    return (
      <button type="button" onClick={props.onComplete}>
        Complete Mock Mission
      </button>
    );
  },
}));

vi.mock("@/robi/components/game/ChattogramTrails", () => ({
  ChattogramTrailEngine: (props: { onComplete: () => void }) => {
    mockEngineProps.onComplete = props.onComplete;
    return (
      <button type="button" onClick={props.onComplete}>
        Complete Mock Mission
      </button>
    );
  },
}));

vi.mock("@/robi/components/game/SylhetTrailsPart1", () => ({
  SylhetTrailsPart1: (props: { onComplete: () => void }) => {
    mockEngineProps.onComplete = props.onComplete;
    return <div />;
  },
}));

vi.mock("@/robi/components/game/SylhetTrailsPart2", () => ({
  SylhetTrailsPart2: (props: { onComplete: () => void }) => {
    mockEngineProps.onComplete = props.onComplete;
    return <div />;
  },
}));

import {
  ambientSynth,
  SUCCESS_CHIME_AUDIO_SRC,
  SUCCESS_CHIME_VOLUME,
} from "@/robi/services/audio/ambientSynth";
import { RobiTrailProvider, useRobiTrail } from "@/robi/context/RobiTrailContext";
import { RouterProvider } from "@/robi/router/RouterContext";
import { GameArenaPage } from "@/robi/components/pages/GameArenaPage";
import { MissionShell } from "@/robi/components/game/MissionShell";

interface MockAudioInstance {
  src: string;
  preload: string;
  volume: number;
  currentTime: number;
  play: ReturnType<typeof vi.fn>;
  pause: ReturnType<typeof vi.fn>;
}

const ShellTrigger: React.FC = () => {
  const { openTrail, setSoundEnabled } = useRobiTrail();
  return (
    <div>
      <button type="button" onClick={() => setSoundEnabled(true)}>
        Enable Sound
      </button>
      <button type="button" onClick={() => openTrail("dhk-1")}>
        Open Trail Modal
      </button>
    </div>
  );
};

describe("Mission completion vibraphone success sound", () => {
  let createdAudio: MockAudioInstance[];
  let nextPlayReject: boolean;

  beforeEach(() => {
    localStorage.clear();
    mockEngineProps.onComplete = null;
    createdAudio = [];
    nextPlayReject = false;

    // Reset private cached element cleanly between tests
    (ambientSynth as unknown as { successAudio: HTMLAudioElement | null }).successAudio = null;

    class MockAudio {
      public src: string;
      public preload = "";
      public volume = 1;
      public currentTime = 4.2;
      public play = vi.fn(() => {
        if (nextPlayReject) {
          return Promise.reject(new Error("Autoplay blocked"));
        }
        return Promise.resolve();
      });
      public pause = vi.fn();

      constructor(src: string) {
        this.src = src;
        createdAudio.push(this);
      }
    }

    vi.stubGlobal("Audio", MockAudio);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not play the vibraphone audio when sound is muted", () => {
    ambientSynth.playSuccessChime(false);
    expect(createdAudio).toHaveLength(0);
  });

  it("plays the attached vibraphone MP3 at gentle soft volume and rewinds on replay", async () => {
    expect(SUCCESS_CHIME_AUDIO_SRC).toBe(
      "/assets/aistudio/chisper-success-vibraphone-triad-638320_7c83ea58.mp3",
    );
    expect(SUCCESS_CHIME_VOLUME).toBeLessThanOrEqual(0.35);
    expect(SUCCESS_CHIME_VOLUME).toBeGreaterThan(0);

    ambientSynth.playSuccessChime(true);

    expect(createdAudio).toHaveLength(1);
    const instance = createdAudio[0];
    expect(instance.src).toBe(SUCCESS_CHIME_AUDIO_SRC);
    expect(instance.preload).toBe("auto");
    expect(instance.volume).toBe(SUCCESS_CHIME_VOLUME);
    expect(instance.currentTime).toBe(0);
    expect(instance.play).toHaveBeenCalledTimes(1);

    // Simulate playback having progressed, then trigger another completion
    instance.currentTime = 1.7;
    ambientSynth.playSuccessChime(true);

    expect(createdAudio).toHaveLength(1);
    expect(instance.currentTime).toBe(0);
    expect(instance.play).toHaveBeenCalledTimes(2);

    // Safely handles rejected play() promises and stopAmbient() cleanup
    nextPlayReject = true;
    expect(() => ambientSynth.playSuccessChime(true)).not.toThrow();
    await Promise.resolve();

    ambientSynth.stopAmbient();
    expect(instance.pause).toHaveBeenCalledTimes(1);
    expect(instance.currentTime).toBe(0);
  });

  it("respects the sound toggle inside GameArenaPage when completing any mission", () => {
    render(
      <RouterProvider>
        <RobiTrailProvider>
          <GameArenaPage cityId="dhaka" gameId="dhk-1" />
        </RobiTrailProvider>
      </RouterProvider>,
    );

    // Default muted: completing should NOT play audio
    fireEvent.click(screen.getByRole("button", { name: "Complete Mock Mission" }));
    expect(screen.getByText("Mission Accomplished!")).toBeInTheDocument();
    expect(createdAudio).toHaveLength(0);

    // Restart, toggle sound ON, then complete
    fireEvent.click(screen.getByRole("button", { name: /Restart/i }));
    fireEvent.click(screen.getByRole("button", { name: "Toggle sound" }));
    fireEvent.click(screen.getByRole("button", { name: "Complete Mock Mission" }));

    expect(createdAudio).toHaveLength(1);
    expect(createdAudio[0].play).toHaveBeenCalledTimes(1);

    // Duplicate onComplete calls inside the same completed run should not re-trigger the chime
    act(() => {
      mockEngineProps.onComplete?.();
    });
    expect(createdAudio[0].play).toHaveBeenCalledTimes(1);
  });

  it("plays the vibraphone chime in MissionShell when sound is enabled", () => {
    render(
      <RouterProvider>
        <RobiTrailProvider>
          <ShellTrigger />
          <MissionShell onNavigateToTokens={() => {}} />
        </RobiTrailProvider>
      </RouterProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Enable Sound" }));
    fireEvent.click(screen.getByRole("button", { name: "Open Trail Modal" }));
    fireEvent.click(screen.getByRole("button", { name: "Complete Mock Mission" }));

    expect(screen.getByText("Mission Accomplished!")).toBeInTheDocument();
    expect(createdAudio).toHaveLength(1);
    expect(createdAudio[0].src).toBe(SUCCESS_CHIME_AUDIO_SRC);
    expect(createdAudio[0].play).toHaveBeenCalledTimes(1);
  });
});
