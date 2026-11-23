import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useRobiTrail } from "../../../context/RobiTrailContext";
import { Adaptive3DViewport, type AdaptiveViewportApi } from "../engine/Adaptive3DViewport";
import { createTutorialBeaconRig, useTutorialState } from "../engine/InWorldTutorial3D";
import {
  createCargoLorry,
  createHarbourGateway,
  createPacketDrone,
  createPortGantryCrane,
  createShippingContainer,
  makeAsphaltTexture,
} from "./chattogramProps";
import { RotateCcw, ShieldCheck, Sparkles } from "lucide-react";

interface PierObstacle {
  x: number;
  z: number;
  halfW: number;
  halfD: number;
  mesh?: THREE.Object3D;
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
}

export const Game3ConnectionRescue3D: React.FC<Game3Props> = ({
  paused = false,
  onProgress,
  onComplete,
}) => {
  const { lang } = useRobiTrail();
  const { tutorialActive, completeTutorial, skipTutorial, replayTutorial } =
    useTutorialState("ctg3_harbour_chase_v1");

  const [integrity, setIntegrity] = useState(100);
  const [distancePct, setDistancePct] = useState(0);
  const [ringsCollected, setRingsCollected] = useState(0);
  const [crashed, setCrashed] = useState(false);
  const [finished, setFinished] = useState(false);
  const [hitFlash, setHitFlash] = useState(false);

  const tutorialActiveRef = useRef(tutorialActive);
  tutorialActiveRef.current = tutorialActive;
  const crashedRef = useRef(crashed);
  crashedRef.current = crashed;
  const finishedRef = useRef(finished);
  finishedRef.current = finished;
  const resetRunRef = useRef<() => void>(() => {});
  const tutorialBeaconRef = useRef<ReturnType<typeof createTutorialBeaconRig> | null>(null);

  useEffect(() => {
    if (finished) {
      onProgress(100);
    } else {
      onProgress(Math.min(95, Math.round(distancePct)));
    }
  }, [distancePct, finished, onProgress]);

  useEffect(() => {
    if (tutorialBeaconRef.current) {
      tutorialBeaconRef.current.setVisible(tutorialActive);
    }
  }, [tutorialActive]);

  const bounds = useMemo(() => ({ minX: -7.5, maxX: 7.5, minZ: -86, maxZ: 82 }), []);

  const handleSceneReady = useCallback(
    (api: AdaptiveViewportApi) => {
      const { scene, chaseInput } = api;
      const disposables: { dispose: () => void }[] = [];

      // 1. Coastal Sea + Chattogram Port Pier Deck (175m long coastal run)
      const sea = new THREE.Mesh(
        new THREE.PlaneGeometry(240, 280),
        new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.25, metalness: 0.14 }),
      );
      sea.rotation.x = -Math.PI / 2;
      sea.position.set(16, -0.45, 0);
      scene.add(sea);

      const asphaltTex = makeAsphaltTexture(4);
      asphaltTex.repeat.set(1, 22);
      disposables.push(asphaltTex);

      const pierDeck = new THREE.Mesh(
        new THREE.BoxGeometry(16, 0.4, 178),
        new THREE.MeshStandardMaterial({ map: asphaltTex, roughness: 0.8 }),
      );
      pierDeck.position.set(0, -0.2, -2);
      pierDeck.receiveShadow = true;
      scene.add(pierDeck);

      // Concrete pier side curbs + warning striping
      const curbMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.7 });
      const dangerMat = new THREE.MeshStandardMaterial({ color: 0xe11d48, roughness: 0.6 });
      [-7.9, 7.9].forEach((cx) => {
        const curb = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.45, 178), curbMat);
        curb.position.set(cx, 0.2, -2);
        scene.add(curb);
      });
      const pierEdge = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.52, 178), dangerMat);
      pierEdge.position.set(8.2, 0.2, -2);
      scene.add(pierEdge);

      // 2. West Container Yard Backdrop + East Anchored Cargo Ship Silhouette
      const containerColors = [0xe11d48, 0x0284c7, 0xf59e0b, 0x0f766e];
      for (let i = 0; i < 14; i++) {
        const zPos = 70 - i * 11.2;
        const c1 = createShippingContainer(containerColors[i % containerColors.length], 7.5);
        c1.position.set(-11.2, 0, zPos);
        scene.add(c1);
        if (i % 2 === 0) {
          const c2 = createShippingContainer(
            containerColors[(i + 1) % containerColors.length],
            7.5,
          );
          c2.position.set(-11.2, 2.4, zPos);
          scene.add(c2);
        }
      }

      // Anchored Bay Vessel beside the east pier
      const shipGroup = new THREE.Group();
      const hull = new THREE.Mesh(
        new THREE.BoxGeometry(8, 3.6, 36),
        new THREE.MeshStandardMaterial({ color: 0x881337, roughness: 0.6 }),
      );
      hull.position.y = 1.4;
      const bridge = new THREE.Mesh(
        new THREE.BoxGeometry(6, 5.2, 6),
        new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 }),
      );
      bridge.position.set(0, 5.5, 11);
      shipGroup.add(hull, bridge);
      shipGroup.position.set(22, -0.3, -18);
      scene.add(shipGroup);

      // 3. Port Gantry Cranes Straddling the Pier (with gently moving trolley cargo)
      const craneTrolleys: { trolley: THREE.Group; phase: number; speed: number; z: number }[] = [];
      [34, 2, -28, -56].forEach((cz, i) => {
        const crane = createPortGantryCrane(i % 2 === 0 ? 0xe11d48 : 0xf59e0b);
        crane.group.position.set(0, 0, cz);
        scene.add(crane.group);
        craneTrolleys.push({
          trolley: crane.trolley,
          phase: i * 1.4,
          speed: 0.8 + i * 0.14,
          z: cz,
        });
      });

      // 4. Pier Obstacles (Static Cargo Crates + Moving Port Lorries)
      const obstacles: PierObstacle[] = [];
      const staticPlacements: [number, number][] = [
        [-4.2, 42],
        [4.0, 26],
        [0.0, 10],
        [-3.8, -14],
        [4.2, -38],
        [-1.0, -64],
      ];
      staticPlacements.forEach(([ox, oz], idx) => {
        const crate = createShippingContainer(
          containerColors[(idx + 2) % containerColors.length],
          4.2,
        );
        crate.position.set(ox, 0, oz);
        scene.add(crate);
        obstacles.push({ x: ox, z: oz, halfW: 1.45, halfD: 2.35, mesh: crate });
      });

      // Moving Port Trucks weaving gently across predictable pier lanes
      const lorryConfigs = [
        { x: 0, z: 18, color: 0x0284c7, amp: 4.5, speed: 0.9, phase: 0.2 },
        { x: 0, z: -6, color: 0xf59e0b, amp: 4.6, speed: 1.05, phase: 2.1 },
        { x: 0, z: -46, color: 0x0f766e, amp: 4.4, speed: 0.95, phase: 3.7 },
      ];
      lorryConfigs.forEach((lc) => {
        const lorry = createCargoLorry(lc.color);
        lorry.position.set(lc.x, 0, lc.z);
        scene.add(lorry);
        obstacles.push({
          x: lc.x,
          z: lc.z,
          halfW: 1.35,
          halfD: 2.9,
          mesh: lorry,
          moveAmp: lc.amp,
          moveSpeed: lc.speed,
          phase: lc.phase,
        });
      });

      // 5. Amber EM Interference Zones (drain integrity while passing inside)
      const interferenceZones: { x: number; z: number; radius: number; mesh: THREE.Mesh }[] = [];
      [
        [3.2, 34],
        [-3.6, -2],
        [2.5, -24],
        [-3.2, -50],
      ].forEach(([ix, iz]) => {
        const cloud = new THREE.Mesh(
          new THREE.CylinderGeometry(2.3, 2.3, 0.25, 24),
          new THREE.MeshBasicMaterial({
            color: 0xf59e0b,
            transparent: true,
            opacity: 0.42,
          }),
        );
        cloud.position.set(ix, 0.14, iz);
        scene.add(cloud);
        interferenceZones.push({ x: ix, z: iz, radius: 2.4, mesh: cloud });
      });

      // 6. Glowing Cyan/Emerald FEC Priority Boost Rings + Practice Warmup Gate
      const practiceRing = new THREE.Mesh(
        new THREE.TorusGeometry(2.0, 0.18, 12, 28),
        new THREE.MeshStandardMaterial({
          color: 0x38bdf8,
          emissive: 0x0284c7,
          emissiveIntensity: 1.1,
        }),
      );
      practiceRing.position.set(-2.4, 1.8, 60);
      scene.add(practiceRing);

      const tutRig = createTutorialBeaconRig(0x38bdf8);
      tutRig.setTarget(-2.4, 0.2, 60);
      tutRig.setVisible(tutorialActiveRef.current);
      scene.add(tutRig.group);
      tutorialBeaconRef.current = tutRig;

      const boostRings: BoostRing[] = [];
      [
        [0, 39],
        [-4.2, 16],
        [4.4, -4],
        [-4.0, -24],
        [3.8, -48],
        [0.0, -70],
      ].forEach(([rx, rz]) => {
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(1.7, 0.16, 12, 28),
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

      // 7. Finish Arch: Harbour Gateway
      const gateway = createHarbourGateway(4);
      gateway.position.set(0, 0, -80);
      scene.add(gateway);

      // 8. Packet Carrier Drone + Follow Chase Camera Registration
      const drone = createPacketDrone();
      drone.group.position.set(0, 0.2, 76);
      scene.add(drone.group);

      api.setChaseFollowTarget(
        drone.group,
        new THREE.Vector3(0, 7.6, 13.8),
        new THREE.Vector3(0, 1.5, -14),
      );

      // Game Run Mutable State
      let droneX = 0;
      let droneZ = 76;
      let integrityVal = 100;
      let ringsCount = 0;
      let invulnTimer = 0;
      let boostTimer = 0;
      let lastUiSync = 0;

      resetRunRef.current = () => {
        droneX = 0;
        droneZ = 76;
        integrityVal = 100;
        ringsCount = 0;
        invulnTimer = 0;
        boostTimer = 0;
        crashedRef.current = false;
        finishedRef.current = false;
        setIntegrity(100);
        setDistancePct(0);
        setRingsCollected(0);
        setCrashed(false);
        setFinished(false);
        setHitFlash(false);
        practiceRing.visible = true;
        boostRings.forEach((r) => {
          r.collected = false;
          r.mesh.visible = true;
        });
        drone.group.position.set(0, 0.2, 76);
      };

      // 9. Chase Physics Loop
      api.setFrameUpdater((delta, elapsed) => {
        tutRig.update(elapsed);

        // Animate rotors & ship heave
        drone.rotors.forEach((rot, idx) => {
          rot.rotation.y += delta * (idx % 2 === 0 ? 22 : -22);
        });
        shipGroup.position.y = -0.3 + Math.sin(elapsed * 1.1) * 0.14;

        // Animate gantry crane trolleys swaying horizontally
        craneTrolleys.forEach((ct) => {
          ct.trolley.position.x = Math.sin(elapsed * ct.speed + ct.phase) * 4.5;
        });

        // Animate patrolling port lorries
        obstacles.forEach((obs) => {
          if (obs.mesh && obs.moveAmp && obs.moveSpeed) {
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
          if (Math.hypot(droneX - -2.4, droneZ - 60) < 2.6 || droneZ < 52) {
            practiceRing.visible = false;
            completeTutorial();
          }
        }

        // Steering & Forward Velocity
        const steerSpeed = 11.5;
        droneX = THREE.MathUtils.clamp(droneX + chaseInput.steer * steerSpeed * delta, -6.2, 6.2);

        const baseSpeed = tutorialActiveRef.current ? 8.5 : 13.5;
        const speedMult =
          boostTimer > 0 ? 1.45 : chaseInput.boost ? 1.25 : chaseInput.brake ? 0.65 : 1.0;
        droneZ -= baseSpeed * speedMult * delta;

        if (invulnTimer > 0) invulnTimer -= delta;
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
          if (Math.hypot(droneX - br.x, droneZ - br.z) < 2.3) {
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

        // Check Crane Suspended Spreader Hazards & Solid Container/Truck Collisions
        let hitThisFrame = false;
        for (const obs of obstacles) {
          if (
            Math.abs(droneX - obs.x) < obs.halfW + 0.65 &&
            Math.abs(droneZ - obs.z) < obs.halfD + 0.85
          ) {
            hitThisFrame = true;
            // Bounce sideways cleanly away from crate/lorry
            droneX += droneX >= obs.x ? 2.2 : -2.2;
            droneX = THREE.MathUtils.clamp(droneX, -6.2, 6.2);
            droneZ += 2.6;
            break;
          }
        }
        for (const ct of craneTrolleys) {
          if (Math.abs(droneX - ct.trolley.position.x) < 1.8 && Math.abs(droneZ - ct.z) < 1.6) {
            hitThisFrame = true;
            droneX += droneX >= ct.trolley.position.x ? 2.4 : -2.4;
            droneX = THREE.MathUtils.clamp(droneX, -6.2, 6.2);
            droneZ += 2.2;
            break;
          }
        }

        if (hitThisFrame && invulnTimer <= 0) {
          invulnTimer = 0.85;
          integrityVal = Math.max(0, integrityVal - 22);
          api.triggerCameraShake(0.45);
          setHitFlash(true);
          window.setTimeout(() => setHitFlash(false), 260);
        }

        // Update drone core glow based on integrity / interference
        if (drone.coreMesh.material instanceof THREE.MeshStandardMaterial) {
          const coreHex =
            hitThisFrame || invulnTimer > 0.4
              ? 0xef4444
              : inInterference
                ? 0xf59e0b
                : boostTimer > 0
                  ? 0x10b981
                  : 0x38bdf8;
          drone.coreMesh.material.color.setHex(coreHex);
          drone.coreMesh.material.emissive.setHex(coreHex);
        }

        if (integrityVal <= 0 && !crashedRef.current) {
          crashedRef.current = true;
          setIntegrity(0);
          setCrashed(true);
          return;
        }

        // Finish Line Arrival at Harbour Gateway (z <= -79)
        if (droneZ <= -79 && !finishedRef.current) {
          finishedRef.current = true;
          setFinished(true);
          setDistancePct(100);
          setIntegrity(Math.round(integrityVal));
          setRingsCollected(ringsCount);
          window.setTimeout(onComplete, 1200);
          return;
        }

        if (elapsed - lastUiSync > 0.12) {
          lastUiSync = elapsed;
          const pct = THREE.MathUtils.clamp(((76 - droneZ) / (76 - -79)) * 100, 0, 100);
          setDistancePct(Math.round(pct));
          setIntegrity(Math.round(integrityVal));
          setRingsCollected(ringsCount);
        }
      });

      return () => {
        tutRig.dispose();
        disposables.forEach((d) => d.dispose());
      };
    },
    [completeTutorial, onComplete],
  );

  return (
    <div className="relative w-full h-full">
      <Adaptive3DViewport
        mode="chase"
        bounds={bounds}
        initialPlayerPos={[0, 0.2, 76]}
        initialCameraOffset={[0, 7.6, 13.8]}
        skyColor="#60a5fa"
        fogColor="#bfdbfe"
        fogDensity={0.0048}
        paused={paused}
        minZoomDistance={10}
        maxZoomDistance={28}
        onSceneReady={handleSceneReady}
        onStationInteract={() => {}}
        tutorial={{
          active: tutorialActive,
          prompt:
            lang === "en"
              ? "Steer Left/Right (A/D or touch buttons) through the glowing Practice Gate to start the harbour chase."
              : "বাম/ডানে (A/D বা বাটন) চালিয়ে উজ্জ্বল প্র্যাকটিস গেটের ভেতর দিয়ে হারবার ধাওয়া শুরু করুন।",
          onSkip: skipTutorial,
          onReplay: replayTutorial,
        }}
        hudOverlay={
          <>
            {/* Integrity & Harbour Progress Telemetry Bar */}
            <div className="pointer-events-none absolute top-14 left-3 md:top-auto md:bottom-3 md:left-1/2 md:-translate-x-1/2 z-20 flex items-center gap-3 px-3.5 py-2 rounded-xl bg-slate-950 border border-white/15 text-white shadow-xl text-xs">
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
              <span className="font-mono-num font-bold text-emerald-300">{distancePct}%</span>
            </div>

            {/* Brief red edge flash on collision */}
            {hitFlash && (
              <div className="pointer-events-none absolute inset-0 border-4 border-rose-500/80 z-30" />
            )}
          </>
        }
      />

      {/* Retry Overlay if Integrity hits 0 */}
      {crashed && (
        <div className="absolute inset-0 z-30 bg-slate-950/75 flex items-center justify-center p-4">
          <div className="max-w-sm w-full rounded-2xl bg-slate-950 border border-rose-400/50 p-6 text-center text-white space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-rose-300">
              {lang === "en" ? "Packet Integrity Lost!" : "প্যাকেট সুরক্ষা শূন্য হয়ে গেছে!"}
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              {lang === "en"
                ? "Dodge container lorries, crane hooks, and amber interference clouds—fly through emerald Boost Rings to repair integrity."
                : "ট্রাক, ক্রেনের হুক ও হলুদ ইন্টারফেরেন্স এড়িয়ে সবুজ বুস্ট রিং সংগ্রহ করুন।"}
            </p>
            <button
              type="button"
              onClick={() => resetRunRef.current()}
              className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{lang === "en" ? "Retry Harbour Pier" : "আবার চেষ্টা করুন"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
