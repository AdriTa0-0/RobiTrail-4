import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { useRobiTrail } from "../../context/RobiTrailContext";
import { getTrailsForCity, type TrailConfig } from "../../data/trails/trails";
import { TrailSymbol } from "../game/TrailSymbol";
import { t } from "../../data/translations/dictionary";
import { createProceduralTextures } from "./proceduralAssets";
import { buildCityEnvironment, type BuiltCityScene } from "./cityBuilders";

const _vec3Target = new THREE.Vector3();
const _camGoal = new THREE.Vector3();

function detectSoftwareGl(): boolean {
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

export const CityWorld3D: React.FC = () => {
  const {
    lang,
    activeCity,
    completedTrailIds,
    openTrail,
    resetViewSignal,
    cameraDistance,
    focusTrailAnchor,
  } = useRobiTrail();

  const mountRef = useRef<HTMLDivElement | null>(null);
  const [hoveredTrail, setHoveredTrail] = useState<TrailConfig | null>(null);
  const [contextLost, setContextLost] = useState(false);

  // Refs synced to animation loop without tearing down WebGL canvas
  const activeCityRef = useRef(activeCity);
  const completedRef = useRef(completedTrailIds);
  const openTrailRef = useRef(openTrail);
  const focusAnchorRef = useRef<[number, number, number] | null>(focusTrailAnchor);
  const cameraDistanceRef = useRef<number>(cameraDistance);
  const resetPendingRef = useRef(false);

  activeCityRef.current = activeCity;
  completedRef.current = completedTrailIds;
  openTrailRef.current = openTrail;
  focusAnchorRef.current = focusTrailAnchor;
  cameraDistanceRef.current = cameraDistance;

  const sceneRefs = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    renderer: THREE.WebGLRenderer;
    textures: ReturnType<typeof createProceduralTextures>;
    built: BuiltCityScene | null;
    keyLight: THREE.DirectionalLight;
    hemiLight: THREE.HemisphereLight;
  } | null>(null);

  useEffect(() => {
    resetPendingRef.current = true;
  }, [resetViewSignal]);

  // Mount Three.js renderer once in high-visual mode
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareGl();
    const width = container.clientWidth || 1280;
    const height = container.clientHeight || 640;

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
    const onContextRestored = () => {
      setContextLost(false);
    };
    renderer.domElement.addEventListener("webglcontextlost", onContextLost);
    renderer.domElement.addEventListener("webglcontextrestored", onContextRestored);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(48, width / height, 0.25, 220);
    camera.position.set(...activeCityRef.current.camera.startPos);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.enablePan = false;
    controls.enableZoom = false; // Critical: mouse wheel scrolls webpage vertically; HUD slider controls zoom
    controls.minDistance = 10;
    controls.maxDistance = 42;
    controls.minPolarAngle = 0.38;
    controls.maxPolarAngle = Math.PI / 2.1; // Prevent going underground
    controls.minAzimuthAngle = -Infinity;
    controls.maxAzimuthAngle = Infinity; // Full 360-degree rotation
    controls.target.set(...activeCityRef.current.camera.target);
    // Allow natural vertical page scrolling on mobile while rotating horizontally in 3D
    renderer.domElement.style.touchAction = "pan-y";

    // Cancel automatic preset glide when user grabs camera
    controls.addEventListener("start", () => {
      resetPendingRef.current = false;
      focusAnchorRef.current = null;
    });

    const hemiLight = new THREE.HemisphereLight(0x93c5fd, 0x5c4033, 0.75);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xffd6a5, 1.8);
    keyLight.position.set(22, 32, 18);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.left = -28;
    keyLight.shadow.camera.right = 28;
    keyLight.shadow.camera.top = 28;
    keyLight.shadow.camera.bottom = -28;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 0.45);
    rimLight.position.set(-20, 14, -22);
    scene.add(rimLight);

    const textures = createProceduralTextures(renderer.capabilities.getMaxAnisotropy());

    sceneRefs.current = {
      scene,
      camera,
      controls,
      renderer,
      textures,
      built: null,
      keyLight,
      hemiLight,
    };

    // Raycasting on Layer 1 proxy hitboxes
    const raycaster = new THREE.Raycaster();
    raycaster.layers.set(1);
    const pointer = new THREE.Vector2();
    let lastMoveRaycast = 0;
    let pointerDownPos = { x: 0, y: 0 };
    const mouseOffset = { x: 0, y: 0 };
    let activeHoverId: string | null = null;

    const updatePointer = (clientX: number, clientY: number) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      mouseOffset.x = pointer.x * 0.4;
      mouseOffset.y = pointer.y * 0.2;
    };

    const handlePointerMove = (e: PointerEvent) => {
      updatePointer(e.clientX, e.clientY);
      const now = performance.now();
      if (now - lastMoveRaycast < 45) return;
      lastMoveRaycast = now;

      const built = sceneRefs.current?.built;
      if (!built) return;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(
        built.landmarks.map((l) => l.hitbox),
        false,
      );
      if (hits.length > 0) {
        const trailId = String(hits[0].object.userData.trailId || "");
        if (trailId !== activeHoverId) {
          activeHoverId = trailId;
          const cityTrails = getTrailsForCity(activeCityRef.current.id);
          setHoveredTrail(cityTrails.find((tr) => tr.id === trailId) || null);
        }
        renderer.domElement.style.cursor = "pointer";
      } else if (activeHoverId !== null) {
        activeHoverId = null;
        setHoveredTrail(null);
        renderer.domElement.style.cursor = "grab";
      }
    };

    const handlePointerDown = (e: PointerEvent) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
      renderer.domElement.style.cursor = "grabbing";
    };

    const handlePointerUp = (e: PointerEvent) => {
      renderer.domElement.style.cursor = activeHoverId ? "pointer" : "grab";
      const dist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
      if (dist > 8) return; // Was a drag, not a tap/click

      updatePointer(e.clientX, e.clientY);
      const built = sceneRefs.current?.built;
      if (!built) return;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(
        built.landmarks.map((l) => l.hitbox),
        false,
      );
      if (hits.length > 0) {
        const trailId = String(hits[0].object.userData.trailId || "");
        if (trailId) {
          openTrailRef.current(trailId);
        }
      }
    };

    renderer.domElement.addEventListener("pointermove", handlePointerMove);
    renderer.domElement.addEventListener("pointerdown", handlePointerDown);
    renderer.domElement.addEventListener("pointerup", handlePointerUp);

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 1280;
      const h = container.clientHeight || 640;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    // Animation loop with software WebGL afterDraw pacing
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
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      if (disposed) return;
      const delta = Math.min(clock.getDelta(), 0.1);
      const elapsed = clock.getElapsedTime();
      const current = sceneRefs.current;

      if (current?.built) {
        // Animate traffic & pedestrians
        for (const actor of current.built.actors) {
          const val = actor.object.position[actor.axis] + actor.speed * actor.direction * delta;
          if (val > actor.max) {
            actor.object.position[actor.axis] = actor.min;
          } else if (val < actor.min) {
            actor.object.position[actor.axis] = actor.max;
          } else {
            actor.object.position[actor.axis] = val;
          }
        }

        // Animate Dhaka metro train
        if (current.built.metroTrain) {
          current.built.metroTrain.position.x = ((elapsed * 7) % 80) - 40;
        }

        // Animate landmark beacons & hover lift
        for (const lm of current.built.landmarks) {
          const isHovered = lm.trailId === activeHoverId;
          const targetY = lm.baseY + (isHovered ? 0.65 : 0) + Math.sin(elapsed * 2.2) * 0.14;
          lm.beacon.position.y = THREE.MathUtils.damp(lm.beacon.position.y, targetY, 8, delta);
          lm.beacon.rotation.y += delta * (isHovered ? 2.4 : 0.9);
          lm.ring.position.y = lm.beacon.position.y;
          const ringScale = isHovered ? 1.32 : 1 + Math.sin(elapsed * 3) * 0.08;
          lm.ring.scale.setScalar(THREE.MathUtils.damp(lm.ring.scale.x, ringScale, 8, delta));
        }

        // Smooth camera focus or reset view
        const anchor = focusAnchorRef.current;
        if (anchor) {
          _vec3Target.set(anchor[0], anchor[1] * 0.6, anchor[2]);
          _camGoal.set(anchor[0] + 8, anchor[1] + 5.5, anchor[2] + 9);
          controls.target.lerp(_vec3Target, 1 - Math.exp(-4.5 * delta));
          camera.position.lerp(_camGoal, 1 - Math.exp(-3.8 * delta));
          if (camera.position.distanceTo(_camGoal) < 0.25) {
            focusAnchorRef.current = null;
          }
        } else if (resetPendingRef.current) {
          const cityCam = activeCityRef.current.camera;
          _vec3Target.set(...cityCam.target);
          _camGoal.set(...cityCam.startPos);
          controls.target.lerp(_vec3Target, 1 - Math.exp(-5 * delta));
          camera.position.lerp(_camGoal, 1 - Math.exp(-4.5 * delta));
          if (camera.position.distanceTo(_camGoal) < 0.2) {
            resetPendingRef.current = false;
          }
        } else {
          // Subtle pointer perspective shift when idle
          controls.target.x = THREE.MathUtils.damp(
            controls.target.x,
            activeCityRef.current.camera.target[0] + mouseOffset.x,
            3,
            delta,
          );
          controls.target.y = THREE.MathUtils.damp(
            controls.target.y,
            activeCityRef.current.camera.target[1] + mouseOffset.y,
            3,
            delta,
          );

          // Apply HUD Camera Distance Slider smoothly along current orbital direction
          _camGoal.subVectors(camera.position, controls.target);
          const currentRadius = _camGoal.length();
          if (currentRadius > 0.001) {
            const targetRadius = THREE.MathUtils.clamp(cameraDistanceRef.current, 10, 42);
            const nextRadius = THREE.MathUtils.damp(currentRadius, targetRadius, 7, delta);
            _camGoal.normalize().multiplyScalar(nextRadius);
            camera.position.copy(controls.target).add(_camGoal);
          }
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
      window.removeEventListener("resize", handleResize);
      renderer.domElement.removeEventListener("pointermove", handlePointerMove);
      renderer.domElement.removeEventListener("pointerdown", handlePointerDown);
      renderer.domElement.removeEventListener("pointerup", handlePointerUp);
      renderer.domElement.removeEventListener("webglcontextlost", onContextLost);
      renderer.domElement.removeEventListener("webglcontextrestored", onContextRestored);
      controls.dispose();
      textures.dispose();
      envTex.dispose();
      renderer.dispose();
      sceneRefs.current = null;
    };
  }, []);

  // Swap active city scene smoothly when city or completion changes
  useEffect(() => {
    const refs = sceneRefs.current;
    if (!refs) return;

    if (refs.built) {
      refs.scene.remove(refs.built.root);
      refs.built.root.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
        }
      });
    }

    refs.scene.background = new THREE.Color(activeCity.theme.skyBottom);
    refs.scene.fog = new THREE.FogExp2(activeCity.theme.fogColor, activeCity.theme.fogDensity);
    refs.keyLight.color.set(activeCity.theme.sunColor);
    refs.keyLight.intensity = activeCity.theme.sunIntensity;
    refs.hemiLight.color.set(activeCity.theme.hemiSky);
    refs.hemiLight.groundColor.set(activeCity.theme.hemiGround);

    const cityTrails = getTrailsForCity(activeCity.id);
    const built = buildCityEnvironment(activeCity, cityTrails, completedTrailIds, refs.textures);
    refs.scene.add(built.root);
    refs.built = built;
    resetPendingRef.current = true;
  }, [activeCity, completedTrailIds]);

  // WebGL context loss safety fallback
  if (contextLost) {
    const cityTrails = getTrailsForCity(activeCity.id);
    return (
      <div
        className="relative w-full h-full flex flex-col justify-between p-6 md:p-10 text-white"
        style={{
          background: `linear-gradient(160deg, ${activeCity.theme.skyTop}, ${activeCity.theme.skyBottom})`,
        }}
      >
        <div className="max-w-2xl">
          <p className="text-xs uppercase tracking-widest text-white/80 mb-2">
            {t(activeCity.regionLabel, lang)} · {activeCity.coordinates.display}
          </p>
          <h2 className="text-3xl font-bold mb-2">{t(activeCity.name, lang)}</h2>
          <p className="text-sm text-white/85">{t(activeCity.description, lang)}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-6">
          {cityTrails.map((trail) => (
            <button
              key={trail.id}
              onClick={() => openTrail(trail.id)}
              className="flex items-center gap-3 p-3 rounded-lg bg-slate-950/60 border border-white/15 hover:border-white/40 text-left transition-colors"
            >
              <TrailSymbol type={trail.iconType} className="w-6 h-6 text-rose-400 shrink-0" />
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">{t(trail.title, lang)}</div>
                <div className="text-xs text-white/70 truncate">{t(trail.subtitle, lang)}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full select-none">
      <div ref={mountRef} className="w-full h-full cursor-grab" />

      {/* Hovered 3D Landmark Tooltip */}
      {hoveredTrail && (
        <div className="pointer-events-none absolute top-20 left-1/2 -translate-x-1/2 z-20 bg-slate-950/90 text-white px-4 py-2 rounded-xl border border-white/15 shadow-lg flex items-center gap-3">
          <TrailSymbol
            type={hoveredTrail.iconType}
            className="w-5 h-5 text-rose-400 shrink-0"
            active
          />
          <div>
            <div className="text-xs text-rose-300 font-medium">
              {t(hoveredTrail.landmarkLabel, lang)}
            </div>
            <div className="text-sm font-semibold">{t(hoveredTrail.title, lang)}</div>
          </div>
        </div>
      )}
    </div>
  );
};
