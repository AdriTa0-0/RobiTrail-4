import React, { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useRobiTrail } from "../../context/RobiTrailContext";
import type { TrailEngineProps } from "./MissionShell";
import {
  ThreeMissionHarness,
  type HarnessApi,
  type InteractiveStation,
  type ObstacleBox,
} from "./chattogram3d/ThreeMissionHarness";
import { Activity, CheckCircle2, Radio, Wrench, Zap } from "lucide-react";

/* =========================================================================
   SYLHET TRAIL 1 (syl-1): THE LOST CONNECTION
   3D Keane Bridge Probe + 3-Step Fiber Fusion Splicer + Optical Pulse Test
   ========================================================================= */
const BRIDGE_NODES = [
  {
    id: "h1",
    x: -10,
    z: 2,
    name: { en: "Phone Radio", bn: "ফোন রেডিও" },
    healthy: true,
    msg: { en: "-70 dBm RF Link OK", bn: "-৭০ dBm রেডিও ঠিক আছে" },
  },
  {
    id: "h2",
    x: -5,
    z: -2,
    name: { en: "Keane Tower", bn: "কিন টাওয়ার" },
    healthy: true,
    msg: { en: "Sector Uplink Active", bn: "সেক্টর আপলিংক সচল" },
  },
  {
    id: "h3",
    x: 0,
    z: 2,
    name: { en: "Surma Fiber Splice", bn: "সুরমা ফাইবার স্প্লাইস" },
    healthy: false,
    msg: { en: "BREAK: Severed Glass Core!", bn: "ত্রুটি: অপটিক্যাল ফাইবার বিচ্ছিন্ন!" },
  },
  {
    id: "h4",
    x: 5,
    z: -2,
    name: { en: "Core Router", bn: "কোর রাউটার" },
    healthy: false,
    msg: { en: "No Optical Carrier", bn: "অপটিক্যাল সংকেত নেই" },
  },
  {
    id: "h5",
    x: 10,
    z: 2,
    name: { en: "Learning Server", bn: "শিক্ষা সার্ভার" },
    healthy: false,
    msg: { en: "Unreachable Upstream", bn: "সার্ভার বিচ্ছিন্ন" },
  },
];

const Trail9LostConnection3D: React.FC<Omit<TrailEngineProps, "trailId">> = ({
  paused,
  hintLevel = 0,
  onProgress,
  onComplete,
}) => {
  const { lang } = useRobiTrail();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [probedIds, setProbedIds] = useState<string[]>([]);
  const [stripped, setStripped] = useState(false);
  const [alignVal, setAlignVal] = useState(18);
  const [fused, setFused] = useState(false);
  const [pulseTested, setPulseTested] = useState(false);

  const stationsRef = useRef<InteractiveStation[]>([]);
  const cableMeshesRef = useRef<THREE.Mesh[]>([]);
  const onProgressRef = useRef(onProgress);
  const onCompleteRef = useRef(onComplete);
  onProgressRef.current = onProgress;
  onCompleteRef.current = onComplete;

  const coreAligned = alignVal >= 45 && alignVal <= 55;
  const spliceProbed = probedIds.includes("h3");

  useEffect(() => {
    stationsRef.current.forEach((st) => {
      const node = BRIDGE_NODES.find((n) => n.id === st.id)!;
      const isProbed = probedIds.includes(st.id);
      if (pulseTested) {
        st.state = "completed";
      } else if (fused && st.id === "h3") {
        st.state = "completed";
      } else if (isProbed) {
        st.state = node.healthy ? "completed" : "invalid";
      } else {
        st.state = hintLevel >= 2 ? "highlighted" : "idle";
      }
    });

    cableMeshesRef.current.forEach((mesh, idx) => {
      const mat = mesh.material as THREE.MeshBasicMaterial;
      if (pulseTested) {
        mat.color.set("#22c55e");
      } else if (idx < 1) {
        mat.color.set("#38bdf8");
      } else {
        mat.color.set(fused ? "#fbbf24" : "#ef4444");
      }
    });
  }, [probedIds, fused, pulseTested, hintLevel]);

  const handleSceneReady = useCallback((api: HarnessApi) => {
    const { scene } = api;

    // Surma River water ribbon under bridge span
    const river = new THREE.Mesh(
      new THREE.BoxGeometry(26, 0.1, 7),
      new THREE.MeshStandardMaterial({ color: "#0369a1", roughness: 0.25 }),
    );
    river.position.set(0, 0.04, 0);
    scene.add(river);

    // Bridge deck & orange splice manhole box
    const deck = new THREE.Mesh(
      new THREE.BoxGeometry(24, 0.22, 6),
      new THREE.MeshStandardMaterial({ color: "#334155", roughness: 0.85 }),
    );
    deck.position.set(0, 0.15, 0);
    deck.receiveShadow = true;
    scene.add(deck);

    // Bridge safety guard curbs along z = ±2.9
    [-2.9, 2.9].forEach((rz) => {
      const curb = new THREE.Mesh(
        new THREE.BoxGeometry(24, 0.35, 0.22),
        new THREE.MeshStandardMaterial({ color: "#991b1b", roughness: 0.6 }),
      );
      curb.position.set(0, 0.32, rz);
      scene.add(curb);
    });

    const obstacles: ObstacleBox[] = [];
    const stations: InteractiveStation[] = [];
    const cables: THREE.Mesh[] = [];

    BRIDGE_NODES.forEach((node, idx) => {
      const pedestal = new THREE.Mesh(
        node.id === "h3"
          ? new THREE.BoxGeometry(1.5, 0.75, 1.5)
          : new THREE.CylinderGeometry(0.45, 0.6, 2.2, 10),
        new THREE.MeshStandardMaterial({
          color: node.id === "h3" ? "#ea580c" : "#94a3b8",
          roughness: 0.55,
        }),
      );
      pedestal.position.set(node.x, node.id === "h3" ? 0.55 : 1.2, node.z);
      pedestal.castShadow = true;
      scene.add(pedestal);

      obstacles.push({
        minX: node.x - (node.id === "h3" ? 0.8 : 0.65),
        maxX: node.x + (node.id === "h3" ? 0.8 : 0.65),
        minZ: node.z - (node.id === "h3" ? 0.8 : 0.65),
        maxZ: node.z + (node.id === "h3" ? 0.8 : 0.65),
        maxY: 2.4,
        label: node.name,
      });

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(1.25, 1.58, 26),
        new THREE.MeshBasicMaterial({ color: "#fbbf24", side: THREE.DoubleSide }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(node.x, 0.28, node.z);
      scene.add(ring);

      const hit = new THREE.Mesh(
        new THREE.CylinderGeometry(1.5, 1.5, 2.5, 12),
        new THREE.MeshBasicMaterial({ visible: false }),
      );
      hit.position.set(node.x, 1.3, node.z);
      scene.add(hit);

      if (idx > 0) {
        const prev = BRIDGE_NODES[idx - 1];
        const a = new THREE.Vector3(prev.x, 1.4, prev.z);
        const b = new THREE.Vector3(node.x, 1.4, node.z);
        const cable = new THREE.Mesh(
          new THREE.CylinderGeometry(0.06, 0.06, a.distanceTo(b), 8),
          new THREE.MeshBasicMaterial({ color: "#ef4444" }),
        );
        cable.position.copy(a).add(b).multiplyScalar(0.5);
        cable.quaternion.setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          b.clone().sub(a).normalize(),
        );
        scene.add(cable);
        cables.push(cable);
      }

      stations.push({
        id: node.id,
        label: node.name,
        position: new THREE.Vector3(node.x, 0, node.z),
        state: "idle",
        hitMesh: hit,
        ringMesh: ring,
      });
    });

    api.registerObstacles(obstacles);
    stationsRef.current = stations;
    cableMeshesRef.current = cables;
    api.registerStations(stations);
    return () => {};
  }, []);

  const currentNode = BRIDGE_NODES.find((n) => n.id === selectedId);

  const probeSelected = () => {
    if (!currentNode || probedIds.includes(currentNode.id)) return;
    const next = [...probedIds, currentNode.id];
    setProbedIds(next);
    onProgressRef.current(Math.min(55, next.length * 14));
  };

  return (
    <div className="relative w-full h-[540px] sm:h-[600px]">
      <ThreeMissionHarness
        bounds={{ minX: -11.4, maxX: 11.4, minZ: -2.6, maxZ: 2.6 }}
        initialPlayerPos={[-10, 0, 0.2]}
        initialCameraOffset={[0, 10, 13]}
        skyColor="#7dd3fc"
        fogColor="#dbeafe"
        cityBackdrop="sylhet"
        paused={paused}
        onSceneReady={handleSceneReady}
        onStationInteract={(id) => setSelectedId(id)}
      />

      <div className="pointer-events-none absolute bottom-32 md:bottom-4 left-1/2 -translate-x-1/2 max-w-[calc(100%-1.5rem)] z-10 rounded-xl bg-slate-950/92 border border-white/15 px-3.5 sm:px-4 py-1.5 sm:py-2 text-center shadow-xl">
        <div className="text-[10px] font-mono text-slate-400">
          {lang === "en" ? "SURMA BRIDGE DIAGNOSTIC PROBE" : "সুরমা ব্রিজ প্রোব ও স্প্লাইসার"}
        </div>
        <div className="text-xs font-mono-num font-bold text-amber-300">
          {probedIds.length}/5 {lang === "en" ? "Nodes Probed" : "নোড পরীক্ষা"} ·{" "}
          {fused
            ? lang === "en"
              ? "Splice Fused ✓"
              : "স্প্লাইস যুক্ত ✓"
            : lang === "en"
              ? "Splice Open"
              : "ত্রুটি খোলা"}
        </div>
      </div>

      {currentNode && (
        <div className="absolute bottom-32 sm:bottom-20 left-3 right-3 sm:left-auto sm:right-4 sm:w-96 max-h-[48vh] overflow-y-auto z-30 rounded-2xl bg-slate-950/95 border border-white/20 p-4 shadow-2xl space-y-3 text-white">
          <div className="flex justify-between items-center border-b border-white/10 pb-2">
            <div className="inline-flex items-center gap-2 text-xs font-bold text-amber-300">
              <Activity className="w-4 h-4" />
              <span>{currentNode.name[lang]}</span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              className="text-xs px-2 py-1 rounded bg-white/10"
            >
              ×
            </button>
          </div>

          {!probedIds.includes(currentNode.id) ? (
            <button
              type="button"
              onClick={probeSelected}
              className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-xs font-bold"
            >
              {lang === "en" ? "Run Diagnostic Probe on Node" : "এই নোডে ডায়াগনস্টিক প্রোব চালান"}
            </button>
          ) : (
            <div
              className={`p-2.5 rounded-xl text-xs font-mono ${
                pulseTested || currentNode.healthy
                  ? "bg-emerald-950 text-emerald-300 border border-emerald-500/40"
                  : "bg-rose-950 text-rose-300 border border-rose-500/40"
              }`}
            >
              {pulseTested
                ? lang === "en"
                  ? "Optical Continuity Verified ✓"
                  : "অপটিক্যাল সংযোগ সচল ✓"
                : currentNode.msg[lang]}
            </div>
          )}

          {/* Mechanical 3-Step Fiber Fusion Splicer only at Surma Splice Box after probing */}
          {currentNode.id === "h3" && spliceProbed && !pulseTested && (
            <div className="space-y-2.5 pt-2 border-t border-white/10">
              <div className="text-[11px] font-mono text-sky-300 flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5" />
                <span>
                  {lang === "en"
                    ? "FIBER FUSION SPLICER (3 STEPS)"
                    : "ফাইবার ফিউশন স্প্লাইসার (৩ ধাপ)"}
                </span>
              </div>

              <button
                type="button"
                disabled={stripped}
                onClick={() => {
                  setStripped(true);
                  onProgressRef.current(68);
                }}
                className={`w-full py-2 rounded-lg text-xs font-semibold ${
                  stripped
                    ? "bg-emerald-700/50 text-emerald-200"
                    : "bg-slate-800 hover:bg-slate-700 text-white"
                }`}
              >
                1.{" "}
                {stripped
                  ? lang === "en"
                    ? "Protective Jacket Stripped ✓"
                    : "আবরণ সরানো হয়েছে ✓"
                  : lang === "en"
                    ? "Strip Jacket & Clean Glass"
                    : "জ্যাকেট সরিয়ে কাঁচ পরিষ্কার করুন"}
              </button>

              {stripped && !fused && (
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-700 space-y-1.5">
                  <div className="flex justify-between text-[11px] font-mono-num">
                    <span>
                      2.{" "}
                      {lang === "en"
                        ? "Align Fiber Cores (Target 45–55%)"
                        : "কোর সারিবদ্ধ করুন (৪৫–৫৫%)"}
                    </span>
                    <span className={coreAligned ? "text-emerald-400 font-bold" : "text-amber-300"}>
                      {alignVal}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={alignVal}
                    onChange={(e) => setAlignVal(Number(e.target.value))}
                    className="w-full accent-rose-500 cursor-pointer"
                  />
                </div>
              )}

              <button
                type="button"
                disabled={!stripped || !coreAligned || fused}
                onClick={() => {
                  setFused(true);
                  onProgressRef.current(85);
                }}
                className={`w-full py-2 rounded-lg text-xs font-bold ${
                  fused
                    ? "bg-emerald-700/50 text-emerald-200"
                    : stripped && coreAligned
                      ? "bg-rose-600 hover:bg-rose-500 text-white"
                      : "bg-slate-800 text-slate-500 cursor-not-allowed"
                }`}
              >
                3.{" "}
                {fused
                  ? lang === "en"
                    ? "Micro-Arc Fused ✓"
                    : "আর্ক ফিউশন সম্পন্ন ✓"
                  : lang === "en"
                    ? "Trigger Arc Fusion Weld"
                    : "আর্ক ফিউশন জোড়া লাগান"}
              </button>

              {fused && (
                <button
                  type="button"
                  onClick={() => {
                    setPulseTested(true);
                    onProgressRef.current(100);
                    onCompleteRef.current();
                  }}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold inline-flex items-center justify-center gap-1.5"
                >
                  <Zap className="w-4 h-4" />
                  <span>
                    {lang === "en"
                      ? "Send Live Optical Pulse Test"
                      : "লাইভ অপটিক্যাল পালস টেস্ট পাঠান"}
                  </span>
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* =========================================================================
   SYLHET TRAIL 2 (syl-2): SIGNAL AND OBSTACLES
   3D Terrain Walk with Concrete Hall & Tilagarh Hill Colliders + Live dBm Ray
   ========================================================================= */
const SYLHET_RF_ZONES = [
  { id: "z1", x: -8, z: 4, dbm: -64, name: { en: "Surma Open Lawn", bn: "সুরমা খোলা মাঠ" } },
  {
    id: "z2",
    x: -2,
    z: -5,
    dbm: -88,
    name: { en: "Behind Concrete Hall", bn: "কংক্রিট হলের পেছনে" },
  },
  {
    id: "z3",
    x: 7,
    z: -4,
    dbm: -107,
    name: { en: "Behind Tilagarh Ridge", bn: "টিলাগড় পাহাড়ের পেছনে" },
  },
  { id: "z4", x: 8, z: 5, dbm: -74, name: { en: "Hilltop Overlook", bn: "টিলার উঁচু প্রান্ত" } },
];

const Trail10SignalObstacles3D: React.FC<Omit<TrailEngineProps, "trailId">> = ({
  paused,
  hintLevel = 0,
  onProgress,
  onComplete,
}) => {
  const { lang } = useRobiTrail();
  const [loggedIds, setLoggedIds] = useState<string[]>([]);
  const [liveDbm, setLiveDbm] = useState(-68);
  const [nearbyZoneId, setNearbyZoneId] = useState<string | null>(null);

  const stationsRef = useRef<InteractiveStation[]>([]);
  const loggedRef = useRef<string[]>([]);
  const onProgressRef = useRef(onProgress);
  const onCompleteRef = useRef(onComplete);
  onProgressRef.current = onProgress;
  onCompleteRef.current = onComplete;

  useEffect(() => {
    loggedRef.current = loggedIds;
    stationsRef.current.forEach((st) => {
      st.state = loggedIds.includes(st.id) ? "completed" : hintLevel >= 2 ? "highlighted" : "idle";
    });
  }, [loggedIds, hintLevel]);

  const handleSceneReady = useCallback((api: HarnessApi) => {
    const { scene, playerGroup } = api;

    // Signal Tower at (-10, 0, -6)
    const towerPos = new THREE.Vector3(-10, 6.2, -6);
    const mast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.55, 6.5, 8),
      new THREE.MeshStandardMaterial({ color: "#e2e8f0", metalness: 0.45 }),
    );
    mast.position.set(towerPos.x, 3.25, towerPos.z);
    mast.castShadow = true;
    scene.add(mast);

    // Obstacle 1: Concrete Hall Box
    const hall = new THREE.Mesh(
      new THREE.BoxGeometry(5, 3.6, 2.5),
      new THREE.MeshStandardMaterial({ color: "#475569", roughness: 0.85 }),
    );
    hall.position.set(-4, 1.8, -1.5);
    hall.castShadow = true;
    hall.receiveShadow = true;
    scene.add(hall);

    // Obstacle 2: Tilagarh Green Hill Ridge
    const hill = new THREE.Mesh(
      new THREE.ConeGeometry(3.4, 4.4, 7),
      new THREE.MeshStandardMaterial({ color: "#15803d", roughness: 0.9 }),
    );
    hill.position.set(4.5, 2.1, -1.0);
    hill.castShadow = true;
    scene.add(hill);

    const obstacles: ObstacleBox[] = [
      {
        minX: -6.7,
        maxX: -1.3,
        minZ: -2.9,
        maxZ: -0.1,
        maxY: 3.8,
        label: { en: "Concrete Hall", bn: "কংক্রিট হল" },
      },
      {
        minX: 1.5,
        maxX: 7.5,
        minZ: -3.6,
        maxZ: 1.6,
        maxY: 4.5,
        label: { en: "Tilagarh Ridge", bn: "টিলাগড় পাহাড়" },
      },
      {
        minX: -10.8,
        maxX: -9.2,
        minZ: -6.8,
        maxZ: -5.2,
        maxY: 6.5,
        label: { en: "Signal Tower", bn: "সিগন্যাল টাওয়ার" },
      },
    ];
    api.registerObstacles(obstacles);

    const stations: InteractiveStation[] = [];
    SYLHET_RF_ZONES.forEach((z) => {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(1.4, 1.75, 28),
        new THREE.MeshBasicMaterial({ color: "#fbbf24", side: THREE.DoubleSide }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(z.x, 0.08, z.z);
      scene.add(ring);

      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.22, 1.5, 10),
        new THREE.MeshStandardMaterial({ color: "#38bdf8" }),
      );
      post.position.set(z.x, 0.75, z.z);
      scene.add(post);

      const hit = new THREE.Mesh(
        new THREE.CylinderGeometry(1.8, 1.8, 2.2, 12),
        new THREE.MeshBasicMaterial({ visible: false }),
      );
      hit.position.set(z.x, 1.1, z.z);
      scene.add(hit);

      stations.push({
        id: z.id,
        label: z.name,
        position: new THREE.Vector3(z.x, 0, z.z),
        state: "idle",
        hitMesh: hit,
        ringMesh: ring,
      });
    });

    stationsRef.current = stations;
    api.registerStations(stations);

    // Dynamic line-of-sight RF beam between Tower and Player
    const rayMat = new THREE.MeshBasicMaterial({
      color: "#22c55e",
      transparent: true,
      opacity: 0.65,
    });
    const rayMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1, 8), rayMat);
    scene.add(rayMesh);

    const boxHall = new THREE.Box3(
      new THREE.Vector3(-6.5, 0, -2.75),
      new THREE.Vector3(-1.5, 3.6, -0.25),
    );
    const boxHill = new THREE.Box3(
      new THREE.Vector3(1.8, 0, -3.4),
      new THREE.Vector3(7.2, 4.4, 1.4),
    );
    const segRay = new THREE.Ray();

    api.setFrameUpdater(() => {
      const targetPos = playerGroup.position.clone().add(new THREE.Vector3(0, 1.2, 0));
      const dir = targetPos.clone().sub(towerPos);
      const len = Math.max(0.2, dir.length());
      rayMesh.scale.set(1, len, 1);
      rayMesh.position.copy(towerPos).add(targetPos).multiplyScalar(0.5);
      rayMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());

      segRay.set(towerPos, dir.clone().normalize());
      const hitHall = segRay.intersectBox(boxHall, new THREE.Vector3());
      const hitHill = segRay.intersectBox(boxHill, new THREE.Vector3());
      const blockedHall = hitHall !== null && hitHall.distanceTo(towerPos) < len;
      const blockedHill = hitHill !== null && hitHill.distanceTo(towerPos) < len;

      const dbm = Math.round(-54 - len * 1.15 - (blockedHall ? 18 : 0) - (blockedHill ? 22 : 0));
      setLiveDbm(dbm);
      rayMat.color.set(dbm >= -82 ? "#22c55e" : dbm >= -96 ? "#fbbf24" : "#ef4444");

      // Track closest zone for quick UI feedback
      const near = SYLHET_RF_ZONES.find(
        (z) => Math.hypot(playerGroup.position.x - z.x, playerGroup.position.z - z.z) < 2.8,
      );
      setNearbyZoneId(near ? near.id : null);
    });

    return () => {};
  }, []);

  const logZone = (id: string) => {
    if (loggedRef.current.includes(id)) return;
    const next = [...loggedRef.current, id];
    setLoggedIds(next);
    onProgressRef.current(Math.round((next.length / 4) * 100));
    if (next.length === 4) onCompleteRef.current();
  };

  return (
    <div className="relative w-full h-[540px] sm:h-[600px]">
      <ThreeMissionHarness
        bounds={{ minX: -12, maxX: 12, minZ: -8.5, maxZ: 8.5 }}
        initialPlayerPos={[-8, 0, 6]}
        initialCameraOffset={[0, 11, 13.5]}
        skyColor="#7dd3fc"
        fogColor="#dbeafe"
        cityBackdrop="sylhet"
        paused={paused}
        onSceneReady={handleSceneReady}
        onStationInteract={(id) => logZone(id)}
      />

      <div className="pointer-events-none absolute bottom-32 md:bottom-4 left-1/2 -translate-x-1/2 max-w-[calc(100%-1.5rem)] z-20 flex flex-col items-center gap-2">
        {nearbyZoneId && !loggedIds.includes(nearbyZoneId) && (
          <button
            type="button"
            onClick={() => logZone(nearbyZoneId)}
            className="pointer-events-auto px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-xl inline-flex items-center gap-2"
          >
            <Radio className="w-4 h-4" />
            <span>
              {lang === "en"
                ? `Log dBm Reading (${SYLHET_RF_ZONES.find((z) => z.id === nearbyZoneId)?.name.en})`
                : `dBm মান রেকর্ড করুন (${SYLHET_RF_ZONES.find((z) => z.id === nearbyZoneId)?.name.bn})`}
            </span>
          </button>
        )}

        <div className="rounded-xl bg-slate-950/92 border border-white/15 px-4 py-2 text-center shadow-xl">
          <div className="text-[10px] font-mono text-slate-400">
            {lang === "en"
              ? "HANDHELD RF METER · LOG 4 BEACONS"
              : "হ্যান্ডহেল্ড আরএফ মিটার · ৪টি জোন মাপুন"}
          </div>
          <div className="flex items-center justify-center gap-3 font-mono-num">
            <span
              className={`text-lg font-bold ${liveDbm >= -82 ? "text-emerald-400" : liveDbm >= -96 ? "text-amber-300" : "text-rose-400"}`}
            >
              {liveDbm} dBm
            </span>
            <span className="text-xs text-slate-300">
              {loggedIds.length}/4 {lang === "en" ? "Logged" : "সংরক্ষিত"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

/* =========================================================================
   SYLHET TRAIL 3 (syl-3): SMART DATA CHOICES
   3D Tilagarh Student Hostel Desk Stations + 7-Day Simulator Calendar
   ========================================================================= */
const Trail11SmartDataChoices3D: React.FC<Omit<TrailEngineProps, "trailId">> = ({
  paused,
  hintLevel = 0,
  onProgress,
  onComplete,
  onMistake,
}) => {
  const { lang } = useRobiTrail();
  const [activeStation, setActiveStation] = useState<
    "video" | "chat" | "tablet" | "calendar" | null
  >(null);
  const [videoQ, setVideoQ] = useState<"720p" | "360p">("720p");
  const [chatAuto, setChatAuto] = useState(true);
  const [offlineNotes, setOfflineNotes] = useState(false);
  const [simResult, setSimResult] = useState<"idle" | "pass" | "fail">("idle");

  const stationsRef = useRef<InteractiveStation[]>([]);
  const onProgressRef = useRef(onProgress);
  const onCompleteRef = useRef(onComplete);
  onProgressRef.current = onProgress;
  onCompleteRef.current = onComplete;

  const weeklyMb =
    (videoQ === "720p" ? 1450 : 620) + (chatAuto ? 680 : 190) + (offlineNotes ? 140 : 480) + 120;

  useEffect(() => {
    stationsRef.current.forEach((st) => {
      if (st.id === "video")
        st.state = videoQ === "360p" ? "completed" : hintLevel >= 2 ? "highlighted" : "idle";
      if (st.id === "chat")
        st.state = !chatAuto ? "completed" : hintLevel >= 2 ? "highlighted" : "idle";
      if (st.id === "tablet")
        st.state = offlineNotes ? "completed" : hintLevel >= 2 ? "highlighted" : "idle";
      if (st.id === "calendar")
        st.state = simResult === "pass" ? "completed" : hintLevel >= 2 ? "highlighted" : "idle";
    });
  }, [videoQ, chatAuto, offlineNotes, simResult, hintLevel]);

  const handleSceneReady = useCallback((api: HarnessApi) => {
    const { scene } = api;

    const obstacles: ObstacleBox[] = [
      {
        minX: -1.4,
        maxX: 1.4,
        minZ: -1.2,
        maxZ: 1.2,
        maxY: 1.4,
        label: { en: "Hostel Tea Table", bn: "হোস্টেল টেবিল" },
      },
    ];
    const teaTable = new THREE.Mesh(
      new THREE.BoxGeometry(2.5, 0.9, 2.2),
      new THREE.MeshStandardMaterial({ color: "#78350f", roughness: 0.75 }),
    );
    teaTable.position.set(0, 0.45, 0);
    scene.add(teaTable);
    api.registerObstacles(obstacles);

    const defs: {
      id: "video" | "chat" | "tablet" | "calendar";
      x: number;
      z: number;
      color: string;
      label: { en: string; bn: string };
    }[] = [
      {
        id: "video",
        x: -7.5,
        z: 3,
        color: "#f43f5e",
        label: { en: "Hostel Video Screen", bn: "হোস্টেল ভিডিও স্ক্রিন" },
      },
      {
        id: "chat",
        x: -7.5,
        z: -4,
        color: "#f59e0b",
        label: { en: "Messaging Terminal", bn: "চ্যাট টার্মিনাল" },
      },
      {
        id: "tablet",
        x: 7.5,
        z: 3,
        color: "#38bdf8",
        label: { en: "Study Notes Tablet", bn: "লেকচার ট্যাবলেট" },
      },
      {
        id: "calendar",
        x: 7.5,
        z: -4,
        color: "#22c55e",
        label: { en: "7-Day Calendar Console", bn: "৭-দিনের ক্যালেন্ডার" },
      },
    ];

    const stations: InteractiveStation[] = [];
    defs.forEach((d) => {
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(1.7, 1.3, 1.3),
        new THREE.MeshStandardMaterial({ color: "#334155", roughness: 0.6 }),
      );
      box.position.set(d.x, 0.65, d.z);
      scene.add(box);

      obstacles.push({
        minX: d.x - 0.9,
        maxX: d.x + 0.9,
        minZ: d.z - 0.7,
        maxZ: d.z + 0.7,
        maxY: 1.9,
        label: d.label,
      });

      const top = new THREE.Mesh(
        new THREE.BoxGeometry(1.1, 0.6, 0.35),
        new THREE.MeshStandardMaterial({
          color: d.color,
          emissive: d.color,
          emissiveIntensity: 0.4,
        }),
      );
      top.position.set(d.x, 1.6, d.z);
      scene.add(top);

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(1.4, 1.75, 28),
        new THREE.MeshBasicMaterial({ color: "#fbbf24", side: THREE.DoubleSide }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(d.x, 0.08, d.z);
      scene.add(ring);

      const hit = new THREE.Mesh(
        new THREE.CylinderGeometry(1.8, 1.8, 2.3, 12),
        new THREE.MeshBasicMaterial({ visible: false }),
      );
      hit.position.set(d.x, 1.15, d.z);
      scene.add(hit);

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
    return () => {};
  }, []);

  const runWeekSim = () => {
    if (weeklyMb <= 2000) {
      setSimResult("pass");
      onProgressRef.current(100);
      onCompleteRef.current();
    } else {
      setSimResult("fail");
      onProgressRef.current(55);
      onMistake?.(`syl3:${weeklyMb}`);
    }
  };

  return (
    <div className="relative w-full h-[540px] sm:h-[600px]">
      <ThreeMissionHarness
        bounds={{ minX: -11, maxX: 11, minZ: -8, maxZ: 8 }}
        initialPlayerPos={[0, 0, 5.5]}
        initialCameraOffset={[0, 10.5, 13.5]}
        skyColor="#7dd3fc"
        fogColor="#dbeafe"
        cityBackdrop="sylhet"
        paused={paused}
        onSceneReady={handleSceneReady}
        onStationInteract={(id) => {
          setSimResult("idle");
          setActiveStation(id as "video" | "chat" | "tablet" | "calendar");
        }}
      />

      <div className="pointer-events-none absolute bottom-32 md:bottom-4 left-1/2 -translate-x-1/2 max-w-[calc(100%-1.5rem)] z-10 rounded-xl bg-slate-950/92 border border-white/15 px-3.5 sm:px-4 py-1.5 sm:py-2 text-center shadow-xl">
        <div className="text-[10px] font-mono text-slate-400">
          {lang === "en"
            ? "NADIA WEEKLY PLAN (LIMIT 2,000 MB)"
            : "সাপ্তাহিক ডেটা বাজেট (সর্বোচ্চ ২,০০০ MB)"}
        </div>
        <div
          className={`text-lg font-mono-num font-bold ${weeklyMb <= 2000 ? "text-emerald-400" : "text-rose-400"}`}
        >
          {weeklyMb} / 2,000 MB
        </div>
      </div>

      {activeStation && (
        <div className="absolute bottom-32 sm:bottom-20 left-3 right-3 sm:left-auto sm:right-4 sm:w-96 max-h-[48vh] overflow-y-auto z-30 rounded-2xl bg-slate-950/95 border border-white/20 p-4 shadow-2xl space-y-3 text-white">
          <div className="flex justify-between items-center border-b border-white/10 pb-2">
            <span className="text-xs font-bold text-amber-300">
              {activeStation === "video"
                ? lang === "en"
                  ? "Hostel Video Quality"
                  : "হোস্টেল ভিডিও মান"
                : activeStation === "chat"
                  ? lang === "en"
                    ? "Group Chat Media"
                    : "গ্রুপ চ্যাট মিডিয়া"
                  : activeStation === "tablet"
                    ? lang === "en"
                      ? "Lecture PDF Caching"
                      : "লেকচার পিডিএফ ক্যাশিং"
                    : lang === "en"
                      ? "7-Day Weekly Simulator"
                      : "৭-দিনের সিমুলেটর"}
            </span>
            <button
              type="button"
              onClick={() => setActiveStation(null)}
              className="text-xs px-2 py-1 rounded bg-white/10"
            >
              ×
            </button>
          </div>

          {activeStation === "video" && (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setVideoQ("720p");
                  onProgressRef.current(25);
                }}
                className={`py-2 rounded-lg text-xs font-bold ${videoQ === "720p" ? "bg-rose-600" : "bg-slate-800"}`}
              >
                720p (1,450 MB)
              </button>
              <button
                type="button"
                onClick={() => {
                  setVideoQ("360p");
                  onProgressRef.current(45);
                }}
                className={`py-2 rounded-lg text-xs font-bold ${videoQ === "360p" ? "bg-emerald-600" : "bg-slate-800"}`}
              >
                360p (620 MB)
              </button>
            </div>
          )}

          {activeStation === "chat" && (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setChatAuto(true)}
                className={`py-2 rounded-lg text-xs font-bold ${chatAuto ? "bg-rose-600" : "bg-slate-800"}`}
              >
                Auto-Download (680 MB)
              </button>
              <button
                type="button"
                onClick={() => {
                  setChatAuto(false);
                  onProgressRef.current(65);
                }}
                className={`py-2 rounded-lg text-xs font-bold ${!chatAuto ? "bg-emerald-600" : "bg-slate-800"}`}
              >
                Wi-Fi / Manual (190 MB)
              </button>
            </div>
          )}

          {activeStation === "tablet" && (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setOfflineNotes(false)}
                className={`py-2 rounded-lg text-xs font-bold ${!offlineNotes ? "bg-rose-600" : "bg-slate-800"}`}
              >
                Re-stream Daily (480 MB)
              </button>
              <button
                type="button"
                onClick={() => {
                  setOfflineNotes(true);
                  onProgressRef.current(80);
                }}
                className={`py-2 rounded-lg text-xs font-bold ${offlineNotes ? "bg-emerald-600" : "bg-slate-800"}`}
              >
                Save PDF Once (140 MB)
              </button>
            </div>
          )}

          {activeStation === "calendar" && (
            <div className="space-y-2.5">
              <p className="text-xs text-slate-300">
                {lang === "en"
                  ? `Projected 7-day consumption (+120 MB Day 7 Quiz): ${weeklyMb} MB.`
                  : `সম্ভাব্য ৭ দিনের মোট খরচ (+১২০ MB কুইজ সহ): ${weeklyMb} MB।`}
              </p>
              <button
                type="button"
                onClick={runWeekSim}
                className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold"
              >
                {lang === "en" ? "Simulate 7-Day Week" : "৭ দিনের সপ্তাহ চালান"}
              </button>
              {simResult === "fail" && (
                <div className="text-xs text-rose-400 font-semibold">
                  {lang === "en"
                    ? "Exceeded 2,000 MB! Trim settings at the other desk stations."
                    : "২,০০০ MB ছাড়িয়ে গেছে! অন্য ডেস্ক থেকে খরচ কমান।"}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* =========================================================================
   SYLHET TRAIL 4 (syl-4): CONNECT THE COMMUNITY
   3D Surma Civic Catenary Fiber Topology Builder (4-Link Budget + BFS)
   ========================================================================= */
const MESH_NODES = [
  { id: "tower", x: 0, z: -5, label: { en: "Main Tower", bn: "মূল টাওয়ার" } },
  { id: "school", x: -7, z: -1, label: { en: "High School", bn: "উচ্চ বিদ্যালয়" } },
  { id: "clinic", x: 7, z: -1, label: { en: "Health Clinic", bn: "স্বাস্থ্য ক্লিনিক" } },
  { id: "ferry", x: 6, z: 5, label: { en: "Ferry Ghat", bn: "ফেরি ঘাট" } },
  { id: "coop", x: -6, z: 5, label: { en: "Tea Co-op", bn: "চা সমবায়" } },
];

const Trail12CommunityMesh3D: React.FC<Omit<TrailEngineProps, "trailId">> = ({
  paused,
  hintLevel = 0,
  onProgress,
  onComplete,
}) => {
  const { lang } = useRobiTrail();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [edges, setEdges] = useState<[string, string][]>([]);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cableGroupRef = useRef<THREE.Group | null>(null);
  const stationsRef = useRef<InteractiveStation[]>([]);
  const onProgressRef = useRef(onProgress);
  const onCompleteRef = useRef(onComplete);
  onProgressRef.current = onProgress;
  onCompleteRef.current = onComplete;

  // BFS Reachability back to 'tower'
  const reachable = new Set<string>(["tower"]);
  let changed = true;
  while (changed) {
    changed = false;
    edges.forEach(([a, b]) => {
      if (reachable.has(a) && !reachable.has(b)) {
        reachable.add(b);
        changed = true;
      } else if (reachable.has(b) && !reachable.has(a)) {
        reachable.add(a);
        changed = true;
      }
    });
  }
  const allConnected = MESH_NODES.every((n) => reachable.has(n.id));

  // Rebuild 3D overhead glowing cables whenever edges change
  useEffect(() => {
    const group = cableGroupRef.current;
    if (group) {
      while (group.children.length > 0) {
        const child = group.children[0] as THREE.Mesh;
        group.remove(child);
        child.geometry.dispose();
        (child.material as THREE.Material).dispose();
      }
      edges.forEach(([aId, bId]) => {
        const aNode = MESH_NODES.find((n) => n.id === aId);
        const bNode = MESH_NODES.find((n) => n.id === bId);
        if (!aNode || !bNode) return;
        const p1 = new THREE.Vector3(aNode.x, 2.3, aNode.z);
        const p2 = new THREE.Vector3(bNode.x, 2.3, bNode.z);
        const cable = new THREE.Mesh(
          new THREE.CylinderGeometry(0.08, 0.08, p1.distanceTo(p2), 8),
          new THREE.MeshBasicMaterial({ color: "#22c55e" }),
        );
        cable.position.copy(p1).add(p2).multiplyScalar(0.5);
        cable.quaternion.setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          p2.clone().sub(p1).normalize(),
        );
        group.add(cable);
      });
    }

    stationsRef.current.forEach((st) => {
      if (st.id === selectedNodeId) {
        st.state = "selected";
      } else if (reachable.has(st.id)) {
        st.state = "completed";
      } else {
        st.state = hintLevel >= 2 ? "highlighted" : "idle";
      }
    });
  }, [edges, selectedNodeId, hintLevel]);

  const handleSceneReady = useCallback((api: HarnessApi) => {
    const { scene } = api;
    sceneRef.current = scene;

    const cg = new THREE.Group();
    scene.add(cg);
    cableGroupRef.current = cg;

    const obstacles: ObstacleBox[] = [];
    const stations: InteractiveStation[] = [];
    MESH_NODES.forEach((node) => {
      const bldg = new THREE.Mesh(
        node.id === "tower"
          ? new THREE.CylinderGeometry(0.45, 0.8, 5.5, 8)
          : new THREE.BoxGeometry(1.9, 2.1, 1.9),
        new THREE.MeshStandardMaterial({
          color: node.id === "tower" ? "#e2e8f0" : "#334155",
          roughness: 0.6,
        }),
      );
      bldg.position.set(node.x, node.id === "tower" ? 2.75 : 1.05, node.z);
      bldg.castShadow = true;
      scene.add(bldg);

      obstacles.push({
        minX: node.x - 1.0,
        maxX: node.x + 1.0,
        minZ: node.z - 1.0,
        maxZ: node.z + 1.0,
        maxY: node.id === "tower" ? 5.6 : 2.3,
        label: node.label,
      });

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(1.4, 1.75, 28),
        new THREE.MeshBasicMaterial({ color: "#fbbf24", side: THREE.DoubleSide }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(node.x, 0.08, node.z);
      scene.add(ring);

      const hit = new THREE.Mesh(
        new THREE.CylinderGeometry(1.8, 1.8, 3, 12),
        new THREE.MeshBasicMaterial({ visible: false }),
      );
      hit.position.set(node.x, 1.5, node.z);
      scene.add(hit);

      stations.push({
        id: node.id,
        label: node.label,
        position: new THREE.Vector3(node.x, 0, node.z),
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

  const handleNodeInteract = (id: string) => {
    if (!selectedNodeId) {
      setSelectedNodeId(id);
      return;
    }
    if (selectedNodeId === id) {
      setSelectedNodeId(null);
      return;
    }
    const exists = edges.some(
      ([a, b]) => (a === selectedNodeId && b === id) || (a === id && b === selectedNodeId),
    );
    if (exists || edges.length >= 4) {
      setSelectedNodeId(null);
      return;
    }
    const nextEdges: [string, string][] = [...edges, [selectedNodeId, id]];
    setEdges(nextEdges);
    setSelectedNodeId(null);

    const checkSet = new Set<string>(["tower"]);
    let mod = true;
    while (mod) {
      mod = false;
      nextEdges.forEach(([a, b]) => {
        if (checkSet.has(a) && !checkSet.has(b)) {
          checkSet.add(b);
          mod = true;
        } else if (checkSet.has(b) && !checkSet.has(a)) {
          checkSet.add(a);
          mod = true;
        }
      });
    }
    onProgressRef.current(Math.round((checkSet.size / 5) * 100));
    if (checkSet.size === 5) onCompleteRef.current();
  };

  return (
    <div className="relative w-full h-[540px] sm:h-[600px]">
      <ThreeMissionHarness
        bounds={{ minX: -11, maxX: 11, minZ: -8, maxZ: 8 }}
        initialPlayerPos={[0, 0, 1]}
        initialCameraOffset={[0, 12, 14]}
        skyColor="#7dd3fc"
        fogColor="#dbeafe"
        cityBackdrop="sylhet"
        paused={paused}
        onSceneReady={handleSceneReady}
        onStationInteract={handleNodeInteract}
      />

      <div className="pointer-events-none absolute bottom-32 md:bottom-4 left-1/2 -translate-x-1/2 max-w-[calc(100%-1.5rem)] z-20 flex flex-col items-center gap-2">
        {selectedNodeId && (
          <div className="px-4 py-2 rounded-xl bg-sky-600 text-white text-xs font-bold shadow-xl inline-flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>
              {lang === "en"
                ? `Cable latched on ${MESH_NODES.find((n) => n.id === selectedNodeId)?.label.en} — click destination building!`
                : `${MESH_NODES.find((n) => n.id === selectedNodeId)?.label.bn} থেকে দ্বিতীয় ভবনে ক্লিক করুন!`}
            </span>
          </div>
        )}

        <div className="pointer-events-auto rounded-xl bg-slate-950/92 border border-white/15 px-4 py-2 flex items-center gap-4 shadow-xl">
          <div>
            <div className="text-[10px] font-mono text-slate-400">
              {lang === "en" ? "CABLE BUDGET (4 MAX)" : "কেবল বাজেট (সর্বোচ্চ ৪)"}
            </div>
            <div className="text-sm font-mono-num font-bold text-amber-300">
              {edges.length}/4 · {reachable.size}/5 {lang === "en" ? "Online" : "সচল"}
            </div>
          </div>
          {edges.length > 0 && !allConnected && (
            <button
              type="button"
              onClick={() => {
                setEdges([]);
                setSelectedNodeId(null);
                onProgressRef.current(20);
              }}
              className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-white"
            >
              {lang === "en" ? "Clear Cables" : "তার সরান"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export const SylhetTrailsPart1: React.FC<TrailEngineProps> = ({
  trailId,
  paused,
  hintLevel,
  onProgress,
  onComplete,
  onMistake,
}) => {
  if (trailId === "syl-1") {
    return (
      <Trail9LostConnection3D
        paused={paused}
        hintLevel={hintLevel}
        onProgress={onProgress}
        onComplete={onComplete}
      />
    );
  }
  if (trailId === "syl-2") {
    return (
      <Trail10SignalObstacles3D
        paused={paused}
        hintLevel={hintLevel}
        onProgress={onProgress}
        onComplete={onComplete}
      />
    );
  }
  if (trailId === "syl-3") {
    return (
      <Trail11SmartDataChoices3D
        paused={paused}
        hintLevel={hintLevel}
        onProgress={onProgress}
        onComplete={onComplete}
        onMistake={onMistake}
      />
    );
  }
  return (
    <Trail12CommunityMesh3D
      paused={paused}
      hintLevel={hintLevel}
      onProgress={onProgress}
      onComplete={onComplete}
    />
  );
};
