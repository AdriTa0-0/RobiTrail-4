import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { useRobiTrail } from "../../context/RobiTrailContext";
import { useAppRouter } from "../../router/RouterContext";
import { detectSoftwareGl } from "../game/chattogram3d/ThreeMissionHarness";
import { ArrowLeft, ArrowRight, Radio, RotateCw, ShieldAlert, BookOpen } from "lucide-react";

type ObstacleKind = "none" | "concrete" | "hill";

export const SignalWavesExhibitPage: React.FC = () => {
  const { lang } = useRobiTrail();
  const { navigate } = useAppRouter();

  const [distanceM, setDistanceM] = useState(80);
  const [obstacle, setObstacle] = useState<ObstacleKind>("none");
  const [bandMhz, setBandMhz] = useState<900 | 2100>(2100);
  const [towerYawDeg, setTowerYawDeg] = useState(25);

  const mountRef = useRef<HTMLDivElement | null>(null);
  const distanceRef = useRef(distanceM);
  const obstacleRef = useRef(obstacle);
  const bandRef = useRef(bandMhz);
  const yawRef = useRef(towerYawDeg);

  distanceRef.current = distanceM;
  obstacleRef.current = obstacle;
  bandRef.current = bandMhz;
  yawRef.current = towerYawDeg;

  const bandLoss = bandMhz === 2100 ? 6 : 0;
  const obstacleLoss = obstacle === "concrete" ? 19 : obstacle === "hill" ? 24 : 0;
  const dbm = Math.round(-48 - distanceM * 0.19 - bandLoss - obstacleLoss);
  const bars = dbm >= -72 ? 4 : dbm >= -84 ? 3 : dbm >= -96 ? 2 : dbm >= -106 ? 1 : 0;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareGl();
    const w = container.clientWidth || 720;
    const h = container.clientHeight || 360;

    const renderer = new THREE.WebGLRenderer({ antialias: !isSoftwareGl });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(w, h);
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xbae6fd);
    scene.fog = new THREE.FogExp2(0xe0f2fe, 0.012);

    const camera = new THREE.PerspectiveCamera(45, w / h, 0.2, 120);
    camera.position.set(0, 9.5, 19);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.enablePan = false;
    controls.enableZoom = false;
    controls.minPolarAngle = 0.35;
    controls.maxPolarAngle = Math.PI / 2.1;
    controls.target.set(0, 1.8, 0);
    renderer.domElement.style.touchAction = "pan-y";

    scene.add(new THREE.HemisphereLight(0xf0f9ff, 0x86efac, 1.15));
    const sun = new THREE.DirectionalLight(0xfffbeb, 1.65);
    sun.position.set(10, 16, 12);
    scene.add(sun);

    const lawn = new THREE.Mesh(
      new THREE.CircleGeometry(48, 36),
      new THREE.MeshStandardMaterial({ color: 0x86efac, roughness: 0.95 }),
    );
    lawn.rotation.x = -Math.PI / 2;
    lawn.position.y = -0.04;
    scene.add(lawn);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(32, 16),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.85 }),
    );
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    // Rotatable Tower Assembly on Left
    const towerGroup = new THREE.Group();
    towerGroup.position.set(-7.5, 0, 0);
    const mast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.52, 6.2, 6),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.5, roughness: 0.35 }),
    );
    mast.position.y = 3.1;
    const antennaPanel = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 1.1, 1.2),
      new THREE.MeshStandardMaterial({
        color: 0xe11d48,
        emissive: 0x9f1239,
        emissiveIntensity: 0.4,
      }),
    );
    antennaPanel.position.set(0.35, 5.4, 0);
    towerGroup.add(mast, antennaPanel);
    scene.add(towerGroup);

    // Concrete Obstacle Mesh
    const concreteMesh = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 5.0, 5.2),
      new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.8 }),
    );
    concreteMesh.position.set(-1.0, 2.5, 0);
    concreteMesh.visible = false;
    scene.add(concreteMesh);

    // Hill Ridge Obstacle Mesh
    const hillMesh = new THREE.Mesh(
      new THREE.ConeGeometry(2.8, 5.6, 7),
      new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.9 }),
    );
    hillMesh.position.set(-1.0, 2.8, 0);
    hillMesh.visible = false;
    scene.add(hillMesh);

    // Movable Smartphone Receiver on Right
    const phoneGroup = new THREE.Group();
    phoneGroup.position.set(4, 0, 0);
    const phoneBody = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 1.4, 0.25),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 }),
    );
    phoneBody.position.y = 1.2;
    const signalOrb = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x10b981, emissiveIntensity: 1 }),
    );
    signalOrb.position.y = 2.4;
    phoneGroup.add(phoneBody, signalOrb);
    scene.add(phoneGroup);

    // 3 Expanding RF Wave Arcs
    const rings: THREE.Mesh[] = [];
    for (let i = 0; i < 3; i++) {
      const r = new THREE.Mesh(
        new THREE.TorusGeometry(1, 0.06, 8, 32),
        new THREE.MeshBasicMaterial({ color: 0xf43f5e, transparent: true, opacity: 0.8 }),
      );
      r.position.set(-7.2, 4.4, 0);
      r.rotation.y = Math.PI / 2;
      scene.add(r);
      rings.push(r);
    }

    const handleResize = () => {
      if (!container) return;
      const nw = container.clientWidth || 720;
      const nh = container.clientHeight || 360;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener("resize", handleResize);

    const clock = new THREE.Clock();
    let frameId = 0;
    let disposed = false;

    const tick = () => {
      if (disposed) return;
      const elapsed = clock.getElapsedTime();

      towerGroup.rotation.y = (yawRef.current * Math.PI) / 180;
      concreteMesh.visible = obstacleRef.current === "concrete";
      hillMesh.visible = obstacleRef.current === "hill";

      const normDist = (distanceRef.current - 20) / 230;
      phoneGroup.position.x = -3.8 + normDist * 13.5;

      const curLoss =
        obstacleRef.current === "concrete" ? 19 : obstacleRef.current === "hill" ? 24 : 0;
      const curBand = bandRef.current === 2100 ? 6 : 0;
      const curDbm = -48 - distanceRef.current * 0.19 - curLoss - curBand;
      const orbColor = curDbm >= -84 ? 0x10b981 : curDbm >= -96 ? 0xf59e0b : 0xef4444;
      (signalOrb.material as THREE.MeshStandardMaterial).color.setHex(orbColor);
      (signalOrb.material as THREE.MeshStandardMaterial).emissive.setHex(orbColor);

      const waveSpeed = bandRef.current === 2100 ? 0.65 : 0.42;
      const maxReach = bandRef.current === 2100 ? 11 : 14.5;
      rings.forEach((r, idx) => {
        const p = (elapsed * waveSpeed + idx * 0.33) % 1;
        const reachFactor = obstacleRef.current === "none" ? 1 : 0.62;
        r.scale.setScalar(0.5 + p * 4.2);
        r.position.x = -7.2 + p * maxReach * reachFactor;
        (r.material as THREE.MeshBasicMaterial).opacity = (1 - p) * 0.85;
      });

      controls.update();
      renderer.render(scene, camera);

      if (isSoftwareGl) {
        frameId = window.setTimeout(tick, 90);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };
    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener("resize", handleResize);
      controls.dispose();
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) obj.geometry.dispose();
      });
      renderer.dispose();
    };
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6 min-h-[82vh]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-950 mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{lang === "en" ? "Back to Homepage" : "হোমপেজে ফিরুন"}</span>
          </button>
          <div className="flex items-center gap-2 text-xs font-mono text-rose-600 uppercase tracking-wider">
            <Radio className="w-4 h-4" />
            <span>
              {lang === "en" ? "Interactive Discovery Exhibit" : "ইন্টারেক্টিভ আবিষ্কার প্রদর্শনী"}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">
            {lang === "en" ? "Signal Wave Expansion Lab" : "সিগন্যাল তরঙ্গ বিস্তার পরীক্ষাগার"}
          </h1>
        </div>

        <button
          type="button"
          onClick={() => navigate("/games/chattogram/ctg-2")}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs sm:text-sm font-semibold transition-colors"
        >
          <span>
            {lang === "en"
              ? "Play Rooftop Network Puzzle (3D Game)"
              : "ছাদের নেটওয়ার্ক ধাঁধা (৩ডি গেম) খেলুন"}
          </span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Interactive 3D / Fallback Exhibit Viewport + Live Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-8 rounded-2xl overflow-hidden border border-slate-200 bg-slate-950 min-h-[340px] relative">
          <div ref={mountRef} className="w-full h-[360px] lg:h-full cursor-grab" />

          {/* Live RF Telemetry Overlay */}
          <div className="absolute top-3 left-3 bg-slate-950/90 border border-white/15 rounded-xl px-3.5 py-2 text-white flex items-center gap-4">
            <div>
              <div className="text-[10px] font-mono text-slate-400">RECEIVED SIGNAL</div>
              <div
                className={`text-lg font-mono-num font-bold ${
                  bars >= 3 ? "text-emerald-400" : bars === 2 ? "text-amber-300" : "text-rose-400"
                }`}
              >
                {dbm} dBm · {bars}/4 bars
              </div>
            </div>
          </div>
        </div>

        {/* Exhibit Controls & Explanation */}
        <div className="lg:col-span-4 rounded-2xl bg-white border border-slate-200 p-5 flex flex-col justify-between space-y-5 shadow-sm">
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-800 mb-1">
                <span>{lang === "en" ? "Receiver Distance" : "গ্রাহকের দূরত্ব"}</span>
                <span className="font-mono-num text-rose-600">{distanceM} m</span>
              </div>
              <input
                type="range"
                min={20}
                max={250}
                step={5}
                value={distanceM}
                onChange={(e) => setDistanceM(Number(e.target.value))}
                className="w-full accent-rose-600"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-800 mb-1">
                <span className="inline-flex items-center gap-1">
                  <RotateCw className="w-3.5 h-3.5 text-slate-500" />
                  <span>{lang === "en" ? "Inspect Tower Rotation" : "টাওয়ার ঘুরিয়ে দেখুন"}</span>
                </span>
                <span className="font-mono-num text-slate-600">{towerYawDeg}°</span>
              </div>
              <input
                type="range"
                min={-180}
                max={180}
                value={towerYawDeg}
                onChange={(e) => setTowerYawDeg(Number(e.target.value))}
                className="w-full accent-slate-800"
              />
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-800 mb-1.5">
                {lang === "en" ? "Introduce Obstacle" : "প্রতিবন্ধকতা যোগ করুন"}
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {(
                  [
                    { id: "none", label: { en: "Open Air", bn: "খোলা বাতাস" } },
                    { id: "concrete", label: { en: "Concrete", bn: "কংক্রিট" } },
                    { id: "hill", label: { en: "Hill Ridge", bn: "পাহাড়ি টিলা" } },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setObstacle(item.id)}
                    className={`py-2 px-2 rounded-lg text-xs font-semibold border transition-colors ${
                      obstacle === item.id
                        ? "bg-rose-600 text-white border-rose-600"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-400"
                    }`}
                  >
                    {item.label[lang]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-800 mb-1.5">
                {lang === "en" ? "Radio Frequency Band" : "রেডিও তরঙ্গ ব্যান্ড"}
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { band: 900 as const, label: "900 MHz (Long Reach)" },
                  { band: 2100 as const, label: "2100 MHz (4G Dense)" },
                ].map((opt) => (
                  <button
                    key={opt.band}
                    type="button"
                    onClick={() => setBandMhz(opt.band)}
                    className={`py-2 px-2 rounded-lg text-[11px] font-semibold border transition-colors ${
                      bandMhz === opt.band
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-slate-50 text-slate-700 border-slate-200"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed space-y-1.5">
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                <span>{lang === "en" ? "Why Signal Changes" : "সিগন্যাল কেন কমে বা বাড়ে"}</span>
              </div>
              <p>
                {lang === "en"
                  ? "Radio waves spread thinner with distance and lose 15–25 dB when absorbed by dense concrete walls or hillside terrain."
                  : "দূরত্ব বাড়ার সাথে সাথে রেডিও তরঙ্গ ছড়িয়ে পড়ে এবং কংক্রিট দেয়াল বা পাহাড়ে ধাক্কা খেয়ে ১৫–২৫ dB শক্তি হারায়।"}
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-[11px] text-slate-500">
            <span>Source: ITU-R P.1411 / GSMA RF Basics</span>
            <button
              type="button"
              onClick={() => navigate("/handbook")}
              className="inline-flex items-center gap-1 text-rose-600 font-semibold hover:underline"
            >
              <BookOpen className="w-3 h-3" />
              <span>{lang === "en" ? "Handbook" : "হ্যান্ডবুক"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
