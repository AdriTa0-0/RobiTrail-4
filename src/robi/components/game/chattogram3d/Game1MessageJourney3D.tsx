import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useRobiTrail } from "../../../context/RobiTrailContext";
import { createCngRickshaw, createPedestrian } from "../../world/proceduralAssets";
import { Adaptive3DViewport, type AdaptiveViewportApi } from "../engine/Adaptive3DViewport";
import { createTutorialBeaconRig, useTutorialState } from "../engine/InWorldTutorial3D";
import type { InteractiveStation, ObstacleBox } from "./ThreeMissionHarness";
import {
  createCargoLorry,
  createChattogramShopBuilding,
  createHilltopMacroTower,
  createRobiShebaKiosk,
  createStreetJunctionCabinet,
  makeAsphaltTexture,
} from "./chattogramProps";
import { CheckCircle2, FileText, Radio, ShieldAlert, X } from "lucide-react";

interface ClueInfo {
  id: "shop_phone" | "fiber_cabinet" | "alley_probe" | "warehouse_log";
  title: { en: string; bn: string };
  finding: { en: string; bn: string };
  metric: { en: string; bn: string };
}

const CLUE_DEFINITIONS: Record<ClueInfo["id"], ClueInfo> = {
  shop_phone: {
    id: "shop_phone",
    title: { en: "Rahman Telecom · Customer Check", bn: "রহমান টেলিকম · গ্রাহক যাচাই" },
    finding: {
      en: "My Robi App check shows SIM active, biometric verified, 2.4 GB pack valid, and Airplane Mode OFF.",
      bn: "মাই রবি অ্যাপ যাচাইয়ে দেখা গেল সিম সচল, বায়োমেট্রিক ঠিক আছে, ২.৪ জিবি ডেটা আছে এবং এয়ারপ্লেন মোড বন্ধ।",
    },
    metric: { en: "SIM & Account: Healthy", bn: "সিম ও অ্যাকাউন্ট: স্বাভাবিক" },
  },
  fiber_cabinet: {
    id: "fiber_cabinet",
    title: { en: "Sidewalk Fiber Cabinet", bn: "সড়কপাশের ফাইবার ক্যাবিনেট" },
    finding: {
      en: "Optical backhaul reads -14 dBm with backup battery at 96%. Street fiber feed is uninterrupted.",
      bn: "অপটিক্যাল ফাইবার ব্যাকহল -১৪ dBm এবং ব্যাকআপ ব্যাটারি ৯৬%। ফাইবার সংযোগে কোনো ত্রুটি নেই।",
    },
    metric: { en: "Fiber Core: -14 dBm OK", bn: "ফাইবার কোর: -১৪ dBm ঠিক আছে" },
  },
  alley_probe: {
    id: "alley_probe",
    title: { en: "Hillside Alley RF Dead Spot", bn: "পাহাড়ি গলির সিগন্যাল ছায়া এলাকা" },
    finding: {
      en: "Signal plunges to -106 dBm behind the tall retaining wall and concrete flats — a classic RF shadow pocket.",
      bn: "উঁচু রিটেইনিং দেয়াল ও কংক্রিট ভবনের আড়ালে সিগন্যাল -১০৬ dBm-এ নেমে গেছে — এটি স্পষ্ট আরএফ ছায়া অঞ্চল।",
    },
    metric: { en: "Alley RSSI: -106 dBm (Weak)", bn: "গলির সিগন্যাল: -১০৬ dBm (দুর্বল)" },
  },
  warehouse_log: {
    id: "warehouse_log",
    title: { en: "Port Loading Dock Sector Log", bn: "বন্দর গুদামের সেক্টর লগ" },
    finding: {
      en: "Hilltop Sector A is tilted 140° toward the harbour road, overshooting the shadowed hillside alley.",
      bn: "পাহাড়ি টাওয়ারের সেক্টর-এ ১৪০° কোণে বন্দর সড়কের দিকে ঘোরানো থাকায় পেছনের গলিতে সিগন্যাল পৌঁছাচ্ছে না।",
    },
    metric: { en: "Sector Tilt: Misaligned (140°)", bn: "সেক্টর দিক: ভিন্নমুখী (১৪০°)" },
  },
};

interface Game1Props {
  paused?: boolean;
  onProgress: (pct: number) => void;
  onComplete: () => void;
  onMistake?: (actionKey: string) => void;
}

export const Game1MessageJourney3D: React.FC<Game1Props> = ({
  paused = false,
  onProgress,
  onComplete,
  onMistake,
}) => {
  const { lang } = useRobiTrail();
  const { tutorialActive, completeTutorial, skipTutorial, replayTutorial } =
    useTutorialState("ctg1_explore_v1");

  const [foundClues, setFoundClues] = useState<ClueInfo["id"][]>([]);
  const [activeClue, setActiveClue] = useState<ClueInfo | null>(null);
  const [kioskOpen, setKioskOpen] = useState(false);
  const [selectedCause, setSelectedCause] = useState<"sim" | "shadow" | "fiber">("shadow");
  const [selectedChannel, setSelectedChannel] = useState<"swap" | "ticket_121" | "reboot">(
    "ticket_121",
  );
  const [ticketError, setTicketError] = useState<string | null>(null);
  const [caseResolved, setCaseResolved] = useState(false);
  const [liveDbm, setLiveDbm] = useState(-74);

  const tutorialActiveRef = useRef(tutorialActive);
  tutorialActiveRef.current = tutorialActive;
  const foundCluesRef = useRef(foundClues);
  foundCluesRef.current = foundClues;
  const resolvedRef = useRef(caseResolved);
  resolvedRef.current = caseResolved;
  const apiRef = useRef<AdaptiveViewportApi | null>(null);
  const stationsRef = useRef<InteractiveStation[]>([]);
  const tutorialBeaconRef = useRef<ReturnType<typeof createTutorialBeaconRig> | null>(null);

  useEffect(() => {
    if (caseResolved) {
      onProgress(100);
    } else {
      const cluePct = Math.min(80, foundClues.length * 20);
      onProgress(cluePct);
    }
  }, [foundClues.length, caseResolved, onProgress]);

  const syncStations = useCallback(() => {
    const found = foundCluesRef.current;
    stationsRef.current.forEach((st) => {
      if (st.id === "practice_post") {
        st.state = tutorialActiveRef.current ? "highlighted" : "completed";
      } else if (st.id === "robi_kiosk") {
        st.state = resolvedRef.current ? "completed" : found.length >= 3 ? "highlighted" : "idle";
      } else {
        st.state = found.includes(st.id as ClueInfo["id"]) ? "completed" : "nearby";
      }
    });
    if (tutorialBeaconRef.current) {
      tutorialBeaconRef.current.setVisible(tutorialActiveRef.current);
    }
  }, []);

  useEffect(() => {
    syncStations();
  }, [tutorialActive, foundClues, caseResolved, syncStations]);

  const handleStationInteract = useCallback(
    (stationId: string) => {
      if (stationId === "practice_post") {
        if (tutorialActiveRef.current) {
          completeTutorial();
        }
        return;
      }

      if (tutorialActiveRef.current) {
        completeTutorial();
      }

      if (stationId === "robi_kiosk") {
        setActiveClue(null);
        setKioskOpen(true);
        return;
      }

      const clue = CLUE_DEFINITIONS[stationId as ClueInfo["id"]];
      if (!clue) return;

      setKioskOpen(false);
      setActiveClue(clue);
      setFoundClues((prev) => (prev.includes(clue.id) ? prev : [...prev, clue.id]));
    },
    [completeTutorial],
  );

  const handleSubmitRobiShebaCase = () => {
    if (foundClues.length < 3) {
      setTicketError(
        lang === "en"
          ? "Inspect at least 3 neighborhood clues first to gather diagnostic evidence."
          : "সঠিক অভিযোগ দাখিলের আগে অন্তত ৩টি মাঠপর্যায়ের সূত্র পরীক্ষা করুন।",
      );
      return;
    }

    if (selectedCause !== "shadow" || selectedChannel !== "ticket_121") {
      onMistake?.(`ctg1:${selectedCause}:${selectedChannel}`);
      setTicketError(
        lang === "en"
          ? "Re-check your field clues: SIM & fiber are healthy, while alley RF drops to -106 dBm from sector misalignment."
          : "মাঠের সূত্রগুলো আবার দেখুন: সিম ও ফাইবার ঠিক আছে, কেবল গলিতে সিগন্যাল ছায়া পড়ছে—তাই ১২১ / মাই রবি নেটওয়ার্ক টিকিটই সঠিক।",
      );
      return;
    }

    setTicketError(null);
    setKioskOpen(false);
    setCaseResolved(true);
    setLiveDbm(-64);
    if (apiRef.current) {
      apiRef.current.setCameraGoal(new THREE.Vector3(-4, 15, 22), new THREE.Vector3(-5, 3, -5));
      window.setTimeout(() => {
        apiRef.current?.setCameraGoal(null);
      }, 2400);
    }
    window.setTimeout(onComplete, 2100);
  };

  const bounds = useMemo(() => ({ minX: -19, maxX: 19, minZ: -15, maxZ: 15 }), []);

  const handleSceneReady = useCallback(
    (api: AdaptiveViewportApi) => {
      apiRef.current = api;
      const { scene } = api;
      const disposables: { dispose: () => void }[] = [];

      // 1. Ground, Hillside & Two-Lane Chattogram Port Avenue
      const groundMat = new THREE.MeshStandardMaterial({ color: 0x65a30d, roughness: 0.92 });
      const ground = new THREE.Mesh(new THREE.PlaneGeometry(140, 140), groundMat);
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = -0.05;
      ground.receiveShadow = true;
      scene.add(ground);

      // Paved pedestrian neighborhood plaza/sidewalk deck
      const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0xd6d3d1, roughness: 0.85 });
      const plaza = new THREE.Mesh(new THREE.BoxGeometry(40, 0.08, 32), sidewalkMat);
      plaza.position.set(0, -0.01, 0);
      plaza.receiveShadow = true;
      scene.add(plaza);

      // Asphalt main port avenue running East-West at z = 3.5
      const roadTex = makeAsphaltTexture(4);
      roadTex.repeat.set(1, 6);
      disposables.push(roadTex);
      const road = new THREE.Mesh(
        new THREE.BoxGeometry(42, 0.06, 6.2),
        new THREE.MeshStandardMaterial({ map: roadTex, roughness: 0.8 }),
      );
      road.position.set(0, 0.025, 3.5);
      road.receiveShadow = true;
      scene.add(road);

      // Raised stone curbs
      const curbMat = new THREE.MeshStandardMaterial({ color: 0x78716c, roughness: 0.85 });
      [0.3, 6.7].forEach((cz) => {
        const curb = new THREE.Mesh(new THREE.BoxGeometry(40, 0.14, 0.28), curbMat);
        curb.position.set(0, 0.07, cz);
        scene.add(curb);
      });

      // Bay of Bengal Port Water on the far South horizon
      const sea = new THREE.Mesh(
        new THREE.BoxGeometry(140, 0.2, 40),
        new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.25, metalness: 0.12 }),
      );
      sea.position.set(0, -0.1, 36);
      scene.add(sea);

      // 2. Hillside Terrace & Retaining Wall in NW quadrant creating a real RF shadow alley!
      const hillMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.9 });
      const wallMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.88 });
      const hillPlateau = new THREE.Mesh(new THREE.BoxGeometry(13, 3.2, 10), hillMat);
      hillPlateau.position.set(-13.5, 1.6, -10.5);
      hillPlateau.receiveShadow = true;
      scene.add(hillPlateau);

      const retainWall = new THREE.Mesh(new THREE.BoxGeometry(10.5, 2.8, 0.65), wallMat);
      retainWall.position.set(-5.2, 1.4, -7.2);
      retainWall.castShadow = true;
      retainWall.receiveShadow = true;
      scene.add(retainWall);

      // 3. Chattogram Local Shopfronts with Bangla Signboards
      const shop1 = createChattogramShopBuilding({
        width: 5.4,
        height: 4.8,
        depth: 4.4,
        wallColor: 0xfef3c7,
        awningColor: 0x9f1239,
        signText: "রহমান টেলিকম ও রিচার্জ",
        signSubtext: "SIM & MY ROBI POINT",
      });
      shop1.position.set(-12.5, 0, -2.8);
      scene.add(shop1);

      const shop2 = createChattogramShopBuilding({
        width: 5.2,
        height: 5.8,
        depth: 4.4,
        wallColor: 0xe0f2fe,
        awningColor: 0x0369a1,
        signText: "পাহাড়তলী হার্ডওয়্যার",
        signSubtext: "HILLVIEW CONCRETE BLOCK",
        signBg: "#1e3a8a",
      });
      shop2.position.set(0.8, 0, -4.4);
      scene.add(shop2);

      const shop3 = createChattogramShopBuilding({
        width: 5.6,
        height: 4.4,
        depth: 4.2,
        wallColor: 0xf1f5f9,
        awningColor: 0x0f766e,
        signText: "কর্ণফুলী চা ও নাস্তা",
        signSubtext: "AGRABAD CORNER",
        signBg: "#065f46",
      });
      shop3.position.set(12.2, 0, -3.2);
      scene.add(shop3);

      const warehouse = createChattogramShopBuilding({
        width: 6.0,
        height: 5.2,
        depth: 4.8,
        wallColor: 0xfde68a,
        awningColor: 0xb45309,
        signText: "বন্দর কার্গো ওয়্যারহাউস",
        signSubtext: "LOADING BAY 04",
        signBg: "#7c2d12",
      });
      warehouse.position.set(2.5, 0, 10.6);
      warehouse.rotation.y = Math.PI;
      scene.add(warehouse);

      // 4. Robi Sheba 121 Kiosk on SE Sidewalk
      const kiosk = createRobiShebaKiosk(4);
      kiosk.position.set(13.2, 0, 10.2);
      kiosk.rotation.y = -Math.PI * 0.78;
      scene.add(kiosk);

      // 5. Hilltop Macro Lattice Tower overseeing the neighborhood
      const macroTower = createHilltopMacroTower();
      macroTower.group.position.set(-14.5, 3.2, -11.5);
      macroTower.sectorHead.rotation.y = 0.65; // Misaligned toward road initially
      scene.add(macroTower.group);

      // 6. Street Fiber Cabinet + Practice Calibration Post
      const cabinet = createStreetJunctionCabinet();
      cabinet.group.position.set(-4.5, 0, -1.2);
      scene.add(cabinet.group);

      const practicePost = new THREE.Group();
      practicePost.position.set(-12.5, 0, 9.8);
      const postPole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.18, 1.55, 12),
        new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.5, roughness: 0.4 }),
      );
      postPole.position.y = 0.78;
      const postHead = new THREE.Mesh(
        new THREE.SphereGeometry(0.28, 12, 12),
        new THREE.MeshStandardMaterial({
          color: 0x38bdf8,
          emissive: 0x0284c7,
          emissiveIntensity: 1.1,
        }),
      );
      postHead.position.y = 1.72;
      practicePost.add(postPole, postHead);
      scene.add(practicePost);

      // Streetlights along sidewalk
      const poleMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.6 });
      const lampMat = new THREE.MeshStandardMaterial({
        color: 0xfef08a,
        emissive: 0xfde047,
        emissiveIntensity: 0.9,
      });
      [-14, 0, 14].forEach((lx) => {
        const p = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 4.6, 8), poleMat);
        p.position.set(lx, 2.3, -0.35);
        const l = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.14, 0.3), lampMat);
        l.position.set(lx, 4.6, 0.1);
        scene.add(p, l);
      });

      // 7. Animated Moving Street Traffic + Robi Service Van (enters on resolution)
      const cng1 = createCngRickshaw();
      cng1.rotation.y = Math.PI / 2;
      const cng2 = createCngRickshaw();
      cng2.rotation.y = -Math.PI / 2;
      const lorry = createCargoLorry(0x0f766e);
      lorry.rotation.y = Math.PI / 2;
      const ped1 = createPedestrian(0xe11d48);
      const ped2 = createPedestrian(0x0284c7);
      scene.add(cng1, cng2, lorry, ped1, ped2);

      // Service van starts parked off west edge and rolls in upon ticket submission
      const serviceVan = createCargoLorry(0xe11d48);
      serviceVan.scale.setScalar(0.82);
      serviceVan.rotation.y = Math.PI / 2;
      serviceVan.position.set(-28, 0, 4.8);
      scene.add(serviceVan);

      // 8. Register Solid Obstacle Bounds (buildings, walls, tower, kiosk)
      const obstacles: ObstacleBox[] = [
        {
          minX: -20,
          maxX: -7,
          minZ: -15.5,
          maxZ: -5.5,
          maxY: 6,
          label: { en: "Hillside Terrace", bn: "পাহাড়ি টিলা" },
        },
        {
          minX: -10.5,
          maxX: 0.1,
          minZ: -7.7,
          maxZ: -6.7,
          maxY: 3.2,
          label: { en: "Retaining Wall", bn: "রিটেইনিং দেয়াল" },
        },
        {
          minX: -15.4,
          maxX: -9.6,
          minZ: -5.2,
          maxZ: -0.4,
          maxY: 5.5,
          label: { en: "Rahman Telecom", bn: "রহমান টেলিকম" },
        },
        {
          minX: -2.0,
          maxX: 3.6,
          minZ: -6.8,
          maxZ: -2.0,
          maxY: 6.5,
          label: { en: "Pahartali Hardware", bn: "পাহাড়তলী হার্ডওয়্যার" },
        },
        {
          minX: 9.2,
          maxX: 15.2,
          minZ: -5.5,
          maxZ: -0.9,
          maxY: 5.0,
          label: { en: "Karnaphuli Tea", bn: "কর্ণফুলী চা ঘর" },
        },
        {
          minX: -0.8,
          maxX: 5.8,
          minZ: 8.0,
          maxZ: 13.2,
          maxY: 5.8,
          label: { en: "Port Warehouse", bn: "বন্দর গুদাম" },
        },
        {
          minX: 11.4,
          maxX: 15.0,
          minZ: 8.6,
          maxZ: 11.8,
          maxY: 3.5,
          label: { en: "Robi Sheba Kiosk", bn: "রবি সেবা কেন্দ্র" },
        },
        { minX: -5.5, maxX: -3.5, minZ: -2.0, maxZ: -0.4, maxY: 2.4 },
      ];
      api.registerObstacles(obstacles);

      // 9. Interactive Stations with glowing ground rings & beacons
      const makeStation = (
        id: string,
        label: { en: string; bn: string },
        x: number,
        z: number,
        hitObj?: THREE.Object3D,
        radius = 4.2,
      ): InteractiveStation => {
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(0.95, 1.25, 28),
          new THREE.MeshBasicMaterial({ color: 0xf59e0b, side: THREE.DoubleSide }),
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(x, 0.06, z);
        scene.add(ring);

        const beacon = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.32, 0),
          new THREE.MeshStandardMaterial({
            color: 0xf59e0b,
            emissive: 0xf59e0b,
            emissiveIntensity: 0.9,
          }),
        );
        beacon.position.set(x, 2.75, z);
        scene.add(beacon);

        let targetHit = hitObj;
        if (!targetHit) {
          targetHit = new THREE.Mesh(
            new THREE.CylinderGeometry(1.3, 1.3, 2.4, 10),
            new THREE.MeshBasicMaterial({ visible: false }),
          );
          targetHit.position.set(x, 1.2, z);
          scene.add(targetHit);
        }
        targetHit.traverse((c) => {
          c.userData.stationId = id;
        });
        targetHit.userData.stationId = id;

        return {
          id,
          label,
          position: new THREE.Vector3(x, 0, z),
          state: "nearby",
          hitMesh: targetHit,
          ringMesh: ring,
          beaconMesh: beacon,
          radius,
        };
      };

      const builtStations: InteractiveStation[] = [
        makeStation(
          "practice_post",
          { en: "Practice RF Post", bn: "প্র্যাকটিস সিগন্যাল পোস্ট" },
          -12.5,
          9.8,
          practicePost,
          3.8,
        ),
        makeStation("shop_phone", CLUE_DEFINITIONS.shop_phone.title, -12.5, 0.6, shop1, 4.4),
        makeStation(
          "fiber_cabinet",
          CLUE_DEFINITIONS.fiber_cabinet.title,
          -4.5,
          -1.2,
          cabinet.group,
          4.0,
        ),
        makeStation("alley_probe", CLUE_DEFINITIONS.alley_probe.title, -5.0, -9.8, undefined, 4.4),
        makeStation(
          "warehouse_log",
          CLUE_DEFINITIONS.warehouse_log.title,
          2.5,
          7.6,
          warehouse,
          4.6,
        ),
        makeStation(
          "robi_kiosk",
          { en: "Robi Sheba 121 Desk", bn: "রবি সেবা ১২১ ডেস্ক" },
          13.2,
          10.2,
          kiosk,
          4.5,
        ),
      ];
      stationsRef.current = builtStations;
      api.registerStations(builtStations);

      // 10. In-World 3D Tutorial Beacon pointing right at Practice RF Post
      const tutRig = createTutorialBeaconRig(0x38bdf8);
      tutRig.setTarget(-12.5, 0.2, 9.8);
      scene.add(tutRig.group);
      tutorialBeaconRef.current = tutRig;

      syncStations();

      // 11. Live Frame Update: Traffic + RF Alley Signal Meter + Sector Beam Resolution
      let lastMeterUpdate = 0;
      api.setFrameUpdater((delta, elapsed) => {
        tutRig.update(elapsed);

        // Road traffic cruising along East-West avenue
        cng1.position.set(((elapsed * 5.2 + 22) % 46) - 23, 0, 2.1);
        cng2.position.set(23 - ((elapsed * 4.4 + 10) % 46), 0, 4.9);
        lorry.position.set(((elapsed * 3.1) % 52) - 26, 0, 2.1);

        // Sidewalk pedestrians
        ped1.position.set(-7.5 + Math.sin(elapsed * 0.45) * 4.2, 0, -0.5);
        ped1.rotation.y = Math.cos(elapsed * 0.45) >= 0 ? Math.PI / 2 : -Math.PI / 2;
        ped2.position.set(7.5 + Math.cos(elapsed * 0.4) * 3.5, 0, 7.3);
        ped2.rotation.y = -Math.sin(elapsed * 0.4) >= 0 ? Math.PI / 2 : -Math.PI / 2;

        // Live RF probe reading based on engineer position in neighborhood
        if (elapsed - lastMeterUpdate > 0.2) {
          lastMeterUpdate = elapsed;
          if (resolvedRef.current) {
            setLiveDbm(-64);
          } else {
            const px = api.playerGroup.position.x;
            const pz = api.playerGroup.position.z;
            const inShadowAlley = px > -11 && px < 2 && pz < -6.5;
            const nearAlleyWall = px > -12 && px < 3 && pz < -3.5;
            const nextDbm = inShadowAlley ? -106 : nearAlleyWall ? -92 : -72;
            setLiveDbm((prev) => (prev === nextDbm ? prev : nextDbm));
          }
        }

        // Animated resolution: Macro Tower turns sector beam toward shadowed alley & turns emerald!
        if (resolvedRef.current) {
          macroTower.sectorHead.rotation.y = THREE.MathUtils.damp(
            macroTower.sectorHead.rotation.y,
            1.42,
            2.6,
            delta,
          );
          if (macroTower.beamCone.material instanceof THREE.MeshBasicMaterial) {
            macroTower.beamCone.material.color.setHex(0x10b981);
            macroTower.beamCone.material.opacity = 0.28;
          }
          serviceVan.position.x = THREE.MathUtils.damp(serviceVan.position.x, -4.5, 1.5, delta);
        }
      });

      return () => {
        tutRig.dispose();
        disposables.forEach((d) => d.dispose());
      };
    },
    [syncStations],
  );

  const signalBarCount = liveDbm > -75 ? 4 : liveDbm > -90 ? 3 : liveDbm > -100 ? 2 : 1;

  return (
    <div className="relative w-full h-full">
      <Adaptive3DViewport
        mode="exploration"
        bounds={bounds}
        initialPlayerPos={[-14.5, 0, 10.5]}
        initialCameraOffset={[0, 11.5, 15]}
        skyColor="#93c5fd"
        fogColor="#dbeafe"
        fogDensity={0.004}
        paused={paused}
        minZoomDistance={8}
        maxZoomDistance={34}
        onSceneReady={handleSceneReady}
        onStationInteract={handleStationInteract}
        interactLabel={{ en: "Inspect", bn: "পরীক্ষা" }}
        tutorial={{
          active: tutorialActive,
          prompt:
            lang === "en"
              ? "Walk to the glowing Practice RF Post (or tap it) to test your handheld signal probe."
              : "জ্বলন্ত প্র্যাকটিস পোস্টের কাছে হেঁটে যান বা ট্যাপ করে আপনার সিগন্যাল প্রোব পরীক্ষা করুন।",
          onSkip: skipTutorial,
          onReplay: replayTutorial,
        }}
        hudOverlay={
          <>
            {/* Live Signal Strength + Clues Found Tracker */}
            <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 hidden md:flex items-center gap-3 z-20 px-4 py-2 rounded-xl bg-slate-950 border border-white/15 text-white shadow-xl">
              <div className="flex items-center gap-2 pr-3 border-r border-white/15">
                <Radio
                  className={`w-4 h-4 ${liveDbm <= -100 ? "text-rose-400" : "text-emerald-400"}`}
                />
                <div className="text-[11px]">
                  <span className="text-slate-400 mr-1">
                    {lang === "en" ? "RF Probe:" : "সিগন্যাল:"}
                  </span>
                  <span className="font-mono-num font-bold text-amber-300">{liveDbm} dBm</span>
                </div>
                <div className="flex items-end gap-0.5 h-3.5">
                  {[1, 2, 3, 4].map((b) => (
                    <span
                      key={b}
                      className={`w-1 rounded-xs ${
                        b <= signalBarCount
                          ? signalBarCount <= 1
                            ? "bg-rose-500"
                            : "bg-emerald-400"
                          : "bg-slate-700"
                      }`}
                      style={{ height: `${b * 25}%` }}
                    />
                  ))}
                </div>
              </div>
              <div className="text-xs font-semibold">
                <span className="text-slate-400 mr-1.5">
                  {lang === "en" ? "Clues:" : "তথ্যসূত্র:"}
                </span>
                <span className="font-mono-num text-sky-300">{foundClues.length}/4</span>
              </div>
              <button
                type="button"
                onClick={() => setKioskOpen(true)}
                className="pointer-events-auto px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-[11px] font-bold transition-colors cursor-pointer"
              >
                {lang === "en" ? "Robi Sheba Desk" : "রবি সেবা ডেস্ক"}
              </button>
            </div>

            {/* Mobile compact RF & Clue strip cleanly above bottom joystick/button */}
            <div className="md:hidden pointer-events-none absolute top-14 left-3 z-20 flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-950 border border-white/15 text-[11px] text-white shadow-md">
              <span
                className={`font-mono-num font-bold ${liveDbm <= -100 ? "text-rose-400" : "text-emerald-300"}`}
              >
                {liveDbm} dBm
              </span>
              <span className="text-slate-500">|</span>
              <span className="font-mono-num text-sky-300">{foundClues.length}/4</span>
            </div>
          </>
        }
      />

      {/* Field Clue Inspection Popover */}
      {activeClue && (
        <div className="absolute bottom-28 md:bottom-20 left-1/2 -translate-x-1/2 z-30 w-[calc(100%-1.5rem)] max-w-md rounded-2xl bg-slate-950 border border-sky-400/50 p-4 text-white shadow-2xl space-y-2.5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-[10px] font-mono font-bold text-sky-300 uppercase">
                {activeClue.metric[lang]}
              </div>
              <h3 className="text-sm font-bold text-white">{activeClue.title[lang]}</h3>
            </div>
            <button
              type="button"
              onClick={() => setActiveClue(null)}
              className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300"
              aria-label="Close clue"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-slate-200 leading-relaxed">{activeClue.finding[lang]}</p>
          <div className="flex items-center justify-between pt-1">
            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-300 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {lang === "en" ? "Logged to Case File" : "কেস ফাইলে সংরক্ষিত"}
            </span>
            {foundClues.length >= 3 && (
              <button
                type="button"
                onClick={() => {
                  setActiveClue(null);
                  setKioskOpen(true);
                }}
                className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs font-bold cursor-pointer"
              >
                {lang === "en" ? "Open Robi Sheba Desk" : "রবি সেবা ডেস্ক খুলুন"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Robi Sheba Case Resolution Modal (Educational Simulation) */}
      {kioskOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/75 flex items-center justify-center p-3"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-2xl bg-slate-950 border border-rose-400/40 p-5 text-white shadow-2xl space-y-4 max-h-[88vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3">
              <div>
                <div className="text-[10px] font-mono text-amber-300 font-bold uppercase">
                  {lang === "en"
                    ? "EDUCATIONAL SIMULATION · ROBI SHEBA CASE #CTG-RS-408"
                    : "শিক্ষামূলক সিমুলেশন · রবি সেবা কেস #CTG-RS-408"}
                </div>
                <h3 className="text-base font-bold mt-0.5">
                  {lang === "en"
                    ? "File Accurate Signal Case Diagnosis"
                    : "সঠিক সিগন্যাল সমস্যার অভিযোগ দাখিল করুন"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setKioskOpen(false)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Clues Summary */}
            <div className="rounded-xl bg-slate-900 border border-white/10 p-3 space-y-1.5">
              <div className="text-[11px] font-semibold text-slate-300 flex items-center justify-between">
                <span>{lang === "en" ? "Gathered Field Evidence" : "সংগৃহীত মাঠপর্যায়ের তথ্য"}</span>
                <span className="font-mono-num text-sky-300">{foundClues.length} / 4</span>
              </div>
              {foundClues.length === 0 ? (
                <p className="text-xs text-slate-400">
                  {lang === "en"
                    ? "Explore the street to inspect the shop phone, fiber cabinet, hillside alley, and warehouse log."
                    : "দোকানের ফোন, ফাইবার ক্যাবিনেট, পাহাড়ি গলি এবং গুদাম লগ পরীক্ষা করে তথ্য সংগ্রহ করুন।"}
                </p>
              ) : (
                <ul className="space-y-1 text-[11px] text-slate-200">
                  {foundClues.map((cid) => (
                    <li key={cid} className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{CLUE_DEFINITIONS[cid].metric[lang]}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Diagnosis Choice */}
            <div className="space-y-1.5">
              <div className="text-xs font-semibold text-slate-200">
                {lang === "en" ? "1. Verified Root Cause:" : "১. মূল কারণ নির্বাচন করুন:"}
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                {[
                  {
                    id: "sim" as const,
                    en: "Damaged SIM or Expired Data Pack",
                    bn: "নষ্ট সিম বা মেয়াদোত্তীর্ণ ডেটা প্যাক",
                  },
                  {
                    id: "shadow" as const,
                    en: "Localized Hillside RF Coverage Shadow & Sector Tilt",
                    bn: "পাহাড়ি গলির আরএফ সিগন্যাল ছায়া ও সেক্টর দিক পরিবর্তন",
                  },
                  {
                    id: "fiber" as const,
                    en: "Cut Street Optical Fiber Trunk",
                    bn: "সড়কের অপটিক্যাল ফাইবার তার কেটে যাওয়া",
                  },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setSelectedCause(opt.id);
                      setTicketError(null);
                    }}
                    className={`text-left px-3 py-2 rounded-xl border text-xs font-medium transition-colors cursor-pointer ${
                      selectedCause === opt.id
                        ? "bg-rose-600/25 border-rose-400 text-white"
                        : "bg-slate-900 border-white/10 text-slate-300 hover:border-white/30"
                    }`}
                  >
                    {opt[lang]}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Channel Choice */}
            <div className="space-y-1.5">
              <div className="text-xs font-semibold text-slate-200">
                {lang === "en" ? "2. Recommended Robi Sheba Action:" : "২. সঠিক রবি সেবা পদক্ষেপ:"}
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                {[
                  {
                    id: "swap" as const,
                    en: "Replace SIM Card at Walk-in Center",
                    bn: "সেবা কেন্দ্রে গিয়ে সিম পরিবর্তন করুন",
                  },
                  {
                    id: "ticket_121" as const,
                    en: "File Network Coverage Ticket via My Robi App / 121 Helpline",
                    bn: "মাই রবি অ্যাপ বা ১২১ হেল্পলাইনে নেটওয়ার্ক কভারেজ টিকিট করুন",
                  },
                  {
                    id: "reboot" as const,
                    en: "Tell Customer to Keep Airplane Mode ON",
                    bn: "গ্রাহককে এয়ারপ্লেন মোড চালু রাখতে বলুন",
                  },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setSelectedChannel(opt.id);
                      setTicketError(null);
                    }}
                    className={`text-left px-3 py-2 rounded-xl border text-xs font-medium transition-colors cursor-pointer ${
                      selectedChannel === opt.id
                        ? "bg-sky-600/25 border-sky-400 text-white"
                        : "bg-slate-900 border-white/10 text-slate-300 hover:border-white/30"
                    }`}
                  >
                    {opt[lang]}
                  </button>
                ))}
              </div>
            </div>

            {ticketError && (
              <div className="rounded-lg bg-rose-950 border border-rose-400/50 px-3 py-2 text-xs text-rose-200 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{ticketError}</span>
              </div>
            )}

            <div className="flex items-center justify-between gap-2 pt-1">
              <span className="text-[10px] text-slate-400">
                {lang === "en"
                  ? "Real Channels: 121 · +8801819400400 · My Robi App"
                  : "বাস্তব মাধ্যম: ১২১ · +8801819400400 · মাই রবি অ্যাপ"}
              </span>
              <button
                type="button"
                onClick={handleSubmitRobiShebaCase}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>{lang === "en" ? "Submit Ticket" : "টিকিট দাখিল করুন"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
