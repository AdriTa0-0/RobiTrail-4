import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { detectSoftwareGl } from "../game/chattogram3d/ThreeMissionHarness";
import { useRobiTrail } from "../../context/RobiTrailContext";
import { RotateCcw, ZoomIn, ZoomOut } from "lucide-react";

export type TowerPartId = "antenna" | "radio" | "structure" | "power" | "backhaul" | "supporting";

interface Tower3DInspectorProps {
  selectedPart: TowerPartId;
  onSelectPart: (part: TowerPartId) => void;
  paused?: boolean;
}

const PART_CAMERA_TARGETS: Record<
  TowerPartId,
  { target: [number, number, number]; pos: [number, number, number] }
> = {
  antenna: { target: [0, 7.1, 0], pos: [3.8, 7.8, 4.1] },
  radio: { target: [0, 6.0, 0.3], pos: [3.6, 6.2, 3.8] },
  structure: { target: [0, 4.1, 0], pos: [7.6, 4.8, 7.4] },
  power: { target: [1.35, 1.05, -0.75], pos: [4.8, 2.5, 3.4] },
  backhaul: { target: [0.2, 5.2, 0.15], pos: [4.2, 5.6, 4.4] },
  supporting: { target: [-1.45, 0.9, 0.9], pos: [-4.4, 2.4, 4.2] },
};

export const Tower3DInspector: React.FC<Tower3DInspectorProps> = ({
  selectedPart,
  onSelectPart,
  paused = false,
}) => {
  const { lang } = useRobiTrail();
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [fallback2D, setFallback2D] = useState(false);
  const [distanceVal, setDistanceVal] = useState(11.4);
  const [pulsePhase, setPulsePhase] = useState(0);

  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const focusGoalRef = useRef<{
    active: boolean;
    target: THREE.Vector3;
    pos: THREE.Vector3;
  }>({
    active: false,
    target: new THREE.Vector3(0, 3.7, 0),
    pos: new THREE.Vector3(7.8, 5.2, 7.8),
  });

  const partMeshesRef = useRef<Record<TowerPartId, THREE.Mesh[]>>({
    antenna: [],
    radio: [],
    structure: [],
    power: [],
    backhaul: [],
    supporting: [],
  });

  const onSelectRef = useRef(onSelectPart);
  onSelectRef.current = onSelectPart;
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  const applyCameraDistance = (dist: number) => {
    const clamped = Math.min(18, Math.max(4.2, dist));
    setDistanceVal(clamped);
    focusGoalRef.current.active = false;
    const cam = cameraRef.current;
    const ctrl = controlsRef.current;
    if (!cam || !ctrl) return;
    const dir = new THREE.Vector3().subVectors(cam.position, ctrl.target);
    if (dir.lengthSq() < 0.001) dir.set(0.6, 0.35, 0.8);
    dir.normalize().multiplyScalar(clamped);
    cam.position.copy(ctrl.target).add(dir);
    ctrl.update();
  };

  const resetCamera = () => {
    focusGoalRef.current = {
      active: true,
      target: new THREE.Vector3(0, 3.7, 0),
      pos: new THREE.Vector3(7.8, 5.2, 7.8),
    };
    setDistanceVal(11.4);
  };

  useEffect(() => {
    if (detectSoftwareGl()) {
      setFallback2D(true);
      return;
    }
    const container = mountRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    } catch {
      setFallback2D(true);
      return;
    }

    const w = Math.max(300, container.clientWidth);
    const h = Math.max(280, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    const onContextLost = (e: Event) => {
      e.preventDefault();
      setFallback2D(true);
    };
    renderer.domElement.addEventListener("webglcontextlost", onContextLost);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#dbeafe");
    scene.fog = new THREE.Fog("#e0f2fe", 22, 54);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;

    const camera = new THREE.PerspectiveCamera(44, w / h, 0.1, 100);
    camera.position.set(7.8, 5.2, 7.8);
    cameraRef.current = camera;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableZoom = false; // Zero page scroll hijacking
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI / 2 - 0.04;
    controls.minPolarAngle = 0.22;
    controls.target.set(0, 3.7, 0);
    controls.update();
    controlsRef.current = controls;

    // Cancel automatic camera focus transition the moment user grabs the orbit view
    const onControlStart = () => {
      focusGoalRef.current.active = false;
    };
    controls.addEventListener("start", onControlStart);

    // Bright Daylight Architectural Lighting
    const hemi = new THREE.HemisphereLight("#f0f9ff", "#cbd5e1", 1.05);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight("#fffbeb", 1.95);
    sun.position.set(11, 16, 9);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.near = 2;
    sun.shadow.camera.far = 42;
    sun.shadow.camera.left = -9;
    sun.shadow.camera.right = 9;
    sun.shadow.camera.top = 11;
    sun.shadow.camera.bottom = -4;
    scene.add(sun);

    // Sunlit green field surround + architectural paved compound pad
    const field = new THREE.Mesh(
      new THREE.CircleGeometry(28, 40),
      new THREE.MeshStandardMaterial({ color: "#86efac", roughness: 0.95 }),
    );
    field.rotation.x = -Math.PI / 2;
    field.position.y = -0.02;
    field.receiveShadow = true;
    scene.add(field);

    const yardPad = new THREE.Mesh(
      new THREE.BoxGeometry(6.8, 0.16, 5.6),
      new THREE.MeshStandardMaterial({ color: "#e2e8f0", roughness: 0.85 }),
    );
    yardPad.position.y = 0.08;
    yardPad.receiveShadow = true;
    scene.add(yardPad);

    const plinth = new THREE.Mesh(
      new THREE.BoxGeometry(2.8, 0.28, 2.8),
      new THREE.MeshStandardMaterial({ color: "#94a3b8", roughness: 0.8 }),
    );
    plinth.position.y = 0.24;
    plinth.receiveShadow = true;
    scene.add(plinth);

    // Subtle perimeter fence corner posts for real-world scale
    [
      [-3.2, -2.6],
      [3.2, -2.6],
      [3.2, 2.6],
      [-3.2, 2.6],
    ].forEach(([fx, fz]) => {
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 1.1, 8),
        new THREE.MeshStandardMaterial({ color: "#475569", metalness: 0.4, roughness: 0.5 }),
      );
      post.position.set(fx, 0.6, fz);
      post.castShadow = true;
      scene.add(post);
    });

    const groups: Record<TowerPartId, THREE.Mesh[]> = {
      antenna: [],
      radio: [],
      structure: [],
      power: [],
      backhaul: [],
      supporting: [],
    };
    const clickableObjects: THREE.Object3D[] = [];
    const registerPart = (mesh: THREE.Mesh, part: TowerPartId) => {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData.towerPart = part;
      groups[part].push(mesh);
      clickableObjects.push(mesh);
      scene.add(mesh);
    };

    // 1. STEEL LATTICE STRUCTURE ('structure')
    const legOffsets: [number, number][] = [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ];
    legOffsets.forEach(([sx, sz]) => {
      const leg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.075, 0.12, 7.2, 8),
        new THREE.MeshStandardMaterial({ color: "#94a3b8", metalness: 0.6, roughness: 0.35 }),
      );
      leg.position.set(sx * 0.56, 3.9, sz * 0.56);
      leg.rotation.z = sx * 0.085;
      leg.rotation.x = -sz * 0.085;
      registerPart(leg, "structure");
    });
    [1.6, 3.1, 4.6, 6.1, 7.2].forEach((yLevel, idx) => {
      const span = 1.44 - idx * 0.19;
      const brace = new THREE.Mesh(
        new THREE.BoxGeometry(span, 0.08, span),
        new THREE.MeshStandardMaterial({ color: "#64748b", metalness: 0.5, roughness: 0.42 }),
      );
      brace.position.y = yLevel;
      registerPart(brace, "structure");
    });

    // 2. DIRECTIONAL SECTOR ANTENNAS ('antenna')
    for (let i = 0; i < 3; i++) {
      const angle = (i * Math.PI * 2) / 3;
      const panel = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 1.32, 0.15),
        new THREE.MeshStandardMaterial({ color: "#f8fafc", roughness: 0.32 }),
      );
      panel.position.set(Math.cos(angle) * 0.72, 7.1, Math.sin(angle) * 0.72);
      panel.rotation.y = -angle + Math.PI / 2;
      registerPart(panel, "antenna");
    }
    const beaconBulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 16, 16),
      new THREE.MeshStandardMaterial({
        color: "#f43f5e",
        emissive: "#e11d48",
        emissiveIntensity: 1.4,
      }),
    );
    beaconBulb.position.y = 7.95;
    scene.add(beaconBulb);

    // 3. REMOTE RADIO UNITS (RRUs) mounted just below antennas ('radio')
    for (let i = 0; i < 3; i++) {
      const angle = (i * Math.PI * 2) / 3 + 0.35;
      const rru = new THREE.Mesh(
        new THREE.BoxGeometry(0.26, 0.48, 0.18),
        new THREE.MeshStandardMaterial({ color: "#e2e8f0", metalness: 0.35, roughness: 0.4 }),
      );
      rru.position.set(Math.cos(angle) * 0.46, 5.95, Math.sin(angle) * 0.46);
      rru.rotation.y = -angle;
      registerPart(rru, "radio");
    }

    // 4. BACKHAUL: MICROWAVE DRUM DISH + BURIED FIBER CONDUIT ('backhaul')
    const dish = new THREE.Mesh(
      new THREE.CylinderGeometry(0.56, 0.56, 0.24, 24),
      new THREE.MeshStandardMaterial({ color: "#f59e0b", metalness: 0.35, roughness: 0.35 }),
    );
    dish.rotation.z = Math.PI / 2;
    dish.position.set(0.68, 5.15, 0.15);
    registerPart(dish, "backhaul");

    const fiberConduit = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 0.16, 0.26),
      new THREE.MeshStandardMaterial({
        color: "#0284c7",
        emissive: "#0369a1",
        emissiveIntensity: 0.35,
      }),
    );
    fiberConduit.position.set(-2.35, 0.24, 0.85);
    registerPart(fiberConduit, "backhaul");

    // 5. POWER SYSTEM: RECTIFIER BATTERY BANK + SOLAR PANEL CANOPY ('power')
    const batteryBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.95, 1.15, 0.72),
      new THREE.MeshStandardMaterial({ color: "#0f766e", metalness: 0.25, roughness: 0.55 }),
    );
    batteryBox.position.set(1.35, 0.74, -0.75);
    registerPart(batteryBox, "power");

    const solarStand = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.08, 1.5, 8),
      new THREE.MeshStandardMaterial({ color: "#475569", metalness: 0.5 }),
    );
    solarStand.position.set(2.2, 0.88, -0.75);
    registerPart(solarStand, "power");

    const solarPanel = new THREE.Mesh(
      new THREE.BoxGeometry(1.15, 0.06, 0.82),
      new THREE.MeshStandardMaterial({ color: "#1d4ed8", metalness: 0.65, roughness: 0.22 }),
    );
    solarPanel.position.set(2.2, 1.65, -0.75);
    solarPanel.rotation.x = 0.32;
    registerPart(solarPanel, "power");

    // 6. SUPPORTING COMPONENTS: BASEBAND SHELTER CABINET, CABLE TRAY & EARTHING ('supporting')
    const basebandCabinet = new THREE.Mesh(
      new THREE.BoxGeometry(1.15, 1.38, 0.88),
      new THREE.MeshStandardMaterial({ color: "#334155", metalness: 0.3, roughness: 0.55 }),
    );
    basebandCabinet.position.set(-1.35, 0.85, 0.88);
    registerPart(basebandCabinet, "supporting");

    const cableLadder = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 4.4, 0.14),
      new THREE.MeshStandardMaterial({ color: "#475569", metalness: 0.5, roughness: 0.45 }),
    );
    cableLadder.position.set(-0.52, 2.35, 0.38);
    registerPart(cableLadder, "supporting");

    const earthBar = new THREE.Mesh(
      new THREE.BoxGeometry(0.65, 0.18, 0.3),
      new THREE.MeshStandardMaterial({ color: "#b45309", metalness: 0.7, roughness: 0.3 }),
    );
    earthBar.position.set(-1.35, 0.24, 0.12);
    registerPart(earthBar, "supporting");

    partMeshesRef.current = groups;

    // Animated RF wave ring around top antennas
    const rfRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.15, 0.04, 8, 40),
      new THREE.MeshBasicMaterial({ color: "#0284c7", transparent: true, opacity: 0.55 }),
    );
    rfRing.rotation.x = Math.PI / 2;
    rfRing.position.y = 7.1;
    scene.add(rfRing);

    // Click picking
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let downPos = { x: 0, y: 0 };

    const onPointerDown = (e: PointerEvent) => {
      downPos = { x: e.clientX, y: e.clientY };
    };
    const onPointerUp = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y) > 8) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(clickableObjects, false);
      if (hits.length > 0) {
        const part = hits[0].object.userData.towerPart as TowerPartId | undefined;
        if (part) onSelectRef.current(part);
      }
    };
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointerup", onPointerUp);

    const onResize = () => {
      if (!container) return;
      const nw = Math.max(300, container.clientWidth);
      const nh = Math.max(280, container.clientHeight);
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener("resize", onResize);

    let rafId = 0;
    const clock = new THREE.Clock();
    const animate = () => {
      rafId = requestAnimationFrame(animate);
      const dt = Math.min(0.05, clock.getDelta());
      const elapsed = clock.elapsedTime;

      if (!pausedRef.current) {
        const s = 1 + ((elapsed * 0.72) % 2.2);
        rfRing.scale.set(s, s, 1);
        (rfRing.material as THREE.MeshBasicMaterial).opacity = Math.max(0.06, 0.72 - (s - 1) * 0.3);
        (beaconBulb.material as THREE.MeshStandardMaterial).emissiveIntensity =
          1.1 + Math.sin(elapsed * 4) * 0.4;
      }

      // Smooth camera focus transition when user clicks a part button or 3D mesh
      if (focusGoalRef.current.active) {
        const alpha = 1 - Math.exp(-5.5 * dt);
        controls.target.lerp(focusGoalRef.current.target, alpha);
        camera.position.lerp(focusGoalRef.current.pos, alpha);
        const dist = camera.position.distanceTo(controls.target);
        setDistanceVal(Number(dist.toFixed(1)));
        if (
          controls.target.distanceTo(focusGoalRef.current.target) < 0.04 &&
          camera.position.distanceTo(focusGoalRef.current.pos) < 0.08
        ) {
          focusGoalRef.current.active = false;
        }
      }

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onResize);
      controls.removeEventListener("start", onControlStart);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      renderer.domElement.removeEventListener("webglcontextlost", onContextLost);
      controls.dispose();
      envTex.dispose();
      pmrem.dispose();
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
          else obj.material.dispose();
        }
      });
      renderer.dispose();
    };
  }, []);

  // Sync emissive highlight + smooth camera focus whenever selectedPart changes
  useEffect(() => {
    (Object.keys(partMeshesRef.current) as TowerPartId[]).forEach((partId) => {
      const isSelected = partId === selectedPart;
      partMeshesRef.current[partId].forEach((mesh) => {
        const mat = mesh.material as THREE.MeshStandardMaterial;
        if (!mat || !("emissive" in mat)) return;
        if (partId === "backhaul") {
          mat.emissive.set(isSelected ? "#e11d48" : "#0369a1");
          mat.emissiveIntensity = isSelected ? 0.85 : 0.25;
        } else {
          mat.emissive.set(isSelected ? "#e11d48" : "#000000");
          mat.emissiveIntensity = isSelected ? 0.6 : 0;
        }
      });
    });

    const preset = PART_CAMERA_TARGETS[selectedPart];
    if (preset) {
      focusGoalRef.current = {
        active: true,
        target: new THREE.Vector3(...preset.target),
        pos: new THREE.Vector3(...preset.pos),
      };
    }
  }, [selectedPart]);

  // Subtle 2D SVG wave pulse when fallback active
  useEffect(() => {
    if (!fallback2D || paused) return;
    const timer = setInterval(() => setPulsePhase((p) => (p + 1) % 3), 900);
    return () => clearInterval(timer);
  }, [fallback2D, paused]);

  if (fallback2D) {
    return (
      <div className="rounded-xl bg-sky-50 border border-sky-200 p-4 space-y-3">
        <div className="text-[11px] font-mono text-sky-800 font-semibold">
          {lang === "en"
            ? "INTERACTIVE 2D DAYLIGHT TOWER SCHEMATIC (CLICK ALL 6 PARTS)"
            : "ইন্টারেক্টিভ ২ডি টাওয়ার ডায়াগ্রাম (৬টি অংশে ক্লিক করুন)"}
        </div>
        <svg viewBox="0 0 320 210" className="w-full h-60">
          <rect x="0" y="176" width="320" height="34" fill="#bbf7d0" />
          <rect x="30" y="172" width="260" height="12" rx="3" fill="#cbd5e1" />
          {/* Steel structure */}
          <path
            d="M128 172 L154 30 L180 172 M138 110 L170 110 M145 72 L163 72"
            stroke={selectedPart === "structure" ? "#e11d48" : "#475569"}
            strokeWidth="4"
            fill="none"
            className="cursor-pointer"
            onClick={() => onSelectPart("structure")}
          />
          {/* Antennas */}
          <rect
            x="136"
            y="22"
            width="36"
            height="14"
            rx="3"
            fill={selectedPart === "antenna" ? "#e11d48" : "#0284c7"}
            className="cursor-pointer"
            onClick={() => onSelectPart("antenna")}
          />
          {[0, 1].map((ring) => (
            <circle
              key={ring}
              cx="154"
              cy="29"
              r={20 + ((ring + pulsePhase) % 3) * 14}
              stroke="#0284c7"
              strokeWidth="1.5"
              fill="none"
              opacity="0.45"
            />
          ))}
          {/* RRU Radio unit */}
          <rect
            x="146"
            y="44"
            width="16"
            height="18"
            rx="2"
            fill={selectedPart === "radio" ? "#e11d48" : "#64748b"}
            className="cursor-pointer"
            onClick={() => onSelectPart("radio")}
          />
          {/* Backhaul microwave + fiber */}
          <circle
            cx="176"
            cy="82"
            r="11"
            fill={selectedPart === "backhaul" ? "#e11d48" : "#f59e0b"}
            className="cursor-pointer"
            onClick={() => onSelectPart("backhaul")}
          />
          <rect
            x="30"
            y="164"
            width="50"
            height="8"
            rx="2"
            fill={selectedPart === "backhaul" ? "#e11d48" : "#0284c7"}
            className="cursor-pointer"
            onClick={() => onSelectPart("backhaul")}
          />
          {/* Power solar + battery */}
          <rect
            x="212"
            y="142"
            width="36"
            height="30"
            rx="3"
            fill={selectedPart === "power" ? "#e11d48" : "#0f766e"}
            className="cursor-pointer"
            onClick={() => onSelectPart("power")}
          />
          <rect
            x="220"
            y="124"
            width="42"
            height="10"
            rx="2"
            transform="rotate(-12 240 129)"
            fill={selectedPart === "power" ? "#e11d48" : "#1d4ed8"}
            className="cursor-pointer"
            onClick={() => onSelectPart("power")}
          />
          {/* Supporting baseboard shelter */}
          <rect
            x="80"
            y="140"
            width="38"
            height="32"
            rx="3"
            fill={selectedPart === "supporting" ? "#e11d48" : "#334155"}
            className="cursor-pointer"
            onClick={() => onSelectPart("supporting")}
          />
        </svg>
      </div>
    );
  }

  return (
    <div className="relative rounded-xl overflow-hidden border border-slate-300 bg-sky-100">
      <div ref={mountRef} className="w-full h-72 sm:h-80 cursor-grab active:cursor-grabbing" />

      {/* Camera Distance Slider + Reset View HUD */}
      <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 rounded-xl bg-slate-950/90 border border-white/15 px-2.5 py-1.5 shadow-lg">
        <button
          type="button"
          onClick={() => applyCameraDistance(distanceVal - 1.4)}
          className="p-1 rounded bg-white/10 hover:bg-white/20 text-white"
          title={lang === "en" ? "Zoom In" : "কাছে আনুন"}
          aria-label="Zoom In"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <input
          type="range"
          min={4.2}
          max={18}
          step={0.4}
          value={distanceVal}
          onChange={(e) => applyCameraDistance(Number(e.target.value))}
          className="w-20 accent-rose-500 cursor-pointer"
          aria-label="Tower 3D camera distance"
        />
        <button
          type="button"
          onClick={() => applyCameraDistance(distanceVal + 1.4)}
          className="p-1 rounded bg-white/10 hover:bg-white/20 text-white"
          title={lang === "en" ? "Zoom Out" : "দূরে সরান"}
          aria-label="Zoom Out"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={resetCamera}
          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-semibold ml-0.5"
          title={lang === "en" ? "Reset Full View" : "সম্পূর্ণ ভিউ"}
          aria-label="Reset camera view"
        >
          <RotateCcw className="w-3 h-3" />
          <span className="hidden sm:inline">{lang === "en" ? "Full View" : "রিসেট"}</span>
        </button>
      </div>

      <div className="absolute bottom-2.5 left-2.5 pointer-events-none px-2.5 py-1 rounded-lg bg-slate-950/85 border border-white/10 text-[11px] font-mono text-slate-200">
        {lang === "en"
          ? "Drag to Orbit 360° · Click Any Part to Focus"
          : "৩৬০° ঘুরিয়ে দেখুন · যেকোনো অংশে ক্লিক করুন"}
      </div>
    </div>
  );
};
