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
import { CheckCircle2, Radio, Sun, CloudRain, Moon, Zap } from "lucide-react";

/* =========================================================================
   SYLHET TRAIL 5 (syl-5): THE NETWORK JOURNEY
   3D Amberkhana 6-Rack Hardware Walkthrough
   ========================================================================= */
const RACK_STAGES = [
  {
    id: "r1",
    x: -10,
    z: -2.5,
    title: { en: "01 · Voice Encoder", bn: "০১ · কণ্ঠ এনকোডার" },
    wave: "Analog Audio → 010110",
  },
  {
    id: "r2",
    x: -6,
    z: 2.5,
    title: { en: "02 · RF Modulator", bn: "০২ · রেডিও মডুলেটর" },
    wave: "1800 MHz Carrier Wave",
  },
  {
    id: "r3",
    x: -2,
    z: -2.5,
    title: { en: "03 · Tower Sector", bn: "০৩ · টাওয়ার সেক্টর" },
    wave: "Wireless Uplink",
  },
  {
    id: "r4",
    x: 2,
    z: 2.5,
    title: { en: "04 · Optical Fiber", bn: "০৪ · অপটিক্যাল ফাইবার" },
    wave: "Laser Light Pulses",
  },
  {
    id: "r5",
    x: 6,
    z: -2.5,
    title: { en: "05 · Core Switch", bn: "০৫ · কোর সুইচ" },
    wave: "Subscriber Routing",
  },
  {
    id: "r6",
    x: 10,
    z: 2.5,
    title: { en: "06 · Receiver Decode", bn: "০৬ · গ্রাহক ডিকোডার" },
    wave: "010110 → Clear Voice",
  },
];

const Trail13NetworkJourney3D: React.FC<Omit<TrailEngineProps, "trailId">> = ({
  paused,
  hintLevel = 0,
  onProgress,
  onComplete,
  onMistake,
}) => {
  const { lang } = useRobiTrail();
  const [step, setStep] = useState(0);
  const [errorCue, setErrorCue] = useState("");

  const stationsRef = useRef<InteractiveStation[]>([]);
  const stepRef = useRef(0);
  const onProgressRef = useRef(onProgress);
  const onCompleteRef = useRef(onComplete);
  const onMistakeRef = useRef(onMistake);
  onProgressRef.current = onProgress;
  onCompleteRef.current = onComplete;
  onMistakeRef.current = onMistake;

  useEffect(() => {
    stepRef.current = step;
    stationsRef.current.forEach((st, idx) => {
      if (idx < step) st.state = "completed";
      else if (idx === step) st.state = hintLevel >= 2 ? "highlighted" : "selected";
      else st.state = "idle";
    });
  }, [step, hintLevel]);

  const handleSceneReady = useCallback((api: HarnessApi) => {
    const { scene } = api;

    const aisle = new THREE.Mesh(
      new THREE.BoxGeometry(24, 0.08, 3.2),
      new THREE.MeshStandardMaterial({ color: "#1e293b", roughness: 0.85 }),
    );
    aisle.position.set(0, 0.04, 0);
    scene.add(aisle);

    const obstacles: ObstacleBox[] = [];
    const stations: InteractiveStation[] = [];
    RACK_STAGES.forEach((rk, idx) => {
      const rack = new THREE.Mesh(
        new THREE.BoxGeometry(1.4, 2.6, 1.1),
        new THREE.MeshStandardMaterial({ color: "#334155", metalness: 0.4, roughness: 0.5 }),
      );
      rack.position.set(rk.x, 1.3, rk.z);
      rack.castShadow = true;
      scene.add(rack);

      obstacles.push({
        minX: rk.x - 0.75,
        maxX: rk.x + 0.75,
        minZ: rk.z - 0.6,
        maxZ: rk.z + 0.6,
        maxY: 2.7,
        label: rk.title,
      });

      const led = new THREE.Mesh(
        new THREE.BoxGeometry(1.0, 0.35, 0.15),
        new THREE.MeshStandardMaterial({
          color: "#38bdf8",
          emissive: "#0284c7",
          emissiveIntensity: 0.6,
        }),
      );
      led.position.set(rk.x, 2.2, rk.z + (rk.z > 0 ? -0.6 : 0.6));
      scene.add(led);

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(1.25, 1.58, 26),
        new THREE.MeshBasicMaterial({ color: "#fbbf24", side: THREE.DoubleSide }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(rk.x, 0.09, rk.z);
      scene.add(ring);

      const hit = new THREE.Mesh(
        new THREE.CylinderGeometry(1.6, 1.6, 2.8, 12),
        new THREE.MeshBasicMaterial({ visible: false }),
      );
      hit.position.set(rk.x, 1.4, rk.z);
      scene.add(hit);

      if (idx > 0) {
        const prev = RACK_STAGES[idx - 1];
        const p1 = new THREE.Vector3(prev.x, 2.5, prev.z);
        const p2 = new THREE.Vector3(rk.x, 2.5, rk.z);
        const conduit = new THREE.Mesh(
          new THREE.CylinderGeometry(0.06, 0.06, p1.distanceTo(p2), 8),
          new THREE.MeshBasicMaterial({ color: "#38bdf8", transparent: true, opacity: 0.5 }),
        );
        conduit.position.copy(p1).add(p2).multiplyScalar(0.5);
        conduit.quaternion.setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          p2.clone().sub(p1).normalize(),
        );
        scene.add(conduit);
      }

      stations.push({
        id: rk.id,
        label: rk.title,
        position: new THREE.Vector3(rk.x, 0, rk.z),
        state: idx === 0 ? "selected" : "idle",
        hitMesh: hit,
        ringMesh: ring,
      });
    });

    api.registerObstacles(obstacles);
    stationsRef.current = stations;
    api.registerStations(stations);
    return () => {};
  }, []);

  const activateRack = (id: string) => {
    const idx = RACK_STAGES.findIndex((r) => r.id === id);
    if (idx === stepRef.current) {
      const next = stepRef.current + 1;
      setStep(next);
      setErrorCue("");
      onProgressRef.current(Math.round((next / 6) * 100));
      if (next === 6) onCompleteRef.current();
    } else if (idx > stepRef.current) {
      onMistakeRef.current?.(`syl5:rack_${id}:step_${stepRef.current}`);
      setErrorCue(
        lang === "en"
          ? `Activate Stage 0${stepRef.current + 1} (${RACK_STAGES[stepRef.current].title.en}) before jumping ahead!`
          : `আগে ধাপ ০${stepRef.current + 1} সক্রিয় করুন!`,
      );
    }
  };

  return (
    <div className="relative w-full h-[540px] sm:h-[600px]">
      <ThreeMissionHarness
        bounds={{ minX: -12, maxX: 12, minZ: -6, maxZ: 6 }}
        initialPlayerPos={[-10, 0, 1]}
        initialCameraOffset={[0, 9.5, 12.5]}
        skyColor="#7dd3fc"
        fogColor="#dbeafe"
        cityBackdrop="sylhet"
        paused={paused}
        onSceneReady={handleSceneReady}
        onStationInteract={activateRack}
      />

      <div className="pointer-events-none absolute bottom-32 md:bottom-4 left-1/2 -translate-x-1/2 max-w-[calc(100%-1.5rem)] z-20 flex flex-col items-center gap-2">
        {errorCue && (
          <div className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold shadow-xl">
            {errorCue}
          </div>
        )}

        <div className="rounded-xl bg-slate-950/92 border border-white/15 px-4 py-2 text-center shadow-xl">
          <div className="text-[10px] font-mono text-slate-400">
            {lang === "en" ? "SIGNAL TRANSFORMATION RACKS" : "সিগন্যাল রূপান্তর ধাপ"}
          </div>
          <div className="text-sm font-mono-num font-bold text-emerald-400">
            {step}/6 {step < 6 ? `· Next: ${RACK_STAGES[step].wave}` : "· Complete ✓"}
          </div>
        </div>
      </div>
    </div>
  );
};

/* =========================================================================
   SYLHET TRAIL 6 (syl-6): DIGITAL DAY
   3D Subhanighat Square with Dynamic Time-of-Day Lighting & 4 Kiosks
   ========================================================================= */
const DAY_KIOSKS = [
  {
    id: "morning",
    x: -7,
    z: 4,
    sky: "#7dd3fc",
    title: { en: "08:00 AM · Bus QR Gate", bn: "সকাল ৮টা · বাস কিউআর" },
    desc: {
      en: "Clear morning street 4G. Scan your commuter bus pass quickly.",
      bn: "সকালের পরিষ্কার রাস্তায় ৪জি সচল—বাসের কিউআর স্ক্যান করুন।",
    },
    best: "data",
  },
  {
    id: "noon",
    x: -7,
    z: -4,
    sky: "#60a5fa",
    title: { en: "01:00 PM · Campus Lecture", bn: "দুপুর ১টা · অনলাইন ক্লাস" },
    desc: {
      en: "Lunch study break on modest data pack. Join your math session cleanly.",
      bn: "মাঝারি ডেটা প্যাকে গণিত ক্লাস করতে হবে।",
    },
    best: "sd",
  },
  {
    id: "rain",
    x: 7,
    z: -4,
    sky: "#64748b",
    title: { en: "05:30 PM · Monsoon Rain", bn: "বিকেল ৫:৩০ · ভারী বৃষ্টি" },
    desc: {
      en: "Heavy rain weakens 4G & phone battery is 12%. Alert family safely.",
      bn: "ভারী বৃষ্টিতে ৪জি দুর্বল ও ব্যাটারি ১২%—পরিবারকে খবর দিন।",
    },
    best: "sms",
  },
  {
    id: "night",
    x: 7,
    z: 4,
    sky: "#1e3a5f",
    title: { en: "09:00 PM · Home Study Desk", bn: "রাত ৯টা · বাসার ওয়াই-ফাই" },
    desc: {
      en: "Back home near broadband Wi-Fi. Download heavy science archives.",
      bn: "বাসায় ফিরে এসেছেন—বড় পড়াশোনার ফাইল নামান।",
    },
    best: "wifi",
  },
];

const Trail14DigitalDay3D: React.FC<Omit<TrailEngineProps, "trailId">> = ({
  paused,
  hintLevel = 0,
  onProgress,
  onComplete,
  onMistake,
}) => {
  const { lang } = useRobiTrail();
  const [slotIndex, setSlotIndex] = useState(0);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [errorCue, setErrorCue] = useState("");

  const stationsRef = useRef<InteractiveStation[]>([]);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const onProgressRef = useRef(onProgress);
  const onCompleteRef = useRef(onComplete);
  onProgressRef.current = onProgress;
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const activeKioskId = DAY_KIOSKS[slotIndex]?.id;
    stationsRef.current.forEach((st, idx) => {
      if (idx < slotIndex) st.state = "completed";
      else if (st.id === activeKioskId) st.state = hintLevel >= 2 ? "highlighted" : "selected";
      else st.state = "idle";
    });
    if (sceneRef.current && DAY_KIOSKS[slotIndex]) {
      const col = new THREE.Color(DAY_KIOSKS[slotIndex].sky);
      sceneRef.current.background = col;
      if (sceneRef.current.fog) sceneRef.current.fog.color.copy(col);
    }
  }, [slotIndex, hintLevel]);

  const handleSceneReady = useCallback((api: HarnessApi) => {
    const { scene } = api;
    sceneRef.current = scene;

    // Subhanighat central clock spire
    const spire = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 5.2, 1.5),
      new THREE.MeshStandardMaterial({ color: "#e2e8f0", roughness: 0.5 }),
    );
    spire.position.set(0, 2.6, 0);
    scene.add(spire);

    const obstacles: ObstacleBox[] = [
      {
        minX: -0.8,
        maxX: 0.8,
        minZ: -0.8,
        maxZ: 0.8,
        maxY: 5.4,
        label: { en: "Subhanighat Clock Spire", bn: "সুবহানীঘাট ক্লক টাওয়ার" },
      },
    ];

    const stations: InteractiveStation[] = [];
    DAY_KIOSKS.forEach((k, idx) => {
      const booth = new THREE.Mesh(
        new THREE.CylinderGeometry(0.75, 0.85, 2.2, 10),
        new THREE.MeshStandardMaterial({ color: "#334155", roughness: 0.65 }),
      );
      booth.position.set(k.x, 1.1, k.z);
      scene.add(booth);

      obstacles.push({
        minX: k.x - 0.85,
        maxX: k.x + 0.85,
        minZ: k.z - 0.85,
        maxZ: k.z + 0.85,
        maxY: 2.3,
        label: k.title,
      });

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(1.3, 1.65, 26),
        new THREE.MeshBasicMaterial({ color: "#fbbf24", side: THREE.DoubleSide }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(k.x, 0.08, k.z);
      scene.add(ring);

      const hit = new THREE.Mesh(
        new THREE.CylinderGeometry(1.7, 1.7, 2.5, 12),
        new THREE.MeshBasicMaterial({ visible: false }),
      );
      hit.position.set(k.x, 1.25, k.z);
      scene.add(hit);

      stations.push({
        id: k.id,
        label: k.title,
        position: new THREE.Vector3(k.x, 0, k.z),
        state: idx === 0 ? "selected" : "idle",
        hitMesh: hit,
        ringMesh: ring,
      });
    });

    api.registerObstacles(obstacles);
    stationsRef.current = stations;
    api.registerStations(stations);
    return () => {};
  }, []);

  const expectedKiosk = DAY_KIOSKS[slotIndex];
  const currentKiosk = DAY_KIOSKS.find((k) => k.id === activeId);

  const pickAction = (opt: "data" | "sd" | "sms" | "wifi") => {
    if (!currentKiosk || currentKiosk.id !== expectedKiosk?.id) return;
    if (opt === currentKiosk.best) {
      const next = slotIndex + 1;
      setSlotIndex(next);
      setActiveId(null);
      setErrorCue("");
      onProgressRef.current(Math.round((next / 4) * 100));
      if (next === 4) onCompleteRef.current();
    } else {
      onMistake?.(`syl6:${currentKiosk.id}:${opt}`);
      setErrorCue(
        lang === "en"
          ? "That strains battery or weak monsoon signal—choose the smart fit for this hour."
          : "এই সময়ের আবহাওয়া বা ব্যাটারির সাথে মানানসই নয়—সঠিক সেবাটি বেছে নিন।",
      );
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
          setErrorCue("");
          if (id === expectedKiosk?.id) {
            setActiveId(id);
          } else if (expectedKiosk) {
            setErrorCue(
              lang === "en"
                ? `Visit ${expectedKiosk.title.en} next!`
                : `প্রথমে ${expectedKiosk.title.bn} কিয়স্কে যান!`,
            );
          }
        }}
      />

      <div className="pointer-events-none absolute bottom-32 md:bottom-4 left-1/2 -translate-x-1/2 max-w-[calc(100%-1.5rem)] z-20 flex flex-col items-center gap-2">
        {!currentKiosk && errorCue && (
          <div className="px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-bold shadow-xl">
            {errorCue}
          </div>
        )}

        <div className="rounded-xl bg-slate-950/92 border border-white/15 px-3.5 sm:px-4 py-1.5 sm:py-2 text-center shadow-xl">
          <div className="text-[10px] font-mono text-slate-400">
            {lang === "en" ? "SUBHANIGHAT DIGITAL CLOCK" : "সুবহানীঘাট ডিজিটাল দিনলিপি"}
          </div>
          <div className="text-xs font-mono-num font-bold text-amber-300 inline-flex items-center gap-1.5">
            {slotIndex === 0 && <Sun className="w-3.5 h-3.5 text-amber-300" />}
            {slotIndex === 1 && <Sun className="w-3.5 h-3.5 text-sky-300" />}
            {slotIndex === 2 && <CloudRain className="w-3.5 h-3.5 text-sky-400" />}
            {slotIndex >= 3 && <Moon className="w-3.5 h-3.5 text-indigo-300" />}
            <span>
              {slotIndex}/4 {expectedKiosk ? expectedKiosk.title[lang] : "Complete ✓"}
            </span>
          </div>
        </div>
      </div>

      {currentKiosk && (
        <div className="absolute bottom-32 sm:bottom-20 left-3 right-3 sm:left-auto sm:right-4 sm:w-96 max-h-[48vh] overflow-y-auto z-30 rounded-2xl bg-slate-950/95 border border-white/20 p-4 shadow-2xl space-y-3 text-white">
          <div className="flex justify-between items-start gap-2">
            <div>
              <div className="text-xs font-bold text-amber-300">{currentKiosk.title[lang]}</div>
              <p className="text-xs text-slate-200 mt-1">{currentKiosk.desc[lang]}</p>
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
              {
                id: "data" as const,
                label: { en: "Light 4G Ticket (<1 MB)", bn: "হালকা ৪জি টিকিট" },
              },
              { id: "sd" as const, label: { en: "360p Study Stream", bn: "৩৬০পি ক্লাস" } },
              { id: "sms" as const, label: { en: "Low-Battery SMS", bn: "হালকা এসএমএস" } },
              { id: "wifi" as const, label: { en: "Home Broadband Wi-Fi", bn: "বাসার ওয়াই-ফাই" } },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => pickAction(opt.id)}
                className="p-2.5 rounded-lg bg-slate-800 hover:bg-rose-600 text-xs font-semibold transition-colors"
              >
                {opt.label[lang]}
              </button>
            ))}
          </div>
          {errorCue && <div className="text-xs text-rose-400 font-semibold">{errorCue}</div>}
        </div>
      )}
    </div>
  );
};

/* =========================================================================
   SYLHET TRAIL 7 (syl-7): THE FINAL CONNECTION
   3D Three-City Corridor Tabletop Capstone (Chattogram + Dhaka + Sylhet)
   ========================================================================= */
const Trail15FinalConnection3D: React.FC<Omit<TrailEngineProps, "trailId">> = ({
  paused,
  hintLevel = 0,
  onProgress,
  onComplete,
}) => {
  const { lang } = useRobiTrail();
  const [activeZone, setActiveZone] = useState<"ctg" | "dhk" | "syl" | null>(null);
  const [ctgHeight, setCtgHeight] = useState(8);
  const [dhkLoad, setDhkLoad] = useState(112);
  const [sylAlign, setSylAlign] = useState(15);
  const [sylFused, setSylFused] = useState(false);
  const [corridorIgnited, setCorridorIgnited] = useState(false);

  const stationsRef = useRef<InteractiveStation[]>([]);
  const corridorBeamsRef = useRef<THREE.Mesh[]>([]);
  const onProgressRef = useRef(onProgress);
  const onCompleteRef = useRef(onComplete);
  onProgressRef.current = onProgress;
  onCompleteRef.current = onComplete;

  const ctgOk = ctgHeight >= 15;
  const dhkOk = dhkLoad < 75;
  const sylOk = sylFused;
  const allThreeReady = ctgOk && dhkOk && sylOk;

  useEffect(() => {
    const count = (ctgOk ? 1 : 0) + (dhkOk ? 1 : 0) + (sylOk ? 1 : 0);
    if (!corridorIgnited) onProgressRef.current(Math.max(10, count * 28));

    stationsRef.current.forEach((st) => {
      const ok =
        (st.id === "ctg" && ctgOk) || (st.id === "dhk" && dhkOk) || (st.id === "syl" && sylOk);
      st.state = ok ? "completed" : hintLevel >= 2 ? "highlighted" : "idle";
    });

    corridorBeamsRef.current.forEach((b) => {
      const mat = b.material as THREE.MeshBasicMaterial;
      mat.color.set(corridorIgnited ? "#22c55e" : allThreeReady ? "#fbbf24" : "#ef4444");
    });
  }, [ctgOk, dhkOk, sylOk, corridorIgnited, allThreeReady, hintLevel]);

  const handleSceneReady = useCallback((api: HarnessApi) => {
    const { scene } = api;

    const defs: {
      id: "ctg" | "dhk" | "syl";
      x: number;
      z: number;
      color: string;
      label: { en: string; bn: string };
    }[] = [
      {
        id: "ctg",
        x: -8.5,
        z: 0,
        color: "#0284c7",
        label: { en: "Chattogram Ridge Tower", bn: "চট্টগ্রাম রিলে টাওয়ার" },
      },
      {
        id: "dhk",
        x: 0,
        z: -3.5,
        color: "#f43f5e",
        label: { en: "Dhaka Sector Console", bn: "ঢাকা সেক্টর কনসোল" },
      },
      {
        id: "syl",
        x: 8.5,
        z: 0,
        color: "#22c55e",
        label: { en: "Sylhet Bridge Splice", bn: "সিলেট ফাইবার স্প্লাইস" },
      },
    ];

    const obstacles: ObstacleBox[] = [];
    const stations: InteractiveStation[] = [];
    const beams: THREE.Mesh[] = [];

    defs.forEach((d, idx) => {
      const plinth = new THREE.Mesh(
        new THREE.CylinderGeometry(1.4, 1.6, 0.6, 16),
        new THREE.MeshStandardMaterial({ color: "#1e293b", roughness: 0.7 }),
      );
      plinth.position.set(d.x, 0.3, d.z);
      scene.add(plinth);

      obstacles.push({
        minX: d.x - 1.35,
        maxX: d.x + 1.35,
        minZ: d.z - 1.35,
        maxZ: d.z + 1.35,
        maxY: 4.5,
        label: d.label,
      });

      const prop = new THREE.Mesh(
        idx === 0
          ? new THREE.CylinderGeometry(0.25, 0.45, 4.2, 8)
          : new THREE.BoxGeometry(1.6, 2.2, 1.3),
        new THREE.MeshStandardMaterial({
          color: d.color,
          emissive: d.color,
          emissiveIntensity: 0.35,
        }),
      );
      prop.position.set(d.x, idx === 0 ? 2.4 : 1.4, d.z);
      scene.add(prop);

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(1.7, 2.05, 28),
        new THREE.MeshBasicMaterial({ color: "#fbbf24", side: THREE.DoubleSide }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(d.x, 0.08, d.z);
      scene.add(ring);

      const hit = new THREE.Mesh(
        new THREE.CylinderGeometry(2.0, 2.0, 3.2, 12),
        new THREE.MeshBasicMaterial({ visible: false }),
      );
      hit.position.set(d.x, 1.6, d.z);
      scene.add(hit);

      if (idx > 0) {
        const prev = defs[idx - 1];
        const a = new THREE.Vector3(prev.x, 2.6, prev.z);
        const b = new THREE.Vector3(d.x, 2.6, d.z);
        const beam = new THREE.Mesh(
          new THREE.CylinderGeometry(0.08, 0.08, a.distanceTo(b), 8),
          new THREE.MeshBasicMaterial({ color: "#ef4444" }),
        );
        beam.position.copy(a).add(b).multiplyScalar(0.5);
        beam.quaternion.setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          b.clone().sub(a).normalize(),
        );
        scene.add(beam);
        beams.push(beam);
      }

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
    corridorBeamsRef.current = beams;
    api.registerStations(stations);
    return () => {};
  }, []);

  return (
    <div className="relative w-full h-[540px] sm:h-[600px]">
      <ThreeMissionHarness
        bounds={{ minX: -12, maxX: 12, minZ: -8, maxZ: 8 }}
        initialPlayerPos={[0, 0, 5.5]}
        initialCameraOffset={[0, 11, 14]}
        skyColor="#7dd3fc"
        fogColor="#dbeafe"
        cityBackdrop="sylhet"
        paused={paused}
        onSceneReady={handleSceneReady}
        onStationInteract={(id) => setActiveZone(id as "ctg" | "dhk" | "syl")}
      />

      <div className="pointer-events-none absolute bottom-32 md:bottom-4 left-1/2 -translate-x-1/2 max-w-[calc(100%-1.5rem)] z-20 flex flex-col items-center gap-2">
        {!activeZone && allThreeReady && !corridorIgnited && (
          <button
            type="button"
            onClick={() => {
              setCorridorIgnited(true);
              onProgressRef.current(100);
              onCompleteRef.current();
            }}
            className="pointer-events-auto px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-2xl inline-flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>
              {lang === "en" ? "Ignite Unified National Corridor!" : "জাতীয় করিডোর সচল করুন!"}
            </span>
          </button>
        )}

        <div className="rounded-xl bg-slate-950/92 border border-white/15 px-3.5 sm:px-4 py-1.5 sm:py-2 text-center shadow-xl">
          <div className="text-[10px] font-mono text-slate-400">
            {lang === "en" ? "3-CITY CORRIDOR CONTROL" : "৩ শহরের করিডোর কন্ট্রোল"}
          </div>
          <div className="text-xs font-mono-num font-bold text-amber-300">
            CTG {ctgOk ? "✓" : "·"} · DHK {dhkOk ? "✓" : "·"} · SYL {sylOk ? "✓" : "·"}
          </div>
        </div>
      </div>

      {activeZone && (
        <div className="absolute bottom-32 sm:bottom-20 left-3 right-3 sm:left-auto sm:right-4 sm:w-96 max-h-[48vh] overflow-y-auto z-30 rounded-2xl bg-slate-950/95 border border-white/20 p-4 shadow-2xl space-y-3 text-white">
          <div className="flex justify-between items-center border-b border-white/10 pb-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-300">
              <Radio className="w-4 h-4" />
              <span>
                {activeZone === "ctg"
                  ? lang === "en"
                    ? "Chattogram Mast Height"
                    : "চট্টগ্রাম মাস্তুল উচ্চতা"
                  : activeZone === "dhk"
                    ? lang === "en"
                      ? "Dhaka Evening Sector Load"
                      : "ঢাকা সেক্টর লোড"
                    : lang === "en"
                      ? "Sylhet Fiber Arc Splice"
                      : "সিলেট ফাইবার স্প্লাইস"}
              </span>
            </span>
            <button
              type="button"
              onClick={() => setActiveZone(null)}
              className="text-xs px-2 py-1 rounded bg-white/10"
            >
              ×
            </button>
          </div>

          {activeZone === "ctg" && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono-num">
                <span>
                  {lang === "en" ? "Tower Elevation (Need ≥ 15m)" : "টাওয়ারের উচ্চতা (কমপক্ষে ১৫ মি)"}
                </span>
                <span className={ctgOk ? "text-emerald-400 font-bold" : "text-amber-300"}>
                  {ctgHeight} m
                </span>
              </div>
              <input
                type="range"
                min={6}
                max={20}
                value={ctgHeight}
                onChange={(e) => setCtgHeight(Number(e.target.value))}
                className="w-full accent-rose-500 cursor-pointer"
              />
            </div>
          )}

          {activeZone === "dhk" && (
            <div className="space-y-2">
              <div className="text-xs font-mono-num">
                {lang === "en" ? "Current Load:" : "বর্তমান লোড:"}{" "}
                <span className={dhkOk ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                  {dhkLoad}%
                </span>
              </div>
              <button
                type="button"
                onClick={() => setDhkLoad(58)}
                className={`w-full py-2.5 rounded-xl text-xs font-bold ${dhkOk ? "bg-emerald-600" : "bg-rose-600 hover:bg-rose-500"}`}
              >
                {dhkOk
                  ? lang === "en"
                    ? "Balanced at 58% Load ✓"
                    : "৫৮%-এ স্থিতিশীল ✓"
                  : lang === "en"
                    ? "Shift Heavy Cloud Backups Off-Peak (58%)"
                    : "ব্যাকআপ অফ-পিকে সরিয়ে ৫৮%-এ আনুন"}
              </button>
            </div>
          )}

          {activeZone === "syl" && (
            <div className="space-y-2">
              <div className="flex justify-between text-[11px] font-mono-num">
                <span>
                  {lang === "en" ? "Align Core Splice (45–55%)" : "কোর সারিবদ্ধ করুন (৪৫–৫৫%)"}
                </span>
                <span
                  className={
                    sylAlign >= 45 && sylAlign <= 55 ? "text-emerald-400" : "text-amber-300"
                  }
                >
                  {sylAlign}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={sylAlign}
                onChange={(e) => setSylAlign(Number(e.target.value))}
                disabled={sylFused}
                className="w-full accent-rose-500 cursor-pointer"
              />
              <button
                type="button"
                disabled={sylFused || sylAlign < 45 || sylAlign > 55}
                onClick={() => setSylFused(true)}
                className={`w-full py-2.5 rounded-xl text-xs font-bold ${
                  sylFused
                    ? "bg-emerald-600 text-white"
                    : sylAlign >= 45 && sylAlign <= 55
                      ? "bg-rose-600 hover:bg-rose-500 text-white"
                      : "bg-slate-800 text-slate-400"
                }`}
              >
                {sylFused
                  ? lang === "en"
                    ? "Sylhet Fiber Fused ✓"
                    : "সিলেট ফাইবার যুক্ত ✓"
                  : lang === "en"
                    ? "Weld Fiber Splice"
                    : "ফাইবার জোড়া লাগান"}
              </button>
            </div>
          )}

          {allThreeReady && !corridorIgnited && (
            <button
              type="button"
              onClick={() => {
                setCorridorIgnited(true);
                setActiveZone(null);
                onProgressRef.current(100);
                onCompleteRef.current();
              }}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold inline-flex items-center justify-center gap-1.5"
            >
              <Zap className="w-4 h-4" />
              <span>
                {lang === "en" ? "Ignite 3-City Laser Corridor!" : "৩ শহরের লেজার করিডোর চালু করুন!"}
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export const SylhetTrailsPart2: React.FC<TrailEngineProps> = ({
  trailId,
  paused,
  hintLevel,
  onProgress,
  onComplete,
  onMistake,
}) => {
  if (trailId === "syl-5") {
    return (
      <Trail13NetworkJourney3D
        paused={paused}
        hintLevel={hintLevel}
        onProgress={onProgress}
        onComplete={onComplete}
        onMistake={onMistake}
      />
    );
  }
  if (trailId === "syl-6") {
    return (
      <Trail14DigitalDay3D
        paused={paused}
        hintLevel={hintLevel}
        onProgress={onProgress}
        onComplete={onComplete}
        onMistake={onMistake}
      />
    );
  }
  return (
    <Trail15FinalConnection3D
      paused={paused}
      hintLevel={hintLevel}
      onProgress={onProgress}
      onComplete={onComplete}
    />
  );
};
