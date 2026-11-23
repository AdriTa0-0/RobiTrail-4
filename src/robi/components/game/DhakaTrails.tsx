import React from "react";
import type { TrailEngineProps } from "./MissionShell";
import {
  DhakaGame1DataDetective3D,
  DhakaGame2ConnectedEveryday3D,
  DhakaGame4BusyNetwork3D,
  DhakaGame5MessageOrInternet3D,
} from "./dhaka/Dhaka3DScenes";
import { DhakaSpeedDataLab } from "./dhaka/DhakaSpeedDataLab";

export const DhakaTrailEngine: React.FC<TrailEngineProps> = ({
  trailId,
  paused,
  hintLevel,
  onProgress,
  onComplete,
  onMistake,
}) => {
  if (trailId === "dhk-1") {
    return (
      <DhakaGame1DataDetective3D
        paused={paused}
        hintLevel={hintLevel}
        onProgress={onProgress}
        onComplete={onComplete}
      />
    );
  }
  if (trailId === "dhk-2") {
    return (
      <DhakaGame2ConnectedEveryday3D
        paused={paused}
        hintLevel={hintLevel}
        onProgress={onProgress}
        onComplete={onComplete}
        onMistake={onMistake}
      />
    );
  }
  if (trailId === "dhk-3") {
    return (
      <DhakaSpeedDataLab
        paused={paused}
        hintLevel={hintLevel}
        onProgress={onProgress}
        onComplete={onComplete}
        onMistake={onMistake}
      />
    );
  }
  if (trailId === "dhk-4") {
    return (
      <DhakaGame4BusyNetwork3D
        paused={paused}
        hintLevel={hintLevel}
        onProgress={onProgress}
        onComplete={onComplete}
      />
    );
  }
  return (
    <DhakaGame5MessageOrInternet3D
      paused={paused}
      hintLevel={hintLevel}
      onProgress={onProgress}
      onComplete={onComplete}
      onMistake={onMistake}
    />
  );
};
