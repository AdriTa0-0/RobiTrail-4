import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useRobiTrail } from "../../../context/RobiTrailContext";
import { Adaptive3DViewport, type AdaptiveViewportApi } from "../engine/Adaptive3DViewport";
import { createTutorialBeaconRig, useTutorialState } from "../engine/InWorldTutorial3D";
import type { InteractiveStation, ObstacleBox } from "./ThreeMissionHarness";
import {
  createChattogramShopBuilding,
  createRooftopRelayTripod,
  createRooftopWaterTankObstacle,
  makeAsphaltTexture,
  makeRoofTileTexture,
} from "./chattogramProps";
import { ArrowUpDown, CheckCircle2, Radio, RotateCcw, RotateCw } from "lucide-react";

interface RoofPad {
  id: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  y: number;
}

interface BlockingVolume {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
  label: { en: string; bn: string };
}

type RelayKey = "alpha" | "beta" | "practice";

interface RelayConfigState {
  id: RelayKey;
  label: { en: string; bn: string };
  yaw: number;
  tall: boolean;
}

interface SmoothedBeamState {
  line: THREE.Line;
  curEnd: THREE.Vector3;
  curColor: THREE.Color;
  visibilityAlpha: number;
  drawFraction: number;
  initialized: boolean;
}

const COLOR_BLOCKED = new THREE.Color(0xef4444);
const COLOR_CONNECTED = new THREE.Color(0x10b981);
const COLOR_PENDING = new THREE.Color(0xf59e0b);
const _scratchHit = new THREE.Vector3();
const _scratchDir = new THREE.Vector3();
const _scratchCamPos = new THREE.Vector3();
const _scratchCamTarget = new THREE.Vector3();

/** True 3D Ray-AABB intersection returning [0..1] fraction if hit */
function rayHitsBox3D(a: THREE.Vector3, b: THREE.Vector3, box: BlockingVolume): number | null {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = b.z - a.z;
  let tMin = 0;
  let tMax = 1;

  const axis = (p: number, d: number, mn: number, mx: number) => {
    if (Math.abs(d) < 1e-6) return p >= mn && p <= mx;
    let t1 = (mn - p) / d;
    let t2 = (mx - p) / d;
    if (t1 > t2) {
      const tmp = t1;
      t1 = t2;
      t2 = tmp;
    }
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    return tMin <= tMax;
  };

  if (!axis(a.x, dx, box.minX, box.maxX)) return null;
  if (!axis(a.y, dy, box.minY, box.maxY)) return null;
  if (!axis(a.z, dz, box.minZ, box.maxZ)) return null;
  return tMin > 0.01 && tMin < 0.99 ? tMin : null;
}

function yawAngleDiff(from: THREE.Vector3, to: THREE.Vector3, currentYaw: number): number {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const targetYaw = Math.atan2(dx, dz);
  let diff = targetYaw - currentYaw;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return Math.abs(diff);
}

interface Game2Props {
  paused?: boolean;
  onProgress: (pct: number) => void;
  onComplete: () => void;
}

export const Game2FindSignal3D: React.FC<Game2Props> = ({
  paused = false,
  onProgress,
  onComplete,
}) => {
  const { lang } = useRobiTrail();
  const { tutorialActive, completeTutorial, skipTutorial, replayTutorial } =
    useTutorialState("ctg2_rooftop_puzzle_v1");

  const [selectedRelay, setSelectedRelay] = useState<RelayKey>("alpha");
  const [relayStates, setRelayStates] = useState<Record<RelayKey, RelayConfigState>>({
    practice: {
      id: "practice",
      label: { en: "Practice Tripod", bn: "প্র্যাকটিস রিলে" },
      yaw: 0.4,
      tall: false,
    },
    alpha: { id: "alpha", label: { en: "Relay Alpha", bn: "রিলে আলফা" }, yaw: 0.6, tall: false },
    beta: { id: "beta", label: { en: "Relay Beta", bn: "রিলে বিটা" }, yaw: 1.9, tall: false },
  });

  const [connectedTargets, setConnectedTargets] = useState<number>(0);
  const [blockedCount, setBlockedCount] = useState<number>(2);
  const [solved, setSolved] = useState(false);

  const tutorialActiveRef = useRef(tutorialActive);
  tutorialActiveRef.current = tutorialActive;
  const relayStatesRef = useRef(relayStates);
  relayStatesRef.current = relayStates;
  const selectedRef = useRef<RelayKey>(selectedRelay);
  selectedRef.current = selectedRelay;
  const solvedRef = useRef(solved);
  solvedRef.current = solved;

  const viewportApiRef = useRef<AdaptiveViewportApi | null>(null);
  const tutorialBeaconRef = useRef<ReturnType<typeof createTutorialBeaconRig> | null>(null);
  const stationsRef = useRef<InteractiveStation[]>([]);
  const relaysRef = useRef<Record<RelayKey, ReturnType<typeof createRooftopRelayTripod> | null>>({
    alpha: null,
    beta: null,
    practice: null,
  });

  // Smooth drag target state & visual feedback state
  const relayTargetPosRef = useRef<Record<RelayKey, THREE.Vector3>>({
    practice: new THREE.Vector3(-11.4, 1.6, -5.8),
    alpha: new THREE.Vector3(-5.8, 1.6, 5.6),
    beta: new THREE.Vector3(8.6, 2.2, -5.6),
  });
  const relayLiftRef = useRef<Record<RelayKey, number>>({
    practice: 0,
    alpha: 0,
    beta: 0,
  });
  const relayPulseRef = useRef<Record<RelayKey, number>>({
    practice: 0,
    alpha: 0,
    beta: 0,
  });
  const activeDragRelayRef = useRef<RelayKey | null>(null);

  // Continuous smooth rotation direction (-1 left, 0 idle, +1 right)
  const continuousRotateDirRef = useRef<-1 | 0 | 1>(0);
  const continuousStartTimeRef = useRef<number>(0);

  useEffect(() => {
    if (solved) {
      onProgress(100);
    } else {
      onProgress(connectedTargets * 45 + (blockedCount === 0 ? 10 : 0));
    }
  }, [connectedTargets, blockedCount, solved, onProgress]);

  useEffect(() => {
    if (tutorialBeaconRef.current) {
      tutorialBeaconRef.current.setVisible(tutorialActive);
    }
    stationsRef.current.forEach((s) => {
      if (s.id === "practice") {
        s.state = tutorialActive ? "highlighted" : "completed";
      } else {
        s.state = selectedRelay === s.id ? "selected" : "nearby";
      }
    });
  }, [tutorialActive, selectedRelay]);

  const focusCameraOnRelay = useCallback((rid: RelayKey) => {
    const api = viewportApiRef.current;
    if (!api || activeDragRelayRef.current) return;
    const targetPos = relayTargetPosRef.current[rid];
    if (!targetPos) return;
    _scratchCamTarget.set(targetPos.x * 0.55, targetPos.y + 1.8, targetPos.z * 0.45);
    _scratchCamPos.set(
      THREE.MathUtils.clamp(targetPos.x * 0.55 + 2.5, -13, 13),
      19.5,
      THREE.MathUtils.clamp(targetPos.z * 0.45 + 17.5, 11, 26),
    );
    api.setCameraGoal(_scratchCamPos, _scratchCamTarget);
  }, []);

  const selectAndFocusRelay = useCallback(
    (rid: RelayKey, shouldFocusCamera = true) => {
      setSelectedRelay(rid);
      relayPulseRef.current[rid] = Math.max(relayPulseRef.current[rid], 0.35);
      if (rid === "practice" && tutorialActiveRef.current) {
        completeTutorial();
      }
      if (shouldFocusCamera) {
        focusCameraOnRelay(rid);
      }
    },
    [completeTutorial, focusCameraOnRelay],
  );

  const adjustSelectedRelay = useCallback(
    (deltaYaw: number, toggleHeight = false) => {
      const targetId = selectedRef.current;
      if (targetId === "practice" && tutorialActiveRef.current) {
        completeTutorial();
      }
      if (toggleHeight) {
        relayPulseRef.current[targetId] = Math.max(relayPulseRef.current[targetId], 0.45);
      }
      setRelayStates((prev) => {
        const cur = prev[targetId];
        return {
          ...prev,
          [targetId]: {
            ...cur,
            yaw: cur.yaw + deltaYaw,
            tall: toggleHeight ? !cur.tall : cur.tall,
          },
        };
      });
    },
    [completeTutorial],
  );

  const startRotateHold = (dir: -1 | 1) => {
    continuousRotateDirRef.current = dir;
    continuousStartTimeRef.current = performance.now();
  };

  const stopRotateHold = (dir: -1 | 1) => {
    if (continuousRotateDirRef.current === dir) {
      const heldMs = performance.now() - continuousStartTimeRef.current;
      continuousRotateDirRef.current = 0;
      // Quick tap nudges crisply while keeping sustained hold silky smooth
      if (heldMs < 170) {
        adjustSelectedRelay(dir * 0.28, false);
      }
    }
  };

  const bounds = useMemo(() => ({ minX: -16, maxX: 16, minZ: -12, maxZ: 12 }), []);

  const handleSceneReady = useCallback(
    (api: AdaptiveViewportApi) => {
      viewportApiRef.current = api;
      const { scene } = api;
      const disposables: { dispose: () => void }[] = [];
      let completionTimer: number | null = null;

      // 1. Lower Street & Coastal Horizon Context
      const streetGround = new THREE.Mesh(
        new THREE.PlaneGeometry(140, 140),
        new THREE.MeshStandardMaterial({ color: 0x3f6212, roughness: 0.95 }),
      );
      streetGround.rotation.x = -Math.PI / 2;
      streetGround.position.y = -4.2;
      scene.add(streetGround);

      const roadTex = makeAsphaltTexture(4);
      roadTex.repeat.set(1, 5);
      disposables.push(roadTex);
      const lowerRoad = new THREE.Mesh(
        new THREE.BoxGeometry(52, 0.1, 6.2),
        new THREE.MeshStandardMaterial({ map: roadTex, roughness: 0.85 }),
      );
      lowerRoad.position.set(0, -4.12, 14.5);
      scene.add(lowerRoad);

      const bayWater = new THREE.Mesh(
        new THREE.BoxGeometry(150, 0.2, 42),
        new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.25, metalness: 0.12 }),
      );
      bayWater.position.set(0, -4.25, -34);
      scene.add(bayWater);

      // 2. Three Multi-Elevation Rooftop Buildings
      const roofTileTex = makeRoofTileTexture("#e2e8f0", "#94a3b8");
      roofTileTex.repeat.set(6, 6);
      disposables.push(roofTileTex);

      const roofPads: RoofPad[] = [
        { id: "west_north", minX: -14.2, maxX: -2.2, minZ: -10.0, maxZ: -1.6, y: 1.6 },
        { id: "south_deck", minX: -14.2, maxX: 2.8, minZ: 1.2, maxZ: 10.2, y: 1.6 },
        { id: "east_clinic", minX: 5.0, maxX: 14.4, minZ: -9.8, maxZ: 9.8, y: 2.2 },
      ];

      const buildRooftopBlock = (pad: RoofPad, wallColor: number, trimColor: number) => {
        const w = pad.maxX - pad.minX;
        const d = pad.maxZ - pad.minZ;
        const h = pad.y + 4.2;
        const cx = (pad.minX + pad.maxX) * 0.5;
        const cz = (pad.minZ + pad.maxZ) * 0.5;

        const block = new THREE.Mesh(
          new THREE.BoxGeometry(w, h, d),
          new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.78 }),
        );
        block.position.set(cx, pad.y - h / 2, cz);
        block.castShadow = true;
        block.receiveShadow = true;
        scene.add(block);

        const deck = new THREE.Mesh(
          new THREE.BoxGeometry(w + 0.16, 0.22, d + 0.16),
          new THREE.MeshStandardMaterial({ map: roofTileTex, roughness: 0.8 }),
        );
        deck.position.set(cx, pad.y - 0.1, cz);
        deck.receiveShadow = true;
        scene.add(deck);

        const trimMat = new THREE.MeshStandardMaterial({ color: trimColor, roughness: 0.65 });
        const rimFront = new THREE.Mesh(new THREE.BoxGeometry(w + 0.2, 0.35, 0.22), trimMat);
        rimFront.position.set(cx, pad.y + 0.16, pad.maxZ);
        const rimBack = rimFront.clone();
        rimBack.position.z = pad.minZ;
        scene.add(rimFront, rimBack);
      };

      buildRooftopBlock(roofPads[0], 0xf1f5f9, 0x9f1239);
      buildRooftopBlock(roofPads[1], 0xfef3c7, 0x0f766e);
      buildRooftopBlock(roofPads[2], 0xe0f2fe, 0x0369a1);

      const bgShop = createChattogramShopBuilding({
        width: 5.5,
        height: 4.5,
        depth: 4.2,
        wallColor: 0xfde68a,
        awningColor: 0xe11d48,
        signText: "আগ্রাবাদ পোর্ট ভিউ",
        signSubtext: "HARBOUR SECTOR 02",
      });
      bgShop.position.set(-16, -4.2, 18.5);
      bgShop.rotation.y = Math.PI;
      scene.add(bgShop);

      // 3. Rooftop Physical Obstacles (Water Tanks + Stair Bulkhead)
      const tankTower = createRooftopWaterTankObstacle();
      tankTower.position.set(-2.5, 1.6, 5.2);
      scene.add(tankTower);

      const bulkhead = new THREE.Group();
      bulkhead.position.set(1.2, 1.6, 2.2);
      const stairBox = new THREE.Mesh(
        new THREE.BoxGeometry(2.6, 3.8, 3.2),
        new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.85 }),
      );
      stairBox.position.y = 1.9;
      stairBox.castShadow = true;
      const stairDoor = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 1.8, 1.1),
        new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.45 }),
      );
      stairDoor.position.set(-1.31, 0.9, 0);
      bulkhead.add(stairBox, stairDoor);
      scene.add(bulkhead);

      const tankSouth = createRooftopWaterTankObstacle();
      tankSouth.position.set(7.2, 2.2, 1.0);
      scene.add(tankSouth);

      const blockingVolumes: BlockingVolume[] = [
        {
          minX: -4.1,
          maxX: -0.9,
          minY: 1.6,
          maxY: 6.4,
          minZ: 3.6,
          maxZ: 6.8,
          label: { en: "Water Tank Tower", bn: "পানির ট্যাংক টাওয়ার" },
        },
        {
          minX: -0.3,
          maxX: 2.7,
          minY: 1.6,
          maxY: 5.8,
          minZ: 0.4,
          maxZ: 4.0,
          label: { en: "Stairwell Bulkhead", bn: "সিঁড়িঘর ব্লক" },
        },
        {
          minX: 5.6,
          maxX: 8.8,
          minY: 2.2,
          maxY: 7.0,
          minZ: -0.6,
          maxZ: 2.6,
          label: { en: "Clinic Water Tank", bn: "ক্লিনিক পানির ট্যাংক" },
        },
      ];

      const dragObstacles: ObstacleBox[] = blockingVolumes.map((b) => ({
        minX: b.minX,
        maxX: b.maxX,
        minZ: b.minZ,
        maxZ: b.maxZ,
        maxY: b.maxY,
        label: b.label,
      }));
      api.registerObstacles(dragObstacles);

      // 4. Hilltop Source Transmitter
      const sourceTx = createRooftopRelayTripod(0xe11d48);
      sourceTx.group.position.set(-11.2, 1.6, 5.4);
      sourceTx.dishHead.rotation.y = Math.PI * 0.5;
      sourceTx.mastGroup.position.y = 2.1;
      scene.add(sourceTx.group);

      // 5. Two Target Receivers on East Roof + subtle completion ripple halos
      const makeTargetReceiver = (x: number, y: number, z: number, colorHex: number) => {
        const rg = new THREE.Group();
        rg.position.set(x, y, z);
        const pole = new THREE.Mesh(
          new THREE.CylinderGeometry(0.12, 0.18, 2.8, 10),
          new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.5 }),
        );
        pole.position.y = 1.4;
        const orb = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.45, 0),
          new THREE.MeshStandardMaterial({
            color: colorHex,
            emissive: colorHex,
            emissiveIntensity: 0.7,
          }),
        );
        orb.position.y = 3.05;
        const padRing = new THREE.Mesh(
          new THREE.RingGeometry(0.9, 1.2, 24),
          new THREE.MeshBasicMaterial({ color: colorHex, side: THREE.DoubleSide }),
        );
        padRing.rotation.x = -Math.PI / 2;
        padRing.position.y = 0.06;

        const waveRingMat = new THREE.MeshBasicMaterial({
          color: 0x10b981,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0,
        });
        const waveRing = new THREE.Mesh(new THREE.RingGeometry(1.15, 1.42, 32), waveRingMat);
        waveRing.rotation.x = -Math.PI / 2;
        waveRing.position.y = 0.09;

        rg.add(pole, orb, padRing, waveRing);
        scene.add(rg);
        return {
          group: rg,
          orb,
          padRing,
          waveRing,
          headPos: new THREE.Vector3(x, y + 3.05, z),
          wasConnected: false,
          pulseTimer: 0,
        };
      };

      const targetClinic = makeTargetReceiver(11.4, 2.2, 5.8, 0xf59e0b);
      const targetDorm = makeTargetReceiver(11.4, 2.2, -5.8, 0xf59e0b);

      // 6. Draggable Rooftop Relays (Practice + Alpha + Beta)
      const practiceRelay = createRooftopRelayTripod(0x38bdf8);
      practiceRelay.group.position.copy(relayTargetPosRef.current.practice);
      scene.add(practiceRelay.group);

      const alphaRelay = createRooftopRelayTripod(0x38bdf8);
      alphaRelay.group.position.copy(relayTargetPosRef.current.alpha);
      scene.add(alphaRelay.group);

      const betaRelay = createRooftopRelayTripod(0xa855f7);
      betaRelay.group.position.copy(relayTargetPosRef.current.beta);
      scene.add(betaRelay.group);

      relaysRef.current = {
        practice: practiceRelay,
        alpha: alphaRelay,
        beta: betaRelay,
      };

      practiceRelay.group.userData.relayId = "practice";
      alphaRelay.group.userData.relayId = "alpha";
      betaRelay.group.userData.relayId = "beta";

      const makeRelayStation = (
        id: RelayKey,
        label: { en: string; bn: string },
        relay: ReturnType<typeof createRooftopRelayTripod>,
      ): InteractiveStation => {
        relay.group.traverse((c) => {
          c.userData.stationId = id;
        });
        relay.group.userData.stationId = id;
        return {
          id,
          label,
          position: relay.group.position,
          state: id === "practice" ? "highlighted" : "nearby",
          hitMesh: relay.group,
          ringMesh: relay.statusHalo,
        };
      };

      const stations = [
        makeRelayStation("practice", { en: "Practice Tripod", bn: "প্র্যাকটিস রিলে" }, practiceRelay),
        makeRelayStation("alpha", { en: "Relay Alpha", bn: "রিলে আলফা" }, alphaRelay),
        makeRelayStation("beta", { en: "Relay Beta", bn: "রিলে বিটা" }, betaRelay),
      ];
      stationsRef.current = stations;
      api.registerStations(stations);

      const findRoofPadAt = (x: number, z: number): RoofPad | null => {
        for (const pad of roofPads) {
          if (
            x >= pad.minX + 0.9 &&
            x <= pad.maxX - 0.9 &&
            z >= pad.minZ + 0.9 &&
            z <= pad.maxZ - 0.9
          ) {
            return pad;
          }
        }
        return null;
      };

      api.registerDraggables(
        [practiceRelay.group, alphaRelay.group, betaRelay.group],
        (pt, obj, valid) => {
          const rid = obj.userData.relayId as RelayKey;
          activeDragRelayRef.current = rid;
          if (selectedRef.current !== rid) {
            setSelectedRelay(rid);
          }
          if (rid === "practice" && tutorialActiveRef.current) {
            completeTutorial();
          }
          if (valid) {
            const pad = findRoofPadAt(pt.x, pt.z);
            relayTargetPosRef.current[rid].set(
              pt.x,
              pad ? pad.y : relayTargetPosRef.current[rid].y,
              pt.z,
            );
          }
        },
        (obj) => {
          const rid = obj.userData.relayId as RelayKey;
          if (activeDragRelayRef.current === rid) {
            activeDragRelayRef.current = null;
          }
        },
        {
          footprintPad: 1.05,
          // Keep drag plane locked to target roof elevation (independent of smooth hover lift)
          dragPlaneY: (obj) => {
            const rid = obj.userData.relayId as RelayKey;
            return relayTargetPosRef.current[rid]?.y ?? obj.position.y;
          },
          validatePoint: (pt) => {
            const pad = findRoofPadAt(pt.x, pt.z);
            if (!pad) {
              return {
                valid: false,
                reason: {
                  en: "Rooftop gap! Keep relay tripods safely inside tiled concrete terraces.",
                  bn: "ছাদের ফাঁকা স্থান! রিলে ট্রাইপডটি নিরাপদে ছাদের ভেতরে রাখুন।",
                },
              };
            }
            return { valid: true };
          },
        },
      );

      // 7. Smooth Signal Beam Pool + Smooth Impact Marker + Multi-Hop Pulse Orbs
      const makeSmoothedBeam = (initialColor: number): SmoothedBeamState => {
        const geo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(),
          new THREE.Vector3(0, 1, 0),
        ]);
        const mat = new THREE.LineBasicMaterial({
          color: initialColor,
          transparent: true,
          opacity: 0.92,
        });
        const line = new THREE.Line(geo, mat);
        line.frustumCulled = false;
        scene.add(line);
        return {
          line,
          curEnd: new THREE.Vector3(),
          curColor: new THREE.Color(initialColor),
          visibilityAlpha: 0,
          drawFraction: 0,
          initialized: false,
        };
      };

      const beamTxToClinic = makeSmoothedBeam(0xef4444);
      const beamTxToAlpha = makeSmoothedBeam(0xef4444);
      const beamAlphaToBeta = makeSmoothedBeam(0xef4444);
      const beamBetaToDorm = makeSmoothedBeam(0xef4444);
      const beamBetaToClinic = makeSmoothedBeam(0xef4444);
      const beamAlphaToClinic = makeSmoothedBeam(0xef4444);
      const beamAlphaToDorm = makeSmoothedBeam(0xef4444);

      const impactMarker = new THREE.Mesh(
        new THREE.SphereGeometry(0.42, 14, 12),
        new THREE.MeshStandardMaterial({
          color: 0xef4444,
          emissive: 0xdc2626,
          emissiveIntensity: 1.35,
        }),
      );
      scene.add(impactMarker);
      const smoothedImpactPos = new THREE.Vector3();
      let impactScale = 0;

      // Pool of lightweight pulse beads so every connected rooftop hop animates cleanly
      const PULSE_POOL_SIZE = 6;
      const pulseBeads = Array.from({ length: PULSE_POOL_SIZE }, () => {
        const bead = new THREE.Mesh(
          new THREE.SphereGeometry(0.24, 10, 10),
          new THREE.MeshBasicMaterial({ color: 0x34d399 }),
        );
        bead.visible = false;
        scene.add(bead);
        return bead;
      });

      // Tutorial beacon pointing to Practice Tripod
      const tutRig = createTutorialBeaconRig(0x38bdf8);
      tutRig.setTarget(-11.4, 1.75, -5.8);
      tutRig.setVisible(tutorialActiveRef.current);
      scene.add(tutRig.group);
      tutorialBeaconRef.current = tutRig;

      const updateSmoothedBeam = (
        beam: SmoothedBeamState,
        start: THREE.Vector3,
        targetEnd: THREE.Vector3,
        isVisible: boolean,
        isConnected: boolean,
        delta: number,
      ) => {
        if (!beam.initialized) {
          beam.curEnd.copy(targetEnd);
          beam.drawFraction = isVisible ? 1 : 0;
          beam.visibilityAlpha = isVisible ? 1 : 0;
          beam.initialized = true;
        }

        const targetColor = isConnected ? COLOR_CONNECTED : COLOR_BLOCKED;
        beam.curColor.lerp(targetColor, 1 - Math.exp(-9 * delta));
        beam.curEnd.lerp(targetEnd, 1 - Math.exp(-13 * delta));
        beam.drawFraction = THREE.MathUtils.damp(beam.drawFraction, isVisible ? 1 : 0, 10, delta);
        beam.visibilityAlpha = THREE.MathUtils.damp(
          beam.visibilityAlpha,
          isVisible ? (isConnected ? 0.96 : 0.78) : 0,
          10,
          delta,
        );

        beam.line.visible = beam.visibilityAlpha > 0.03;
        if (!beam.line.visible) return;

        _scratchHit.lerpVectors(start, beam.curEnd, Math.max(0.02, beam.drawFraction));
        const pos = beam.line.geometry.attributes.position as THREE.BufferAttribute;
        pos.setXYZ(0, start.x, start.y, start.z);
        pos.setXYZ(1, _scratchHit.x, _scratchHit.y, _scratchHit.z);
        pos.needsUpdate = true;

        const mat = beam.line.material as THREE.LineBasicMaterial;
        mat.color.copy(beam.curColor);
        mat.opacity = beam.visibilityAlpha;
      };

      const txDishWorld = new THREE.Vector3();
      const alphaDishWorld = new THREE.Vector3();
      const betaDishWorld = new THREE.Vector3();

      // Anti-flicker hysteresis state per link
      const linkStabilityMap = new Map<string, boolean>();
      const checkLinkClear = (
        linkId: string,
        from: THREE.Vector3,
        to: THREE.Vector3,
        yaw?: number,
      ) => {
        const dist = from.distanceTo(to);
        const wasOk = linkStabilityMap.get(linkId) ?? false;
        const maxDist = wasOk ? 25.4 : 25.0;
        const maxYawDiff = wasOk ? 1.02 : 0.95;

        if (dist > maxDist) {
          linkStabilityMap.set(linkId, false);
          return { ok: false, hitPoint: to };
        }
        if (yaw !== undefined && yawAngleDiff(from, to, yaw) > maxYawDiff) {
          linkStabilityMap.set(linkId, false);
          return { ok: false, hitPoint: from.clone().lerp(to, 0.35), aimedAway: true };
        }
        let earliest = 1;
        for (const bv of blockingVolumes) {
          const hit = rayHitsBox3D(from, to, bv);
          if (hit !== null && hit < earliest) earliest = hit;
        }
        if (earliest < 1) {
          linkStabilityMap.set(linkId, false);
          return { ok: false, hitPoint: from.clone().lerp(to, earliest) };
        }
        linkStabilityMap.set(linkId, true);
        return { ok: true, hitPoint: to };
      };

      let prevAlphaChainOk = false;
      let prevBetaChainOk = false;
      let completionWaveProgress = 0;
      let lastUiSync = 0;
      let lastHoldYawPush = 0;

      const activeSegments: Array<[THREE.Vector3, THREE.Vector3]> = [];

      api.setFrameUpdater((delta, elapsed) => {
        tutRig.update(elapsed);

        // Support smooth continuous rotation while Aim Left/Right is held down
        if (continuousRotateDirRef.current !== 0 && !solvedRef.current) {
          const dir = continuousRotateDirRef.current;
          const sid = selectedRef.current;
          if (sid === "practice" && tutorialActiveRef.current) {
            completeTutorial();
          }
          relayStatesRef.current[sid].yaw += dir * 1.45 * delta;
          if (elapsed - lastHoldYawPush > 0.08) {
            lastHoldYawPush = elapsed;
            const nextYaw = relayStatesRef.current[sid].yaw;
            setRelayStates((prev) => ({
              ...prev,
              [sid]: { ...prev[sid], yaw: nextYaw },
            }));
          }
        }

        const rs = relayStatesRef.current;
        (["practice", "alpha", "beta"] as const).forEach((key) => {
          const rObj = relaysRef.current[key];
          if (!rObj) return;

          // Smoothly damp relay horizontal rooftop placement & subtle drag hover lift
          const desired = relayTargetPosRef.current[key];
          const isBeingDragged = activeDragRelayRef.current === key;
          relayLiftRef.current[key] = THREE.MathUtils.damp(
            relayLiftRef.current[key],
            isBeingDragged ? 0.22 : 0,
            14,
            delta,
          );
          const targetWorldY = desired.y + relayLiftRef.current[key];

          rObj.group.position.x = THREE.MathUtils.damp(rObj.group.position.x, desired.x, 16, delta);
          rObj.group.position.y = THREE.MathUtils.damp(
            rObj.group.position.y,
            targetWorldY,
            16,
            delta,
          );
          rObj.group.position.z = THREE.MathUtils.damp(rObj.group.position.z, desired.z, 16, delta);

          // Fluid dish yaw rotation & mast elevation damping
          rObj.dishHead.rotation.y = THREE.MathUtils.damp(
            rObj.dishHead.rotation.y,
            rs[key].yaw,
            8.5,
            delta,
          );
          const targetMastY = rs[key].tall ? 2.45 : 1.15;
          rObj.mastGroup.position.y = THREE.MathUtils.damp(
            rObj.mastGroup.position.y,
            targetMastY,
            7.5,
            delta,
          );

          // Subtle status halo feedback pulse on selection/connection change
          if (relayPulseRef.current[key] > 0.005) {
            relayPulseRef.current[key] = THREE.MathUtils.damp(
              relayPulseRef.current[key],
              0,
              5.5,
              delta,
            );
          } else {
            relayPulseRef.current[key] = 0;
          }
          const haloPulseScale = 1 + relayPulseRef.current[key] * 0.45;
          rObj.statusHalo.scale.set(haloPulseScale, haloPulseScale, 1);
        });

        sourceTx.dishHead.getWorldPosition(txDishWorld);
        alphaRelay.dishHead.getWorldPosition(alphaDishWorld);
        betaRelay.dishHead.getWorldPosition(betaDishWorld);

        // Evaluate 3D hops smoothly using actual damped dish rotation
        const alphaActualYaw = alphaRelay.dishHead.rotation.y;
        const betaActualYaw = betaRelay.dishHead.rotation.y;

        const directClinic = checkLinkClear("tx->clinic", txDishWorld, targetClinic.headPos);
        updateSmoothedBeam(
          beamTxToClinic,
          txDishWorld,
          directClinic.hitPoint,
          true,
          directClinic.ok,
          delta,
        );

        if (!directClinic.ok) {
          if (impactScale < 0.05) smoothedImpactPos.copy(directClinic.hitPoint);
          smoothedImpactPos.lerp(directClinic.hitPoint, 1 - Math.exp(-12 * delta));
          impactScale = THREE.MathUtils.damp(
            impactScale,
            1 + Math.sin(elapsed * 4.5) * 0.12,
            10,
            delta,
          );
        } else {
          impactScale = THREE.MathUtils.damp(impactScale, 0, 12, delta);
        }
        impactMarker.visible = impactScale > 0.03;
        impactMarker.position.copy(smoothedImpactPos);
        impactMarker.scale.setScalar(Math.max(0.01, impactScale));

        const txToAlpha = checkLinkClear("tx->alpha", txDishWorld, alphaDishWorld);
        updateSmoothedBeam(
          beamTxToAlpha,
          txDishWorld,
          txToAlpha.hitPoint,
          true,
          txToAlpha.ok,
          delta,
        );

        const alphaToBeta = txToAlpha.ok
          ? checkLinkClear("alpha->beta", alphaDishWorld, betaDishWorld, alphaActualYaw)
          : { ok: false, hitPoint: alphaDishWorld };
        updateSmoothedBeam(
          beamAlphaToBeta,
          alphaDishWorld,
          alphaToBeta.hitPoint,
          txToAlpha.ok,
          alphaToBeta.ok,
          delta,
        );

        const alphaToClinic = txToAlpha.ok
          ? checkLinkClear("alpha->clinic", alphaDishWorld, targetClinic.headPos, alphaActualYaw)
          : { ok: false, hitPoint: alphaDishWorld };
        updateSmoothedBeam(
          beamAlphaToClinic,
          alphaDishWorld,
          alphaToClinic.hitPoint,
          txToAlpha.ok,
          alphaToClinic.ok,
          delta,
        );

        const alphaToDorm = txToAlpha.ok
          ? checkLinkClear("alpha->dorm", alphaDishWorld, targetDorm.headPos, alphaActualYaw)
          : { ok: false, hitPoint: alphaDishWorld };
        updateSmoothedBeam(
          beamAlphaToDorm,
          alphaDishWorld,
          alphaToDorm.hitPoint,
          txToAlpha.ok,
          alphaToDorm.ok,
          delta,
        );

        const betaToDorm =
          txToAlpha.ok && alphaToBeta.ok
            ? checkLinkClear("beta->dorm", betaDishWorld, targetDorm.headPos, betaActualYaw)
            : { ok: false, hitPoint: betaDishWorld };
        updateSmoothedBeam(
          beamBetaToDorm,
          betaDishWorld,
          betaToDorm.hitPoint,
          txToAlpha.ok && alphaToBeta.ok && !alphaToDorm.ok,
          betaToDorm.ok,
          delta,
        );

        const betaToClinic =
          txToAlpha.ok && alphaToBeta.ok
            ? checkLinkClear("beta->clinic", betaDishWorld, targetClinic.headPos, betaActualYaw)
            : { ok: false, hitPoint: betaDishWorld };
        updateSmoothedBeam(
          beamBetaToClinic,
          betaDishWorld,
          betaToClinic.hitPoint,
          txToAlpha.ok && alphaToBeta.ok && !alphaToClinic.ok,
          betaToClinic.ok,
          delta,
        );

        // Instant visual feedback when relays establish or lose valid links
        const alphaConnectedNow =
          txToAlpha.ok && (alphaToBeta.ok || alphaToClinic.ok || alphaToDorm.ok);
        if (alphaConnectedNow !== prevAlphaChainOk) {
          prevAlphaChainOk = alphaConnectedNow;
          relayPulseRef.current.alpha = 0.75;
        }
        const betaConnectedNow =
          txToAlpha.ok && alphaToBeta.ok && (betaToClinic.ok || betaToDorm.ok);
        if (betaConnectedNow !== prevBetaChainOk) {
          prevBetaChainOk = betaConnectedNow;
          relayPulseRef.current.beta = 0.75;
        }

        const clinicConnected = directClinic.ok || alphaToClinic.ok || betaToClinic.ok;
        const dormConnected = alphaToDorm.ok || betaToDorm.ok;

        const updateTargetVisual = (t: typeof targetClinic, ok: boolean) => {
          if (ok && !t.wasConnected) {
            t.pulseTimer = 1.0;
          }
          t.wasConnected = ok;
          if (t.pulseTimer > 0) {
            t.pulseTimer = Math.max(0, t.pulseTimer - delta * 1.4);
          }

          const targetColor = ok ? COLOR_CONNECTED : COLOR_PENDING;
          if (t.orb.material instanceof THREE.MeshStandardMaterial) {
            t.orb.material.color.lerp(targetColor, 1 - Math.exp(-8 * delta));
            t.orb.material.emissive.lerp(targetColor, 1 - Math.exp(-8 * delta));
            t.orb.material.emissiveIntensity = THREE.MathUtils.damp(
              t.orb.material.emissiveIntensity,
              ok ? 1.25 : 0.7,
              8,
              delta,
            );
          }
          if (t.padRing.material instanceof THREE.MeshBasicMaterial) {
            t.padRing.material.color.lerp(targetColor, 1 - Math.exp(-8 * delta));
          }
          const targetOrbY = solvedRef.current ? 3.3 + Math.sin(elapsed * 3) * 0.12 : 3.05;
          t.orb.position.y = THREE.MathUtils.damp(t.orb.position.y, targetOrbY, 6, delta);
          t.orb.rotation.y += delta * (ok ? 2.4 : 0.85);

          // Expanding subtle completion / lock halo ring
          const waveMat = t.waveRing.material as THREE.MeshBasicMaterial;
          if (solvedRef.current) {
            const loopWave = (completionWaveProgress * 1.2) % 1;
            t.waveRing.scale.setScalar(1 + loopWave * 2.1);
            waveMat.opacity = (1 - loopWave) * 0.65;
          } else if (t.pulseTimer > 0) {
            const p = 1 - t.pulseTimer;
            t.waveRing.scale.setScalar(1 + p * 1.6);
            waveMat.opacity = t.pulseTimer * 0.55;
          } else {
            waveMat.opacity = 0;
          }
        };

        if (solvedRef.current) {
          completionWaveProgress += delta * 0.9;
        }
        updateTargetVisual(targetClinic, clinicConnected);
        updateTargetVisual(targetDorm, dormConnected);

        // Animate subtle continuous signal pulses across ALL currently active hops
        activeSegments.length = 0;
        if (directClinic.ok) activeSegments.push([txDishWorld, targetClinic.headPos]);
        if (txToAlpha.ok) activeSegments.push([txDishWorld, alphaDishWorld]);
        if (alphaToBeta.ok) activeSegments.push([alphaDishWorld, betaDishWorld]);
        if (alphaToClinic.ok) activeSegments.push([alphaDishWorld, targetClinic.headPos]);
        if (alphaToDorm.ok) activeSegments.push([alphaDishWorld, targetDorm.headPos]);
        if (betaToDorm.ok) activeSegments.push([betaDishWorld, targetDorm.headPos]);
        if (betaToClinic.ok) activeSegments.push([betaDishWorld, targetClinic.headPos]);

        for (let i = 0; i < pulseBeads.length; i++) {
          const bead = pulseBeads[i];
          if (activeSegments.length === 0) {
            bead.visible = false;
            continue;
          }
          const seg = activeSegments[i % activeSegments.length];
          const phaseOffset = Math.floor(i / activeSegments.length) * 0.5;
          const u = (elapsed * 0.72 + phaseOffset + (i % 3) * 0.14) % 1;
          bead.visible = true;
          bead.position.lerpVectors(seg[0], seg[1], u);
          _scratchDir.subVectors(seg[1], seg[0]);
          const pulseScale = 0.85 + Math.sin(u * Math.PI) * 0.35;
          bead.scale.setScalar(pulseScale);
        }

        if (elapsed - lastUiSync > 0.16) {
          lastUiSync = elapsed;
          const count = (clinicConnected ? 1 : 0) + (dormConnected ? 1 : 0);
          setConnectedTargets(count);
          setBlockedCount(2 - count);
          if (clinicConnected && dormConnected && !solvedRef.current) {
            solvedRef.current = true;
            setSolved(true);
            completionTimer = window.setTimeout(onComplete, 1650);
          }
        }
      });

      return () => {
        if (completionTimer !== null) {
          window.clearTimeout(completionTimer);
        }
        viewportApiRef.current = null;
        tutRig.dispose();
        disposables.forEach((d) => d.dispose());
      };
    },
    [completeTutorial, onComplete],
  );

  const activeCfg = relayStates[selectedRelay];

  return (
    <div className="relative w-full h-full">
      <Adaptive3DViewport
        mode="puzzle"
        bounds={bounds}
        initialPlayerPos={[0, 2, 0]}
        initialCameraOffset={[0, 19, 21]}
        skyColor="#7dd3fc"
        fogColor="#e0f2fe"
        fogDensity={0.0032}
        paused={paused}
        minZoomDistance={14}
        maxZoomDistance={44}
        onSceneReady={handleSceneReady}
        onStationInteract={(id) => {
          if (id === "practice" || id === "alpha" || id === "beta") {
            selectAndFocusRelay(id, true);
          }
        }}
        tutorial={{
          active: tutorialActive,
          prompt:
            lang === "en"
              ? "Drag or rotate the glowing Practice Tripod on the back-left terrace to test rooftop setup."
              : "বাম ছাদের উজ্জ্বল প্র্যাকটিস ট্রাইপডটি টেনে বা ঘুরিয়ে নিয়ন্ত্রণ পরীক্ষা করুন।",
          onSkip: skipTutorial,
          onReplay: replayTutorial,
        }}
        hudOverlay={
          <div className="pointer-events-none absolute top-14 left-3 md:top-auto md:bottom-20 md:left-1/2 md:-translate-x-1/2 z-20 flex items-center gap-3 px-3.5 py-2 rounded-xl bg-slate-950 border border-white/15 text-white shadow-xl text-xs">
            <div className="flex items-center gap-1.5">
              <Radio
                className={`w-4 h-4 ${connectedTargets === 2 ? "text-emerald-400" : "text-amber-400"}`}
              />
              <span className="font-semibold">
                {lang === "en" ? "Connected Roofs:" : "সংযুক্ত ছাদ:"}
              </span>
              <span className="font-mono-num font-bold text-emerald-300">{connectedTargets}/2</span>
            </div>
            {blockedCount > 0 && (
              <span className="hidden sm:inline text-rose-300 text-[11px] font-medium">
                {lang === "en"
                  ? "· Route around water tanks!"
                  : "· পানির ট্যাংক পাশ কাটিয়ে দিক ঠিক করুন!"}
              </span>
            )}
            {solved && (
              <span className="inline-flex items-center gap-1 text-emerald-300 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {lang === "en" ? "Mesh Locked!" : "লিঙ্ক সফল!"}
              </span>
            )}
          </div>
        }
        puzzleSelectionBar={
          <div className="pointer-events-none absolute inset-x-0 bottom-3 px-3 flex justify-center z-20">
            <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 bg-slate-950 border border-white/20 rounded-2xl px-3 py-2 shadow-2xl text-white">
              <div className="flex items-center gap-1 pr-2 border-r border-white/15">
                {(["alpha", "beta"] as const).map((rid) => (
                  <button
                    key={rid}
                    type="button"
                    onClick={() => selectAndFocusRelay(rid, true)}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                      selectedRelay === rid
                        ? rid === "alpha"
                          ? "bg-sky-600 text-white"
                          : "bg-purple-600 text-white"
                        : "bg-white/10 text-slate-300 hover:bg-white/20"
                    }`}
                  >
                    {relayStates[rid].label[lang]}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onPointerDown={() => startRotateHold(-1)}
                onPointerUp={() => stopRotateHold(-1)}
                onPointerLeave={() => stopRotateHold(-1)}
                onPointerCancel={() => stopRotateHold(-1)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    adjustSelectedRelay(-0.28);
                  }
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 active:bg-rose-600 text-xs font-semibold cursor-pointer select-none"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{lang === "en" ? "Aim Left" : "বামে"}</span>
              </button>

              <button
                type="button"
                onPointerDown={() => startRotateHold(1)}
                onPointerUp={() => stopRotateHold(1)}
                onPointerLeave={() => stopRotateHold(1)}
                onPointerCancel={() => stopRotateHold(1)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    adjustSelectedRelay(0.28);
                  }
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 active:bg-rose-600 text-xs font-semibold cursor-pointer select-none"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>{lang === "en" ? "Aim Right" : "ডানে"}</span>
              </button>

              <button
                type="button"
                onClick={() => adjustSelectedRelay(0, true)}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  activeCfg.tall
                    ? "bg-emerald-600 text-white"
                    : "bg-amber-500/20 border border-amber-400/50 text-amber-200 hover:bg-amber-500/30"
                }`}
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                <span>
                  {activeCfg.tall
                    ? lang === "en"
                      ? "Tall Mast"
                      : "উঁচু মাস্তুল"
                    : lang === "en"
                      ? "Low Mast"
                      : "নিচু মাস্তুল"}
                </span>
              </button>
            </div>
          </div>
        }
      />
    </div>
  );
};
