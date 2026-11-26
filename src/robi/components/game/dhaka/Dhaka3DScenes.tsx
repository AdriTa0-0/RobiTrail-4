import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useRobiTrail } from "../../../context/RobiTrailContext";
import {
  ThreeMissionHarness,
  type HarnessApi,
  type InteractiveStation,
  type ObstacleBox,
} from "../chattogram3d/ThreeMissionHarness";
import {
  CheckCircle2,
  Smartphone,
  Radio,
  Server,
  Wifi,
  AlertTriangle,
  Tv,
  Gauge,
  Database,
  ShieldCheck,
} from "lucide-react";
import {
  createInitialDataDetectiveState,
  DATA_BUDGET_CAP_MB,
  evaluateDataDetective,
  getVideoDailyMb,
  STUDY_SPEED_GOAL_MBPS,
  type DataDetectiveState,
  type DataDetectiveStationId,
} from "./dataDetectiveLogic";
import { buildDhakaApartmentScene, type ApartmentRigHandles } from "./dhakaApartmentProps";

interface DhakaSceneProps {
  paused?: boolean;
  hintLevel?: number;
  onProgress: (pct: number) => void;
  onComplete: () => void;
  onMistake?: (actionKey: string) => void;
}

const _pulseLerpPos = new THREE.Vector3();

/* =========================================================================
   DHAKA TRAIL 1: DATA DETECTIVE (3D Dhaka Apartment Network & Speed Audit)
   ========================================================================= */
export const DhakaGame1DataDetective3D: React.FC<DhakaSceneProps> = ({
  paused,
  hintLevel = 0,
  onProgress,
  onComplete,
}) => {
  const { lang } = useRobiTrail();
  const [activeStation, setActiveStation] = useState<DataDetectiveStationId | null>(null);
  const [auditState, setAuditState] = useState<DataDetectiveState>(createInitialDataDetectiveState);
  const [verifyNotice, setVerifyNotice] = useState<string | null>(null);
  const [solved, setSolved] = useState(false);

  const rigRef = useRef<ApartmentRigHandles | null>(null);
  const metricsRef = useRef(evaluateDataDetective(auditState));
  const pausedRef = useRef(Boolean(paused));
  pausedRef.current = Boolean(paused);

  const onProgressRef = useRef(onProgress);
  const onCompleteRef = useRef(onComplete);
  onProgressRef.current = onProgress;
  onCompleteRef.current = onComplete;

  const metrics = useMemo(() => evaluateDataDetective(auditState), [auditState]);
  metricsRef.current = metrics;

  const handleOpenStation = useCallback((stationId: string) => {
    const id = stationId as DataDetectiveStationId;
    setActiveStation(id);
    setVerifyNotice(null);
    setAuditState((prev) =>
      prev.auditedStations.includes(id)
        ? prev
        : { ...prev, auditedStations: [...prev.auditedStations, id] },
    );
  }, []);

  useEffect(() => {
    if (!solved) onProgressRef.current(metrics.progressPercent);

    const rig = rigRef.current;
    if (!rig) return;

    const auditedSet = new Set(auditState.auditedStations);
    rig.stations.forEach((st) => {
      const id = st.id as DataDetectiveStationId;
      if (metrics.stationReady[id]) {
        st.state = "completed";
      } else if (activeStation === id) {
        st.state = "operating";
      } else if (auditedSet.has(id)) {
        st.state = "selected";
      } else if (hintLevel >= 2) {
        st.state = "highlighted";
      } else {
        st.state = "idle";
      }
    });

    const activeCount = Math.max(1, Math.ceil((metrics.totalMb / 1440) * rig.packetCubes.length));
    rig.packetCubes.forEach((cube, i) => {
      const mat = cube.material as THREE.MeshStandardMaterial;
      cube.visible = i < activeCount;
      const colorHex = metrics.underDataCap
        ? 0x10b981
        : metrics.totalMb <= 650
          ? 0xf59e0b
          : 0xf43f5e;
      mat.color.setHex(colorHex);
      mat.emissive.setHex(colorHex);
    });

    const routerClean =
      auditState.wifiBand === "5ghz" && !auditState.cloudSync && !auditState.bgUpdates;
    rig.routerLedMat.color.setHex(
      routerClean ? 0x10b981 : auditState.wifiBand === "5ghz" ? 0xf59e0b : 0xf43f5e,
    );
    rig.routerLedMat.emissive.setHex(
      routerClean ? 0x10b981 : auditState.wifiBand === "5ghz" ? 0xf59e0b : 0xf43f5e,
    );

    const tvClean = auditState.tvSource === "fiber";
    rig.tvHotspotLedMat.color.setHex(tvClean ? 0x10b981 : 0xf43f5e);
    rig.tvHotspotLedMat.emissive.setHex(tvClean ? 0x10b981 : 0xf43f5e);

    rig.fiberPulses.forEach((p) => {
      const mat = p.mesh.material as THREE.MeshStandardMaterial;
      const hex = metrics.meetsSpeedTarget ? 0x10b981 : 0xf59e0b;
      mat.color.setHex(hex);
      mat.emissive.setHex(hex);
    });
  }, [auditState, metrics, activeStation, hintLevel, solved]);

  const handleSceneReady = useCallback((api: HarnessApi) => {
    const rig = buildDhakaApartmentScene(api.scene);
    rigRef.current = rig;
    api.registerObstacles(rig.obstacles);
    api.registerStations(rig.stations);

    api.setFrameUpdater((dt, elapsed) => {
      if (pausedRef.current) return;
      rig.fanBladeGroup.rotation.y += dt * 3.1;

      rig.packetCubes.forEach((c, idx) => {
        c.rotation.y = elapsed * 1.4 + idx * 0.4;
        c.position.y = 3.05 + Math.sin(elapsed * 2.2 + idx) * 0.18;
      });

      const speedFactor = 0.25 + (metricsRef.current.studyMbps / 16) * 1.15;
      rig.fiberPulses.forEach((p) => {
        const t = (elapsed * speedFactor + p.phase) % 1;
        _pulseLerpPos.lerpVectors(p.start, p.end, t);
        _pulseLerpPos.y += Math.sin(t * Math.PI) * 0.55;
        p.mesh.position.copy(_pulseLerpPos);
      });
    });

    return () => {
      rigRef.current = null;
      rig.dispose();
    };
  }, []);

  const handleVerifyPlan = () => {
    if (!metrics.studyLinkValid) {
      setVerifyNotice(
        lang === "en"
          ? "Keep Essential Live Class & Study PDFs active at the Telemetry Workstation!"
          : "টেলিমেট্রি ওয়ার্কস্টেশনে জরুরি লাইভ ক্লাস ও স্টাডি পিডিএফ অবশ্যই চালু রাখুন!",
      );
      return;
    }
    if (!metrics.allAudited) {
      setVerifyNotice(
        lang === "en"
          ? `Inspect all 4 apartment stations first (${metrics.auditedCount}/4 audited).`
          : `প্রথমে বাসার ৪টি স্টেশনই পরীক্ষা করুন (${metrics.auditedCount}/৪টি সম্পন্ন)।`,
      );
      return;
    }
    if (!metrics.underDataCap || !metrics.meetsSpeedTarget) {
      setVerifyNotice(
        lang === "en"
          ? `Reach ≤ ${DATA_BUDGET_CAP_MB} MB daily drain AND ≥ ${STUDY_SPEED_GOAL_MBPS} Mbps speed.`
          : `দৈনিক খরচ ≤ ${DATA_BUDGET_CAP_MB} MB এবং স্টাডি গতি ≥ ${STUDY_SPEED_GOAL_MBPS} Mbps অর্জন করুন।`,
      );
      return;
    }
    setSolved(true);
    setVerifyNotice(null);
    onProgressRef.current(100);
    onCompleteRef.current();
  };

  return (
    <div className="relative w-full h-[540px] sm:h-[600px]">
      <ThreeMissionHarness
        bounds={{ minX: -10.8, maxX: 10.8, minZ: -8.6, maxZ: 8.6 }}
        initialPlayerPos={[0, 0, 6.2]}
        initialCameraOffset={[0, 10.5, 13.8]}
        skyColor="#93c5fd"
        fogColor="#dbeafe"
        cityBackdrop="dhaka"
        paused={paused}
        onSceneReady={handleSceneReady}
        onStationInteract={handleOpenStation}
      />

      {/* Bottom Center Live Telemetry Dock (zero backdrop-filter over WebGL) */}
      <div className="pointer-events-auto absolute bottom-32 md:bottom-4 left-1/2 -translate-x-1/2 max-w-[calc(100%-1.5rem)] z-10 rounded-xl bg-slate-950/95 border border-white/15 px-3.5 sm:px-5 py-2.5 shadow-xl flex flex-wrap items-center justify-center gap-3 sm:gap-5 text-white">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-sky-400 shrink-0" />
          <div>
            <div className="text-[10px] font-mono text-slate-400">
              {lang === "en"
                ? `DATA DRAIN (≤ ${DATA_BUDGET_CAP_MB} MB)`
                : `ডেটা খরচ (≤ ${DATA_BUDGET_CAP_MB} MB)`}
            </div>
            <div
              className={`text-sm sm:text-base font-mono font-bold tabular-nums ${
                metrics.underDataCap ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {metrics.totalMb} MB
            </div>
          </div>
        </div>

        <div className="h-7 w-px bg-white/10 hidden sm:block" />

        <div className="flex items-center gap-2">
          <Gauge className="w-4 h-4 text-amber-400 shrink-0" />
          <div>
            <div className="text-[10px] font-mono text-slate-400">
              {lang === "en"
                ? `STUDY SPEED (≥ ${STUDY_SPEED_GOAL_MBPS} Mbps)`
                : `স্টাডি গতি (≥ ${STUDY_SPEED_GOAL_MBPS} Mbps)`}
            </div>
            <div
              className={`text-sm sm:text-base font-mono font-bold tabular-nums ${
                metrics.meetsSpeedTarget ? "text-emerald-400" : "text-amber-300"
              }`}
            >
              {metrics.studyMbps} Mbps
            </div>
          </div>
        </div>

        <div className="h-7 w-px bg-white/10 hidden sm:block" />

        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <div>
            <div className="text-[10px] font-mono text-slate-400">
              {lang === "en" ? "AUDIT CHECK" : "অডিট ধাপ"}
            </div>
            <div className="text-sm sm:text-base font-mono font-bold tabular-nums text-white">
              {metrics.auditedCount}/4
            </div>
          </div>
        </div>

        {!solved && (
          <button
            type="button"
            onClick={handleVerifyPlan}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
              metrics.canVerify
                ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                : "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10"
            }`}
          >
            {lang === "en" ? "Verify & Lock Plan" : "পরিকল্পনা যাচাই করুন"}
          </button>
        )}
      </div>

      {verifyNotice && (
        <div
          role="alert"
          className="absolute bottom-52 md:bottom-20 left-1/2 -translate-x-1/2 z-20 max-w-md w-[calc(100%-2rem)] rounded-xl bg-rose-950/95 border border-rose-400/50 px-3.5 py-2.5 text-xs font-medium text-rose-100 flex items-center gap-2 shadow-xl"
        >
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{verifyNotice}</span>
        </div>
      )}

      {/* Station Hardware Inspector Modal */}
      {activeStation && (
        <div className="absolute bottom-36 sm:bottom-24 left-3 right-3 sm:left-auto sm:right-4 sm:w-96 max-h-[50vh] overflow-y-auto z-30 rounded-2xl bg-slate-950/95 border border-white/20 p-4 shadow-2xl space-y-3 text-white">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div className="flex items-center gap-2 text-xs font-bold">
              {activeStation === "phone" && <Smartphone className="w-4 h-4 text-sky-400" />}
              {activeStation === "monitor" && <Server className="w-4 h-4 text-amber-400" />}
              {activeStation === "router" && <Wifi className="w-4 h-4 text-emerald-400" />}
              {activeStation === "tv" && <Tv className="w-4 h-4 text-rose-400" />}
              <span>
                {activeStation === "phone"
                  ? lang === "en"
                    ? "Desk Smartphone · Stream & Tether"
                    : "ডেস্ক স্মার্টফোন · স্ট্রিম ও হটস্পট"
                  : activeStation === "monitor"
                    ? lang === "en"
                      ? "Workstation · QoS & Study Link"
                      : "ওয়ার্কস্টেশন · QoS ও স্টাডি লিংক"
                    : activeStation === "router"
                      ? lang === "en"
                        ? "Wi-Fi Fiber Router · Band & Sync"
                        : "রাউটার · ব্যান্ড ও ব্যাকগ্রাউন্ড সিঙ্ক"
                      : lang === "en"
                        ? "Smart TV Corner · Uplink Audit"
                        : "স্মার্ট টিভি কর্নার · আপলিংক অডিট"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setActiveStation(null)}
              className="text-xs px-2 py-1 rounded bg-white/10 hover:bg-white/20 cursor-pointer"
            >
              {lang === "en" ? "Close" : "বন্ধ"}
            </button>
          </div>

          {activeStation === "phone" && (
            <div className="space-y-3">
              <div>
                <div className="text-[11px] font-semibold text-slate-300 mb-1.5">
                  {lang === "en" ? "Mobile Video Resolution" : "মোবাইল ভিডিও রেজোলিউশন"}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(["1080p", "480p", "360p"] as const).map((res) => (
                    <button
                      key={res}
                      type="button"
                      onClick={() => setAuditState((p) => ({ ...p, videoRes: res }))}
                      className={`py-2 rounded-lg text-xs font-mono font-bold border cursor-pointer ${
                        auditState.videoRes === res
                          ? "bg-rose-600 border-rose-500 text-white"
                          : "bg-slate-900 border-slate-700 text-slate-300"
                      }`}
                    >
                      {res} ({getVideoDailyMb(res)} MB)
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-700">
                <div>
                  <div className="text-xs font-bold">
                    {lang === "en" ? "Phone Mobile Hotspot Tether" : "মোবাইল হটস্পট শেয়ারিং"}
                  </div>
                  <div className="text-[11px] font-mono text-amber-300">
                    +160 MB · -4 Mbps speed drag
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAuditState((p) => ({ ...p, hotspotTether: !p.hotspotTether }))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                    auditState.hotspotTether
                      ? "bg-rose-600 text-white"
                      : "bg-emerald-600 text-white"
                  }`}
                >
                  {auditState.hotspotTether
                    ? lang === "en"
                      ? "Disable"
                      : "বন্ধ করুন"
                    : lang === "en"
                      ? "Off ✓"
                      : "বন্ধ ✓"}
                </button>
              </div>
            </div>
          )}

          {activeStation === "monitor" && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-700">
                <div>
                  <div className="text-xs font-bold">
                    {lang === "en" ? "Feed Video Autoplay" : "ফিড ভিডিও অটোপ্লে"}
                  </div>
                  <div className="text-[11px] font-mono text-amber-300">+190 MB / day</div>
                </div>
                <button
                  type="button"
                  onClick={() => setAuditState((p) => ({ ...p, autoPlay: !p.autoPlay }))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                    auditState.autoPlay ? "bg-rose-600 text-white" : "bg-emerald-600 text-white"
                  }`}
                >
                  {auditState.autoPlay
                    ? lang === "en"
                      ? "Pause"
                      : "বন্ধ করুন"
                    : lang === "en"
                      ? "Paused ✓"
                      : "বন্ধ ✓"}
                </button>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-700">
                <div>
                  <div className="text-xs font-bold">
                    {lang === "en" ? "Traffic Shaping (QoS)" : "ট্র্যাফিক প্রায়োরিটি (QoS)"}
                  </div>
                  <div className="text-[11px] font-mono text-sky-300">
                    {auditState.qosMode === "unrestricted"
                      ? "Game preloads (+140 MB · -4 Mbps)"
                      : "Study Priority (+0 MB · +5 Mbps)"}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setAuditState((p) => ({
                      ...p,
                      qosMode: p.qosMode === "unrestricted" ? "study" : "unrestricted",
                    }))
                  }
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                    auditState.qosMode === "study"
                      ? "bg-emerald-600 text-white"
                      : "bg-amber-600 text-white"
                  }`}
                >
                  {auditState.qosMode === "study"
                    ? lang === "en"
                      ? "Study QoS ✓"
                      : "স্টাডি মোড ✓"
                    : lang === "en"
                      ? "Set Study QoS"
                      : "স্টাডি মোড দিন"}
                </button>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-700">
                <div>
                  <div className="text-xs font-bold">
                    {lang === "en"
                      ? "Essential Live Class & Study PDFs"
                      : "জরুরি লাইভ ক্লাস ও স্টাডি পিডিএফ"}
                  </div>
                  <div className="text-[11px] font-mono text-emerald-300">
                    130 MB · Required Active
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setAuditState((p) => ({ ...p, studyClassActive: !p.studyClassActive }))
                  }
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                    auditState.studyClassActive
                      ? "bg-emerald-600 text-white"
                      : "bg-rose-600 text-white"
                  }`}
                >
                  {auditState.studyClassActive
                    ? lang === "en"
                      ? "Active ✓"
                      : "চালু ✓"
                    : lang === "en"
                      ? "Re-enable!"
                      : "চালু করুন!"}
                </button>
              </div>
            </div>
          )}

          {activeStation === "router" && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-700">
                <div>
                  <div className="text-xs font-bold">
                    {lang === "en" ? "Wi-Fi Radio Band" : "ওয়াই-ফাই রেডিও ব্যান্ড"}
                  </div>
                  <div className="text-[11px] font-mono text-sky-300">
                    {auditState.wifiBand === "2.4ghz"
                      ? "2.4 GHz Crowded (5 Mbps base)"
                      : "5 GHz Clean Channel (11 Mbps base)"}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setAuditState((p) => ({
                      ...p,
                      wifiBand: p.wifiBand === "2.4ghz" ? "5ghz" : "2.4ghz",
                    }))
                  }
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                    auditState.wifiBand === "5ghz"
                      ? "bg-emerald-600 text-white"
                      : "bg-amber-600 text-white"
                  }`}
                >
                  {auditState.wifiBand === "5ghz" ? "5 GHz ✓" : "Switch 5 GHz"}
                </button>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-700">
                <div>
                  <div className="text-xs font-bold">
                    {lang === "en" ? "Cellular Cloud Photo Sync" : "মোবাইল ক্লাউড ফটো সিঙ্ক"}
                  </div>
                  <div className="text-[11px] font-mono text-amber-300">+130 MB · -1 Mbps</div>
                </div>
                <button
                  type="button"
                  onClick={() => setAuditState((p) => ({ ...p, cloudSync: !p.cloudSync }))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                    auditState.cloudSync ? "bg-rose-600 text-white" : "bg-emerald-600 text-white"
                  }`}
                >
                  {auditState.cloudSync
                    ? lang === "en"
                      ? "Wi-Fi Only"
                      : "ওয়াই-ফাইয়ে নিন"
                    : lang === "en"
                      ? "Wi-Fi Only ✓"
                      : "সম্পন্ন ✓"}
                </button>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-700">
                <div>
                  <div className="text-xs font-bold">
                    {lang === "en" ? "Background OS & App Updates" : "ব্যাকগ্রাউন্ড অ্যাপ আপডেট"}
                  </div>
                  <div className="text-[11px] font-mono text-amber-300">+100 MB</div>
                </div>
                <button
                  type="button"
                  onClick={() => setAuditState((p) => ({ ...p, bgUpdates: !p.bgUpdates }))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                    auditState.bgUpdates ? "bg-rose-600 text-white" : "bg-emerald-600 text-white"
                  }`}
                >
                  {auditState.bgUpdates
                    ? lang === "en"
                      ? "Schedule Night"
                      : "রাতে শিডিউল"
                    : lang === "en"
                      ? "Scheduled ✓"
                      : "শিডিউলড ✓"}
                </button>
              </div>
            </div>
          )}

          {activeStation === "tv" && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-700">
                <div>
                  <div className="text-xs font-bold">
                    {lang === "en" ? "Smart TV Internet Source" : "স্মার্ট টিভি সংযোগ"}
                  </div>
                  <div className="text-[11px] font-mono text-amber-300">
                    {auditState.tvSource === "hotspot"
                      ? "Mobile Hotspot (+220 MB · -3 Mbps)"
                      : "Home Broadband Fiber (0 MB mobile)"}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setAuditState((p) => ({
                      ...p,
                      tvSource: p.tvSource === "hotspot" ? "fiber" : "hotspot",
                    }))
                  }
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                    auditState.tvSource === "fiber"
                      ? "bg-emerald-600 text-white"
                      : "bg-rose-600 text-white"
                  }`}
                >
                  {auditState.tvSource === "fiber"
                    ? lang === "en"
                      ? "Fiber Wi-Fi ✓"
                      : "ফাইবার ✓"
                    : lang === "en"
                      ? "Move to Fiber"
                      : "ফাইবারে নিন"}
                </button>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-700">
                <div>
                  <div className="text-xs font-bold">
                    {lang === "en" ? "4K Screensaver Live Loop" : "৪কে লাইভ স্ক্রিনসেভার"}
                  </div>
                  <div className="text-[11px] font-mono text-amber-300">+110 MB / day</div>
                </div>
                <button
                  type="button"
                  onClick={() => setAuditState((p) => ({ ...p, tvAmbientLoop: !p.tvAmbientLoop }))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                    auditState.tvAmbientLoop
                      ? "bg-rose-600 text-white"
                      : "bg-emerald-600 text-white"
                  }`}
                >
                  {auditState.tvAmbientLoop
                    ? lang === "en"
                      ? "Static Clock"
                      : "স্থির ঘড়ি দিন"
                    : lang === "en"
                      ? "Static Clock ✓"
                      : "সম্পন্ন ✓"}
                </button>
              </div>
            </div>
          )}

          {metrics.canVerify && !solved && (
            <button
              type="button"
              onClick={handleVerifyPlan}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {lang === "en"
                  ? `Confirm Audit (${metrics.totalMb} MB · ${metrics.studyMbps} Mbps)`
                  : `অডিট নিশ্চিত করুন (${metrics.totalMb} MB · ${metrics.studyMbps} Mbps)`}
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

/* =========================================================================
   DHAKA TRAIL 2: CONNECTED EVERYDAY (3D Hatirjheel Citizen Dispatch)
   ========================================================================= */
const CITIZEN_BOOTHS = [
  {
    id: "elderly",
    pos: [-8, 5] as const,
    name: { en: "Elderly Passenger (Offline)", bn: "প্রবীণ যাত্রী (ইন্টারনেট নেই)" },
    need: {
      en: "Wants to verify SIM account credit without mobile data.",
      bn: "মোবাইল ডেটা ছাড়াই অ্যাকাউন্ট ব্যালেন্স দেখতে চান।",
    },
    valid: ["ussd"],
  },
  {
    id: "worker",
    pos: [8, 5] as const,
    name: { en: "Delivery Rider", bn: "ডেলিভারি রাইডার" },
    need: {
      en: "Needs instant arrival ping while cycling through busy traffic.",
      bn: "ব্যস্ত রাস্তায় ছোট একটি পৌঁছানোর বার্তা পাঠাতে চান।",
    },
    valid: ["sms"],
  },
  {
    id: "clinic",
    pos: [-8, -5] as const,
    name: { en: "Community Health Aide", bn: "স্বাস্থ্যকর্মী" },
    need: {
      en: "Needs immediate two-way speech confirmation from clinic.",
      bn: "ক্লিনিকের সাথে সরাসরি দুই-দিকের কথা বলা জরুরি।",
    },
    valid: ["voice"],
  },
  {
    id: "student",
    pos: [8, -5] as const,
    name: { en: "Mirpur College Student", bn: "মিরপুরের শিক্ষার্থী" },
    need: {
      en: "Joining an interactive live afternoon science lecture.",
      bn: "বিকেলের লাইভ বিজ্ঞান ক্লাসে যুক্ত হতে চান।",
    },
    valid: ["video"],
  },
];

export const DhakaGame2ConnectedEveryday3D: React.FC<DhakaSceneProps> = ({
  paused,
  hintLevel = 0,
  onProgress,
  onComplete,
  onMistake,
}) => {
  const { lang } = useRobiTrail();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dispatched, setDispatched] = useState<Record<string, boolean>>({});
  const [errorMsg, setErrorMsg] = useState<string>("");

  const stationsRef = useRef<InteractiveStation[]>([]);
  const beamsRef = useRef<Record<string, THREE.Mesh>>({});
  const onProgressRef = useRef(onProgress);
  const onCompleteRef = useRef(onComplete);
  onProgressRef.current = onProgress;
  onCompleteRef.current = onComplete;

  useEffect(() => {
    stationsRef.current.forEach((st) => {
      const done = Boolean(dispatched[st.id]);
      st.state = done ? "completed" : hintLevel >= 2 ? "highlighted" : "idle";
      if (beamsRef.current[st.id]) {
        const mat = beamsRef.current[st.id].material as THREE.MeshBasicMaterial;
        mat.color.set(done ? "#22c55e" : "#ef4444");
        mat.opacity = done ? 0.9 : 0.2;
      }
    });
  }, [dispatched, hintLevel]);

  const handleSceneReady = useCallback((api: HarnessApi) => {
    const { scene } = api;

    // Hatirjheel plaza central tower
    const tower = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.7, 7.5, 8),
      new THREE.MeshStandardMaterial({ color: "#e2e8f0", metalness: 0.45, roughness: 0.4 }),
    );
    tower.position.set(0, 3.75, 0);
    tower.castShadow = true;
    scene.add(tower);

    // Plaza decorative planters as obstacles
    const planterPositions: [number, number][] = [
      [-3.5, 0],
      [3.5, 0],
    ];
    const obstacles: ObstacleBox[] = [
      {
        minX: -0.8,
        maxX: 0.8,
        minZ: -0.8,
        maxZ: 0.8,
        maxY: 7.5,
        label: { en: "Plaza Signal Tower", bn: "প্লাজা সিগন্যাল টাওয়ার" },
      },
    ];
    planterPositions.forEach(([px, pz]) => {
      const planter = new THREE.Mesh(
        new THREE.BoxGeometry(2.2, 1.2, 2.2),
        new THREE.MeshStandardMaterial({ color: "#15803d", roughness: 0.85 }),
      );
      planter.position.set(px, 0.6, pz);
      planter.castShadow = true;
      scene.add(planter);
      obstacles.push({
        minX: px - 1.2,
        maxX: px + 1.2,
        minZ: pz - 1.2,
        maxZ: pz + 1.2,
        maxY: 1.4,
        label: { en: "Plaza Planter", bn: "বাগান বেদি" },
      });
    });

    const stations: InteractiveStation[] = [];
    const beams: Record<string, THREE.Mesh> = {};

    CITIZEN_BOOTHS.forEach((b) => {
      const kiosk = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 2.0, 1.5),
        new THREE.MeshStandardMaterial({ color: "#334155", roughness: 0.6 }),
      );
      kiosk.position.set(b.pos[0], 1.0, b.pos[1]);
      kiosk.castShadow = true;
      scene.add(kiosk);

      obstacles.push({
        minX: b.pos[0] - 0.8,
        maxX: b.pos[0] + 0.8,
        minZ: b.pos[1] - 0.8,
        maxZ: b.pos[1] + 0.8,
        maxY: 2.2,
        label: b.name,
      });

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(1.3, 1.65, 28),
        new THREE.MeshBasicMaterial({ color: "#fbbf24", side: THREE.DoubleSide }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(b.pos[0], 0.08, b.pos[1]);
      scene.add(ring);

      const hit = new THREE.Mesh(
        new THREE.CylinderGeometry(1.7, 1.7, 2.4, 12),
        new THREE.MeshBasicMaterial({ visible: false }),
      );
      hit.position.set(b.pos[0], 1.2, b.pos[1]);
      scene.add(hit);

      // Signal beam from booth top to plaza tower top
      const start = new THREE.Vector3(b.pos[0], 2.1, b.pos[1]);
      const end = new THREE.Vector3(0, 7.0, 0);
      const dist = start.distanceTo(end);
      const beam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, dist, 8),
        new THREE.MeshBasicMaterial({ color: "#ef4444", transparent: true, opacity: 0.2 }),
      );
      beam.position.copy(start).add(end).multiplyScalar(0.5);
      beam.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        end.clone().sub(start).normalize(),
      );
      scene.add(beam);
      beams[b.id] = beam;

      stations.push({
        id: b.id,
        label: b.name,
        position: new THREE.Vector3(b.pos[0], 0, b.pos[1]),
        state: "idle",
        hitMesh: hit,
        ringMesh: ring,
      });
    });

    api.registerObstacles(obstacles);
    stationsRef.current = stations;
    beamsRef.current = beams;
    api.registerStations(stations);

    return () => {};
  }, []);

  const currentBooth = CITIZEN_BOOTHS.find((b) => b.id === activeId);
  const doneCount = Object.values(dispatched).filter(Boolean).length;

  const chooseHandsetTool = (tool: "ussd" | "sms" | "voice" | "video") => {
    if (!currentBooth) return;
    if (currentBooth.valid.includes(tool)) {
      const next = { ...dispatched, [currentBooth.id]: true };
      setDispatched(next);
      setErrorMsg("");
      const count = Object.values(next).filter(Boolean).length;
      onProgressRef.current(Math.round((count / 4) * 100));
      setActiveId(null);
      if (count === 4) onCompleteRef.current();
    } else {
      onMistake?.(`dhk2:${currentBooth.id}:${tool}`);
      setErrorMsg(
        lang === "en"
          ? "That channel fails their constraint (e.g. offline/urgency). Try another handset tool."
          : "এই মাধ্যমে নাগরিকের সমস্যা সমাধান হবে না—অন্য টুল ব্যবহার করুন।",
      );
    }
  };

  return (
    <div className="relative w-full h-[540px] sm:h-[600px]">
      <ThreeMissionHarness
        bounds={{ minX: -12, maxX: 12, minZ: -9, maxZ: 9 }}
        initialPlayerPos={[0, 0, 7]}
        initialCameraOffset={[0, 11, 14]}
        skyColor="#7dd3fc"
        fogColor="#dbeafe"
        cityBackdrop="dhaka"
        paused={paused}
        onSceneReady={handleSceneReady}
        onStationInteract={(id) => {
          setErrorMsg("");
          setActiveId(id);
        }}
      />

      <div className="pointer-events-none absolute bottom-32 md:bottom-4 left-1/2 -translate-x-1/2 max-w-[calc(100%-1.5rem)] z-10 rounded-xl bg-slate-950/92 border border-white/15 px-3.5 sm:px-4 py-1.5 sm:py-2 text-center shadow-xl">
        <div className="text-[10px] font-mono text-slate-400">
          {lang === "en" ? "CITIZENS CONNECTED" : "সংযুক্ত নাগরিক"}
        </div>
        <div className="text-lg font-mono-num font-bold text-emerald-400">{doneCount} / 4</div>
      </div>

      {currentBooth && (
        <div className="absolute bottom-32 sm:bottom-20 left-3 right-3 sm:left-auto sm:right-4 sm:w-96 max-h-[48vh] overflow-y-auto z-30 rounded-2xl bg-slate-950/95 border border-white/20 p-4 shadow-2xl space-y-3 text-white">
          <div className="flex justify-between items-start gap-2">
            <div>
              <div className="text-xs font-bold text-amber-300">{currentBooth.name[lang]}</div>
              <p className="text-xs text-slate-200 mt-1">{currentBooth.need[lang]}</p>
            </div>
            <button
              type="button"
              onClick={() => setActiveId(null)}
              className="text-xs px-2 py-1 rounded bg-white/10"
            >
              ×
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: "ussd" as const, label: { en: "Demo *000# USSD", bn: "ডেমো *000# USSD" } },
              { id: "sms" as const, label: { en: "Send SMS", bn: "এসএমএস পাঠান" } },
              { id: "voice" as const, label: { en: "Voice Call", bn: "ভয়েস কল" } },
              { id: "video" as const, label: { en: "4G Live Class", bn: "৪জি লাইভ ক্লাস" } },
            ].map((btn) => (
              <button
                key={btn.id}
                type="button"
                onClick={() => chooseHandsetTool(btn.id)}
                className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-rose-600 text-xs font-semibold transition-colors"
              >
                {btn.label[lang]}
              </button>
            ))}
          </div>
          <div className="text-[10px] font-mono text-slate-400">
            {lang === "en"
              ? "Note: *000# is an illustrative educational prompt."
              : "দ্রষ্টব্য: *000# শুধুমাত্র শিক্ষামূলক নমুনা কোড।"}
          </div>
          {errorMsg && <div className="text-xs text-rose-400 font-semibold">{errorMsg}</div>}
        </div>
      )}
    </div>
  );
};

/* =========================================================================
   DHAKA TRAIL 4: THE BUSY NETWORK (3D Gulshan Sector Load Control)
   ========================================================================= */
export const DhakaGame4BusyNetwork3D: React.FC<DhakaSceneProps> = ({
  paused,
  hintLevel = 0,
  onProgress,
  onComplete,
}) => {
  const { lang } = useRobiTrail();
  const [activeStation, setActiveStation] = useState<
    "showroom" | "office" | "cafe" | "clinic" | null
  >(null);
  const [showroomCap480, setShowroomCap480] = useState(false);
  const [officeNightOffpeak, setOfficeNightOffpeak] = useState(false);
  const [cafeActive, setCafeActive] = useState(true);
  const [clinicActive, setClinicActive] = useState(true);
  const [solved, setSolved] = useState(false);

  const stationsRef = useRef<InteractiveStation[]>([]);
  const ringMatRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const onProgressRef = useRef(onProgress);
  const onCompleteRef = useRef(onComplete);
  onProgressRef.current = onProgress;
  onCompleteRef.current = onComplete;

  const loadMbps =
    (showroomCap480 ? 18 : 54) +
    (officeNightOffpeak ? 4 : 38) +
    (cafeActive ? 14 : 0) +
    (clinicActive ? 10 : 0);
  const healthy = loadMbps < 75 && cafeActive && clinicActive;

  useEffect(() => {
    if (!solved) {
      const stepPts = (showroomCap480 ? 40 : 0) + (officeNightOffpeak ? 40 : 0);
      onProgressRef.current(Math.max(10, stepPts));
    }
    if (ringMatRef.current) {
      ringMatRef.current.color.set(
        loadMbps > 95 ? "#ef4444" : loadMbps >= 75 ? "#f59e0b" : "#22c55e",
      );
    }
    stationsRef.current.forEach((st) => {
      if (st.id === "showroom")
        st.state = showroomCap480 ? "completed" : hintLevel >= 2 ? "highlighted" : "idle";
      if (st.id === "office")
        st.state = officeNightOffpeak ? "completed" : hintLevel >= 2 ? "highlighted" : "idle";
      if (st.id === "cafe") st.state = cafeActive ? "completed" : "invalid";
      if (st.id === "clinic") st.state = clinicActive ? "completed" : "invalid";
    });
  }, [loadMbps, showroomCap480, officeNightOffpeak, cafeActive, clinicActive, hintLevel, solved]);

  const handleSceneReady = useCallback((api: HarnessApi) => {
    const { scene } = api;

    // Central Gulshan sector mast + color status halo
    const tower = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0.85, 9, 8),
      new THREE.MeshStandardMaterial({ color: "#cbd5e1", metalness: 0.5, roughness: 0.35 }),
    );
    tower.position.set(0, 4.5, 0);
    tower.castShadow = true;
    scene.add(tower);

    const statusMat = new THREE.MeshBasicMaterial({ color: "#ef4444", side: THREE.DoubleSide });
    ringMatRef.current = statusMat;
    const statusHalo = new THREE.Mesh(new THREE.RingGeometry(2.0, 2.5, 32), statusMat);
    statusHalo.rotation.x = -Math.PI / 2;
    statusHalo.position.set(0, 8.8, 0);
    scene.add(statusHalo);

    const defs: {
      id: "showroom" | "office" | "cafe" | "clinic";
      x: number;
      z: number;
      color: string;
      label: { en: string; bn: string };
    }[] = [
      {
        id: "showroom",
        x: -7.5,
        z: -5,
        color: "#f43f5e",
        label: { en: "4K TV Showroom", bn: "৪কে টিভি শোরুম" },
      },
      {
        id: "office",
        x: 7.5,
        z: -5,
        color: "#f97316",
        label: { en: "Office Cloud Server", bn: "অফিস ক্লাউড সার্ভার" },
      },
      {
        id: "cafe",
        x: -7.5,
        z: 5,
        color: "#38bdf8",
        label: { en: "Student Study Cafe", bn: "শিক্ষার্থী স্টাডি ক্যাফে" },
      },
      {
        id: "clinic",
        x: 7.5,
        z: 5,
        color: "#22c55e",
        label: { en: "Telemedicine Clinic", bn: "টেলিমেডিসিন ক্লিনিক" },
      },
    ];

    const stations: InteractiveStation[] = [];
    const obstacles: ObstacleBox[] = [
      {
        minX: -1.1,
        maxX: 1.1,
        minZ: -1.1,
        maxZ: 1.1,
        maxY: 9,
        label: { en: "Gulshan Sector Mast", bn: "গুলশান সেক্টর মাস্তুল" },
      },
    ];

    defs.forEach((d) => {
      const bldg = new THREE.Mesh(
        new THREE.BoxGeometry(2.4, 2.2, 2.2),
        new THREE.MeshStandardMaterial({ color: "#334155", roughness: 0.7 }),
      );
      bldg.position.set(d.x, 1.1, d.z);
      bldg.castShadow = true;
      scene.add(bldg);

      const sign = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 0.5, 0.2),
        new THREE.MeshStandardMaterial({
          color: d.color,
          emissive: d.color,
          emissiveIntensity: 0.45,
        }),
      );
      sign.position.set(d.x, 2.45, d.z + 1.15);
      scene.add(sign);

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(1.8, 2.15, 28),
        new THREE.MeshBasicMaterial({ color: "#fbbf24", side: THREE.DoubleSide }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(d.x, 0.08, d.z);
      scene.add(ring);

      const hit = new THREE.Mesh(
        new THREE.CylinderGeometry(2.1, 2.1, 2.6, 12),
        new THREE.MeshBasicMaterial({ visible: false }),
      );
      hit.position.set(d.x, 1.3, d.z);
      scene.add(hit);

      obstacles.push({
        minX: d.x - 1.25,
        maxX: d.x + 1.25,
        minZ: d.z - 1.15,
        maxZ: d.z + 1.15,
        maxY: 2.5,
        label: d.label,
      });

      stations.push({
        id: d.id,
        label: d.label,
        position: new THREE.Vector3(d.x, 0, d.z),
        state: "idle",
        hitMesh: hit,
        ringMesh: ring,
      });
    });

    api.registerObstacles(obstacles);
    stationsRef.current = stations;
    api.registerStations(stations);

    api.setFrameUpdater((_dt, elapsed) => {
      statusHalo.rotation.z = elapsed * 0.8;
    });

    return () => {};
  }, []);

  return (
    <div className="relative w-full h-[540px] sm:h-[600px]">
      <ThreeMissionHarness
        bounds={{ minX: -12, maxX: 12, minZ: -9, maxZ: 9 }}
        initialPlayerPos={[0, 0, 6.8]}
        initialCameraOffset={[0, 11, 14]}
        skyColor="#7dd3fc"
        fogColor="#dbeafe"
        cityBackdrop="dhaka"
        paused={paused}
        onSceneReady={handleSceneReady}
        onStationInteract={(id) =>
          setActiveStation(id as "showroom" | "office" | "cafe" | "clinic")
        }
      />

      <div className="pointer-events-none absolute bottom-32 md:bottom-4 left-1/2 -translate-x-1/2 max-w-[calc(100%-1.5rem)] z-10 rounded-xl bg-slate-950/92 border border-white/15 px-3.5 sm:px-4 py-1.5 sm:py-2 text-center shadow-xl">
        <div className="text-[10px] font-mono text-slate-400">
          {lang === "en" ? "SHARED SECTOR LOAD (TARGET < 75%)" : "শেয়ার্ড সেক্টর চাপ (লক্ষ্য < ৭৫%)"}
        </div>
        <div
          className={`text-xl font-mono-num font-bold ${healthy ? "text-emerald-400" : "text-rose-400"}`}
        >
          {loadMbps}%
        </div>
      </div>

      {activeStation && (
        <div className="absolute bottom-32 sm:bottom-20 left-3 right-3 sm:left-auto sm:right-4 sm:w-96 max-h-[48vh] overflow-y-auto z-30 rounded-2xl bg-slate-950/95 border border-white/20 p-4 shadow-2xl space-y-3 text-white">
          <div className="flex justify-between items-center border-b border-white/10 pb-2">
            <div className="inline-flex items-center gap-2 text-xs font-bold">
              <Server className="w-4 h-4 text-rose-400" />
              <span>
                {activeStation === "showroom"
                  ? lang === "en"
                    ? "4K TV Showroom Console"
                    : "৪কে টিভি শোরুম কনসোল"
                  : activeStation === "office"
                    ? lang === "en"
                      ? "Office Cloud Server Console"
                      : "অফিস সার্ভার কনসোল"
                    : activeStation === "cafe"
                      ? lang === "en"
                        ? "Student Study Cafe"
                        : "শিক্ষার্থী স্টাডি ক্যাফে"
                      : lang === "en"
                        ? "Telemedicine Clinic"
                        : "টেলিমেডিসিন ক্লিনিক"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setActiveStation(null)}
              className="text-xs px-2 py-1 rounded bg-white/10"
            >
              ×
            </button>
          </div>

          {activeStation === "showroom" && (
            <button
              type="button"
              onClick={() => setShowroomCap480((v) => !v)}
              className={`w-full py-2.5 rounded-xl text-xs font-bold ${
                showroomCap480 ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
              }`}
            >
              {showroomCap480
                ? lang === "en"
                  ? "Capped at 480p (18 Mbps) ✓"
                  : "৪৮০পি-তে সীমিত (১৮ Mbps) ✓"
                : lang === "en"
                  ? "Throttle Demo Screens 4K → 480p (Save 36 Mbps)"
                  : "৪কে থেকে ৪৮০পি-তে নামান (৩৬ Mbps বাঁচান)"}
            </button>
          )}

          {activeStation === "office" && (
            <button
              type="button"
              onClick={() => setOfficeNightOffpeak((v) => !v)}
              className={`w-full py-2.5 rounded-xl text-xs font-bold ${
                officeNightOffpeak ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
              }`}
            >
              {officeNightOffpeak
                ? lang === "en"
                  ? "Backups Scheduled 2 AM Off-Peak ✓"
                  : "রাত ২টার অফ-পিকে সরানো হয়েছে ✓"
                : lang === "en"
                  ? "Move Cloud Backups to 2 AM Night Off-Peak (Save 34 Mbps)"
                  : "ব্যাকআপ রাত ২টার অফ-পিকে সরান (৩৪ Mbps বাঁচান)"}
            </button>
          )}

          {(activeStation === "cafe" || activeStation === "clinic") && (
            <div className="space-y-2">
              <p className="text-xs text-slate-300">
                {lang === "en"
                  ? "Critical community service—keep this essential link online!"
                  : "এটি জরুরি নাগরিক সেবা—এই সংযোগ সচল রাখা প্রয়োজন!"}
              </p>
              <button
                type="button"
                onClick={() =>
                  activeStation === "cafe" ? setCafeActive((v) => !v) : setClinicActive((v) => !v)
                }
                className="w-full py-2 rounded-xl bg-slate-800 text-xs font-semibold"
              >
                {activeStation === "cafe"
                  ? cafeActive
                    ? "Keep Cafe Online ✓"
                    : "Restore Cafe Connection"
                  : clinicActive
                    ? "Keep Clinic Online ✓"
                    : "Restore Clinic Connection"}
              </button>
            </div>
          )}

          {healthy && !solved && (
            <button
              type="button"
              onClick={() => {
                setSolved(true);
                onProgressRef.current(100);
                onCompleteRef.current();
              }}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold inline-flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {lang === "en"
                  ? `Stabilize Sector (${loadMbps}% Load)`
                  : `সেক্টর স্থিতিশীল করুন (${loadMbps}%)`}
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

/* =========================================================================
   DHAKA TRAIL 5: MESSAGE OR INTERNET? (3D Transit & River Pier Dispatch)
   ========================================================================= */
const TRANSIT_TERMINALS = [
  {
    id: "ferry",
    pos: [-8.5, 2] as const,
    name: { en: "River Ferry 2G Crossing", bn: "নদী ফেরি ২জি পারাপার" },
    desc: {
      en: "Weak 2G mid-river signal; mobile data stalls. Family needs quick arrival check.",
      bn: "নদীর মাঝে দুর্বল ২জি; পরিবারকে দ্রুত পৌঁছানোর খবর জানানো প্রয়োজন।",
    },
    valid: ["sms", "voice"],
  },
  {
    id: "campus",
    pos: [0, -2.5] as const,
    name: { en: "Campus PDF Kiosk", bn: "ক্যাম্পাস পিডিএফ কিয়স্ক" },
    desc: {
      en: "Strong 4G/Wi-Fi zone; student must fetch an 8 MB assignment packet.",
      bn: "ভালো ৪জি সংযোগ রয়েছে; শিক্ষার্থীকে ৮ MB অ্যাসাইনমেন্ট নামাতে হবে।",
    },
    valid: ["data"],
  },
  {
    id: "shelter",
    pos: [8.5, 2] as const,
    name: { en: "Farmgate Bus Shelter", bn: "ফার্মগেট বাস ছাউনি" },
    desc: {
      en: "Grandfather uses a keypad phone without a data plan; needs pharmacy pickup ping.",
      bn: "দাদার বাটন ফোনে ইন্টারনেট নেই; ওষুধ নেওয়ার বার্তা পাঠানো দরকার।",
    },
    valid: ["voice", "sms"],
  },
];

export const DhakaGame5MessageOrInternet3D: React.FC<DhakaSceneProps> = ({
  paused,
  hintLevel = 0,
  onProgress,
  onComplete,
  onMistake,
}) => {
  const { lang } = useRobiTrail();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [cleared, setCleared] = useState<Record<string, boolean>>({});
  const [feedback, setFeedback] = useState<string>("");

  const stationsRef = useRef<InteractiveStation[]>([]);
  const onProgressRef = useRef(onProgress);
  const onCompleteRef = useRef(onComplete);
  onProgressRef.current = onProgress;
  onCompleteRef.current = onComplete;

  useEffect(() => {
    stationsRef.current.forEach((st) => {
      st.state = cleared[st.id] ? "completed" : hintLevel >= 2 ? "highlighted" : "idle";
    });
  }, [cleared, hintLevel]);

  const handleSceneReady = useCallback((api: HarnessApi) => {
    const { scene } = api;

    // River pier water strip along negative Z edge (clearly separated from Campus Kiosk at z=-2.5)
    const water = new THREE.Mesh(
      new THREE.BoxGeometry(24, 0.1, 3.6),
      new THREE.MeshStandardMaterial({ color: "#0369a1", roughness: 0.25, metalness: 0.2 }),
    );
    water.position.set(0, 0.04, -7.2);
    scene.add(water);

    const obstacles: ObstacleBox[] = [
      {
        minX: -12,
        maxX: 12,
        minZ: -9.2,
        maxZ: -5.3,
        maxY: 1.5,
        label: { en: "River Ferry Channel", bn: "নদী ফেরি ঘাট" },
      },
    ];

    const stations: InteractiveStation[] = [];
    TRANSIT_TERMINALS.forEach((term) => {
      const booth = new THREE.Mesh(
        new THREE.BoxGeometry(1.7, 2.1, 1.7),
        new THREE.MeshStandardMaterial({ color: "#1e293b", roughness: 0.65 }),
      );
      booth.position.set(term.pos[0], 1.05, term.pos[1]);
      booth.castShadow = true;
      scene.add(booth);

      obstacles.push({
        minX: term.pos[0] - 0.9,
        maxX: term.pos[0] + 0.9,
        minZ: term.pos[1] - 0.9,
        maxZ: term.pos[1] + 0.9,
        maxY: 2.3,
        label: term.name,
      });

      const beacon = new THREE.Mesh(
        new THREE.SphereGeometry(0.32, 16, 16),
        new THREE.MeshStandardMaterial({
          color: "#38bdf8",
          emissive: "#0284c7",
          emissiveIntensity: 0.6,
        }),
      );
      beacon.position.set(term.pos[0], 2.45, term.pos[1]);
      scene.add(beacon);

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(1.4, 1.75, 28),
        new THREE.MeshBasicMaterial({ color: "#fbbf24", side: THREE.DoubleSide }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(term.pos[0], 0.09, term.pos[1]);
      scene.add(ring);

      const hit = new THREE.Mesh(
        new THREE.CylinderGeometry(1.8, 1.8, 2.5, 12),
        new THREE.MeshBasicMaterial({ visible: false }),
      );
      hit.position.set(term.pos[0], 1.25, term.pos[1]);
      scene.add(hit);

      stations.push({
        id: term.id,
        label: term.name,
        position: new THREE.Vector3(term.pos[0], 0, term.pos[1]),
        state: "idle",
        hitMesh: hit,
        ringMesh: ring,
      });
    });

    api.registerObstacles(obstacles);
    stationsRef.current = stations;
    api.registerStations(stations);
    return () => {};
  }, []);

  const currentTerminal = TRANSIT_TERMINALS.find((t) => t.id === activeId);
  const doneCount = Object.values(cleared).filter(Boolean).length;

  const dispatchChoice = (mode: "sms" | "voice" | "data") => {
    if (!currentTerminal) return;
    if (currentTerminal.valid.includes(mode)) {
      const next = { ...cleared, [currentTerminal.id]: true };
      setCleared(next);
      setFeedback("");
      const count = Object.values(next).filter(Boolean).length;
      onProgressRef.current(Math.round((count / 3) * 100));
      setActiveId(null);
      if (count === 3) onCompleteRef.current();
    } else {
      onMistake?.(`dhk5:${currentTerminal.id}:${mode}`);
      setFeedback(
        lang === "en"
          ? "That channel will stall here—pick an option suited to the signal and file need!"
          : "এখানকার নেটওয়ার্ক ও প্রয়োজন অনুযায়ী এই মাধ্যমটি উপযুক্ত নয়!",
      );
    }
  };

  return (
    <div className="relative w-full h-[540px] sm:h-[600px]">
      <ThreeMissionHarness
        bounds={{ minX: -12, maxX: 12, minZ: -8.5, maxZ: 8.5 }}
        initialPlayerPos={[0, 0, 5.5]}
        initialCameraOffset={[0, 10, 13.5]}
        skyColor="#7dd3fc"
        fogColor="#dbeafe"
        cityBackdrop="dhaka"
        paused={paused}
        onSceneReady={handleSceneReady}
        onStationInteract={(id) => {
          setFeedback("");
          setActiveId(id);
        }}
      />

      <div className="pointer-events-none absolute bottom-32 md:bottom-4 left-1/2 -translate-x-1/2 max-w-[calc(100%-1.5rem)] z-10 rounded-xl bg-slate-950/92 border border-white/15 px-3.5 sm:px-4 py-1.5 sm:py-2 text-center shadow-xl">
        <div className="text-[10px] font-mono text-slate-400">
          {lang === "en" ? "TERMINAL BOOTHS DISPATCHED" : "সম্পন্ন টার্মিনাল বুথ"}
        </div>
        <div className="text-lg font-mono-num font-bold text-emerald-400">{doneCount} / 3</div>
      </div>

      {currentTerminal && (
        <div className="absolute bottom-32 sm:bottom-20 left-3 right-3 sm:left-auto sm:right-4 sm:w-96 max-h-[48vh] overflow-y-auto z-30 rounded-2xl bg-slate-950/95 border border-white/20 p-4 shadow-2xl space-y-3 text-white">
          <div className="flex justify-between items-start gap-2">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-300">
                <Radio className="w-3.5 h-3.5" />
                <span>{currentTerminal.name[lang]}</span>
              </div>
              <p className="text-xs text-slate-200 mt-1">{currentTerminal.desc[lang]}</p>
            </div>
            <button
              type="button"
              onClick={() => setActiveId(null)}
              className="text-xs px-2 py-1 rounded bg-white/10"
            >
              ×
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "sms" as const, label: { en: "SMS Text", bn: "এসএমএস" } },
              { id: "voice" as const, label: { en: "Voice Call", bn: "ভয়েস কল" } },
              { id: "data" as const, label: { en: "4G / Wi-Fi Data", bn: "ইন্টারনেট ডেটা" } },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => dispatchChoice(m.id)}
                className="py-2 rounded-lg bg-slate-800 hover:bg-rose-600 text-xs font-semibold transition-colors"
              >
                {m.label[lang]}
              </button>
            ))}
          </div>
          {feedback && <div className="text-xs text-rose-400 font-semibold">{feedback}</div>}
        </div>
      )}
    </div>
  );
};
