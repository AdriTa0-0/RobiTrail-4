import * as THREE from "three";
import type { InteractiveStation, ObstacleBox } from "../chattogram3d/ThreeMissionHarness";
import type { DataDetectiveStationId } from "./dataDetectiveLogic";

export interface ApartmentRigHandles {
  stations: InteractiveStation[];
  obstacles: ObstacleBox[];
  packetCubes: THREE.Mesh[];
  fiberPulses: { mesh: THREE.Mesh; start: THREE.Vector3; end: THREE.Vector3; phase: number }[];
  routerLedMat: THREE.MeshStandardMaterial;
  tvHotspotLedMat: THREE.MeshStandardMaterial;
  fanBladeGroup: THREE.Group;
  dispose: () => void;
}

function makeCanvasTexture(
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  w = 512,
  h = 512,
  repeatX = 1,
  repeatY = 1,
): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (ctx) draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  if (repeatX !== 1 || repeatY !== 1) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
  }
  return tex;
}

function buildWoodParquetTexture(): THREE.CanvasTexture {
  return makeCanvasTexture(
    (ctx, w, h) => {
      ctx.fillStyle = "#b6895b";
      ctx.fillRect(0, 0, w, h);
      const rows = 8;
      const cols = 4;
      const pw = w / cols;
      const ph = h / rows;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const offset = (r % 2) * (pw * 0.5);
          const x = (c * pw + offset) % w;
          const y = r * ph;
          const shade = ((r * 7 + c * 13) % 5) * 6 - 12;
          ctx.fillStyle = `rgb(${178 + shade}, ${131 + shade}, ${85 + Math.floor(shade * 0.7)})`;
          ctx.fillRect(x, y, pw - 2, ph - 2);
          ctx.fillStyle = "rgba(85, 50, 22, 0.14)";
          for (let g = 0; g < 4; g++) {
            ctx.fillRect(x + 6, y + 8 + g * 13, pw - 14, 1.5);
          }
        }
      }
    },
    512,
    512,
    4,
    3,
  );
}

function buildRugTexture(): THREE.CanvasTexture {
  return makeCanvasTexture((ctx, w, h) => {
    ctx.fillStyle = "#e7dfd3";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#b45309";
    ctx.lineWidth = 18;
    ctx.strokeRect(20, 20, w - 40, h - 40);
    ctx.strokeStyle = "#0f766e";
    ctx.lineWidth = 6;
    ctx.strokeRect(42, 42, w - 84, h - 84);
    ctx.fillStyle = "#cbd5e1";
    for (let x = 80; x < w - 80; x += 64) {
      for (let y = 80; y < h - 80; y += 64) {
        ctx.beginPath();
        ctx.moveTo(x + 22, y);
        ctx.lineTo(x + 44, y + 22);
        ctx.lineTo(x + 22, y + 44);
        ctx.lineTo(x, y + 22);
        ctx.closePath();
        ctx.fillStyle = (x + y) % 128 === 0 ? "#9f1239" : "#1e3a8a";
        ctx.globalAlpha = 0.22;
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  });
}

function buildMonitorTelemetryTexture(): THREE.CanvasTexture {
  return makeCanvasTexture((ctx, w, h) => {
    ctx.fillStyle = "#0b1220";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(16, 16, w - 32, 46);
    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 22px monospace";
    ctx.fillText("PACKET TELEMETRY · DHAKA", 28, 46);
    const bars = [0.78, 0.42, 0.91, 0.65, 0.34, 0.85, 0.52];
    bars.forEach((v, idx) => {
      const bx = 32 + idx * 66;
      const bh = v * 210;
      ctx.fillStyle = v > 0.7 ? "#f43f5e" : v > 0.45 ? "#f59e0b" : "#10b981";
      ctx.fillRect(bx, 310 - bh, 42, bh);
    });
    ctx.fillStyle = "#94a3b8";
    ctx.font = "16px monospace";
    ctx.fillText("QoS / AUTOPLAY / LIVE LINK MONITOR", 32, 360);
  });
}

function buildTvScreenTexture(): THREE.CanvasTexture {
  return makeCanvasTexture((ctx, w, h) => {
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, "#1d1b4b");
    grad.addColorStop(0.55, "#7c2d12");
    grad.addColorStop(1, "#0f172a");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "rgba(255,255,255,0.14)";
    ctx.fillRect(28, 36, w - 56, 180);
    ctx.fillStyle = "#fb7185";
    ctx.font = "bold 28px sans-serif";
    ctx.fillText("4K ULTRA STREAMING", 46, 106);
    ctx.fillStyle = "#fde68a";
    ctx.font = "bold 20px monospace";
    ctx.fillText("HOTSPOT TETHER DRAIN ACTIVE", 46, 152);
  });
}

function buildWallArtTexture(): THREE.CanvasTexture {
  return makeCanvasTexture((ctx, w, h) => {
    ctx.fillStyle = "#faf5ef";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(36, 36, w - 72, h - 72);
    const sky = ctx.createLinearGradient(0, 40, 0, h - 80);
    sky.addColorStop(0, "#1e3a8a");
    sky.addColorStop(1, "#fb923c");
    ctx.fillStyle = sky;
    ctx.fillRect(54, 54, w - 108, h - 108);
    ctx.fillStyle = "#0f172a";
    [80, 140, 210, 285, 355].forEach((bx, i) => {
      const bh = 120 + (i % 3) * 55;
      ctx.fillRect(bx, h - 60 - bh, 52, bh);
    });
    ctx.fillStyle = "#e11d48";
    ctx.beginPath();
    ctx.arc(330, 140, 38, 0, Math.PI * 2);
    ctx.fill();
  });
}

export function buildDhakaApartmentScene(scene: THREE.Scene): ApartmentRigHandles {
  const disposables: { dispose: () => void }[] = [];
  const geo = <T extends THREE.BufferGeometry>(g: T): T => {
    disposables.push(g);
    return g;
  };
  const mat = <T extends THREE.Material>(m: T): T => {
    disposables.push(m);
    return m;
  };
  const tex = <T extends THREE.Texture>(t: T): T => {
    disposables.push(t);
    return t;
  };

  // Warm interior lighting rig paired with harness sky & sun
  const indoorWarmLight = new THREE.PointLight(0xffedd5, 1.35, 28, 1.4);
  indoorWarmLight.position.set(0, 4.2, 0);
  scene.add(indoorWarmLight);

  const deskLampLight = new THREE.PointLight(0xfde68a, 0.85, 11, 1.6);
  deskLampLight.position.set(-8.6, 2.3, -4.6);
  scene.add(deskLampLight);

  const parquetTex = tex(buildWoodParquetTexture());
  const rugTex = tex(buildRugTexture());
  const monitorTex = tex(buildMonitorTelemetryTexture());
  const tvTex = tex(buildTvScreenTexture());
  const artTex = tex(buildWallArtTexture());

  // 1. Hardwood Parquet Apartment Floor (above backdrop courtyard y = -0.025)
  const floorMesh = new THREE.Mesh(
    geo(new THREE.BoxGeometry(22.4, 0.05, 18.4)),
    mat(new THREE.MeshStandardMaterial({ map: parquetTex, roughness: 0.58, metalness: 0.05 })),
  );
  floorMesh.position.set(0, 0.005, 0);
  floorMesh.receiveShadow = true;
  scene.add(floorMesh);

  // Living/Study Area Rug
  const rugMesh = new THREE.Mesh(
    geo(new THREE.BoxGeometry(10.6, 0.03, 7.6)),
    mat(new THREE.MeshStandardMaterial({ map: rugTex, roughness: 0.92 })),
  );
  rugMesh.position.set(0, 0.04, 0.8);
  rugMesh.receiveShadow = true;
  scene.add(rugMesh);

  // 2. Interior Walls + Panoramic Dhaka Window Bay on Back Wall (z = -9.1)
  const plasterMat = mat(new THREE.MeshStandardMaterial({ color: 0xf4efe6, roughness: 0.88 }));
  const accentWallMat = mat(new THREE.MeshStandardMaterial({ color: 0xd6d3d1, roughness: 0.82 }));
  const walnutMat = mat(new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.65 }));
  const whiteTrimMat = mat(new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.45 }));

  // Left & Right side walls
  const leftWall = new THREE.Mesh(geo(new THREE.BoxGeometry(0.32, 4.7, 18.4)), plasterMat);
  leftWall.position.set(-11.2, 2.35, 0);
  leftWall.receiveShadow = true;
  scene.add(leftWall);

  const rightWall = new THREE.Mesh(geo(new THREE.BoxGeometry(0.32, 4.7, 18.4)), plasterMat);
  rightWall.position.set(11.2, 2.35, 0);
  rightWall.receiveShadow = true;
  scene.add(rightWall);

  // Baseboards
  const leftBase = new THREE.Mesh(geo(new THREE.BoxGeometry(0.08, 0.2, 18.2)), walnutMat);
  leftBase.position.set(-11.0, 0.1, 0);
  scene.add(leftBase);
  const rightBase = new THREE.Mesh(geo(new THREE.BoxGeometry(0.08, 0.2, 18.2)), walnutMat);
  rightBase.position.set(11.0, 0.1, 0);
  scene.add(rightBase);

  // Back wall framing a wide panoramic window (open span x = -5.2 to 5.2, y = 1.05 to 4.1)
  const backWallLeft = new THREE.Mesh(geo(new THREE.BoxGeometry(6.0, 4.7, 0.34)), accentWallMat);
  backWallLeft.position.set(-8.2, 2.35, -9.1);
  backWallLeft.receiveShadow = true;
  scene.add(backWallLeft);

  const backWallRight = new THREE.Mesh(geo(new THREE.BoxGeometry(6.0, 4.7, 0.34)), accentWallMat);
  backWallRight.position.set(8.2, 2.35, -9.1);
  backWallRight.receiveShadow = true;
  scene.add(backWallRight);

  const windowSillWall = new THREE.Mesh(
    geo(new THREE.BoxGeometry(10.6, 1.08, 0.34)),
    accentWallMat,
  );
  windowSillWall.position.set(0, 0.54, -9.1);
  windowSillWall.receiveShadow = true;
  scene.add(windowSillWall);

  const windowHeaderWall = new THREE.Mesh(
    geo(new THREE.BoxGeometry(10.6, 0.65, 0.34)),
    accentWallMat,
  );
  windowHeaderWall.position.set(0, 4.38, -9.1);
  scene.add(windowHeaderWall);

  // Window frame, mullions & architectural glass looking out at Dhaka Metro skyline
  const windowSill = new THREE.Mesh(geo(new THREE.BoxGeometry(10.6, 0.1, 0.5)), walnutMat);
  windowSill.position.set(0, 1.08, -9.05);
  scene.add(windowSill);

  [-5.2, -1.75, 1.75, 5.2].forEach((mx) => {
    const mullion = new THREE.Mesh(geo(new THREE.BoxGeometry(0.14, 3.05, 0.22)), whiteTrimMat);
    mullion.position.set(mx, 2.58, -9.1);
    scene.add(mullion);
  });

  const windowGlass = new THREE.Mesh(
    geo(new THREE.PlaneGeometry(10.3, 2.95)),
    mat(
      new THREE.MeshPhysicalMaterial({
        color: 0xdbeafe,
        roughness: 0.08,
        metalness: 0.1,
        transparent: true,
        opacity: 0.18,
        depthWrite: false,
      }),
    ),
  );
  windowGlass.position.set(0, 2.58, -9.1);
  scene.add(windowGlass);

  // Balcony deck & railing just outside the panoramic window (frames the Dhaka skyline)
  const balconyDeck = new THREE.Mesh(
    geo(new THREE.BoxGeometry(11.4, 0.16, 2.6)),
    mat(new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.8 })),
  );
  balconyDeck.position.set(0, 0.92, -10.55);
  balconyDeck.receiveShadow = true;
  scene.add(balconyDeck);

  const railMat = mat(
    new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7, roughness: 0.35 }),
  );
  const topRail = new THREE.Mesh(geo(new THREE.BoxGeometry(11.2, 0.08, 0.08)), railMat);
  topRail.position.set(0, 1.98, -11.75);
  scene.add(topRail);
  for (let rx = -5.4; rx <= 5.4; rx += 1.35) {
    const post = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.035, 0.035, 1.02, 8)), railMat);
    post.position.set(rx, 1.48, -11.75);
    scene.add(post);
  }

  // Framed Dhaka Skyline Artwork on Left Wall
  const artFrame = new THREE.Group();
  const frameOuter = new THREE.Mesh(geo(new THREE.BoxGeometry(0.1, 1.85, 2.5)), walnutMat);
  const frameCanvas = new THREE.Mesh(
    geo(new THREE.PlaneGeometry(2.26, 1.62)),
    mat(new THREE.MeshStandardMaterial({ map: artTex, roughness: 0.45 })),
  );
  frameCanvas.rotation.y = Math.PI / 2;
  frameCanvas.position.x = 0.06;
  artFrame.add(frameOuter, frameCanvas);
  artFrame.position.set(-10.98, 2.55, -0.8);
  scene.add(artFrame);

  // Overhead Ceiling Beam & Rotating Ceiling Fan (keeps camera sightlines unobstructed)
  const beam = new THREE.Mesh(geo(new THREE.BoxGeometry(22.2, 0.28, 0.45)), walnutMat);
  beam.position.set(0, 4.72, -1.2);
  scene.add(beam);

  const fanBladeGroup = new THREE.Group();
  const fanHub = new THREE.Mesh(
    geo(new THREE.CylinderGeometry(0.24, 0.24, 0.18, 16)),
    mat(new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.5, roughness: 0.3 })),
  );
  const fanLight = new THREE.Mesh(
    geo(new THREE.SphereGeometry(0.18, 14, 10)),
    mat(
      new THREE.MeshStandardMaterial({
        color: 0xfef3c7,
        emissive: 0xfde68a,
        emissiveIntensity: 0.7,
      }),
    ),
  );
  fanLight.position.y = -0.14;
  fanBladeGroup.add(fanHub, fanLight);
  for (let b = 0; b < 3; b++) {
    const blade = new THREE.Mesh(geo(new THREE.BoxGeometry(1.55, 0.03, 0.26)), walnutMat);
    const angle = (b * Math.PI * 2) / 3;
    blade.position.set(Math.cos(angle) * 0.9, 0.02, Math.sin(angle) * 0.9);
    blade.rotation.y = -angle;
    fanBladeGroup.add(blade);
  }
  fanBladeGroup.position.set(0, 4.42, -1.2);
  scene.add(fanBladeGroup);

  // 3. Detailed Composite Furnishings + Collision Obstacles
  const obstacles: ObstacleBox[] = [];

  // 3a. Oak Bookshelf Divider (Center-Back Left, Multi-part with books)
  const shelfGroup = new THREE.Group();
  const shelfFrame = new THREE.Mesh(geo(new THREE.BoxGeometry(2.6, 2.35, 0.85)), walnutMat);
  shelfFrame.position.y = 1.18;
  shelfFrame.castShadow = true;
  shelfFrame.receiveShadow = true;
  shelfGroup.add(shelfFrame);
  const shelfColors = [0xe11d48, 0x0284c7, 0xd97706, 0x059669, 0x7c3aed];
  [0.65, 1.35, 1.98].forEach((sy, rowIdx) => {
    const plank = new THREE.Mesh(
      geo(new THREE.BoxGeometry(2.42, 0.07, 0.9)),
      mat(new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.65 })),
    );
    plank.position.y = sy;
    shelfGroup.add(plank);
    for (let bi = 0; bi < 6; bi++) {
      const book = new THREE.Mesh(
        geo(new THREE.BoxGeometry(0.16, 0.36 + ((bi + rowIdx) % 3) * 0.06, 0.42)),
        mat(
          new THREE.MeshStandardMaterial({
            color: shelfColors[(bi + rowIdx) % shelfColors.length],
            roughness: 0.7,
          }),
        ),
      );
      book.position.set(-0.92 + bi * 0.24, sy + 0.22, 0.25);
      shelfGroup.add(book);
    }
  });
  shelfGroup.position.set(0, 0, -2.2);
  scene.add(shelfGroup);
  obstacles.push({
    minX: -1.4,
    maxX: 1.4,
    minZ: -2.75,
    maxZ: -1.65,
    maxY: 2.4,
    label: { en: "Study Bookshelf", bn: "বইয়ের তাক" },
  });

  // 3b. Lounge Sofa & Coffee Table (Center Living Zone)
  const sofaGroup = new THREE.Group();
  const fabricMat = mat(new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.88 }));
  const cushionMat = mat(new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.85 }));
  const accentPillowMat = mat(new THREE.MeshStandardMaterial({ color: 0xe11d48, roughness: 0.75 }));
  const sofaBase = new THREE.Mesh(geo(new THREE.BoxGeometry(3.4, 0.45, 1.25)), fabricMat);
  sofaBase.position.y = 0.34;
  sofaBase.castShadow = true;
  const sofaBack = new THREE.Mesh(geo(new THREE.BoxGeometry(3.4, 0.72, 0.28)), fabricMat);
  sofaBack.position.set(0, 0.75, 0.48);
  const armL = new THREE.Mesh(geo(new THREE.BoxGeometry(0.28, 0.56, 1.25)), fabricMat);
  armL.position.set(-1.56, 0.52, 0);
  const armR = armL.clone();
  armR.position.x = 1.56;
  const pillowL = new THREE.Mesh(geo(new THREE.BoxGeometry(0.45, 0.38, 0.18)), accentPillowMat);
  pillowL.position.set(-1.12, 0.76, 0.22);
  pillowL.rotation.z = 0.16;
  const pillowR = pillowL.clone();
  pillowR.position.x = 1.12;
  pillowR.rotation.z = -0.16;
  [-1.4, 1.4].forEach((lx) => {
    [-0.45, 0.45].forEach((lz) => {
      const leg = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.05, 0.04, 0.14, 8)), walnutMat);
      leg.position.set(lx, 0.07, lz);
      sofaGroup.add(leg);
    });
  });
  [-0.75, 0.75].forEach((cx) => {
    const seat = new THREE.Mesh(geo(new THREE.BoxGeometry(1.38, 0.16, 1.0)), cushionMat);
    seat.position.set(cx, 0.62, -0.04);
    sofaGroup.add(seat);
  });
  sofaGroup.add(sofaBase, sofaBack, armL, armR, pillowL, pillowR);
  sofaGroup.position.set(0, 0, 2.2);
  scene.add(sofaGroup);
  obstacles.push({
    minX: -1.75,
    maxX: 1.75,
    minZ: 1.5,
    maxZ: 2.9,
    maxY: 1.2,
    label: { en: "Apartment Sofa", bn: "সোফা" },
  });

  // Coffee Table in front of sofa
  const coffeeTable = new THREE.Group();
  const tableGlass = new THREE.Mesh(
    geo(new THREE.BoxGeometry(1.75, 0.06, 0.95)),
    mat(
      new THREE.MeshPhysicalMaterial({
        color: 0xbae6fd,
        roughness: 0.1,
        metalness: 0.15,
        transparent: true,
        opacity: 0.55,
      }),
    ),
  );
  tableGlass.position.y = 0.46;
  const tableFrame = new THREE.Mesh(geo(new THREE.BoxGeometry(1.62, 0.05, 0.84)), railMat);
  tableFrame.position.y = 0.41;
  coffeeTable.add(tableGlass, tableFrame);
  [-0.74, 0.74].forEach((tx) => {
    [-0.36, 0.36].forEach((tz) => {
      const tLeg = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.035, 0.03, 0.41, 8)), railMat);
      tLeg.position.set(tx, 0.2, tz);
      coffeeTable.add(tLeg);
    });
  });
  coffeeTable.position.set(0, 0, 0.2);
  scene.add(coffeeTable);
  obstacles.push({
    minX: -0.95,
    maxX: 0.95,
    minZ: -0.35,
    maxZ: 0.75,
    maxY: 0.6,
    label: { en: "Coffee Table", bn: "কফি টেবিল" },
  });

  // 3c. Potted Indoor Palms (Back Corners & Balcony)
  const buildPlant = (x: number, z: number, scale = 1) => {
    const plant = new THREE.Group();
    const pot = new THREE.Mesh(
      geo(new THREE.CylinderGeometry(0.36, 0.26, 0.52, 14)),
      mat(new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.78 })),
    );
    pot.position.y = 0.26;
    pot.castShadow = true;
    const soil = new THREE.Mesh(
      geo(new THREE.CylinderGeometry(0.33, 0.33, 0.06, 12)),
      mat(new THREE.MeshStandardMaterial({ color: 0x3f2e21, roughness: 0.95 })),
    );
    soil.position.y = 0.5;
    const leafMat = mat(new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.62 }));
    plant.add(pot, soil);
    for (let i = 0; i < 6; i++) {
      const ang = (i * Math.PI * 2) / 6;
      const stem = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.025, 0.03, 0.85, 6)), leafMat);
      stem.position.set(Math.cos(ang) * 0.16, 0.88, Math.sin(ang) * 0.16);
      stem.rotation.z = -Math.cos(ang) * 0.35;
      stem.rotation.x = Math.sin(ang) * 0.35;
      const frond = new THREE.Mesh(geo(new THREE.BoxGeometry(0.28, 0.04, 0.58)), leafMat);
      frond.position.set(Math.cos(ang) * 0.42, 1.24, Math.sin(ang) * 0.42);
      frond.rotation.y = -ang + Math.PI / 2;
      frond.rotation.x = 0.28;
      plant.add(stem, frond);
    }
    plant.scale.setScalar(scale);
    plant.position.set(x, 0, z);
    scene.add(plant);
  };
  buildPlant(-9.8, -7.8, 1.1);
  buildPlant(9.8, -7.8, 1.05);
  buildPlant(-3.8, -10.3, 0.95);
  buildPlant(3.8, -10.3, 0.95);

  // Standing Floor Lamp beside Workstation
  const floorLamp = new THREE.Group();
  const lampBase = new THREE.Mesh(
    geo(new THREE.CylinderGeometry(0.32, 0.36, 0.08, 16)),
    mat(new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.25 })),
  );
  lampBase.position.y = 0.04;
  const lampPole = new THREE.Mesh(
    geo(new THREE.CylinderGeometry(0.035, 0.04, 2.2, 10)),
    mat(new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.75, roughness: 0.25 })),
  );
  lampPole.position.y = 1.14;
  const lampShade = new THREE.Mesh(
    geo(new THREE.CylinderGeometry(0.26, 0.42, 0.48, 16)),
    mat(
      new THREE.MeshStandardMaterial({
        color: 0xfef3c7,
        emissive: 0xfde68a,
        emissiveIntensity: 0.55,
        roughness: 0.7,
      }),
    ),
  );
  lampShade.position.y = 2.25;
  floorLamp.add(lampBase, lampPole, lampShade);
  floorLamp.position.set(-9.4, 0, -5.6);
  scene.add(floorLamp);

  // 4. Four Composite Multi-Part Interactive Hardware Stations
  const stations: InteractiveStation[] = [];
  const metalMat = mat(
    new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.82, roughness: 0.24 }),
  );
  const darkTechMat = mat(
    new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.42, metalness: 0.35 }),
  );
  const deskWoodMat = mat(new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.62 }));

  const routerLedMat = mat(
    new THREE.MeshStandardMaterial({
      color: 0xf43f5e,
      emissive: 0xe11d48,
      emissiveIntensity: 0.9,
    }),
  );
  const tvHotspotLedMat = mat(
    new THREE.MeshStandardMaterial({
      color: 0xf43f5e,
      emissive: 0xe11d48,
      emissiveIntensity: 0.95,
    }),
  );

  const registerStationMesh = (
    id: DataDetectiveStationId,
    x: number,
    z: number,
    label: { en: string; bn: string },
    obsHalfW: number,
    obsHalfD: number,
  ) => {
    const ring = new THREE.Mesh(
      geo(new THREE.RingGeometry(1.45, 1.78, 32)),
      mat(new THREE.MeshBasicMaterial({ color: 0xfbbf24, side: THREE.DoubleSide })),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(x, 0.06, z);
    scene.add(ring);

    const hit = new THREE.Mesh(
      geo(new THREE.CylinderGeometry(1.65, 1.65, 2.4, 14)),
      mat(new THREE.MeshBasicMaterial({ visible: false })),
    );
    hit.position.set(x, 1.2, z);
    scene.add(hit);

    obstacles.push({
      minX: x - obsHalfW,
      maxX: x + obsHalfW,
      minZ: z - obsHalfD,
      maxZ: z + obsHalfD,
      maxY: 1.8,
      label,
    });

    stations.push({
      id,
      label,
      position: new THREE.Vector3(x, 0, z),
      state: "idle",
      hitMesh: hit,
      ringMesh: ring,
    });
  };

  // Station A: Desk Smartphone Rig (x = -6.8, z = 3.2)
  const phoneDesk = new THREE.Group();
  const pTop = new THREE.Mesh(geo(new THREE.BoxGeometry(2.3, 0.12, 1.45)), deskWoodMat);
  pTop.position.y = 0.92;
  pTop.castShadow = true;
  phoneDesk.add(pTop);
  [-1.02, 1.02].forEach((lx) => {
    [-0.58, 0.58].forEach((lz) => {
      const leg = new THREE.Mesh(geo(new THREE.BoxGeometry(0.1, 0.9, 0.1)), darkTechMat);
      leg.position.set(lx, 0.45, lz);
      leg.castShadow = true;
      phoneDesk.add(leg);
    });
  });
  const phoneStand = new THREE.Mesh(geo(new THREE.BoxGeometry(0.45, 0.25, 0.35)), metalMat);
  phoneStand.position.set(-0.2, 1.1, 0);
  const phoneBody = new THREE.Mesh(geo(new THREE.BoxGeometry(0.42, 0.72, 0.08)), darkTechMat);
  phoneBody.position.set(-0.2, 1.38, 0.02);
  phoneBody.rotation.x = -0.22;
  const phoneScreen = new THREE.Mesh(
    geo(new THREE.PlaneGeometry(0.36, 0.62)),
    mat(
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 0.75,
      }),
    ),
  );
  phoneScreen.position.set(-0.2, 1.38, 0.065);
  phoneScreen.rotation.x = -0.22;
  const mug = new THREE.Mesh(
    geo(new THREE.CylinderGeometry(0.12, 0.11, 0.22, 12)),
    mat(new THREE.MeshStandardMaterial({ color: 0xf43f5e, roughness: 0.4 })),
  );
  mug.position.set(0.65, 1.09, 0.2);
  const notebook = new THREE.Mesh(
    geo(new THREE.BoxGeometry(0.62, 0.05, 0.8)),
    mat(new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.85 })),
  );
  notebook.position.set(0.45, 1.0, -0.15);
  phoneDesk.add(phoneStand, phoneBody, phoneScreen, mug, notebook);
  phoneDesk.position.set(-6.8, 0, 3.2);
  scene.add(phoneDesk);
  registerStationMesh(
    "phone",
    -6.8,
    3.2,
    { en: "Desk Smartphone & Hotspot", bn: "ডেস্ক স্মার্টফোন ও হটস্পট" },
    1.15,
    0.75,
  );

  // Station B: Dual-Monitor Telemetry Workstation (x = -5.8, z = -4.8)
  const workDesk = new THREE.Group();
  const wTop = new THREE.Mesh(geo(new THREE.BoxGeometry(2.8, 0.12, 1.5)), deskWoodMat);
  wTop.position.y = 0.94;
  wTop.castShadow = true;
  workDesk.add(wTop);
  [-1.25, 1.25].forEach((lx) => {
    [-0.6, 0.6].forEach((lz) => {
      const leg = new THREE.Mesh(geo(new THREE.BoxGeometry(0.1, 0.92, 0.1)), darkTechMat);
      leg.position.set(lx, 0.46, lz);
      leg.castShadow = true;
      workDesk.add(leg);
    });
  });
  const monStand = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.06, 0.12, 0.55, 10)), metalMat);
  monStand.position.set(0, 1.24, -0.35);
  const monL = new THREE.Mesh(geo(new THREE.BoxGeometry(1.12, 0.68, 0.08)), darkTechMat);
  monL.position.set(-0.58, 1.48, -0.28);
  monL.rotation.y = 0.18;
  const screenL = new THREE.Mesh(
    geo(new THREE.PlaneGeometry(1.02, 0.58)),
    mat(
      new THREE.MeshStandardMaterial({
        map: monitorTex,
        emissive: 0x0f172a,
        emissiveIntensity: 0.4,
      }),
    ),
  );
  screenL.position.set(-0.58, 1.48, -0.235);
  screenL.rotation.y = 0.18;
  const monR = new THREE.Mesh(geo(new THREE.BoxGeometry(1.12, 0.68, 0.08)), darkTechMat);
  monR.position.set(0.58, 1.48, -0.28);
  monR.rotation.y = -0.18;
  const screenR = screenL.clone();
  screenR.position.set(0.58, 1.48, -0.235);
  screenR.rotation.y = -0.18;
  const keyboard = new THREE.Mesh(geo(new THREE.BoxGeometry(0.86, 0.04, 0.3)), darkTechMat);
  keyboard.position.set(-0.1, 1.02, 0.25);
  const pcTower = new THREE.Mesh(geo(new THREE.BoxGeometry(0.45, 0.78, 0.72)), darkTechMat);
  pcTower.position.set(1.08, 1.38, -0.1);
  workDesk.add(monStand, monL, screenL, monR, screenR, keyboard, pcTower);
  workDesk.position.set(-5.8, 0, -4.8);
  scene.add(workDesk);
  registerStationMesh(
    "monitor",
    -5.8,
    -4.8,
    { en: "Telemetry Workstation", bn: "টেলিমেট্রি ওয়ার্কস্টেশন" },
    1.4,
    0.75,
  );

  // Station C: 4-Antenna Wi-Fi Fiber Router Hub (x = 5.8, z = -4.8)
  const routerCabinet = new THREE.Group();
  const cabBody = new THREE.Mesh(
    geo(new THREE.BoxGeometry(2.1, 1.0, 1.1)),
    mat(new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.55 })),
  );
  cabBody.position.y = 0.5;
  cabBody.castShadow = true;
  const routerBox = new THREE.Mesh(geo(new THREE.BoxGeometry(1.15, 0.2, 0.65)), darkTechMat);
  routerBox.position.set(0, 1.1, 0);
  const routerLedBar = new THREE.Mesh(geo(new THREE.BoxGeometry(0.85, 0.045, 0.04)), routerLedMat);
  routerLedBar.position.set(0, 1.12, 0.33);
  [-0.45, -0.16, 0.16, 0.45].forEach((ax) => {
    const ant = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.025, 0.035, 0.68, 8)), metalMat);
    ant.position.set(ax, 1.48, -0.22);
    ant.rotation.x = -0.14;
    routerCabinet.add(ant);
  });
  const fiberOnt = new THREE.Mesh(geo(new THREE.BoxGeometry(0.42, 0.12, 0.35)), whiteTrimMat);
  fiberOnt.position.set(0.75, 1.06, 0.12);
  routerCabinet.add(cabBody, routerBox, routerLedBar, fiberOnt);
  routerCabinet.position.set(5.8, 0, -4.8);
  scene.add(routerCabinet);
  registerStationMesh(
    "router",
    5.8,
    -4.8,
    { en: "Wi-Fi Fiber Router Hub", bn: "ওয়াই-ফাই ফাইবার রাউটার হাব" },
    1.05,
    0.58,
  );

  // Station D: Smart TV & Hotspot Corner (x = 6.8, z = 3.2)
  const tvCorner = new THREE.Group();
  const mediaConsole = new THREE.Mesh(geo(new THREE.BoxGeometry(2.5, 0.72, 1.1)), deskWoodMat);
  mediaConsole.position.y = 0.36;
  mediaConsole.castShadow = true;
  const tvStand = new THREE.Mesh(geo(new THREE.BoxGeometry(0.6, 0.25, 0.35)), metalMat);
  tvStand.position.set(0, 0.85, -0.1);
  const tvBezel = new THREE.Mesh(geo(new THREE.BoxGeometry(2.1, 1.25, 0.1)), darkTechMat);
  tvBezel.position.set(0, 1.56, -0.12);
  tvBezel.castShadow = true;
  const tvScreen = new THREE.Mesh(
    geo(new THREE.PlaneGeometry(1.94, 1.1)),
    mat(
      new THREE.MeshStandardMaterial({ map: tvTex, emissive: 0x1e1b4b, emissiveIntensity: 0.45 }),
    ),
  );
  tvScreen.position.set(0, 1.56, -0.06);
  const soundbar = new THREE.Mesh(geo(new THREE.BoxGeometry(1.4, 0.12, 0.18)), darkTechMat);
  soundbar.position.set(0, 0.78, 0.22);
  const dongle = new THREE.Mesh(geo(new THREE.BoxGeometry(0.28, 0.1, 0.42)), whiteTrimMat);
  dongle.position.set(0.9, 0.77, 0.24);
  const dongleLed = new THREE.Mesh(geo(new THREE.SphereGeometry(0.055, 10, 8)), tvHotspotLedMat);
  dongleLed.position.set(0.9, 0.84, 0.34);
  tvCorner.add(mediaConsole, tvStand, tvBezel, tvScreen, soundbar, dongle, dongleLed);
  tvCorner.position.set(6.8, 0, 3.2);
  scene.add(tvCorner);
  registerStationMesh(
    "tv",
    6.8,
    3.2,
    { en: "Smart TV & Hotspot Corner", bn: "স্মার্ট টিভি ও হটস্পট কর্নার" },
    1.25,
    0.58,
  );

  // 5. Floating Overhead Data-Drain Cubes & Fiber Throughput Pulses
  const packetCubes: THREE.Mesh[] = [];
  for (let i = 0; i < 10; i++) {
    const cube = new THREE.Mesh(
      geo(new THREE.BoxGeometry(0.42, 0.42, 0.42)),
      mat(
        new THREE.MeshStandardMaterial({
          color: 0xf43f5e,
          emissive: 0xe11d48,
          emissiveIntensity: 0.7,
          roughness: 0.25,
        }),
      ),
    );
    cube.position.set(-4.5 + i * 1.0, 3.05, -0.2);
    scene.add(cube);
    packetCubes.push(cube);
  }

  const fiberPulses: {
    mesh: THREE.Mesh;
    start: THREE.Vector3;
    end: THREE.Vector3;
    phase: number;
  }[] = [];
  const routerOrigin = new THREE.Vector3(5.8, 1.35, -4.8);
  const targets = [new THREE.Vector3(-5.8, 1.45, -4.8), new THREE.Vector3(-6.8, 1.35, 3.2)];
  targets.forEach((endPos, tIdx) => {
    for (let k = 0; k < 4; k++) {
      const pulse = new THREE.Mesh(
        geo(new THREE.SphereGeometry(0.11, 10, 8)),
        mat(
          new THREE.MeshStandardMaterial({
            color: 0xf59e0b,
            emissive: 0xf59e0b,
            emissiveIntensity: 0.9,
          }),
        ),
      );
      scene.add(pulse);
      fiberPulses.push({
        mesh: pulse,
        start: routerOrigin,
        end: endPos,
        phase: k * 0.25 + tIdx * 0.12,
      });
    }
  });

  return {
    stations,
    obstacles,
    packetCubes,
    fiberPulses,
    routerLedMat,
    tvHotspotLedMat,
    fanBladeGroup,
    dispose: () => {
      for (const d of disposables) {
        d.dispose();
      }
    },
  };
}
