import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { useRobiTrail } from "../../../context/RobiTrailContext";
import {
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Hand,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  AlertTriangle,
} from "lucide-react";
import { buildCityGameBackdrop, type GameCityId } from "../shared/cityGameBackdrops";

export type ObjectInteractionState =
  "idle" | "nearby" | "highlighted" | "selected" | "operating" | "valid" | "invalid" | "completed";

export interface ObstacleBox {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  maxY?: number;
  label?: { en: string; bn: string };
}

export interface InteractiveStation {
  id: string;
  label: { en: string; bn: string };
  position: THREE.Vector3;
  state: ObjectInteractionState;
  hitMesh: THREE.Object3D;
  ringMesh?: THREE.Mesh;
  beaconMesh?: THREE.Mesh;
  radius?: number;
}

export interface DragValidationOptions {
  footprintPad?: number;
  validatePoint?: (pt: THREE.Vector3) => { valid: boolean; reason?: { en: string; bn: string } };
}

export interface HarnessApi {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  playerGroup: THREE.Group;
  setPlayerTarget: (x: number, z: number) => void;
  teleportPlayer: (x: number, z: number) => void;
  setCameraGoal: (pos: THREE.Vector3 | null, target?: THREE.Vector3 | null) => void;
  registerStations: (stations: InteractiveStation[]) => void;
  registerObstacles: (obstacles: ObstacleBox[]) => void;
  registerDraggables: (
    meshes: THREE.Object3D[],
    onDragMove: (hitPoint: THREE.Vector3, object: THREE.Object3D, isValid: boolean) => void,
    onDragEnd?: (object: THREE.Object3D, lastValidPoint: THREE.Vector3) => void,
    options?: DragValidationOptions,
  ) => void;
  setFrameUpdater: (fn: (delta: number, elapsed: number) => void) => void;
}

interface ThreeMissionHarnessProps {
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  initialPlayerPos: [number, number, number];
  initialCameraOffset: [number, number, number];
  skyColor?: string;
  fogColor?: string;
  cityBackdrop?: GameCityId;
  paused?: boolean;
  wheelZoom?: boolean;
  minZoomDistance?: number;
  maxZoomDistance?: number;
  onSceneReady: (api: HarnessApi) => () => void;
  onStationInteract: (stationId: string) => void;
  onFallbackView?: React.ReactNode;
  children?: React.ReactNode;
}

export function detectSoftwareGl(): boolean {
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2") || c.getContext("webgl");
    if (!gl) return true;
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export function applyStateVisuals(station: InteractiveStation, elapsed: number) {
  const ring = station.ringMesh;
  const beacon = station.beaconMesh;
  const colorMap: Record<ObjectInteractionState, number> = {
    idle: 0x64748b,
    nearby: 0xf59e0b,
    highlighted: 0x38bdf8,
    selected: 0x38bdf8,
    operating: 0xe11d48,
    valid: 0x10b981,
    invalid: 0xef4444,
    completed: 0x10b981,
  };
  const hex = colorMap[station.state];

  if (ring && ring.material instanceof THREE.MeshBasicMaterial) {
    ring.material.color.setHex(hex);
    const baseScale =
      station.state === "nearby" || station.state === "highlighted" || station.state === "selected"
        ? 1.18 + Math.sin(elapsed * 5) * 0.08
        : station.state === "completed" || station.state === "valid"
          ? 1.05
          : 0.92;
    ring.scale.setScalar(baseScale);
  }

  if (beacon && beacon.material instanceof THREE.MeshStandardMaterial) {
    beacon.material.color.setHex(hex);
    beacon.material.emissive.setHex(hex);
    beacon.material.emissiveIntensity =
      station.state === "idle" ? 0.35 : station.state === "operating" ? 1.4 : 0.95;
    beacon.position.y += Math.sin(elapsed * 3) * 0.002;
  }
}

/**
 * Ray-AABB segment intersection returning earliest t in [0, 1] along origin -> end.
 */
function intersectSegmentBox(
  origin: THREE.Vector3,
  end: THREE.Vector3,
  box: ObstacleBox,
): number | null {
  const dx = end.x - origin.x;
  const dy = end.y - origin.y;
  const dz = end.z - origin.z;
  const maxY = box.maxY ?? 6.5;

  let tMin = 0;
  let tMax = 1;

  const checkAxis = (p: number, d: number, minB: number, maxB: number): boolean => {
    if (Math.abs(d) < 1e-6) {
      return p >= minB && p <= maxB;
    }
    let t1 = (minB - p) / d;
    let t2 = (maxB - p) / d;
    if (t1 > t2) {
      const tmp = t1;
      t1 = t2;
      t2 = tmp;
    }
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    return tMin <= tMax;
  };

  if (!checkAxis(origin.x, dx, box.minX - 0.35, box.maxX + 0.35)) return null;
  if (!checkAxis(origin.y, dy, 0, maxY + 0.35)) return null;
  if (!checkAxis(origin.z, dz, box.minZ - 0.35, box.maxZ + 0.35)) return null;

  return tMin > 0.02 && tMin < 1 ? tMin : null;
}

function createEngineerAvatar(): THREE.Group {
  const group = new THREE.Group();

  const bootsMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.65 });
  const jacketMat = new THREE.MeshStandardMaterial({ color: 0xe11d48, roughness: 0.45 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xd99b66, roughness: 0.6 });
  const helmetMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 });
  const visorMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.6,
    roughness: 0.2,
  });

  const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.72, 0.28), pantsMat);
  leftLeg.position.set(-0.18, 0.4, 0);
  leftLeg.castShadow = true;
  const rightLeg = leftLeg.clone();
  rightLeg.position.x = 0.18;

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.82, 0.42), jacketMat);
  torso.position.set(0, 1.16, 0);
  torso.castShadow = true;

  const pack = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.56, 0.24), bootsMat);
  pack.position.set(0, 1.18, -0.28);
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.52, 8), visorMat);
  antenna.position.set(0.14, 1.66, -0.28);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 12), skinMat);
  head.position.set(0, 1.78, 0);
  head.castShadow = true;

  const helmet = new THREE.Mesh(
    new THREE.SphereGeometry(0.27, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.58),
    helmetMat,
  );
  helmet.position.set(0, 1.82, 0);

  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.1, 0.16), visorMat);
  visor.position.set(0, 1.8, 0.2);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.55, 0.7, 24),
    new THREE.MeshBasicMaterial({ color: 0xfbbf24, side: THREE.DoubleSide }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.04;

  group.add(leftLeg, rightLeg, torso, pack, antenna, head, helmet, visor, ring);
  return group;
}

export const ThreeMissionHarness: React.FC<ThreeMissionHarnessProps> = ({
  bounds,
  initialPlayerPos,
  initialCameraOffset,
  skyColor = "#7dd3fc",
  fogColor = "#dbeafe",
  cityBackdrop,
  paused = false,
  wheelZoom = false,
  minZoomDistance = 9,
  maxZoomDistance = 38,
  onSceneReady,
  onStationInteract,
  onFallbackView,
}) => {
  const { lang, quality } = useRobiTrail();
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [contextLost, setContextLost] = useState(false);
  const [nearbyStation, setNearbyStation] = useState<{ id: string; label: string } | null>(null);
  const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);
  const [dragWarning, setDragWarning] = useState<string | null>(null);

  const defaultDist = Math.round(
    Math.min(
      maxZoomDistance,
      Math.max(
        minZoomDistance,
        Math.hypot(initialCameraOffset[0], initialCameraOffset[1] - 1.2, initialCameraOffset[2]),
      ),
    ),
  );
  const [camDistance, setCamDistance] = useState<number>(defaultDist);
  const desiredDistanceRef = useRef<number>(defaultDist);

  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const langRef = useRef(lang);
  langRef.current = lang;
  const onInteractRef = useRef(onStationInteract);
  onInteractRef.current = onStationInteract;

  // Input states
  const keysRef = useRef<Record<string, boolean>>({});
  const touchMoveRef = useRef<{ x: number; z: number }>({ x: 0, z: 0 });
  const resetCamRef = useRef<() => void>(() => {});
  const nearbyIdRef = useRef<string | null>(null);

  const handleSetZoom = (nextDist: number) => {
    const clamped = Math.round(Math.min(maxZoomDistance, Math.max(minZoomDistance, nextDist)));
    desiredDistanceRef.current = clamped;
    setCamDistance(clamped);
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareGl();
    const width = container.clientWidth || 1024;
    const height = container.clientHeight || 620;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: "high-performance",
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";

    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    const onContextLost = (e: Event) => {
      e.preventDefault();
      setContextLost(true);
    };
    const onContextRestored = () => setContextLost(false);
    renderer.domElement.addEventListener("webglcontextlost", onContextLost);
    renderer.domElement.addEventListener("webglcontextrestored", onContextRestored);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(skyColor);
    scene.fog = new THREE.FogExp2(fogColor, 0.0045);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(48, width / height, 0.25, 220);
    camera.position.set(
      initialPlayerPos[0] + initialCameraOffset[0],
      initialPlayerPos[1] + initialCameraOffset[1],
      initialPlayerPos[2] + initialCameraOffset[2],
    );

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.enableZoom = wheelZoom;
    controls.minDistance = minZoomDistance;
    controls.maxDistance = maxZoomDistance;
    controls.minPolarAngle = 0.35;
    controls.maxPolarAngle = Math.PI / 2.12;
    controls.target.set(initialPlayerPos[0], initialPlayerPos[1] + 1.2, initialPlayerPos[2]);

    const hemiLight = new THREE.HemisphereLight(0xf0f9ff, 0x86efac, 1.05);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfffbeb, 1.95);
    keyLight.position.set(20, 32, 18);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.left = -28;
    keyLight.shadow.camera.right = 28;
    keyLight.shadow.camera.top = 28;
    keyLight.shadow.camera.bottom = -28;
    keyLight.shadow.bias = -0.0006;
    scene.add(keyLight);

    const backdropHandle = cityBackdrop
      ? buildCityGameBackdrop({
          scene,
          bounds,
          city: cityBackdrop,
          quality,
          maxAnisotropy: Math.min(4, renderer.capabilities.getMaxAnisotropy()),
        })
      : null;

    const playerGroup = createEngineerAvatar();
    playerGroup.position.set(...initialPlayerPos);
    scene.add(playerGroup);

    // Click-to-move destination marker
    const waypointRing = new THREE.Mesh(
      new THREE.RingGeometry(0.4, 0.58, 24),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0,
      }),
    );
    waypointRing.rotation.x = -Math.PI / 2;
    waypointRing.position.y = 0.05;
    scene.add(waypointRing);

    // Drag footprint placement indicator (green valid vs red blocked)
    const dragHaloRing = new THREE.Mesh(
      new THREE.RingGeometry(1.75, 2.1, 32),
      new THREE.MeshBasicMaterial({
        color: 0x10b981,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9,
      }),
    );
    dragHaloRing.rotation.x = -Math.PI / 2;
    dragHaloRing.position.y = 0.08;
    dragHaloRing.visible = false;
    scene.add(dragHaloRing);

    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    let stations: InteractiveStation[] = [];
    let obstacles: ObstacleBox[] = [];
    let draggables: THREE.Object3D[] = [];
    let onDragMoveCb: ((pt: THREE.Vector3, obj: THREE.Object3D, valid: boolean) => void) | null =
      null;
    let onDragEndCb: ((obj: THREE.Object3D, lastValidPoint: THREE.Vector3) => void) | null = null;
    let dragOptions: DragValidationOptions = {};
    let frameUpdater: ((delta: number, elapsed: number) => void) | null = null;

    let moveGoal: THREE.Vector2 | null = null;
    let pendingStationId: string | null = null;
    let cameraGoalPos: THREE.Vector3 | null = null;
    let cameraGoalTarget: THREE.Vector3 | null = null;
    let activeDragObj: THREE.Object3D | null = null;
    const lastValidDragPoint = new THREE.Vector3();

    resetCamRef.current = () => {
      cameraGoalPos = null;
      cameraGoalTarget = null;
      desiredDistanceRef.current = defaultDist;
      setCamDistance(defaultDist);
      controls.target.set(playerGroup.position.x, 1.2, playerGroup.position.z);
      camera.position.set(
        playerGroup.position.x + initialCameraOffset[0],
        initialPlayerPos[1] + initialCameraOffset[1],
        playerGroup.position.z + initialCameraOffset[2],
      );
    };

    function resolveCollisions(nx: number, nz: number, pad = 0.58): [number, number] {
      let rx = THREE.MathUtils.clamp(nx, bounds.minX + 0.4, bounds.maxX - 0.4);
      let rz = THREE.MathUtils.clamp(nz, bounds.minZ + 0.4, bounds.maxZ - 0.4);
      for (let pass = 0; pass < 2; pass++) {
        for (const b of obstacles) {
          if (rx > b.minX - pad && rx < b.maxX + pad && rz > b.minZ - pad && rz < b.maxZ + pad) {
            const dLeft = Math.abs(rx - (b.minX - pad));
            const dRight = Math.abs(b.maxX + pad - rx);
            const dTop = Math.abs(rz - (b.minZ - pad));
            const dBot = Math.abs(b.maxZ + pad - rz);
            const minD = Math.min(dLeft, dRight, dTop, dBot);
            if (minD === dLeft) rx = b.minX - pad;
            else if (minD === dRight) rx = b.maxX + pad;
            else if (minD === dTop) rz = b.minZ - pad;
            else rz = b.maxZ + pad;
          }
        }
      }
      return [rx, rz];
    }

    function checkPointBlocked(x: number, z: number, pad: number): ObstacleBox | null {
      for (const b of obstacles) {
        if (x > b.minX - pad && x < b.maxX + pad && z > b.minZ - pad && z < b.maxZ + pad) {
          return b;
        }
      }
      return null;
    }

    const api: HarnessApi = {
      scene,
      camera,
      controls,
      playerGroup,
      setPlayerTarget: (x: number, z: number) => {
        const [sx, sz] = resolveCollisions(x, z, 0.58);
        moveGoal = new THREE.Vector2(sx, sz);
        waypointRing.position.set(moveGoal.x, 0.05, moveGoal.y);
        (waypointRing.material as THREE.MeshBasicMaterial).opacity = 0.85;
      },
      teleportPlayer: (x: number, z: number) => {
        const [cx, cz] = resolveCollisions(x, z, 0.58);
        const dx = cx - playerGroup.position.x;
        const dz = cz - playerGroup.position.z;
        playerGroup.position.set(cx, 0, cz);
        controls.target.x += dx;
        controls.target.z += dz;
        camera.position.x += dx;
        camera.position.z += dz;
        moveGoal = null;
      },
      setCameraGoal: (pos: THREE.Vector3 | null, target?: THREE.Vector3 | null) => {
        cameraGoalPos = pos ? pos.clone() : null;
        cameraGoalTarget = target ? target.clone() : null;
      },
      registerStations: (next) => {
        stations = next;
      },
      registerObstacles: (obs) => {
        obstacles = obs;
        // Validate initial spawn does not intersect an obstacle
        const [safeX, safeZ] = resolveCollisions(
          playerGroup.position.x,
          playerGroup.position.z,
          0.58,
        );
        if (safeX !== playerGroup.position.x || safeZ !== playerGroup.position.z) {
          playerGroup.position.x = safeX;
          playerGroup.position.z = safeZ;
          controls.target.set(safeX, 1.2, safeZ);
        }
      },
      registerDraggables: (meshes, onDragMove, onDragEnd, options) => {
        draggables = meshes;
        onDragMoveCb = onDragMove;
        onDragEndCb = onDragEnd || null;
        dragOptions = options || {};
      },
      setFrameUpdater: (fn) => {
        frameUpdater = fn;
      },
    };

    const cleanupMission = onSceneReady(api);

    // Keyboard listeners
    const onKeyDown = (e: KeyboardEvent) => {
      if (pausedRef.current) return;
      const key = e.key.toLowerCase();
      keysRef.current[key] = true;
      if (key === "e" && nearbyIdRef.current) {
        onInteractRef.current(nearbyIdRef.current);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = false;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    // Pointer raycast for drag, hover, click station, or click ground to walk
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const planeHit = new THREE.Vector3();
    let pointerDownPos = { x: 0, y: 0 };

    const updateNdc = (clientX: number, clientY: number) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (pausedRef.current) return;
      pointerDownPos = { x: e.clientX, y: e.clientY };
      updateNdc(e.clientX, e.clientY);
      raycaster.setFromCamera(pointer, camera);

      if (draggables.length > 0) {
        const dragHits = raycaster.intersectObjects(draggables, true);
        if (dragHits.length > 0) {
          let rootDrag = dragHits[0].object;
          while (rootDrag.parent && !draggables.includes(rootDrag)) {
            rootDrag = rootDrag.parent;
          }
          activeDragObj = rootDrag;
          lastValidDragPoint.copy(rootDrag.position);
          dragHaloRing.position.set(rootDrag.position.x, 0.08, rootDrag.position.z);
          dragHaloRing.visible = true;
          controls.enabled = false;
          renderer.domElement.style.cursor = "grabbing";
        }
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (pausedRef.current) return;
      updateNdc(e.clientX, e.clientY);
      raycaster.setFromCamera(pointer, camera);

      if (activeDragObj && onDragMoveCb) {
        if (raycaster.ray.intersectPlane(groundPlane, planeHit)) {
          planeHit.x = THREE.MathUtils.clamp(planeHit.x, bounds.minX + 1, bounds.maxX - 1);
          planeHit.z = THREE.MathUtils.clamp(planeHit.z, bounds.minZ + 1, bounds.maxZ - 1);

          const pad = dragOptions.footprintPad ?? 1.45;
          const hitObstacle = checkPointBlocked(planeHit.x, planeHit.z, pad);
          const customCheck = dragOptions.validatePoint
            ? dragOptions.validatePoint(planeHit)
            : { valid: true };
          const isValid = !hitObstacle && customCheck.valid;

          if (isValid) {
            lastValidDragPoint.set(planeHit.x, 0, planeHit.z);
            setDragWarning(null);
            (dragHaloRing.material as THREE.MeshBasicMaterial).color.setHex(0x10b981);
            dragHaloRing.position.set(planeHit.x, 0.08, planeHit.z);
            onDragMoveCb(planeHit, activeDragObj, true);
          } else {
            // Clamp object safely outside solid obstacle while showing red halo warning
            const [safeX, safeZ] = resolveCollisions(planeHit.x, planeHit.z, pad);
            const safePt = new THREE.Vector3(safeX, 0, safeZ);
            (dragHaloRing.material as THREE.MeshBasicMaterial).color.setHex(0xef4444);
            dragHaloRing.position.set(planeHit.x, 0.08, planeHit.z);
            const msg = customCheck.reason
              ? customCheck.reason[langRef.current]
              : hitObstacle?.label
                ? `${langRef.current === "en" ? "Blocked by" : "বাধাগ্রস্ত:"} ${hitObstacle.label[langRef.current]}`
                : langRef.current === "en"
                  ? "Solid obstacle! Place equipment in clear space."
                  : "এখানে ভবন/বাধা রয়েছে! খোলা জায়গায় বসান।";
            setDragWarning(msg);
            lastValidDragPoint.copy(safePt);
            onDragMoveCb(safePt, activeDragObj, false);
          }
        }
        return;
      }

      const stationHits = raycaster.intersectObjects(
        stations.map((s) => s.hitMesh),
        true,
      );
      if (stationHits.length > 0) {
        let obj: THREE.Object3D | null = stationHits[0].object;
        while (obj && !obj.userData.stationId) {
          obj = obj.parent;
        }
        const st = stations.find((s) => s.id === obj?.userData?.stationId);
        if (st) {
          setHoveredLabel(st.label[langRef.current]);
          renderer.domElement.style.cursor = "pointer";
          return;
        }
      }

      if (draggables.length > 0 && raycaster.intersectObjects(draggables, true).length > 0) {
        renderer.domElement.style.cursor = "grab";
        return;
      }

      setHoveredLabel(null);
      renderer.domElement.style.cursor = "default";
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (activeDragObj) {
        dragHaloRing.visible = false;
        setDragWarning(null);
        if (onDragEndCb) onDragEndCb(activeDragObj, lastValidDragPoint.clone());
        activeDragObj = null;
        controls.enabled = true;
        renderer.domElement.style.cursor = "grab";
        return;
      }

      if (pausedRef.current) return;
      const dist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
      if (dist > 8) return; // Was camera orbit drag

      updateNdc(e.clientX, e.clientY);
      raycaster.setFromCamera(pointer, camera);

      // 1. Check station click
      const stationHits = raycaster.intersectObjects(
        stations.map((s) => s.hitMesh),
        true,
      );
      if (stationHits.length > 0) {
        let obj: THREE.Object3D | null = stationHits[0].object;
        while (obj && !obj.userData.stationId) {
          obj = obj.parent;
        }
        const stationId = String(obj?.userData?.stationId || "");
        const st = stations.find((s) => s.id === stationId);
        if (st) {
          const playerDist = Math.hypot(
            playerGroup.position.x - st.position.x,
            playerGroup.position.z - st.position.z,
          );
          if (playerDist <= (st.radius || 4.8)) {
            onInteractRef.current(st.id);
          } else {
            const dirX = playerGroup.position.x - st.position.x;
            const dirZ = playerGroup.position.z - st.position.z;
            const len = Math.hypot(dirX, dirZ) || 1;
            const stopDist = Math.max(1.8, (st.radius || 4.2) * 0.6);
            api.setPlayerTarget(
              st.position.x + (dirX / len) * stopDist,
              st.position.z + (dirZ / len) * stopDist,
            );
            pendingStationId = st.id;
          }
          return;
        }
      }

      // 2. Click ground plane to walk there (safe against obstacles)
      if (raycaster.ray.intersectPlane(groundPlane, planeHit)) {
        pendingStationId = null;
        api.setPlayerTarget(planeHit.x, planeHit.z);
      }
    };

    renderer.domElement.addEventListener("pointerdown", handlePointerDown);
    renderer.domElement.addEventListener("pointermove", handlePointerMove);
    renderer.domElement.addEventListener("pointerup", handlePointerUp);

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 1024;
      const h = container.clientHeight || 620;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    const clock = new THREE.Clock();
    let frameId = 0;
    let disposed = false;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (!gl || !gl.fenceSync) {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const st = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (st === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    const forwardVec = new THREE.Vector3();
    const rightVec = new THREE.Vector3();
    const camOffsetVec = new THREE.Vector3();

    function tick() {
      if (disposed) return;
      const delta = Math.min(clock.getDelta(), 0.08);
      const elapsed = clock.getElapsedTime();

      if (!pausedRef.current) {
        // Compute camera-relative ground movement vector
        let inX = touchMoveRef.current.x;
        let inZ = touchMoveRef.current.z;
        const k = keysRef.current;
        if (k["w"] || k["arrowup"]) inZ -= 1;
        if (k["s"] || k["arrowdown"]) inZ += 1;
        if (k["a"] || k["arrowleft"]) inX -= 1;
        if (k["d"] || k["arrowright"]) inX += 1;

        let moveX = 0;
        let moveZ = 0;
        const speed = 9.2;

        if (Math.abs(inX) > 0.05 || Math.abs(inZ) > 0.05) {
          moveGoal = null;
          pendingStationId = null;
          (waypointRing.material as THREE.MeshBasicMaterial).opacity = 0;

          camera.getWorldDirection(forwardVec);
          forwardVec.y = 0;
          forwardVec.normalize();
          rightVec.crossVectors(forwardVec, new THREE.Vector3(0, 1, 0)).normalize();

          const dirX = rightVec.x * inX + forwardVec.x * -inZ;
          const dirZ = rightVec.z * inX + forwardVec.z * -inZ;
          const mag = Math.hypot(dirX, dirZ) || 1;
          moveX = (dirX / mag) * speed * delta;
          moveZ = (dirZ / mag) * speed * delta;
        } else if (moveGoal) {
          const dx = moveGoal.x - playerGroup.position.x;
          const dz = moveGoal.y - playerGroup.position.z;
          const dist = Math.hypot(dx, dz);
          if (dist < 0.25) {
            moveGoal = null;
            (waypointRing.material as THREE.MeshBasicMaterial).opacity = 0;
            if (pendingStationId) {
              const targetId = pendingStationId;
              pendingStationId = null;
              onInteractRef.current(targetId);
            }
          } else {
            const step = Math.min(dist, speed * delta);
            moveX = (dx / dist) * step;
            moveZ = (dz / dist) * step;
          }
        }

        if (moveX !== 0 || moveZ !== 0) {
          const [rx, rz] = resolveCollisions(
            playerGroup.position.x + moveX,
            playerGroup.position.z + moveZ,
            0.58,
          );
          const actualDx = rx - playerGroup.position.x;
          const actualDz = rz - playerGroup.position.z;
          playerGroup.position.x = rx;
          playerGroup.position.z = rz;
          if (Math.hypot(actualDx, actualDz) > 0.002) {
            playerGroup.rotation.y = Math.atan2(actualDx, actualDz);
            playerGroup.position.y = Math.abs(Math.sin(elapsed * 12)) * 0.07;
          }
          if (!cameraGoalPos) {
            controls.target.x += actualDx;
            controls.target.z += actualDz;
            camera.position.x += actualDx;
            camera.position.z += actualDz;
          }
        } else {
          playerGroup.position.y = THREE.MathUtils.damp(playerGroup.position.y, 0, 10, delta);
        }

        // Nearby station detection
        let closest: InteractiveStation | null = null;
        let closestDist = Infinity;
        for (const st of stations) {
          const d = Math.hypot(
            playerGroup.position.x - st.position.x,
            playerGroup.position.z - st.position.z,
          );
          const r = st.radius || 4.4;
          if (d <= r && d < closestDist) {
            closest = st;
            closestDist = d;
          }
          applyStateVisuals(st, elapsed);
        }

        if (closest?.id !== nearbyIdRef.current) {
          nearbyIdRef.current = closest?.id || null;
          setNearbyStation(
            closest ? { id: closest.id, label: closest.label[langRef.current] } : null,
          );
        }

        // Smoothly honor slider Camera Distance & apply Camera Collision Avoidance
        if (cameraGoalPos && cameraGoalTarget) {
          camera.position.lerp(cameraGoalPos, 1 - Math.exp(-4.5 * delta));
          controls.target.lerp(cameraGoalTarget, 1 - Math.exp(-5.5 * delta));
        } else {
          camOffsetVec.subVectors(camera.position, controls.target);
          const curDist = camOffsetVec.length() || 1;
          const desiredDist = desiredDistanceRef.current;

          // Compute desired position along orbit vector
          const targetCamPos = controls.target
            .clone()
            .add(camOffsetVec.clone().normalize().multiplyScalar(desiredDist));

          // Check camera ray collision against obstacles so camera never clips inside buildings
          let earliestT = 1;
          for (const obs of obstacles) {
            const hitT = intersectSegmentBox(controls.target, targetCamPos, obs);
            if (hitT !== null && hitT < earliestT) {
              earliestT = hitT;
            }
          }
          const finalDist =
            earliestT < 1
              ? Math.max(4.5, desiredDist * earliestT * 0.88)
              : THREE.MathUtils.lerp(curDist, desiredDist, 1 - Math.exp(-8 * delta));

          camOffsetVec.normalize().multiplyScalar(finalDist);
          camera.position.copy(controls.target).add(camOffsetVec);
          if (camera.position.y < 1.8) camera.position.y = 1.8;
        }

        if (backdropHandle) {
          backdropHandle.update(delta, elapsed);
        }
        if (frameUpdater) {
          frameUpdater(delta, elapsed);
        }
      }

      controls.update();
      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      cleanupMission();
      if (backdropHandle) backdropHandle.dispose();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("resize", handleResize);
      renderer.domElement.removeEventListener("pointerdown", handlePointerDown);
      renderer.domElement.removeEventListener("pointermove", handlePointerMove);
      renderer.domElement.removeEventListener("pointerup", handlePointerUp);
      renderer.domElement.removeEventListener("webglcontextlost", onContextLost);
      renderer.domElement.removeEventListener("webglcontextrestored", onContextRestored);
      controls.dispose();
      envTex.dispose();
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
        }
      });
      renderer.dispose();
    };
  }, [
    quality,
    skyColor,
    fogColor,
    cityBackdrop,
    wheelZoom,
    minZoomDistance,
    maxZoomDistance,
    defaultDist,
  ]);

  if (contextLost) {
    return (
      <div className="w-full h-full flex items-center justify-center p-4 bg-slate-900">
        {onFallbackView || (
          <div className="text-center text-white text-sm">
            {lang === "en" ? "3D view temporarily unavailable." : "৩ডি দৃশ্য সাময়িকভাবে অনুপলব্ধ।"}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative w-full h-full select-none overflow-hidden">
      <div ref={mountRef} className="w-full h-full" />

      {/* Top-Right Camera Distance Slider & Quick Zoom / Reset Bar */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-1 sm:gap-2 bg-slate-950/90 border border-white/15 rounded-xl px-2 sm:px-2.5 py-1.5 shadow-lg text-white">
        <button
          type="button"
          onClick={() => handleSetZoom(camDistance - 3)}
          className="p-1 rounded-md bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white transition-colors"
          aria-label="Zoom in"
          title={lang === "en" ? "Zoom In" : "জুম ইন"}
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>

        <label className="flex items-center gap-1.5 text-[11px] text-slate-200">
          <span className="hidden sm:inline font-medium">
            {lang === "en" ? "Camera Distance" : "ক্যামেরার দূরত্ব"}
          </span>
          <input
            type="range"
            min={minZoomDistance}
            max={maxZoomDistance}
            step={1}
            value={camDistance}
            onChange={(e) => handleSetZoom(Number(e.target.value))}
            aria-label={lang === "en" ? "Camera Distance" : "ক্যামেরার দূরত্ব"}
            className="w-14 sm:w-24 accent-rose-500 cursor-pointer"
          />
        </label>

        <button
          type="button"
          onClick={() => handleSetZoom(camDistance + 3)}
          className="p-1 rounded-md bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white transition-colors"
          aria-label="Zoom out"
          title={lang === "en" ? "Zoom Out" : "জুম আউট"}
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>

        <span className="font-mono-num text-[11px] text-amber-300 w-7 text-right">
          {camDistance}m
        </span>

        <button
          type="button"
          onClick={() => resetCamRef.current()}
          className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 text-white text-[11px] font-medium border border-white/10"
          title={lang === "en" ? "Reset Camera" : "ক্যামেরা রিসেট"}
        >
          <RotateCcw className="w-3 h-3" />
          <span className="hidden sm:inline">{lang === "en" ? "Reset" : "রিসেট"}</span>
        </button>
      </div>

      {/* Placement Obstacle Collision Warning */}
      {dragWarning && (
        <div className="pointer-events-none absolute bottom-32 md:bottom-20 left-1/2 -translate-x-1/2 z-20 px-3.5 py-1.5 rounded-lg bg-rose-950/95 border border-rose-400 text-rose-100 text-xs font-semibold shadow-lg flex items-center gap-2 max-w-[calc(100%-2rem)]">
          <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          <span className="truncate">{dragWarning}</span>
        </div>
      )}

      {/* Hovered 3D Object Badge */}
      {!dragWarning && hoveredLabel && (
        <div className="pointer-events-none absolute bottom-32 md:bottom-20 left-1/2 -translate-x-1/2 z-20 px-3 py-1 rounded-md bg-slate-950/90 border border-sky-400/40 text-sky-200 text-xs font-semibold shadow-md max-w-[calc(100%-2rem)] truncate">
          {hoveredLabel}
        </div>
      )}

      {/* Nearby Station Prompt */}
      {nearbyStation && (
        <div className="hidden sm:flex absolute top-16 right-3 z-20 items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-950/92 border border-amber-400/50 text-white shadow-xl">
          <span className="text-xs font-semibold max-w-[180px] truncate">
            {nearbyStation.label}
          </span>
          <button
            type="button"
            onClick={() => onStationInteract(nearbyStation.id)}
            className="px-2.5 py-1 rounded-md bg-rose-600 hover:bg-rose-500 text-[11px] font-semibold transition-colors"
          >
            {lang === "en" ? "Operate" : "অপারেট"}
          </button>
        </div>
      )}

      {/* Mobile Touch Controls — Bottom-Left D-Pad & Bottom-Right Interact Button */}
      <div className="md:hidden pointer-events-none absolute inset-x-0 bottom-3 px-3 flex items-end justify-between z-20">
        <div className="pointer-events-auto grid grid-cols-3 gap-1 bg-slate-950/80 border border-white/15 p-1 rounded-2xl">
          <div />
          <button
            type="button"
            onPointerDown={() => (touchMoveRef.current.z = -1)}
            onPointerUp={() => (touchMoveRef.current.z = 0)}
            onPointerLeave={() => (touchMoveRef.current.z = 0)}
            className="w-10 h-10 rounded-xl bg-white/10 active:bg-rose-600 text-white flex items-center justify-center"
            aria-label="Move forward"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
          <div />
          <button
            type="button"
            onPointerDown={() => (touchMoveRef.current.x = -1)}
            onPointerUp={() => (touchMoveRef.current.x = 0)}
            onPointerLeave={() => (touchMoveRef.current.x = 0)}
            className="w-10 h-10 rounded-xl bg-white/10 active:bg-rose-600 text-white flex items-center justify-center"
            aria-label="Move left"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onPointerDown={() => (touchMoveRef.current.z = 1)}
            onPointerUp={() => (touchMoveRef.current.z = 0)}
            onPointerLeave={() => (touchMoveRef.current.z = 0)}
            className="w-10 h-10 rounded-xl bg-white/10 active:bg-rose-600 text-white flex items-center justify-center"
            aria-label="Move backward"
          >
            <ArrowDown className="w-4 h-4" />
          </button>
          <button
            type="button"
            onPointerDown={() => (touchMoveRef.current.x = 1)}
            onPointerUp={() => (touchMoveRef.current.x = 0)}
            onPointerLeave={() => (touchMoveRef.current.x = 0)}
            className="w-10 h-10 rounded-xl bg-white/10 active:bg-rose-600 text-white flex items-center justify-center"
            aria-label="Move right"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => nearbyStation && onStationInteract(nearbyStation.id)}
          disabled={!nearbyStation}
          className={`pointer-events-auto min-w-[112px] h-12 px-3.5 rounded-2xl border font-bold text-xs flex items-center justify-center gap-1.5 shadow-xl transition-colors ${
            nearbyStation
              ? "bg-rose-600 active:bg-rose-500 border-rose-300 text-white"
              : "bg-slate-950/80 border-white/15 text-slate-400"
          }`}
        >
          <Hand className="w-4 h-4 shrink-0" />
          <span className="truncate max-w-[92px]">
            {nearbyStation ? nearbyStation.label : lang === "en" ? "Interact" : "ব্যবহার"}
          </span>
        </button>
      </div>
    </div>
  );
};
