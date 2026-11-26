import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useRobiTrail } from "../../../context/RobiTrailContext";
import { ambientSynth } from "../../../services/audio/ambientSynth";
import { Adaptive3DViewport, type AdaptiveViewportApi } from "../engine/Adaptive3DViewport";
import { createTutorialBeaconRig, useTutorialState } from "../engine/InWorldTutorial3D";
import {
  createCargoLorry,
  createChannelBuoy,
  createDistanceSectorSign,
  createHarbourCargoShip,
  createHarbourGateway,
  createPacketDrone,
  createPierLightMast,
  createPortGantryCrane,
  createShippingContainer,
  makeAsphaltTexture,
} from "./chattogramProps";
import { HarbourLoseModal } from "./HarbourLoseModal";
import {
  computeHarbourProgressPct,
  computeHarbourSpeed,
  detectHarbourHazardCollision,
  getChancesRemainingAfterRetry,
  HARBOUR_BOOST_RING_POSITIONS,
  HARBOUR_CRANE_Z_POSITIONS,
  HARBOUR_DECK_CENTER_Z,
  HARBOUR_DECK_LENGTH,
  HARBOUR_DISTANCE_MARKERS,
  HARBOUR_FINISH_Z,
  HARBOUR_GATEWAY_Z,
  HARBOUR_INTERFERENCE_ZONES,
  HARBOUR_LORRY_CONFIGS,
  HARBOUR_MAX_RETRY_CHANCES,
  HARBOUR_PIER_WIDTH,
  HARBOUR_PRACTICE_RING_POS,
  HARBOUR_START_Z,
  HARBOUR_STATIC_CONTAINER_PLACEMENTS,
  HARBOUR_STEER_LIMIT_X,
  HARBOUR_WORLD_BOUNDS,
  type HarbourCrashCause,
  type HarbourObstacleBox,
} from "./harbourChaseLogic";
import { Gauge, Heart, ShieldCheck, Sparkles } from "lucide-react";

interface PierObstacle extends HarbourObstacleBox {
  mesh: THREE.Object3D;
  moveAmp?: number;
  moveSpeed?: number;
  phase?: number;
}

interface BoostRing {
  x: number;
  z: number;
  collected: boolean;
  mesh: THREE.Mesh;
}

interface Game3Props {
  paused?: boolean;
  onProgress: (pct: number) => void;
  onComplete: () => void;
  onExitToCity?: () => void;
}

export const Game3ConnectionRescue3D: React.FC<Game3Props> = ({
  paused = false,
  onProgress,
  onComplete,
  onExitToCity,
}) => {
  const { lang, soundEnabled } = useRobiTrail();
  const { tutorialActive, completeTutorial, skipTutorial, replayTutorial } =
    useTutorialState("ctg3_harbour_chase_v1");

  const [integrity, setIntegrity] = useState(100);
  const [distancePct, setDistancePct] = useState(0);
  const [ringsCollected, setRingsCollected] = useState(0);
  const [speedDisplay, setSpeedDisplay] = useState(12.5);
  const [chancesLeft, setChancesLeft] = useState(HARBOUR_MAX_RETRY_CHANCES);
  const [crashCause, setCrashCause] = useState<HarbourCrashCause>("truck");
  const [crashed, setCrashed] = useState(false);
  const [finished, setFinished] = useState(false);
  const [hitFlash, setHitFlash] = useState(false);

  const tutorialActiveRef = useRef(tutorialActive);
  tutorialActiveRef.current = tutorialActive;
  const crashedRef = useRef(crashed);
  crashedRef.current = crashed;
  const finishedRef = useRef(finished);
  finishedRef.current = finished;
  const soundEnabledRef = useRef(soundEnabled);
  soundEnabledRef.current = soundEnabled;
  const langRef = useRef(lang);
  langRef.current = lang;
  const resetRunRef = useRef<() => void>(() => {});
  const tutorialBeaconRef = useRef<ReturnType<typeof createTutorialBeaconRig> | null>(null);

  useEffect(() => {
    if (finished) {
      onProgress(100);
    } else {
      onProgress(Math.min(99, Math.round(distancePct)));
    }
  }, [distancePct, finished, onProgress]);

  useEffect(() => {
    if (tutorialBeaconRef.current) {
      tutorialBeaconRef.current.setVisible(tutorialActive);
    }
  }, [tutorialActive]);

  const bounds = useMemo(() => ({ ...HARBOUR_WORLD_BOUNDS }), []);

  const handleSceneReady = useCallback(
    (api: AdaptiveViewportApi) => {
      const { scene, chaseInput } = api;
      const disposables: { dispose: () => void }[] = [];

      // 1. Bright Port Daylight Sea with Subtle Animated Waves + Pier Foam Edge
      const seaUniforms = { uTime: { value: 0 } };
      const seaMat = new THREE.MeshStandardMaterial({
        color: 0x0284c7,
        roughness: 0.22,
        metalness: 0.16,
      });
      seaMat.onBeforeCompile = (shader) => {
        shader.uniforms.uTime = seaUniforms.uTime;
        shader.vertexShader = `uniform float uTime;\n${shader.vertexShader}`.replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
           float wave = sin(position.x * 0.25 + uTime * 1.35) * 0.16 + cos(position.y * 0.2 + uTime * 1.05) * 0.14;
           transformed.z += wave;`,
        );
      };
      disposables.push(seaMat);

      const seaGeo = new THREE.PlaneGeometry(280, 420, 36, 52);
      disposables.push(seaGeo);
      const sea = new THREE.Mesh(seaGeo, seaMat);
      sea.rotation.x = -Math.PI / 2;
      sea.position.set(18, -0.5, HARBOUR_DECK_CENTER_Z);
      sea.receiveShadow = true;
      scene.add(sea);

      // Shoreline wake / foam strip running along east pier wall
      const foamMat = new THREE.MeshBasicMaterial({
        color: 0xe0f2fe,
        transparent: true,
        opacity: 0.45,
      });
      disposables.push(foamMat);
      const foamStrip = new THREE.Mesh(
        new THREE.BoxGeometry(1.1, 0.06, HARBOUR_DECK_LENGTH + 4),
        foamMat,
      );
      foamStrip.position.set(HARBOUR_PIER_WIDTH / 2 + 0.85, -0.32, HARBOUR_DECK_CENTER_Z);
      scene.add(foamStrip);

      // 2. Expanded 18.6m x 264m Asphalt Pier Deck + Curbs + Bollards + Light Masts
      const asphaltTex = makeAsphaltTexture(4);
      asphaltTex.repeat.set(1, 34);
      disposables.push(asphaltTex);

      const pierMat = new THREE.MeshStandardMaterial({ map: asphaltTex, roughness: 0.78 });
      disposables.push(pierMat);
      const pierDeck = new THREE.Mesh(
        new THREE.BoxGeometry(HARBOUR_PIER_WIDTH, 0.48, HARBOUR_DECK_LENGTH),
        pierMat,
      );
      pierDeck.position.set(0, -0.24, HARBOUR_DECK_CENTER_Z);
      pierDeck.receiveShadow = true;
      scene.add(pierDeck);

      const curbMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.65 });
      const dangerMat = new THREE.MeshStandardMaterial({ color: 0xe11d48, roughness: 0.55 });
      const bollardMat = new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        roughness: 0.45,
        metalness: 0.25,
      });
      disposables.push(curbMat, dangerMat, bollardMat);

      const halfPier = HARBOUR_PIER_WIDTH / 2;
      [-halfPier - 0.25, halfPier + 0.25].forEach((cx) => {
        const curb = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, HARBOUR_DECK_LENGTH), curbMat);
        curb.position.set(cx, 0.22, HARBOUR_DECK_CENTER_Z);
        curb.receiveShadow = true;
        scene.add(curb);
      });

      const pierEdge = new THREE.Mesh(
        new THREE.BoxGeometry(0.38, 0.56, HARBOUR_DECK_LENGTH),
        dangerMat,
      );
      pierEdge.position.set(halfPier + 0.62, 0.22, HARBOUR_DECK_CENTER_Z);
      scene.add(pierEdge);

      // Pier Light Masts & Mooring Bollards along the 240m run
      for (let z = 72; z >= -168; z -= 36) {
        const mast = createPierLightMast();
        mast.position.set(-halfPier - 0.3, 0, z);
        scene.add(mast);
      }
      for (let z = 78; z >= -166; z -= 24) {
        const bollard = new THREE.Mesh(
          new THREE.CylinderGeometry(0.18, 0.24, 0.65, 10),
          bollardMat,
        );
        bollard.position.set(halfPier + 0.3, 0.55, z);
        scene.add(bollard);
      }

      // 3. West Container Yard Terminal + East Anchored Cargo Ships + Channel Buoys
      const containerColors = [0xe11d48, 0x0284c7, 0xf59e0b, 0x0f766e];
      for (let i = 0; i < 22; i++) {
        const zPos = 74 - i * 11.4;
        const c1 = createShippingContainer(containerColors[i % containerColors.length], 7.5);
        c1.position.set(-halfPier - 3.6, 0, zPos);
        scene.add(c1);
        if (i % 2 === 0) {
          const c2 = createShippingContainer(
            containerColors[(i + 1) % containerColors.length],
            7.5,
          );
          c2.position.set(-halfPier - 3.6, 2.4, zPos);
          scene.add(c2);
        }
      }

      const ship1 = createHarbourCargoShip(0x881337, 0x0284c7);
      ship1.position.set(24.5, -0.35, -16);
      scene.add(ship1);

      const ship2 = createHarbourCargoShip(0x0f766e, 0xe11d48);
      ship2.position.set(25.5, -0.35, -112);
      scene.add(ship2);

      const buoys: { group: THREE.Group; baseY: number; phase: number }[] = [];
      [62, 22, -48, -76, -148].forEach((bz, idx) => {
        const buoy = createChannelBuoy(idx % 2 === 0 ? 0xe11d48 : 0x10b981);
        buoy.position.set(17.2 + (idx % 2) * 3.5, -0.35, bz);
        scene.add(buoy);
        buoys.push({ group: buoy, baseY: -0.35, phase: idx * 1.3 });
      });

      // Roadside Distance Sector Signs (60m / 120m / 180m / 240m)
      HARBOUR_DISTANCE_MARKERS.forEach((marker) => {
        const sign = createDistanceSectorSign(
          langRef.current === "bn" ? marker.bn : marker.en,
          langRef.current === "bn" ? marker.subBn : marker.subEn,
          4,
        );
        sign.position.set(halfPier + 0.35, 0, marker.z);
        sign.rotation.y = -0.22;
        scene.add(sign);
      });

      // 4. Port Gantry Cranes Straddling the Wider Pier
      const craneTrolleys: {
        trolley: THREE.Group;
        phase: number;
        speed: number;
        z: number;
        scaleX: number;
      }[] = [];
      const craneScaleX = 1.12;
      HARBOUR_CRANE_Z_POSITIONS.forEach((cz, i) => {
        const crane = createPortGantryCrane(i % 2 === 0 ? 0xe11d48 : 0xf59e0b);
        crane.group.scale.set(craneScaleX, 1, 1);
        crane.group.position.set(0, 0, cz);
        scene.add(crane.group);
        craneTrolleys.push({
          trolley: crane.trolley,
          phase: i * 1.4,
          speed: 0.72 + i * 0.1,
          z: cz,
          scaleX: craneScaleX,
        });
      });

      // 5. Pier Obstacles (Well-Spaced Static Cargo Crates + Moving Port Lorries)
      const obstacles: PierObstacle[] = [];
      HARBOUR_STATIC_CONTAINER_PLACEMENTS.forEach(([ox, oz], idx) => {
        const crate = createShippingContainer(
          containerColors[(idx + 2) % containerColors.length],
          4.2,
        );
        crate.position.set(ox, 0, oz);
        scene.add(crate);
        obstacles.push({
          x: ox,
          z: oz,
          halfW: 1.45,
          halfD: 2.35,
          kind: "container",
          mesh: crate,
        });
      });

      HARBOUR_LORRY_CONFIGS.forEach((lc) => {
        const lorry = createCargoLorry(lc.color);
        lorry.position.set(lc.x, 0, lc.z);
        scene.add(lorry);
        obstacles.push({
          x: lc.x,
          z: lc.z,
          halfW: 1.35,
          halfD: 2.9,
          kind: "truck",
          mesh: lorry,
          moveAmp: lc.amp,
          moveSpeed: lc.speed,
          phase: lc.phase,
        });
      });

      // 6. Amber EM Interference Zones
      const interferenceZones: { x: number; z: number; radius: number; mesh: THREE.Mesh }[] = [];
      HARBOUR_INTERFERENCE_ZONES.forEach(([ix, iz]) => {
        const cloud = new THREE.Mesh(
          new THREE.CylinderGeometry(2.2, 2.2, 0.25, 24),
          new THREE.MeshBasicMaterial({
            color: 0xf59e0b,
            transparent: true,
            opacity: 0.42,
          }),
        );
        cloud.position.set(ix, 0.14, iz);
        scene.add(cloud);
        interferenceZones.push({ x: ix, z: iz, radius: 2.3, mesh: cloud });
      });

      // 7. Practice Warmup Ring + 6 Emerald FEC Boost Rings along 240m Run
      const practiceRing = new THREE.Mesh(
        new THREE.TorusGeometry(2.0, 0.18, 12, 28),
        new THREE.MeshStandardMaterial({
          color: 0x38bdf8,
          emissive: 0x0284c7,
          emissiveIntensity: 1.1,
        }),
      );
      practiceRing.position.set(HARBOUR_PRACTICE_RING_POS.x, 1.8, HARBOUR_PRACTICE_RING_POS.z);
      scene.add(practiceRing);

      const tutRig = createTutorialBeaconRig(0x38bdf8);
      tutRig.setTarget(HARBOUR_PRACTICE_RING_POS.x, 0.2, HARBOUR_PRACTICE_RING_POS.z);
      tutRig.setVisible(tutorialActiveRef.current);
      scene.add(tutRig.group);
      tutorialBeaconRef.current = tutRig;

      const boostRings: BoostRing[] = [];
      HARBOUR_BOOST_RING_POSITIONS.forEach(([rx, rz]) => {
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(1.75, 0.16, 12, 28),
          new THREE.MeshStandardMaterial({
            color: 0x10b981,
            emissive: 0x059669,
            emissiveIntensity: 1.2,
          }),
        );
        ring.position.set(rx, 1.65, rz);
        scene.add(ring);
        boostRings.push({ x: rx, z: rz, collected: false, mesh: ring });
      });

      // 8. Finish Arch: Harbour Fiber Gateway at 240m
      const gateway = createHarbourGateway(4);
      gateway.scale.set(1.16, 1, 1);
      gateway.position.set(0, 0, HARBOUR_GATEWAY_Z);
      scene.add(gateway);

      // 9. Packet Carrier Drone + Follow Chase Camera Registration
      const drone = createPacketDrone();
      drone.group.position.set(0, 0.2, HARBOUR_START_Z);
      scene.add(drone.group);

      api.setChaseFollowTarget(
        drone.group,
        new THREE.Vector3(0, 7.6, 13.8),
        new THREE.Vector3(0, 1.5, -14),
      );

      // Game Run Mutable State
      let droneX = 0;
      let droneZ = HARBOUR_START_Z;
      let integrityVal = 100;
      let ringsCount = 0;
      let boostTimer = 0;
      let lastUiSync = 0;

      resetRunRef.current = () => {
        droneX = 0;
        droneZ = HARBOUR_START_Z;
        integrityVal = 100;
        ringsCount = 0;
        boostTimer = 0;
        crashedRef.current = false;
        finishedRef.current = false;
        setIntegrity(100);
        setDistancePct(0);
        setRingsCollected(0);
        setSpeedDisplay(12.5);
        setCrashed(false);
        setFinished(false);
        setHitFlash(false);
        practiceRing.visible = true;
        boostRings.forEach((r) => {
          r.collected = false;
          r.mesh.visible = true;
        });
        drone.group.position.set(0, 0.2, HARBOUR_START_Z);
        drone.group.rotation.z = 0;
        if (drone.coreMesh.material instanceof THREE.MeshStandardMaterial) {
          drone.coreMesh.material.color.setHex(0x38bdf8);
          drone.coreMesh.material.emissive.setHex(0x0284c7);
        }
      };

      // 10. Chase Physics & Instant Collision Loop
      api.setFrameUpdater((delta, elapsed) => {
        seaUniforms.uTime.value = elapsed;
        tutRig.update(elapsed);

        // Animate rotors, cargo ships, & channel buoys
        drone.rotors.forEach((rot, idx) => {
          rot.rotation.y += delta * (idx % 2 === 0 ? 22 : -22);
        });
        ship1.position.y = -0.35 + Math.sin(elapsed * 1.1) * 0.16;
        ship2.position.y = -0.35 + Math.sin(elapsed * 0.95 + 1.8) * 0.16;
        buoys.forEach((b) => {
          b.group.position.y = b.baseY + Math.sin(elapsed * 1.9 + b.phase) * 0.12;
          b.group.rotation.z = Math.sin(elapsed * 1.5 + b.phase) * 0.06;
        });

        // Animate gantry crane trolleys swaying across wider pier
        craneTrolleys.forEach((ct) => {
          ct.trolley.position.x = Math.sin(elapsed * ct.speed + ct.phase) * 4.3;
        });

        // Animate patrolling port lorries
        obstacles.forEach((obs) => {
          if (obs.moveAmp && obs.moveSpeed) {
            obs.x = Math.sin(elapsed * obs.moveSpeed + (obs.phase ?? 0)) * obs.moveAmp;
            obs.mesh.position.x = obs.x;
          }
        });

        // Pulse interference zones
        interferenceZones.forEach((iz, i) => {
          iz.mesh.scale.setScalar(1 + Math.sin(elapsed * 4 + i) * 0.08);
        });

        if (crashedRef.current || finishedRef.current) return;

        // Practice Ring Check
        if (tutorialActiveRef.current) {
          if (
            Math.hypot(droneX - HARBOUR_PRACTICE_RING_POS.x, droneZ - HARBOUR_PRACTICE_RING_POS.z) <
              2.6 ||
            droneZ < 52
          ) {
            practiceRing.visible = false;
            completeTutorial();
          }
        }

        // Responsive Left/Right Steering across widened 14.8m corridor
        const steerSpeed = 13.0;
        droneX = THREE.MathUtils.clamp(
          droneX + chaseInput.steer * steerSpeed * delta,
          -HARBOUR_STEER_LIMIT_X,
          HARBOUR_STEER_LIMIT_X,
        );

        // Smooth Progressive Forward Speed Ramp along 240m Pier
        const currentPct = computeHarbourProgressPct(droneZ);
        const forwardSpeed = computeHarbourSpeed(currentPct, {
          tutorialActive: tutorialActiveRef.current,
          boostActive: boostTimer > 0,
          inputBoost: chaseInput.boost,
          inputBrake: chaseInput.brake,
        });
        droneZ -= forwardSpeed * delta;

        if (boostTimer > 0) boostTimer -= delta;

        // Tilting drone bank animation
        drone.group.position.set(droneX, 0.25 + Math.sin(elapsed * 8) * 0.06, droneZ);
        drone.group.rotation.z = THREE.MathUtils.damp(
          drone.group.rotation.z,
          -chaseInput.steer * 0.34,
          10,
          delta,
        );

        // Check Boost Rings
        boostRings.forEach((br) => {
          if (br.collected) return;
          br.mesh.rotation.z += delta * 2.2;
          if (Math.hypot(droneX - br.x, droneZ - br.z) < 2.35) {
            br.collected = true;
            br.mesh.visible = false;
            ringsCount += 1;
            boostTimer = 1.6;
            integrityVal = Math.min(100, integrityVal + 12);
          }
        });

        // Check Interference Clouds
        let inInterference = false;
        for (const iz of interferenceZones) {
          if (Math.hypot(droneX - iz.x, droneZ - iz.z) < iz.radius) {
            inInterference = true;
            integrityVal = Math.max(0, integrityVal - 16 * delta);
          }
        }

        // Instant Collision Check: Cargo Truck, Container Block, or Crane Hook
        const craneBoxes = craneTrolleys.map((ct) => ({
          x: ct.trolley.position.x * ct.scaleX,
          z: ct.z,
        }));
        const hazardHit = detectHarbourHazardCollision(droneX, droneZ, obstacles, craneBoxes);

        if (hazardHit !== null) {
          crashedRef.current = true;
          api.triggerCameraShake(0.55);
          setHitFlash(true);
          window.setTimeout(() => setHitFlash(false), 300);
          ambientSynth.playCrashTone(soundEnabledRef.current);

          if (drone.coreMesh.material instanceof THREE.MeshStandardMaterial) {
            drone.coreMesh.material.color.setHex(0xef4444);
            drone.coreMesh.material.emissive.setHex(0xef4444);
          }
          setDistancePct(computeHarbourProgressPct(droneZ));
          setIntegrity(Math.round(integrityVal));
          setRingsCollected(ringsCount);
          setSpeedDisplay(forwardSpeed);
          setCrashCause(hazardHit);
          setCrashed(true);
          return;
        }

        if (integrityVal <= 0 && !crashedRef.current) {
          crashedRef.current = true;
          ambientSynth.playCrashTone(soundEnabledRef.current);
          setIntegrity(0);
          setCrashCause("interference");
          setCrashed(true);
          return;
        }

        // Update drone core glow based on interference / boost
        if (drone.coreMesh.material instanceof THREE.MeshStandardMaterial) {
          const coreHex = inInterference ? 0xf59e0b : boostTimer > 0 ? 0x10b981 : 0x38bdf8;
          drone.coreMesh.material.color.setHex(coreHex);
          drone.coreMesh.material.emissive.setHex(coreHex);
        }

        // Finish Line Arrival at 240m Harbour Gateway
        if (droneZ <= HARBOUR_FINISH_Z && !finishedRef.current) {
          finishedRef.current = true;
          setFinished(true);
          setDistancePct(100);
          setIntegrity(Math.round(integrityVal));
          setRingsCollected(ringsCount);
          setSpeedDisplay(forwardSpeed);
          window.setTimeout(onComplete, 900);
          return;
        }

        if (elapsed - lastUiSync > 0.12) {
          lastUiSync = elapsed;
          setDistancePct(computeHarbourProgressPct(droneZ));
          setIntegrity(Math.round(integrityVal));
          setRingsCollected(ringsCount);
          setSpeedDisplay(forwardSpeed);
        }
      });

      return () => {
        tutRig.dispose();
        disposables.forEach((d) => d.dispose());
      };
    },
    [completeTutorial, onComplete],
  );

  const handleRetryChance = () => {
    setChancesLeft((prev) => getChancesRemainingAfterRetry(prev));
    resetRunRef.current();
  };

  const handleRestartFullSession = () => {
    setChancesLeft(HARBOUR_MAX_RETRY_CHANCES);
    resetRunRef.current();
  };

  const handleExitToCity = () => {
    if (onExitToCity) {
      onExitToCity();
    } else {
      handleRestartFullSession();
    }
  };

  return (
    <div className="relative w-full h-full">
      <Adaptive3DViewport
        mode="chase"
        bounds={bounds}
        initialPlayerPos={[0, 0.2, HARBOUR_START_Z]}
        initialCameraOffset={[0, 7.6, 13.8]}
        skyColor="#7dd3fc"
        fogColor="#e0f2fe"
        fogDensity={0.0036}
        paused={paused || crashed}
        minZoomDistance={10}
        maxZoomDistance={28}
        onSceneReady={handleSceneReady}
        onStationInteract={() => {}}
        tutorial={{
          active: tutorialActive,
          prompt:
            lang === "en"
              ? "Steer Left/Right (A/D or touch buttons) through the glowing Practice Gate to start the 240m harbour chase."
              : "বাম/ডানে (A/D বা বাটন) চালিয়ে উজ্জ্বল প্র্যাকটিস গেটের ভেতর দিয়ে ২৪০ মিটার হারবার ধাওয়া শুরু করুন।",
          onSkip: skipTutorial,
          onReplay: replayTutorial,
        }}
        hudOverlay={
          <>
            {/* Integrity, Speed, Chances & Harbour Progress Telemetry Bar */}
            <div className="pointer-events-none absolute top-14 left-3 md:top-auto md:bottom-3 md:left-1/2 md:-translate-x-1/2 z-20 flex items-center gap-2.5 sm:gap-3 px-3.5 py-2 rounded-xl bg-slate-950 border border-white/15 text-white shadow-xl text-xs">
              <div className="flex items-center gap-1.5">
                <ShieldCheck
                  className={`w-4 h-4 ${
                    integrity > 50
                      ? "text-emerald-400"
                      : integrity > 25
                        ? "text-amber-400"
                        : "text-rose-400"
                  }`}
                />
                <span className="hidden sm:inline text-slate-300">
                  {lang === "en" ? "Integrity:" : "সুরক্ষা:"}
                </span>
                <span className="font-mono-num font-bold text-amber-300">{integrity}%</span>
              </div>
              <span className="text-slate-600">|</span>
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                <span className="font-mono-num font-bold text-sky-300">{ringsCollected}/6</span>
              </div>
              <span className="text-slate-600">|</span>
              <div className="hidden sm:flex items-center gap-1">
                <Gauge className="w-3.5 h-3.5 text-cyan-300" />
                <span className="font-mono-num font-bold text-cyan-200">
                  {speedDisplay.toFixed(1)} m/s
                </span>
              </div>
              <span className="hidden sm:inline text-slate-600">|</span>
              <div className="flex items-center gap-1" title="Retry chances remaining">
                <Heart className="w-3.5 h-3.5 text-rose-400" />
                <span className="font-mono-num font-bold text-rose-200">{chancesLeft}</span>
              </div>
              <span className="text-slate-600">|</span>
              <span className="font-mono-num font-bold text-emerald-300">{distancePct}%</span>
            </div>

            {/* Brief red edge flash on collision */}
            {hitFlash && (
              <div className="pointer-events-none absolute inset-0 border-4 border-rose-500/80 z-30" />
            )}
          </>
        }
      />

      {/* Lose & Retry Modal on Collision or Zero Integrity */}
      {crashed && !finished && (
        <HarbourLoseModal
          lang={lang}
          chancesLeft={chancesLeft}
          crashCause={crashCause}
          onRetry={handleRetryChance}
          onRestartGame={handleRestartFullSession}
          onExitToCity={handleExitToCity}
        />
      )}
    </div>
  );
};
