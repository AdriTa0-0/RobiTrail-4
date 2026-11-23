import React, { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useRobiTrail } from "../../../context/RobiTrailContext";
import {
  ThreeMissionHarness,
  type HarnessApi,
  type InteractiveStation,
  type ObstacleBox,
} from "../chattogram3d/ThreeMissionHarness";
import { CheckCircle2, Smartphone, Radio, Server, Wifi, AlertTriangle } from "lucide-react";

interface DhakaSceneProps {
  paused?: boolean;
  hintLevel?: number;
  onProgress: (pct: number) => void;
  onComplete: () => void;
  onMistake?: (actionKey: string) => void;
}

/* =========================================================================
   DHAKA TRAIL 1: DATA DETECTIVE (3D Study Room Hardware Inspection)
   ========================================================================= */
export const DhakaGame1DataDetective3D: React.FC<DhakaSceneProps> = ({
  paused,
  hintLevel = 0,
  onProgress,
  onComplete,
}) => {
  const { lang } = useRobiTrail();
  const [activeStation, setActiveStation] = useState<"phone" | "monitor" | "router" | null>(null);
  const [videoRes, setVideoRes] = useState<"1080p" | "480p" | "360p">("1080p");
  const [autoPlay, setAutoPlay] = useState(true);
  const [cloudSync, setCloudSync] = useState(true);
  const [bgUpdates, setBgUpdates] = useState(true);
  const [solved, setSolved] = useState(false);

  const stationsRef = useRef<InteractiveStation[]>([]);
  const packetCubesRef = useRef<THREE.Mesh[]>([]);
  const onProgressRef = useRef(onProgress);
  const onCompleteRef = useRef(onComplete);
  onProgressRef.current = onProgress;
  onCompleteRef.current = onComplete;

  const videoMb = videoRes === "1080p" ? 320 : videoRes === "480p" ? 180 : 110;
  const totalMb =
    videoMb + (autoPlay ? 210 : 0) + (cloudSync ? 140 : 0) + (bgUpdates ? 110 : 0) + 70;
  const underBudget = totalMb <= 400;

  useEffect(() => {
    const pct = underBudget ? 90 : Math.max(15, Math.round((400 / totalMb) * 85));
    if (!solved) onProgressRef.current(pct);

    // Update 3D station glows and floating packet cube color
    const phoneOk = videoRes !== "1080p";
    const monitorOk = !autoPlay;
    const routerOk = !cloudSync && !bgUpdates;

    stationsRef.current.forEach((st) => {
      if (st.id === "phone")
        st.state = phoneOk ? "completed" : hintLevel >= 2 ? "highlighted" : "idle";
      if (st.id === "monitor")
        st.state = monitorOk ? "completed" : hintLevel >= 2 ? "highlighted" : "idle";
      if (st.id === "router")
        st.state = routerOk ? "completed" : hintLevel >= 2 ? "highlighted" : "idle";
    });

    packetCubesRef.current.forEach((cube, i) => {
      const mat = cube.material as THREE.MeshStandardMaterial;
      const activeCount = Math.ceil((totalMb / 850) * packetCubesRef.current.length);
      cube.visible = i < activeCount;
      mat.color.set(underBudget ? "#22c55e" : "#f43f5e");
      mat.emissive.set(underBudget ? "#16a34a" : "#e11d48");
    });
  }, [totalMb, underBudget, videoRes, autoPlay, cloudSync, bgUpdates, hintLevel, solved]);

  const handleSceneReady = useCallback((api: HarnessApi) => {
    const { scene } = api;

    // Study room floor tile & perimeter wall strips
    const rug = new THREE.Mesh(
      new THREE.BoxGeometry(10, 0.06, 7),
      new THREE.MeshStandardMaterial({ color: "#94a3b8", roughness: 0.85 }),
    );
    rug.position.set(0, 0.03, 0);
    rug.receiveShadow = true;
    scene.add(rug);

    // Center bookshelf divider (solid obstacle)
    const shelf = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 2.2, 1.1),
      new THREE.MeshStandardMaterial({ color: "#78350f", roughness: 0.75 }),
    );
    shelf.position.set(0, 1.1, -0.5);
    shelf.castShadow = true;
    shelf.receiveShadow = true;
    scene.add(shelf);

    const obstacles: ObstacleBox[] = [
      {
        minX: -1.4,
        maxX: 1.4,
        minZ: -1.2,
        maxZ: 0.2,
        maxY: 2.3,
        label: { en: "Bookshelf Divider", bn: "বইয়ের তাক" },
      },
    ];
    api.registerObstacles(obstacles);

    const stationDefs: {
      id: "phone" | "monitor" | "router";
      x: number;
      z: number;
      color: string;
      label: { en: string; bn: string };
    }[] = [
      {
        id: "phone",
        x: -6.5,
        z: 2.5,
        color: "#38bdf8",
        label: { en: "Desk Smartphone", bn: "ডেস্ক স্মার্টফোন" },
      },
      {
        id: "monitor",
        x: 0,
        z: -5.5,
        color: "#f59e0b",
        label: { en: "App Telemetry Screen", bn: "অ্যাপ মনিটর স্ক্রিন" },
      },
      {
        id: "router",
        x: 6.5,
        z: 2.5,
        color: "#22c55e",
        label: { en: "Wi-Fi Offload Hub", bn: "ওয়াই-ফাই হাব" },
      },
    ];

    const stations: InteractiveStation[] = [];
    stationDefs.forEach((def) => {
      const desk = new THREE.Mesh(
        new THREE.BoxGeometry(2.1, 0.95, 1.4),
        new THREE.MeshStandardMaterial({ color: "#475569", roughness: 0.6 }),
      );
      desk.position.set(def.x, 0.48, def.z);
      desk.castShadow = true;
      scene.add(desk);

      const prop = new THREE.Mesh(
        def.id === "phone"
          ? new THREE.BoxGeometry(0.65, 0.14, 1.15)
          : def.id === "monitor"
            ? new THREE.BoxGeometry(1.5, 0.95, 0.16)
            : new THREE.BoxGeometry(1.0, 0.35, 0.65),
        new THREE.MeshStandardMaterial({
          color: def.color,
          emissive: def.color,
          emissiveIntensity: 0.35,
        }),
      );
      prop.position.set(def.x, def.id === "monitor" ? 1.45 : 1.05, def.z);
      scene.add(prop);

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(1.4, 1.72, 28),
        new THREE.MeshBasicMaterial({ color: "#fbbf24", side: THREE.DoubleSide }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(def.x, 0.08, def.z);
      scene.add(ring);

      const hit = new THREE.Mesh(
        new THREE.CylinderGeometry(1.6, 1.6, 2.2, 12),
        new THREE.MeshBasicMaterial({ visible: false }),
      );
      hit.position.set(def.x, 1.1, def.z);
      scene.add(hit);

      obstacles.push({
        minX: def.x - 1.05,
        maxX: def.x + 1.05,
        minZ: def.z - 0.7,
        maxZ: def.z + 0.7,
        maxY: 1.6,
        label: def.label,
      });

      stations.push({
        id: def.id,
        label: def.label,
        position: new THREE.Vector3(def.x, 0, def.z),
        state: "idle",
        hitMesh: hit,
        ringMesh: ring,
      });
    });

    api.registerObstacles(obstacles);
    stationsRef.current = stations;
    api.registerStations(stations);

    // Floating 3D data cubes representing daily megabytes
    const cubes: THREE.Mesh[] = [];
    for (let i = 0; i < 8; i++) {
      const cube = new THREE.Mesh(
        new THREE.BoxGeometry(0.45, 0.45, 0.45),
        new THREE.MeshStandardMaterial({
          color: "#f43f5e",
          emissive: "#e11d48",
          emissiveIntensity: 0.65,
        }),
      );
      cube.position.set(-3.5 + i * 1.0, 2.8, 0);
      scene.add(cube);
      cubes.push(cube);
    }
    packetCubesRef.current = cubes;

    api.setFrameUpdater((_dt, elapsed) => {
      cubes.forEach((c, idx) => {
        c.rotation.y = elapsed * 1.4 + idx * 0.4;
        c.position.y = 2.7 + Math.sin(elapsed * 2.2 + idx) * 0.25;
      });
    });

    return () => {};
  }, []);

  return (
    <div className="relative w-full h-[540px] sm:h-[600px]">
      <ThreeMissionHarness
        bounds={{ minX: -11, maxX: 11, minZ: -9, maxZ: 9 }}
        initialPlayerPos={[0, 0, 5.8]}
        initialCameraOffset={[0, 10, 13]}
        skyColor="#7dd3fc"
        fogColor="#dbeafe"
        cityBackdrop="dhaka"
        paused={paused}
        onSceneReady={handleSceneReady}
        onStationInteract={(id) => setActiveStation(id as "phone" | "monitor" | "router")}
      />

      {/* Bottom Center Live MB Meter Pill (zero top HUD overlap) */}
      <div className="pointer-events-none absolute bottom-32 md:bottom-4 left-1/2 -translate-x-1/2 max-w-[calc(100%-1.5rem)] z-10 rounded-xl bg-slate-950/92 border border-white/15 px-3.5 sm:px-4 py-1.5 sm:py-2 text-center shadow-xl">
        <div className="text-[10px] font-mono text-slate-400">
          {lang === "en" ? "DAILY DATA DRAIN (GOAL ≤ 400 MB)" : "দৈনিক ডেটা খরচ (লক্ষ্য ≤ ৪০০ MB)"}
        </div>
        <div
          className={`text-xl font-mono-num font-bold ${underBudget ? "text-emerald-400" : "text-rose-400"}`}
        >
          {totalMb} MB
        </div>
      </div>

      {/* Station Hardware Modal Controls */}
      {activeStation && (
        <div className="absolute bottom-32 sm:bottom-20 left-3 right-3 sm:left-auto sm:right-4 sm:w-96 max-h-[48vh] overflow-y-auto z-30 rounded-2xl bg-slate-950/95 border border-white/20 p-4 shadow-2xl space-y-3 text-white">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div className="flex items-center gap-2 text-xs font-bold">
              {activeStation === "phone" && <Smartphone className="w-4 h-4 text-sky-400" />}
              {activeStation === "monitor" && <AlertTriangle className="w-4 h-4 text-amber-400" />}
              {activeStation === "router" && <Wifi className="w-4 h-4 text-emerald-400" />}
              <span>
                {activeStation === "phone"
                  ? lang === "en"
                    ? "Desk Smartphone · Video Quality"
                    : "ডেস্ক স্মার্টফোন · ভিডিও মান"
                  : activeStation === "monitor"
                    ? lang === "en"
                      ? "Telemetry Monitor · Autoplay"
                      : "মনিটর · অটোপ্লে"
                    : lang === "en"
                      ? "Wi-Fi Hub · Background Sync"
                      : "ওয়াই-ফাই হাব · ব্যাকগ্রাউন্ড সিঙ্ক"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setActiveStation(null)}
              className="text-xs px-2 py-1 rounded bg-white/10 hover:bg-white/20"
            >
              {lang === "en" ? "Close" : "বন্ধ"}
            </button>
          </div>

          {activeStation === "phone" && (
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-2">
                {(["1080p", "480p", "360p"] as const).map((res) => (
                  <button
                    key={res}
                    type="button"
                    onClick={() => setVideoRes(res)}
                    className={`py-2 rounded-lg text-xs font-mono font-bold border ${
                      videoRes === res
                        ? "bg-rose-600 border-rose-500 text-white"
                        : "bg-slate-900 border-slate-700 text-slate-300"
                    }`}
                  >
                    {res}
                  </button>
                ))}
              </div>
              <div className="text-[11px] text-slate-300">
                {lang === "en"
                  ? `Video playback uses ${videoMb} MB/day (+70 MB study PDFs always kept active).`
                  : `ভিডিওতে ${videoMb} MB (+৭০ MB স্টাডি পিডিএফ সর্বদা সচল)।`}
              </div>
            </div>
          )}

          {activeStation === "monitor" && (
            <label className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-700 cursor-pointer">
              <div>
                <div className="text-xs font-bold">
                  {lang === "en" ? "Feed Video Autoplay" : "ফিড ভিডিও অটোপ্লে"}
                </div>
                <div className="text-[11px] font-mono-num text-amber-300">210 MB / day</div>
              </div>
              <button
                type="button"
                onClick={() => setAutoPlay((v) => !v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                  autoPlay ? "bg-rose-600 text-white" : "bg-emerald-600 text-white"
                }`}
              >
                {autoPlay
                  ? lang === "en"
                    ? "Turn Off"
                    : "বন্ধ করুন"
                  : lang === "en"
                    ? "Paused ✓"
                    : "বন্ধ আছে ✓"}
              </button>
            </label>
          )}

          {activeStation === "router" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-700">
                <div>
                  <div className="text-xs font-bold">
                    {lang === "en" ? "Cellular Cloud Photo Sync" : "মোবাইল ক্লাউড ফটো সিঙ্ক"}
                  </div>
                  <div className="text-[11px] font-mono-num text-amber-300">140 MB</div>
                </div>
                <button
                  type="button"
                  onClick={() => setCloudSync((v) => !v)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                    cloudSync ? "bg-rose-600 text-white" : "bg-emerald-600 text-white"
                  }`}
                >
                  {cloudSync
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
                    {lang === "en" ? "Background App Updates" : "ব্যাকগ্রাউন্ড অ্যাপ আপডেট"}
                  </div>
                  <div className="text-[11px] font-mono-num text-amber-300">110 MB</div>
                </div>
                <button
                  type="button"
                  onClick={() => setBgUpdates((v) => !v)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                    bgUpdates ? "bg-rose-600 text-white" : "bg-emerald-600 text-white"
                  }`}
                >
                  {bgUpdates
                    ? lang === "en"
                      ? "Wi-Fi Only"
                      : "ওয়াই-ফাইয়ে নিন"
                    : lang === "en"
                      ? "Wi-Fi Only ✓"
                      : "সম্পন্ন ✓"}
                </button>
              </div>
            </div>
          )}

          {underBudget && !solved && (
            <button
              type="button"
              onClick={() => {
                setSolved(true);
                onProgressRef.current(100);
                onCompleteRef.current();
              }}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
            >
              {lang === "en"
                ? `Confirm Optimized Plan (${totalMb} MB)`
                : `সাশ্রয়ী পরিকল্পনা নিশ্চিত করুন (${totalMb} MB)`}
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
