import * as THREE from "three";

export function makeSignTexture(
  text: string,
  subtext: string,
  bgColor = "#9f1239",
  borderColor = "#fbbf24",
  maxAnisotropy = 4,
): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 160;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, 512, 160);
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 8;
  ctx.strokeRect(8, 8, 496, 144);

  ctx.fillStyle = "#ffffff";
  ctx.font = 'bold 38px "Hind Siliguri", sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 256, 62);

  if (subtext) {
    ctx.fillStyle = borderColor;
    ctx.font = 'bold 22px "Hind Siliguri", monospace';
    ctx.fillText(subtext, 256, 114);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function makeAsphaltTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#272c36";
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 1800; i++) {
    ctx.fillStyle = i % 2 === 0 ? "rgba(255,255,255,0.035)" : "rgba(0,0,0,0.09)";
    ctx.fillRect((i * 89) % 512, (i * 151) % 512, 2, 2);
  }
  ctx.fillStyle = "#f59e0b";
  ctx.fillRect(16, 0, 10, 512);
  ctx.fillRect(486, 0, 10, 512);
  ctx.fillStyle = "#f8fafc";
  for (let y = 18; y < 512; y += 64) {
    ctx.fillRect(251, y, 10, 34);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function makeRoofTileTexture(baseHex = "#cbd5e1", lineHex = "#94a3b8"): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = lineHex;
  ctx.lineWidth = 2;
  for (let i = 0; i <= 256; i += 32) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 256);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(256, i);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/** Composite 8-part Bangladeshi Shopfront Building with awning, parapet, water tank, & Bangla sign */
export function createChattogramShopBuilding(opts: {
  width: number;
  height: number;
  depth: number;
  wallColor: number;
  awningColor: number;
  signText: string;
  signSubtext?: string;
  signBg?: string;
  tankColor?: number;
  maxAnisotropy?: number;
}): THREE.Group {
  const g = new THREE.Group();
  const {
    width,
    height,
    depth,
    wallColor,
    awningColor,
    signText,
    signSubtext = "",
    signBg = "#9f1239",
  } = opts;

  const plinthMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.88 });
  const wallMat = new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.72 });
  const trimMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.6,
    metalness: 0.2,
  });
  const shutterMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    roughness: 0.45,
    metalness: 0.45,
  });
  const awningMat = new THREE.MeshStandardMaterial({
    color: awningColor,
    roughness: 0.5,
    metalness: 0.2,
  });
  const tankMat = new THREE.MeshStandardMaterial({
    color: opts.tankColor ?? 0x0284c7,
    roughness: 0.35,
  });

  // 1. Concrete plinth
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(width + 0.3, 0.28, depth + 0.3), plinthMat);
  plinth.position.y = 0.14;
  plinth.receiveShadow = true;
  g.add(plinth);

  // 2. Main building shell
  const body = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), wallMat);
  body.position.y = 0.28 + height / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);

  // 3. Recessed shop shutter bay on front (+Z)
  const shutter = new THREE.Mesh(
    new THREE.BoxGeometry(width * 0.68, Math.min(2.1, height * 0.42), 0.14),
    shutterMat,
  );
  shutter.position.set(0, 0.28 + Math.min(1.05, height * 0.21), depth / 2 + 0.02);
  g.add(shutter);

  // 4. Sloped corrugated awning
  const awning = new THREE.Mesh(new THREE.BoxGeometry(width * 0.86, 0.1, 1.05), awningMat);
  awning.position.set(0, 2.55, depth / 2 + 0.46);
  awning.rotation.x = 0.24;
  awning.castShadow = true;
  g.add(awning);

  // 5. Bangla Signboard
  const signTex = makeSignTexture(
    signText,
    signSubtext,
    signBg,
    "#fbbf24",
    opts.maxAnisotropy ?? 4,
  );
  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(Math.min(width * 0.9, 4.2), 0.96, 0.14),
    new THREE.MeshBasicMaterial({ map: signTex }),
  );
  sign.position.set(0, Math.min(3.35, height - 0.3), depth / 2 + 0.12);
  g.add(sign);

  // 6. Upper windows
  if (height > 4.2) {
    const winMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.2,
      metalness: 0.7,
    });
    [-width * 0.26, width * 0.26].forEach((wx) => {
      const win = new THREE.Mesh(new THREE.BoxGeometry(width * 0.2, 0.75, 0.1), winMat);
      win.position.set(wx, height - 1.1, depth / 2 + 0.03);
      g.add(win);
    });
  }

  // 7. Rooftop parapet rim
  const parapet = new THREE.Mesh(new THREE.BoxGeometry(width + 0.16, 0.32, depth + 0.16), trimMat);
  parapet.position.y = 0.28 + height + 0.16;
  g.add(parapet);

  // 8. Ribbed rooftop overhead water tank (LatheGeometry)
  const tankPts = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(0.46, 0),
    new THREE.Vector2(0.48, 0.85),
    new THREE.Vector2(0.42, 0.98),
    new THREE.Vector2(0.22, 1.08),
    new THREE.Vector2(0, 1.08),
  ];
  const tank = new THREE.Mesh(new THREE.LatheGeometry(tankPts, 16), tankMat);
  tank.position.set(width * 0.24, 0.28 + height + 0.3, -depth * 0.2);
  tank.castShadow = true;
  g.add(tank);

  return g;
}

/** Composite Robi Sheba 121 Field Kiosk */
export function createRobiShebaKiosk(maxAnisotropy = 4): THREE.Group {
  const g = new THREE.Group();

  const plinthMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 });
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35 });
  const crimsonMat = new THREE.MeshStandardMaterial({
    color: 0xe11d48,
    roughness: 0.35,
    metalness: 0.15,
  });
  const screenMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.8,
    roughness: 0.2,
  });

  const base = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.24, 2.6), plinthMat);
  base.position.y = 0.12;
  g.add(base);

  const counter = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.15, 1.5), whiteMat);
  counter.position.set(0, 0.8, -0.2);
  counter.castShadow = true;
  g.add(counter);

  const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.84, 0.25, 1.54), crimsonMat);
  stripe.position.set(0, 0.95, -0.2);
  g.add(stripe);

  [-1.25, 1.25].forEach((px) => {
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.5, 10), crimsonMat);
    pillar.position.set(px, 1.45, 0.35);
    g.add(pillar);
  });

  const canopy = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.26, 2.2), crimsonMat);
  canopy.position.set(0, 2.75, 0);
  canopy.castShadow = true;
  g.add(canopy);

  const signTex = makeSignTexture(
    "রবি সেবা কেন্দ্র",
    "HELPLINE 121 · MY ROBI",
    "#881337",
    "#fef08a",
    maxAnisotropy,
  );
  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(2.7, 0.72, 0.12),
    new THREE.MeshBasicMaterial({ map: signTex }),
  );
  sign.position.set(0, 2.95, 1.05);
  g.add(sign);

  const screen = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.55, 0.08), screenMat);
  screen.position.set(0, 1.65, 0.35);
  screen.rotation.x = -0.22;
  g.add(screen);

  return g;
}

/** Composite Street Fiber Junction Cabinet with conduit pipes */
export function createStreetJunctionCabinet(): { group: THREE.Group; statusLed: THREE.Mesh } {
  const g = new THREE.Group();
  const padMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.85 });
  const boxMat = new THREE.MeshStandardMaterial({
    color: 0xdbeafe,
    roughness: 0.45,
    metalness: 0.3,
  });
  const doorMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    roughness: 0.4,
    metalness: 0.4,
  });
  const conduitMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.5 });

  const pad = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.22, 1.3), padMat);
  pad.position.y = 0.11;
  g.add(pad);

  const cabinet = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.65, 0.8), boxMat);
  cabinet.position.y = 1.04;
  cabinet.castShadow = true;
  g.add(cabinet);

  const door = new THREE.Mesh(new THREE.BoxGeometry(0.98, 1.35, 0.08), doorMat);
  door.position.set(0, 1.02, 0.42);
  g.add(door);

  // Curved armored fiber conduit entering side
  const conduitCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.75, 0.15, 0),
    new THREE.Vector3(-0.75, 0.85, 0),
    new THREE.Vector3(-0.55, 1.05, 0),
  ]);
  const conduit = new THREE.Mesh(
    new THREE.TubeGeometry(conduitCurve, 12, 0.06, 8, false),
    conduitMat,
  );
  g.add(conduit);

  const statusLed = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 12, 10),
    new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x10b981, emissiveIntensity: 1.4 }),
  );
  statusLed.position.set(0, 1.98, 0.2);
  g.add(statusLed);

  return { group: g, statusLed };
}

/** Composite Hilltop Lattice Macro Tower with directional swiveling RF cone */
export function createHilltopMacroTower(): {
  group: THREE.Group;
  sectorHead: THREE.Group;
  beamCone: THREE.Mesh;
  beacon: THREE.Mesh;
} {
  const g = new THREE.Group();
  const steelMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.65,
    roughness: 0.35,
  });
  const redSteelMat = new THREE.MeshStandardMaterial({
    color: 0xe11d48,
    metalness: 0.45,
    roughness: 0.4,
  });
  const antennaMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.25 });

  // Base pad
  const pad = new THREE.Mesh(
    new THREE.CylinderGeometry(1.75, 2.0, 0.4, 8),
    new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.85 }),
  );
  pad.position.y = 0.2;
  g.add(pad);

  // 4 tapered lattice legs
  const legGeo = new THREE.CylinderGeometry(0.08, 0.14, 9.2, 8);
  [
    [-0.75, -0.75, 0.08, -0.08],
    [0.75, -0.75, 0.08, 0.08],
    [-0.75, 0.75, -0.08, -0.08],
    [0.75, 0.75, -0.08, 0.08],
  ].forEach(([lx, lz, rx, rz], i) => {
    const leg = new THREE.Mesh(legGeo, i % 2 === 0 ? steelMat : redSteelMat);
    leg.position.set(lx * 0.65, 4.7, lz * 0.65);
    leg.rotation.set(rx, 0, rz);
    leg.castShadow = true;
    g.add(leg);
  });

  // Cross rings
  [2.2, 4.5, 6.8, 8.8].forEach((ry, idx) => {
    const s = 1.6 - idx * 0.26;
    const collar = new THREE.Mesh(new THREE.BoxGeometry(s, 0.14, s), steelMat);
    collar.position.y = ry;
    g.add(collar);
  });

  // Rotatable Sector Head
  const sectorHead = new THREE.Group();
  sectorHead.position.y = 9.0;

  for (let i = 0; i < 3; i++) {
    const angle = (i * Math.PI * 2) / 3;
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.32, 1.35, 0.16), antennaMat);
    panel.position.set(Math.sin(angle) * 0.72, 0, Math.cos(angle) * 0.72);
    panel.rotation.y = angle;
    sectorHead.add(panel);
  }

  // Parabolic microwave drum (LatheGeometry)
  const dishPts = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(0.45, 0.12),
    new THREE.Vector2(0.55, 0.26),
    new THREE.Vector2(0.5, 0.28),
  ];
  const dish = new THREE.Mesh(new THREE.LatheGeometry(dishPts, 16), antennaMat);
  dish.rotation.x = Math.PI / 2;
  dish.position.set(0, -0.5, 0.75);
  sectorHead.add(dish);

  // Translucent Directional Signal Cone
  const beamGeo = new THREE.ConeGeometry(5.8, 17, 24, 1, true);
  beamGeo.translate(0, -8.5, 0);
  beamGeo.rotateX(Math.PI / 2);
  const beamCone = new THREE.Mesh(
    beamGeo,
    new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  beamCone.position.set(0, -0.2, 0.5);
  beamCone.rotation.x = 0.28;
  sectorHead.add(beamCone);

  g.add(sectorHead);

  const beacon = new THREE.Mesh(
    new THREE.SphereGeometry(0.24, 12, 10),
    new THREE.MeshStandardMaterial({ color: 0xf43f5e, emissive: 0xe11d48, emissiveIntensity: 1.8 }),
  );
  beacon.position.y = 10.1;
  g.add(beacon);

  return { group: g, sectorHead, beamCone, beacon };
}

/** Composite Rooftop Relay Tripod for Game 2 */
export function createRooftopRelayTripod(accentHex = 0x38bdf8): {
  group: THREE.Group;
  mastGroup: THREE.Group;
  dishHead: THREE.Group;
  dirPointer: THREE.Mesh;
  statusHalo: THREE.Mesh;
} {
  const g = new THREE.Group();
  const metalMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    metalness: 0.6,
    roughness: 0.35,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: accentHex,
    emissive: accentHex,
    emissiveIntensity: 0.45,
    roughness: 0.3,
  });
  const dishMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.25,
    metalness: 0.2,
  });

  // 3 splayed tripod legs
  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI * 2) / 3;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.35, 8), metalMat);
    leg.position.set(Math.sin(a) * 0.42, 0.58, Math.cos(a) * 0.42);
    leg.rotation.order = "YXZ";
    leg.rotation.y = a;
    leg.rotation.x = -0.34;
    leg.castShadow = true;
    g.add(leg);
  }

  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.32, 0.24, 12), metalMat);
  hub.position.y = 1.1;
  g.add(hub);

  const mastGroup = new THREE.Group();
  mastGroup.position.y = 1.15;

  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.5, 10), metalMat);
  pole.position.y = 0.75;
  mastGroup.add(pole);

  const dishHead = new THREE.Group();
  dishHead.position.y = 1.5;

  const dishPts = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(0.42, 0.09),
    new THREE.Vector2(0.56, 0.26),
  ];
  const dish = new THREE.Mesh(new THREE.LatheGeometry(dishPts, 18), dishMat);
  dish.rotation.x = Math.PI / 2;
  dishHead.add(dish);

  const feedHorn = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 0.42, 8), accentMat);
  feedHorn.rotation.x = Math.PI / 2;
  feedHorn.position.z = 0.26;
  dishHead.add(feedHorn);

  const beaconCap = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 10), accentMat);
  beaconCap.position.y = 0.52;
  dishHead.add(beaconCap);

  mastGroup.add(dishHead);
  g.add(mastGroup);

  // Direction indicator wedge on floor showing dish heading clearly
  const dirPointer = new THREE.Mesh(
    new THREE.ConeGeometry(0.28, 0.65, 3),
    new THREE.MeshBasicMaterial({ color: accentHex }),
  );
  dirPointer.rotation.x = Math.PI / 2;
  dirPointer.position.set(0, 0.14, 1.15);
  dishHead.add(dirPointer);

  const statusHalo = new THREE.Mesh(
    new THREE.RingGeometry(0.88, 1.08, 28),
    new THREE.MeshBasicMaterial({ color: accentHex, side: THREE.DoubleSide }),
  );
  statusHalo.rotation.x = -Math.PI / 2;
  statusHalo.position.y = 0.05;
  g.add(statusHalo);

  return { group: g, mastGroup, dishHead, dirPointer, statusHalo };
}

/** Composite Rooftop Water Tank Tower Obstacle */
export function createRooftopWaterTankObstacle(): THREE.Group {
  const g = new THREE.Group();
  const steelMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    metalness: 0.5,
    roughness: 0.5,
  });
  const tankMat = new THREE.MeshStandardMaterial({ color: 0x0369a1, roughness: 0.35 });

  [
    [-1.1, -1.1],
    [1.1, -1.1],
    [-1.1, 1.1],
    [1.1, 1.1],
  ].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.22, 2.1, 0.22), steelMat);
    leg.position.set(lx, 1.05, lz);
    leg.castShadow = true;
    g.add(leg);
  });

  const deck = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.22, 2.8), steelMat);
  deck.position.y = 2.15;
  g.add(deck);

  const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.18, 1.18, 2.2, 16), tankMat);
  tank.position.y = 3.35;
  tank.castShadow = true;
  g.add(tank);

  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, 0.24, 12), steelMat);
  cap.position.y = 4.55;
  g.add(cap);

  return g;
}

/** Composite Corrugated Port Shipping Container */
export function createShippingContainer(colorHex: number, length = 5.4): THREE.Group {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({
    color: colorHex,
    roughness: 0.55,
    metalness: 0.2,
  });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.6 });

  const box = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.4, length), bodyMat);
  box.position.y = 1.2;
  box.castShadow = true;
  box.receiveShadow = true;
  g.add(box);

  // Ribbed side bands
  const ribCount = Math.max(3, Math.floor(length / 0.8));
  for (let i = 0; i < ribCount; i++) {
    const rz = -length / 2 + 0.45 + i * ((length - 0.9) / Math.max(1, ribCount - 1));
    const rib = new THREE.Mesh(new THREE.BoxGeometry(2.48, 2.2, 0.14), bodyMat);
    rib.position.set(0, 1.2, rz);
    g.add(rib);
  }

  const endFrame = new THREE.Mesh(new THREE.BoxGeometry(2.46, 2.44, 0.16), trimMat);
  endFrame.position.set(0, 1.2, length / 2 - 0.08);
  g.add(endFrame);

  return g;
}

/** Composite Port Gantry Crane with animated spreader cargo hook */
export function createPortGantryCrane(accentHex = 0xe11d48): {
  group: THREE.Group;
  trolley: THREE.Group;
} {
  const g = new THREE.Group();
  const frameMat = new THREE.MeshStandardMaterial({
    color: accentHex,
    roughness: 0.45,
    metalness: 0.35,
  });
  const darkMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.6,
    metalness: 0.5,
  });
  const cargoMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.5 });

  // Four gantry legs straddling pier
  [
    [-8.5, -1.6],
    [-8.5, 1.6],
    [8.5, -1.6],
    [8.5, 1.6],
  ].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.7, 9.4, 0.7), frameMat);
    leg.position.set(lx, 4.7, lz);
    leg.castShadow = true;
    g.add(leg);
  });

  // Top horizontal cantilever beam
  const beam = new THREE.Mesh(new THREE.BoxGeometry(20.5, 0.9, 2.6), frameMat);
  beam.position.set(1.0, 9.4, 0);
  beam.castShadow = true;
  g.add(beam);

  // Moving trolley + dangling container cargo hazard
  const trolley = new THREE.Group();
  trolley.position.set(0, 8.85, 0);

  const carriage = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.5, 2.2), darkMat);
  trolley.add(carriage);

  const cable1 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 5.2, 6), darkMat);
  cable1.position.set(-0.7, -2.7, 0);
  const cable2 = cable1.clone();
  cable2.position.x = 0.7;
  trolley.add(cable1, cable2);

  const crate = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.65, 2.1), cargoMat);
  crate.position.set(0, -5.85, 0);
  crate.castShadow = true;
  trolley.add(crate);

  g.add(trolley);
  return { group: g, trolley };
}

/** Composite Port Cargo Lorry / Truck */
export function createCargoLorry(containerColor = 0x0284c7): THREE.Group {
  const g = new THREE.Group();
  const cabMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35 });
  const trailerMat = new THREE.MeshStandardMaterial({ color: containerColor, roughness: 0.5 });
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.9 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.15,
    metalness: 0.8,
  });

  const trailer = new THREE.Mesh(new THREE.BoxGeometry(2.15, 2.1, 4.3), trailerMat);
  trailer.position.set(0, 1.55, -0.8);
  trailer.castShadow = true;
  g.add(trailer);

  const cab = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.7, 1.5), cabMat);
  cab.position.set(0, 1.25, 2.25);
  cab.castShadow = true;
  g.add(cab);

  const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.65, 0.1), glassMat);
  windshield.position.set(0, 1.58, 3.01);
  g.add(windshield);

  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.32, 14);
  wheelGeo.rotateZ(Math.PI / 2);
  [
    [-1.02, 2.25],
    [1.02, 2.25],
    [-1.02, -0.35],
    [1.02, -0.35],
    [-1.02, -2.2],
    [1.02, -2.2],
  ].forEach(([wx, wz]) => {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.position.set(wx, 0.42, wz);
    g.add(w);
  });

  return g;
}

/** Composite Packet Carrier Drone for Harbour Packet Chase */
export function createPacketDrone(): {
  group: THREE.Group;
  coreMesh: THREE.Mesh;
  rotors: THREE.Mesh[];
} {
  const g = new THREE.Group();
  const shellMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.25,
    metalness: 0.35,
  });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0xe11d48, roughness: 0.35 });
  const coreMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 1.25,
    roughness: 0.15,
  });
  const rotorMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.2 });

  const hull = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.48, 2.1), shellMat);
  hull.position.y = 0.72;
  hull.castShadow = true;
  g.add(hull);

  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.65, 1.0, 4), trimMat);
  nose.rotation.x = -Math.PI / 2;
  nose.rotation.y = Math.PI / 4;
  nose.position.set(0, 0.72, -1.45);
  g.add(nose);

  const coreMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 1), coreMat);
  coreMesh.position.set(0, 1.15, 0.1);
  g.add(coreMesh);

  const rotors: THREE.Mesh[] = [];
  const armOffsets: [number, number][] = [
    [-0.92, -0.75],
    [0.92, -0.75],
    [-0.92, 0.75],
    [0.92, 0.75],
  ];
  armOffsets.forEach(([ax, az]) => {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.12, 0.14), trimMat);
    arm.position.set(ax * 0.75, 0.72, az);
    g.add(arm);

    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.04, 0.12), rotorMat);
    blade.position.set(ax, 0.85, az);
    g.add(blade);
    rotors.push(blade);
  });

  const shadowRing = new THREE.Mesh(
    new THREE.RingGeometry(0.75, 0.95, 24),
    new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.65,
    }),
  );
  shadowRing.rotation.x = -Math.PI / 2;
  shadowRing.position.y = 0.05;
  g.add(shadowRing);

  return { group: g, coreMesh, rotors };
}

/** Harbour Gateway Finish Arch */
export function createHarbourGateway(maxAnisotropy = 4): THREE.Group {
  const g = new THREE.Group();
  const pylonMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.4,
    metalness: 0.5,
  });
  const beamMat = new THREE.MeshStandardMaterial({
    color: 0x10b981,
    emissive: 0x10b981,
    emissiveIntensity: 1.1,
  });

  [-6.2, 6.2].forEach((px) => {
    const pylon = new THREE.Mesh(new THREE.BoxGeometry(1.4, 7.5, 1.8), pylonMat);
    pylon.position.set(px, 3.75, 0);
    pylon.castShadow = true;
    g.add(pylon);
  });

  const arch = new THREE.Mesh(new THREE.BoxGeometry(13.8, 1.25, 1.8), pylonMat);
  arch.position.set(0, 7.3, 0);
  g.add(arch);

  const gateStrip = new THREE.Mesh(new THREE.BoxGeometry(11.6, 0.28, 0.3), beamMat);
  gateStrip.position.set(0, 6.45, 0);
  g.add(gateStrip);

  const tex = makeSignTexture(
    "চট্টগ্রাম বন্দর গেটওয়ে",
    "HARBOUR FIBER GATEWAY",
    "#065f46",
    "#a7f3d0",
    maxAnisotropy,
  );
  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(8.2, 1.35, 0.2),
    new THREE.MeshBasicMaterial({ map: tex }),
  );
  sign.position.set(0, 7.35, 0.98);
  g.add(sign);

  return g;
}
