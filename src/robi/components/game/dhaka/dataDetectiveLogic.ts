export type DataDetectiveStationId = "phone" | "monitor" | "router" | "tv";

export type VideoQuality = "1080p" | "480p" | "360p";
export type QosMode = "unrestricted" | "study";
export type WifiBand = "2.4ghz" | "5ghz";
export type TvSource = "hotspot" | "fiber";

export interface DataDetectiveState {
  auditedStations: DataDetectiveStationId[];
  videoRes: VideoQuality;
  hotspotTether: boolean;
  autoPlay: boolean;
  qosMode: QosMode;
  studyClassActive: boolean;
  wifiBand: WifiBand;
  cloudSync: boolean;
  bgUpdates: boolean;
  tvSource: TvSource;
  tvAmbientLoop: boolean;
}

export interface DataDetectiveMetrics {
  totalMb: number;
  studyMbps: number;
  auditedCount: number;
  allAudited: boolean;
  underDataCap: boolean;
  meetsSpeedTarget: boolean;
  studyLinkValid: boolean;
  canVerify: boolean;
  progressPercent: number;
  stationReady: Record<DataDetectiveStationId, boolean>;
}

export const DATA_BUDGET_CAP_MB = 350;
export const STUDY_SPEED_GOAL_MBPS = 12;
export const ALL_STATION_IDS: DataDetectiveStationId[] = ["phone", "monitor", "router", "tv"];

export function createInitialDataDetectiveState(): DataDetectiveState {
  return {
    auditedStations: [],
    videoRes: "1080p",
    hotspotTether: true,
    autoPlay: true,
    qosMode: "unrestricted",
    studyClassActive: true,
    wifiBand: "2.4ghz",
    cloudSync: true,
    bgUpdates: true,
    tvSource: "hotspot",
    tvAmbientLoop: true,
  };
}

export function getVideoDailyMb(videoRes: VideoQuality): number {
  if (videoRes === "1080p") return 260;
  if (videoRes === "480p") return 140;
  return 85;
}

export function evaluateDataDetective(state: DataDetectiveState): DataDetectiveMetrics {
  const videoMb = getVideoDailyMb(state.videoRes);
  const hotspotMb = state.hotspotTether ? 160 : 0;
  const autoPlayMb = state.autoPlay ? 190 : 0;
  const qosOverheadMb = state.qosMode === "unrestricted" ? 140 : 0;
  const studyClassMb = state.studyClassActive ? 130 : 0;
  const cloudSyncMb = state.cloudSync ? 130 : 0;
  const bgUpdatesMb = state.bgUpdates ? 100 : 0;
  const tvHotspotMb = state.tvSource === "hotspot" ? 220 : 0;
  const tvAmbientMb = state.tvAmbientLoop ? 110 : 0;

  const totalMb =
    videoMb +
    hotspotMb +
    autoPlayMb +
    qosOverheadMb +
    studyClassMb +
    cloudSyncMb +
    bgUpdatesMb +
    tvHotspotMb +
    tvAmbientMb;

  const baseBandMbps = state.wifiBand === "5ghz" ? 11 : 5;
  const qosBoost = state.qosMode === "study" ? 5 : -4;
  const hotspotDrag = state.hotspotTether ? -4 : 0;
  const tvHotspotDrag = state.tvSource === "hotspot" ? -3 : 0;
  const syncDrag = state.cloudSync ? -1 : 0;
  const studyMbps = Math.max(2, baseBandMbps + qosBoost + hotspotDrag + tvHotspotDrag + syncDrag);

  const auditedSet = new Set(state.auditedStations);
  const auditedCount = ALL_STATION_IDS.filter((id) => auditedSet.has(id)).length;
  const allAudited = auditedCount === ALL_STATION_IDS.length;
  const underDataCap = totalMb <= DATA_BUDGET_CAP_MB;
  const meetsSpeedTarget = studyMbps >= STUDY_SPEED_GOAL_MBPS;
  const studyLinkValid = state.studyClassActive;
  const canVerify = allAudited && underDataCap && meetsSpeedTarget && studyLinkValid;

  const auditRatio = auditedCount / ALL_STATION_IDS.length;
  const dataRatio = Math.max(0, Math.min(1, (1440 - totalMb) / (1440 - DATA_BUDGET_CAP_MB)));
  const speedRatio = Math.max(0, Math.min(1, (studyMbps - 2) / (STUDY_SPEED_GOAL_MBPS - 2)));
  const progressPercent = Math.min(
    95,
    Math.max(
      10,
      Math.round(auditRatio * 35 + dataRatio * 35 + speedRatio * 20 + (canVerify ? 5 : 0)),
    ),
  );

  const stationReady: Record<DataDetectiveStationId, boolean> = {
    phone: auditedSet.has("phone") && state.videoRes !== "1080p" && !state.hotspotTether,
    monitor:
      auditedSet.has("monitor") &&
      !state.autoPlay &&
      state.qosMode === "study" &&
      state.studyClassActive,
    router:
      auditedSet.has("router") && state.wifiBand === "5ghz" && !state.cloudSync && !state.bgUpdates,
    tv: auditedSet.has("tv") && state.tvSource === "fiber" && !state.tvAmbientLoop,
  };

  return {
    totalMb,
    studyMbps,
    auditedCount,
    allAudited,
    underDataCap,
    meetsSpeedTarget,
    studyLinkValid,
    canVerify,
    progressPercent,
    stationReady,
  };
}
