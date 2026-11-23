import React from "react";
import type { TrailEngineProps } from "./MissionShell";
import { Game1MessageJourney3D } from "./chattogram3d/Game1MessageJourney3D";
import { Game2FindSignal3D } from "./chattogram3d/Game2FindSignal3D";
import { Game3ConnectionRescue3D } from "./chattogram3d/Game3ConnectionRescue3D";
import { Game4MessageJourney3D } from "./chattogram3d/Game4MessageJourney3D";

export const ChattogramTrailEngine: React.FC<TrailEngineProps> = ({
  trailId,
  paused,
  hintLevel,
  onProgress,
  onComplete,
  onMistake,
}) => {
  void hintLevel;
  if (trailId === "ctg-1") {
    return (
      <Game1MessageJourney3D
        paused={paused}
        onProgress={onProgress}
        onComplete={onComplete}
        onMistake={onMistake}
      />
    );
  }
  if (trailId === "ctg-2") {
    return <Game2FindSignal3D paused={paused} onProgress={onProgress} onComplete={onComplete} />;
  }
  if (trailId === "ctg-3") {
    return (
      <Game3ConnectionRescue3D paused={paused} onProgress={onProgress} onComplete={onComplete} />
    );
  }
  return <Game4MessageJourney3D paused={paused} onProgress={onProgress} onComplete={onComplete} />;
};
