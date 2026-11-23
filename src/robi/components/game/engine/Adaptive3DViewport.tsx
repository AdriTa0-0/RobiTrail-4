import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { useRobiTrail } from "../../../context/RobiTrailContext";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Crosshair,
  Hand,
  HelpCircle,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  X,
  Zap,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  applyStateVisuals,
  detectSoftwareGl,
  type DragValidationOptions,
  type InteractiveStation,
  type ObstacleBox,
} from "../chattogram3d/ThreeMissionHarness";

export type CameraArchetype = "exploration" | "puzzle" | "chase" | "command";

export interface ChaseInputState {
  steer: number; // -1 (left) to +1 (right)
  boost: boolean;
  brake: boolean;
}

export interface AdaptiveViewportApi {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  playerGroup: THREE.Group;
  chaseInput: ChaseInputState;
  setPlayerVisible: (visible: boolean) => void;
  setPlayerTarget: (x: number, z: number) => void;
  teleportPlayer: (x: number, z: number, y?: number) => void;
  setCameraGoal: (pos: THREE.Vector3 | null, target?: THREE.Vector3 | null) => void;
  setChaseFollowTarget: (
    target: THREE.Object3D | null,
    offset?: THREE.Vector3,
    lookOffset?: THREE.Vector3,
  ) => void;
  triggerCameraShake: (strength: number) => void;
  registerStations: (stations: InteractiveStation[]) => void;
  registerObstacles: (obstacles: ObstacleBox[]) => void;
  registerDraggables: (
    meshes: THREE.Object3D[],
    onDragMove: (hitPoint: THREE.Vector3, object: THREE.Object3D, isValid: boolean) => void,
    onDragEnd?: (object: THREE.Object3D, lastValidPoint: THREE.Vector3) => void,
    options?: DragValidationOptions & { dragPlaneY?: number | ((obj: THREE.Object3D) => number) },
  ) => void;
  setFrameUpdater: (fn: (delta: number, elapsed: number) => void) => void;
}

export interface TutorialBannerConfig {
  active: boolean;
  prompt: string;
  onSkip: () => void;
  onReplay?: () => void;
}

interface Adaptive3DViewportProps {
  mode: CameraArchetype;
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  initialPlayerPos: [number, number, number];
  initialCameraOffset: [number, number, number];
  skyColor?: string;
  fogColor?: string;
  fogDensity?: number;
  paused?: boolean;
  minZoomDistance?: number;
  maxZoomDistance?: number;
  playerAvatarFactory?: () => THREE.Group;
  tutorial?: TutorialBannerConfig;
  puzzleSelectionBar?: React.ReactNode;
  hudOverlay?: React.ReactNode;
  interactLabel?: { en: string; bn: string };
  onSceneReady: (api: AdaptiveViewportApi) => () => void;
  onStationInteract: (stationId: string) => void;
  onFallbackView?: React.ReactNode;
}

function intersectSegmentBox(
  origin: THREE.Vector3,
  end: THREE.Vector3,
  box: ObstacleBox,
): number | null {
  const dx = end.x - origin.x;
  const dy = end.y - origin.y;
  const dz = end.z - origin.z;
  const maxY = box.maxY ?? 7.5;

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

  if (!checkAxis(origin.x, dx, box.minX - 0.4, box.maxX + 0.4)) return null;
  if (!checkAxis(origin.y, dy, 0, maxY + 0.4)) return null;
  if (!checkAxis(origin.z, dz, box.minZ - 0.4, box.maxZ + 0.4)) return null;

  return tMin > 0.02 && tMin < 1 ? tMin : null;
}

function createDefaultExplorerAvatar(): THREE.Group {
  const group = new THREE.Group();

  const bootsMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.72 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.65 });
  const vestMat = new THREE.MeshStandardMaterial({ color: 0xe11d48, roughness: 0.45 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xd99b66, roughness: 0.6 });
  const helmetMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 });
  const visorMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.6,
    roughness: 0.2,
  });

  const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.68, 0.26), pantsMat);
  leftLeg.position.set(-0.17, 0.38, 0);
  leftLeg.castShadow = true;
  const rightLeg = leftLeg.clone();
  rightLeg.position.x = 0.17;

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.78, 0.4), vestMat);
  torso.position.set(0, 1.12, 0);
  torso.castShadow = true;

  const pack = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.52, 0.22), bootsMat);
  pack.position.set(0, 1.14, -0.27);

  const probeRod = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.56, 8), visorMat);
  probeRod.position.set(0.36, 1.08, 0.24);
  probeRod.rotation.x = 0.45;

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.23, 14, 12), skinMat);
  head.position.set(0, 1.74, 0);
  head.castShadow = true;

  const helmet = new THREE.Mesh(
    new THREE.SphereGeometry(0.26, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.58),
    helmetMat,
  );
  helmet.position.set(0, 1.78, 0);

  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.09, 0.14), visorMat);
  visor.position.set(0, 1.76, 0.2);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.52, 0.66, 24),
    new THREE.MeshBasicMaterial({ color: 0xfbbf24, side: THREE.DoubleSide }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.04;

  group.add(leftLeg, rightLeg, torso, pack, probeRod, head, helmet, visor, ring);
  return group;
}

export const Adaptive3DViewport: React.FC<Adaptive3DViewportProps> = ({
  mode,
  bounds,
  initialPlayerPos,
  initialCameraOffset,
  skyColor = "#bae6fd",
  fogColor = "#e0f2fe",
  fogDensity = 0.0042,
  paused = false,
  minZoomDistance = 9,
  maxZoomDistance = 42,
  playerAvatarFactory,
  tutorial,
  puzzleSelectionBar,
  hudOverlay,
  interactLabel = { en: "Inspect", bn: "পরীক্ষা" },
  onSceneReady,
  onStationInteract,
  onFallbackView,
}) => {
  const { lang } = useRobiTrail();
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [contextLost, setContextLost] = useState(false);
  const [nearbyStation, setNearbyStation] = useState<{ id: string; label: string } | null>(null);
  const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);
  const [dragWarning, setDragWarning] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sensitivity, setSensitivity] = useState<number>(1.0);

  // Virtual Joystick visual knob state for mobile exploration
  const [joyKnob, setJoyKnob] = useState<{ x: number; y: number; active: boolean }>({
    x: 0,
    y: 0,
    active: false,
  });

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
  const sensitivityRef = useRef<number>(sensitivity);
  sensitivityRef.current = sensitivity;

  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const langRef = useRef(lang);
  langRef.current = lang;
  const onInteractRef = useRef(onStationInteract);
  onInteractRef.current = onStationInteract;
  const onSceneReadyRef = useRef(onSceneReady);
  onSceneReadyRef.current = onSceneReady;
  const avatarFactoryRef = useRef(playerAvatarFactory);
  avatarFactoryRef.current = playerAvatarFactory;
  const boundsRef = useRef(bounds);
  boundsRef.current = bounds;
  const initPosRef = useRef(initialPlayerPos);
  const initCamOffsetRef = useRef(initialCameraOffset);
  const modeRef = useRef(mode);
  modeRef.current = mode;

  // Input refs shared with animation loop
  const keysRef = useRef<Record<string, boolean>>({});
  const touchMoveRef = useRef<{ x: number; z: number }>({ x: 0, z: 0 });
  const chaseTouchRef = useRef<{ steer: number; boost: boolean; brake: boolean }>({
    steer: 0,
    boost: false,
    brake: false,
  });
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
    const activeBounds = boundsRef.current;
    const startPlayerPos = initPosRef.current;
    const startCamOffset = initCamOffsetRef.current;

    const isSoftwareGl = detectSoftwareGl();
    const width = container.clientWidth || 1024;
    const height = container.clientHeight || 620;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: "high-performance",
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    renderer.domElement.style.touchAction = "none";

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
    scene.fog = new THREE.FogExp2(fogColor, fogDensity);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(
      mode === "chase" ? 54 : 46,
      width / height,
      0.25,
      240,
    );
    camera.position.set(
      startPlayerPos[0] + startCamOffset[0],
      startPlayerPos[1] + startCamOffset[1],
      startPlayerPos[2] + startCamOffset[2],
    );

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.08;
    controls.enableZoom = false; // Managed consistently via HUD slider / zoom buttons without page-scroll theft
    controls.minDistance = minZoomDistance;
    controls.maxDistance = maxZoomDistance;

    if (mode === "chase") {
      controls.enabled = false;
    } else if (mode === "puzzle") {
      controls.enablePan = false;
      controls.minPolarAngle = 0.38;
      controls.maxPolarAngle = Math.PI / 2.25;
      controls.rotateSpeed = 0.72 * sensitivityRef.current;
    } else if (mode === "command") {
      controls.enablePan = true;
      controls.screenSpacePanning = false;
      controls.minPolarAngle = 0.25;
      controls.maxPolarAngle = Math.PI / 2.35;
      controls.rotateSpeed = 0.65 * sensitivityRef.current;
      controls.panSpeed = 0.85 * sensitivityRef.current;
    } else {
      controls.enablePan = false;
      controls.minPolarAngle = 0.35;
      controls.maxPolarAngle = Math.PI / 2.15;
      controls.rotateSpeed = 0.8 * sensitivityRef.current;
    }

    controls.target.set(startPlayerPos[0], startPlayerPos[1] + 1.1, startPlayerPos[2]);

    const onControlsStart = () => {
      cameraGoalPos = null;
      cameraGoalTarget = null;
    };
    controls.addEventListener("start", onControlsStart);

    const hemiLight = new THREE.HemisphereLight(0xf0f9ff, 0x64748b, 1.0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfffbeb, 1.9);
    keyLight.position.set(22, 34, 18);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.left = -36;
    keyLight.shadow.camera.right = 36;
    keyLight.shadow.camera.top = 36;
    keyLight.shadow.camera.bottom = -36;
    keyLight.shadow.bias = -0.0006;
    scene.add(keyLight);

    const playerGroup = avatarFactoryRef.current
      ? avatarFactoryRef.current()
      : createDefaultExplorerAvatar();
    playerGroup.position.set(...startPlayerPos);
    if (mode !== "exploration") {
      playerGroup.visible = false;
    }
    scene.add(playerGroup);

    // Click-to-move destination marker (exploration mode)
    const waypointRing = new THREE.Mesh(
      new THREE.RingGeometry(0.42, 0.6, 24),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0,
      }),
    );
    waypointRing.rotation.x = -Math.PI / 2;
    waypointRing.position.y = 0.06;
    scene.add(waypointRing);

    // Drag placement ring (green valid vs red blocked)
    const dragHaloRing = new THREE.Mesh(
      new THREE.RingGeometry(1.5, 1.85, 32),
      new THREE.MeshBasicMaterial({
        color: 0x10b981,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9,
      }),
    );
    dragHaloRing.rotation.x = -Math.PI / 2;
    dragHaloRing.position.y = 0.12;
    dragHaloRing.visible = false;
    scene.add(dragHaloRing);

    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    let stations: InteractiveStation[] = [];
    let obstacles: ObstacleBox[] = [];
    let draggables: THREE.Object3D[] = [];
    let onDragMoveCb: ((pt: THREE.Vector3, obj: THREE.Object3D, valid: boolean) => void) | null =
      null;
    let onDragEndCb: ((obj: THREE.Object3D, lastValidPoint: THREE.Vector3) => void) | null = null;
    let dragOptions: DragValidationOptions & {
      dragPlaneY?: number | ((obj: THREE.Object3D) => number);
    } = {};
    let frameUpdater: ((delta: number, elapsed: number) => void) | null = null;

    let moveGoal: THREE.Vector2 | null = null;
    let pendingStationId: string | null = null;
    let cameraGoalPos: THREE.Vector3 | null = null;
    let cameraGoalTarget: THREE.Vector3 | null = null;
    let activeDragObj: THREE.Object3D | null = null;
    const lastValidDragPoint = new THREE.Vector3();

    let chaseTarget: THREE.Object3D | null = null;
    const chaseOffset = new THREE.Vector3(0, 7.2, 13.5);
    const chaseLookOffset = new THREE.Vector3(0, 1.4, -10);
    let shakeStrength = 0;

    const chaseInputState: ChaseInputState = { steer: 0, boost: false, brake: false };

    resetCamRef.current = () => {
      cameraGoalPos = null;
      cameraGoalTarget = null;
      desiredDistanceRef.current = defaultDist;
      setCamDistance(defaultDist);
      if (modeRef.current === "exploration") {
        controls.target.set(
          playerGroup.position.x,
          playerGroup.position.y + 1.1,
          playerGroup.position.z,
        );
        camera.position.set(
          playerGroup.position.x + startCamOffset[0],
          playerGroup.position.y + startCamOffset[1],
          playerGroup.position.z + startCamOffset[2],
        );
      } else if (modeRef.current !== "chase") {
        controls.target.set(startPlayerPos[0], startPlayerPos[1] + 1.1, startPlayerPos[2]);
        camera.position.set(
          startPlayerPos[0] + startCamOffset[0],
          startPlayerPos[1] + startCamOffset[1],
          startPlayerPos[2] + startCamOffset[2],
        );
      }
    };

    function resolveCollisions(nx: number, nz: number, pad = 0.58): [number, number] {
      let rx = THREE.MathUtils.clamp(nx, activeBounds.minX + 0.45, activeBounds.maxX - 0.45);
      let rz = THREE.MathUtils.clamp(nz, activeBounds.minZ + 0.45, activeBounds.maxZ - 0.45);
      for (let pass = 0; pass < 3; pass++) {
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

    const api: AdaptiveViewportApi = {
      scene,
      camera,
      controls,
      playerGroup,
      chaseInput: chaseInputState,
      setPlayerVisible: (visible) => {
        playerGroup.visible = visible;
      },
      setPlayerTarget: (x: number, z: number) => {
        const [sx, sz] = resolveCollisions(x, z, 0.58);
        moveGoal = new THREE.Vector2(sx, sz);
        waypointRing.position.set(moveGoal.x, 0.06, moveGoal.y);
        (waypointRing.material as THREE.MeshBasicMaterial).opacity = 0.85;
      },
      teleportPlayer: (x: number, z: number, y = 0) => {
        const [cx, cz] = resolveCollisions(x, z, 0.58);
        const dx = cx - playerGroup.position.x;
        const dz = cz - playerGroup.position.z;
        playerGroup.position.set(cx, y, cz);
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
      setChaseFollowTarget: (target, offset, lookOffset) => {
        chaseTarget = target;
        if (offset) chaseOffset.copy(offset);
        if (lookOffset) chaseLookOffset.copy(lookOffset);
      },
      triggerCameraShake: (strength: number) => {
        shakeStrength = Math.max(shakeStrength, strength);
      },
      registerStations: (next) => {
        stations = next;
      },
      registerObstacles: (obs) => {
        obstacles = obs;
        if (modeRef.current === "exploration") {
          const [safeX, safeZ] = resolveCollisions(
            playerGroup.position.x,
            playerGroup.position.z,
            0.58,
          );
          playerGroup.position.x = safeX;
          playerGroup.position.z = safeZ;
          controls.target.set(safeX, playerGroup.position.y + 1.1, safeZ);
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

    const cleanupMission = onSceneReadyRef.current(api);

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

    // Pointer raycasting for drag-lock, station interaction, or click-to-walk
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const planeHit = new THREE.Vector3();
    let pointerDownPos = { x: 0, y: 0 };

    const updateNdc = (clientX: number, clientY: number) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    };

    const getActiveDragPlane = (obj: THREE.Object3D): THREE.Plane => {
      const yVal =
        typeof dragOptions.dragPlaneY === "function"
          ? dragOptions.dragPlaneY(obj)
          : (dragOptions.dragPlaneY ?? obj.position.y ?? 0);
      groundPlane.constant = -yVal;
      return groundPlane;
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
          const dragY = rootDrag.position.y || 0;
          dragHaloRing.position.set(rootDrag.position.x, dragY + 0.08, rootDrag.position.z);
          dragHaloRing.visible = true;
          // Lock camera orbit/pan so dragging a puzzle object never rotates the camera!
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
        const dragPlane = getActiveDragPlane(activeDragObj);
        if (raycaster.ray.intersectPlane(dragPlane, planeHit)) {
          planeHit.x = THREE.MathUtils.clamp(
            planeHit.x,
            activeBounds.minX + 0.8,
            activeBounds.maxX - 0.8,
          );
          planeHit.z = THREE.MathUtils.clamp(
            planeHit.z,
            activeBounds.minZ + 0.8,
            activeBounds.maxZ - 0.8,
          );

          const pad = dragOptions.footprintPad ?? 1.2;
          const hitObstacle = checkPointBlocked(planeHit.x, planeHit.z, pad);
          const customCheck = dragOptions.validatePoint
            ? dragOptions.validatePoint(planeHit)
            : { valid: true };
          const isValid = !hitObstacle && customCheck.valid;

          const haloY = planeHit.y + 0.08;
          if (isValid) {
            lastValidDragPoint.copy(planeHit);
            setDragWarning(null);
            (dragHaloRing.material as THREE.MeshBasicMaterial).color.setHex(0x10b981);
            dragHaloRing.position.set(planeHit.x, haloY, planeHit.z);
            onDragMoveCb(planeHit.clone(), activeDragObj, true);
          } else {
            (dragHaloRing.material as THREE.MeshBasicMaterial).color.setHex(0xef4444);
            dragHaloRing.position.set(planeHit.x, haloY, planeHit.z);
            const msg = customCheck.reason
              ? customCheck.reason[langRef.current]
              : hitObstacle?.label
                ? `${langRef.current === "en" ? "Blocked by" : "বাধা:"} ${hitObstacle.label[langRef.current]}`
                : langRef.current === "en"
                  ? "Place equipment in clear space."
                  : "খোলা জায়গায় যন্ত্র বসান।";
            setDragWarning(msg);
            onDragMoveCb(lastValidDragPoint.clone(), activeDragObj, false);
          }
        }
        return;
      }

      if (stations.length > 0) {
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
        if (modeRef.current !== "chase") {
          controls.enabled = true;
        }
        renderer.domElement.style.cursor = "grab";
        return;
      }

      if (pausedRef.current) return;
      const dist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
      if (dist > 9) return; // Was camera orbit

      updateNdc(e.clientX, e.clientY);
      raycaster.setFromCamera(pointer, camera);

      if (stations.length > 0) {
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
            if (modeRef.current !== "exploration") {
              onInteractRef.current(st.id);
              return;
            }
            const playerDist = Math.hypot(
              playerGroup.position.x - st.position.x,
              playerGroup.position.z - st.position.z,
            );
            if (playerDist <= (st.radius || 4.6)) {
              onInteractRef.current(st.id);
            } else {
              const dirX = playerGroup.position.x - st.position.x;
              const dirZ = playerGroup.position.z - st.position.z;
              const len = Math.hypot(dirX, dirZ) || 1;
              const stopDist = Math.max(1.8, (st.radius || 4.2) * 0.55);
              api.setPlayerTarget(
                st.position.x + (dirX / len) * stopDist,
                st.position.z + (dirZ / len) * stopDist,
              );
              pendingStationId = st.id;
            }
            return;
          }
        }
      }

      if (modeRef.current === "exploration") {
        groundPlane.constant = 0;
        if (raycaster.ray.intersectPlane(groundPlane, planeHit)) {
          pendingStationId = null;
          api.setPlayerTarget(planeHit.x, planeHit.z);
        }
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
    const desiredChasePos = new THREE.Vector3();
    const desiredChaseLook = new THREE.Vector3();

    function tick() {
      if (disposed) return;
      const delta = Math.min(clock.getDelta(), 0.08);
      const elapsed = clock.getElapsedTime();

      if (!pausedRef.current) {
        // Apply sensitivity changes smoothly to OrbitControls
        const sens = sensitivityRef.current;
        controls.rotateSpeed = (modeRef.current === "puzzle" ? 0.72 : 0.8) * sens;
        controls.panSpeed = 0.85 * sens;

        // Populate shared Chase inputs (keyboard + mobile touch)
        const k = keysRef.current;
        let steer = chaseTouchRef.current.steer;
        if (k["a"] || k["arrowleft"]) steer -= 1;
        if (k["d"] || k["arrowright"]) steer += 1;
        chaseInputState.steer = THREE.MathUtils.clamp(steer, -1, 1);
        chaseInputState.boost = Boolean(
          chaseTouchRef.current.boost || k["w"] || k["arrowup"] || k[" "],
        );
        chaseInputState.brake = Boolean(chaseTouchRef.current.brake || k["s"] || k["arrowdown"]);

        // 1. Third-person movement for Exploration mode
        if (modeRef.current === "exploration") {
          let inX = touchMoveRef.current.x;
          let inZ = touchMoveRef.current.z;
          if (k["w"] || k["arrowup"]) inZ -= 1;
          if (k["s"] || k["arrowdown"]) inZ += 1;
          if (k["a"] || k["arrowleft"]) inX -= 1;
          if (k["d"] || k["arrowright"]) inX += 1;

          let moveX = 0;
          let moveZ = 0;
          const speed = 9.4;

          if (Math.abs(inX) > 0.06 || Math.abs(inZ) > 0.06) {
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
            const strength = Math.min(1, Math.hypot(inX, inZ));
            moveX = (dirX / mag) * speed * strength * delta;
            moveZ = (dirZ / mag) * speed * strength * delta;
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
            const r = st.radius || 4.2;
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
        } else {
          for (const st of stations) {
            applyStateVisuals(st, elapsed);
          }
        }

        // 2. Mission frame updater (runs physics, chase vehicle steering, rays, tutorials)
        if (frameUpdater) {
          frameUpdater(delta, elapsed);
        }

        // 3. Adaptive Camera Resolution
        if (modeRef.current === "chase" && chaseTarget) {
          desiredChasePos.copy(chaseTarget.position).add(chaseOffset);
          // Scale chase zoom cleanly with Distance slider
          const zoomRatio = desiredDistanceRef.current / defaultDist;
          desiredChasePos
            .sub(chaseTarget.position)
            .multiplyScalar(zoomRatio)
            .add(chaseTarget.position);

          if (shakeStrength > 0.005) {
            desiredChasePos.x += (Math.random() - 0.5) * shakeStrength;
            desiredChasePos.y += (Math.random() - 0.5) * shakeStrength * 0.6;
            shakeStrength = THREE.MathUtils.damp(shakeStrength, 0, 9, delta);
          }

          camera.position.x = THREE.MathUtils.damp(
            camera.position.x,
            desiredChasePos.x,
            7.5,
            delta,
          );
          camera.position.y = THREE.MathUtils.damp(
            camera.position.y,
            desiredChasePos.y,
            7.5,
            delta,
          );
          camera.position.z = THREE.MathUtils.damp(
            camera.position.z,
            desiredChasePos.z,
            9.5,
            delta,
          );

          desiredChaseLook.copy(chaseTarget.position).add(chaseLookOffset);
          controls.target.lerp(desiredChaseLook, 1 - Math.exp(-9 * delta));
          camera.lookAt(controls.target);
        } else if (cameraGoalPos && cameraGoalTarget) {
          const factorPos = 1 - Math.exp(-5.2 * delta);
          const factorTarget = 1 - Math.exp(-6.2 * delta);
          camera.position.lerp(cameraGoalPos, factorPos);
          controls.target.lerp(cameraGoalTarget, factorTarget);

          // Keep focus transition safe against obstacle clipping
          let earliestGoalT = 1;
          for (const obs of obstacles) {
            const hitT = intersectSegmentBox(controls.target, camera.position, obs);
            if (hitT !== null && hitT < earliestGoalT) {
              earliestGoalT = hitT;
            }
          }
          if (earliestGoalT < 1) {
            camOffsetVec
              .subVectors(camera.position, controls.target)
              .multiplyScalar(earliestGoalT * 0.88);
            camera.position.copy(controls.target).add(camOffsetVec);
          }

          const settled =
            camera.position.distanceTo(cameraGoalPos) < 0.25 &&
            controls.target.distanceTo(cameraGoalTarget) < 0.14;
          if (settled) {
            const arrivedDist = Math.round(
              THREE.MathUtils.clamp(
                camera.position.distanceTo(controls.target),
                minZoomDistance,
                maxZoomDistance,
              ),
            );
            desiredDistanceRef.current = arrivedDist;
            setCamDistance(arrivedDist);
            cameraGoalPos = null;
            cameraGoalTarget = null;
          }
        } else {
          // Raycast camera collision against obstacles + zoom distance damping
          camOffsetVec.subVectors(camera.position, controls.target);
          const curDist = camOffsetVec.length() || 1;
          const desiredDist = desiredDistanceRef.current;

          const targetCamPos = controls.target
            .clone()
            .add(camOffsetVec.clone().normalize().multiplyScalar(desiredDist));

          let earliestT = 1;
          for (const obs of obstacles) {
            const hitT = intersectSegmentBox(controls.target, targetCamPos, obs);
            if (hitT !== null && hitT < earliestT) {
              earliestT = hitT;
            }
          }
          const finalDist =
            earliestT < 1
              ? Math.max(4.6, desiredDist * earliestT * 0.86)
              : THREE.MathUtils.damp(curDist, desiredDist, 8, delta);

          camOffsetVec.normalize().multiplyScalar(finalDist);
          camera.position.copy(controls.target).add(camOffsetVec);
          if (camera.position.y < 2.1) camera.position.y = 2.1;
        }
      }

      if (modeRef.current !== "chase") {
        controls.update();
      }
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
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("resize", handleResize);
      renderer.domElement.removeEventListener("pointerdown", handlePointerDown);
      renderer.domElement.removeEventListener("pointermove", handlePointerMove);
      renderer.domElement.removeEventListener("pointerup", handlePointerUp);
      renderer.domElement.removeEventListener("webglcontextlost", onContextLost);
      renderer.domElement.removeEventListener("webglcontextrestored", onContextRestored);
      controls.removeEventListener("start", onControlsStart);
      controls.dispose();
      envTex.dispose();
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
          else if (obj.material) obj.material.dispose();
        }
      });
      renderer.dispose();
    };
  }, [mode, skyColor, fogColor, fogDensity, minZoomDistance, maxZoomDistance, defaultDist]);

  // Mobile floating virtual joystick handlers
  const joyOriginRef = useRef<{ x: number; y: number } | null>(null);
  const handleJoyStart = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = e.currentTarget.getBoundingClientRect();
    joyOriginRef.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    updateJoystick(e.clientX, e.clientY);
  };
  const updateJoystick = (clientX: number, clientY: number) => {
    if (!joyOriginRef.current) return;
    const maxR = 36;
    const dx = clientX - joyOriginRef.current.x;
    const dy = clientY - joyOriginRef.current.y;
    const dist = Math.hypot(dx, dy);
    const clampedDist = Math.min(dist, maxR);
    const angle = Math.atan2(dy, dx);
    const kx = Math.cos(angle) * clampedDist;
    const ky = Math.sin(angle) * clampedDist;
    touchMoveRef.current.x = dist > 4 ? kx / maxR : 0;
    touchMoveRef.current.z = dist > 4 ? ky / maxR : 0;
    setJoyKnob({ x: kx, y: ky, active: true });
  };
  const handleJoyEnd = () => {
    joyOriginRef.current = null;
    touchMoveRef.current.x = 0;
    touchMoveRef.current.z = 0;
    setJoyKnob({ x: 0, y: 0, active: false });
  };

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
    <div
      className="relative w-full h-full select-none overflow-hidden"
      style={{ touchAction: "none" }}
    >
      <div ref={mountRef} className="w-full h-full" style={{ touchAction: "none" }} />

      {/* Top-Right Compact Camera & Tutorial Toolbar (zero overlap with mobile Mission button on left) */}
      <div className="absolute top-3 right-3 z-20 flex flex-col items-end gap-1.5">
        <div className="flex items-center gap-1 bg-slate-950 border border-white/15 rounded-xl px-2 py-1 shadow-lg text-white">
          <button
            type="button"
            onClick={() => handleSetZoom(camDistance - 3)}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white transition-colors"
            aria-label="Zoom In"
            title={lang === "en" ? "Zoom In" : "জুম ইন"}
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <span className="font-mono-num text-[11px] text-amber-300 px-1">{camDistance}m</span>

          <button
            type="button"
            onClick={() => handleSetZoom(camDistance + 3)}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white transition-colors"
            aria-label="Zoom Out"
            title={lang === "en" ? "Zoom Out" : "জুম আউট"}
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => resetCamRef.current()}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
            aria-label={lang === "en" ? "Reset Camera" : "ক্যামেরা রিসেট"}
            title={lang === "en" ? "Reset Camera" : "ক্যামেরা রিসেট"}
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setSettingsOpen((o) => !o)}
            className={`p-1.5 rounded-lg transition-colors ${
              settingsOpen
                ? "bg-rose-600 text-white"
                : "bg-white/10 hover:bg-white/20 text-slate-200"
            }`}
            aria-label={lang === "en" ? "Camera Controls" : "ক্যামেরা সেটিংস"}
            title={lang === "en" ? "Camera & Help" : "ক্যামেরা ও সহায়তা"}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </button>

          {tutorial?.onReplay && (
            <button
              type="button"
              onClick={tutorial.onReplay}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/35 border border-sky-400/30 text-sky-200 text-[11px] font-semibold transition-colors"
              title={lang === "en" ? "Replay In-World Tutorial" : "টিউটোরিয়াল আবার দেখুন"}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{lang === "en" ? "Tutorial" : "টিউটোরিয়াল"}</span>
            </button>
          )}
        </div>

        {/* Camera & Sensitivity Dropdown Popover */}
        {settingsOpen && (
          <div className="w-60 rounded-xl bg-slate-950 border border-white/15 p-3 shadow-2xl text-white space-y-2.5 text-xs">
            <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
              <span className="font-bold text-slate-100">
                {lang === "en" ? "Camera Settings" : "ক্যামেরা নিয়ন্ত্রণ"}
              </span>
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                className="p-0.5 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <label className="block space-y-1">
              <div className="flex justify-between text-[11px] text-slate-300">
                <span>{lang === "en" ? "Camera Distance" : "ক্যামেরা দূরত্ব"}</span>
                <span className="font-mono-num text-amber-300">{camDistance}m</span>
              </div>
              <input
                type="range"
                min={minZoomDistance}
                max={maxZoomDistance}
                step={1}
                value={camDistance}
                onChange={(e) => handleSetZoom(Number(e.target.value))}
                className="w-full accent-rose-500 cursor-pointer"
              />
            </label>
            <label className="block space-y-1">
              <div className="flex justify-between text-[11px] text-slate-300">
                <span>{lang === "en" ? "Orbit Sensitivity" : "ঘূর্ণন সংবেদনশীলতা"}</span>
                <span className="font-mono-num text-sky-300">{sensitivity.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min={0.4}
                max={1.8}
                step={0.1}
                value={sensitivity}
                onChange={(e) => setSensitivity(Number(e.target.value))}
                className="w-full accent-sky-400 cursor-pointer"
              />
            </label>
          </div>
        )}
      </div>

      {/* Interactive In-World 3D Tutorial Prompt (1 crisp sentence + Skip, leaves 3D world open) */}
      {tutorial?.active && (
        <div className="pointer-events-none absolute top-14 left-1/2 -translate-x-1/2 z-20 w-[calc(100%-1.5rem)] max-w-md">
          <div className="pointer-events-auto rounded-xl bg-slate-950 border-2 border-amber-400 px-3.5 py-2.5 shadow-2xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <p className="text-xs font-semibold text-white leading-snug">{tutorial.prompt}</p>
            </div>
            <button
              type="button"
              onClick={tutorial.onSkip}
              className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-bold text-slate-200 shrink-0 cursor-pointer"
            >
              {lang === "en" ? "Skip" : "বাদ দিন"}
            </button>
          </div>
        </div>
      )}

      {/* Custom Mission HUD Slot */}
      {hudOverlay}

      {/* Collision Warning during Puzzle Placement */}
      {dragWarning && (
        <div className="pointer-events-none absolute bottom-28 md:bottom-20 left-1/2 -translate-x-1/2 z-20 px-3.5 py-1.5 rounded-lg bg-rose-950 border border-rose-400 text-rose-100 text-xs font-semibold shadow-lg flex items-center gap-2 max-w-[calc(100%-2rem)]">
          <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          <span className="truncate">{dragWarning}</span>
        </div>
      )}

      {/* Hovered Object Tooltip */}
      {!dragWarning && hoveredLabel && (
        <div className="pointer-events-none absolute bottom-28 md:bottom-20 left-1/2 -translate-x-1/2 z-20 px-3 py-1 rounded-md bg-slate-950 border border-sky-400/50 text-sky-200 text-xs font-semibold shadow-md max-w-[calc(100%-2rem)] truncate">
          {hoveredLabel}
        </div>
      )}

      {/* Desktop Nearby Station Prompt */}
      {mode === "exploration" && nearbyStation && (
        <div className="hidden md:flex absolute top-16 right-3 z-20 items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-950 border border-amber-400/60 text-white shadow-xl">
          <Crosshair className="w-3.5 h-3.5 text-amber-300 shrink-0" />
          <span className="text-xs font-semibold max-w-[180px] truncate">
            {nearbyStation.label}
          </span>
          <button
            type="button"
            onClick={() => onStationInteract(nearbyStation.id)}
            className="px-2.5 py-1 rounded-md bg-rose-600 hover:bg-rose-500 text-[11px] font-bold transition-colors cursor-pointer"
          >
            {interactLabel[lang]} (E)
          </button>
        </div>
      )}

      {/* Mode-Adaptive Bottom Controls */}
      {mode === "exploration" && (
        <div className="md:hidden pointer-events-none absolute inset-x-0 bottom-3 px-3 flex items-end justify-between z-20">
          {/* Smooth Analog Virtual Joystick */}
          <div
            onPointerDown={handleJoyStart}
            onPointerMove={(e) => joyKnob.active && updateJoystick(e.clientX, e.clientY)}
            onPointerUp={handleJoyEnd}
            onPointerCancel={handleJoyEnd}
            className="pointer-events-auto relative w-24 h-24 rounded-full bg-slate-950/85 border-2 border-white/25 flex items-center justify-center shadow-2xl"
            style={{ touchAction: "none" }}
            aria-label={lang === "en" ? "Move Joystick" : "চলাচলের জয়স্টিক"}
          >
            <div className="w-10 h-10 rounded-full border border-white/15" />
            <div
              className="absolute w-10 h-10 rounded-full bg-rose-600 border-2 border-white shadow-lg flex items-center justify-center"
              style={{ transform: `translate(${joyKnob.x}px, ${joyKnob.y}px)` }}
            >
              <div className="w-2.5 h-2.5 rounded-full bg-white" />
            </div>
          </div>

          <button
            type="button"
            onClick={() => nearbyStation && onStationInteract(nearbyStation.id)}
            disabled={!nearbyStation}
            className={`pointer-events-auto min-w-[116px] h-12 px-4 rounded-2xl border font-bold text-xs flex items-center justify-center gap-1.5 shadow-xl transition-colors ${
              nearbyStation
                ? "bg-rose-600 active:bg-rose-500 border-rose-300 text-white"
                : "bg-slate-950/85 border-white/15 text-slate-400"
            }`}
          >
            <Hand className="w-4 h-4 shrink-0" />
            <span className="truncate max-w-[96px]">
              {nearbyStation ? nearbyStation.label : interactLabel[lang]}
            </span>
          </button>
        </div>
      )}

      {mode === "puzzle" && puzzleSelectionBar}

      {mode === "chase" && (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 px-3 flex items-end justify-between z-20">
          <div className="pointer-events-auto flex items-center gap-2">
            <button
              type="button"
              onPointerDown={() => (chaseTouchRef.current.steer = -1)}
              onPointerUp={() => (chaseTouchRef.current.steer = 0)}
              onPointerLeave={() => (chaseTouchRef.current.steer = 0)}
              onPointerCancel={() => (chaseTouchRef.current.steer = 0)}
              className="w-14 h-14 md:w-12 md:h-12 rounded-2xl bg-slate-950/90 active:bg-rose-600 border border-white/25 text-white flex items-center justify-center shadow-xl"
              style={{ touchAction: "none" }}
              aria-label="Steer Left"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <button
              type="button"
              onPointerDown={() => (chaseTouchRef.current.steer = 1)}
              onPointerUp={() => (chaseTouchRef.current.steer = 0)}
              onPointerLeave={() => (chaseTouchRef.current.steer = 0)}
              onPointerCancel={() => (chaseTouchRef.current.steer = 0)}
              className="w-14 h-14 md:w-12 md:h-12 rounded-2xl bg-slate-950/90 active:bg-rose-600 border border-white/25 text-white flex items-center justify-center shadow-xl"
              style={{ touchAction: "none" }}
              aria-label="Steer Right"
            >
              <ArrowRight className="w-6 h-6" />
            </button>
          </div>

          <button
            type="button"
            onPointerDown={() => (chaseTouchRef.current.boost = true)}
            onPointerUp={() => (chaseTouchRef.current.boost = false)}
            onPointerLeave={() => (chaseTouchRef.current.boost = false)}
            onPointerCancel={() => (chaseTouchRef.current.boost = false)}
            className="pointer-events-auto px-5 h-14 md:h-12 rounded-2xl bg-sky-600 active:bg-sky-400 border border-sky-300 text-white font-bold text-xs flex items-center gap-1.5 shadow-xl"
            style={{ touchAction: "none" }}
          >
            <Zap className="w-4 h-4" />
            <span>{lang === "en" ? "Boost (W)" : "বুস্ট (W)"}</span>
          </button>
        </div>
      )}
    </div>
  );
};
