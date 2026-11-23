import * as THREE from "three";

export interface ProceduralTexturePack {
  roadTexture: THREE.CanvasTexture;
  buildingTexture: THREE.CanvasTexture;
  signTextures: THREE.CanvasTexture[];
  dispose: () => void;
}

export function createProceduralTextures(maxAnisotropy: number): ProceduralTexturePack {
  // 1. Road asphalt with lane dashes
  const roadCanvas = document.createElement("canvas");
  roadCanvas.width = 512;
  roadCanvas.height = 512;
  const rctx = roadCanvas.getContext("2d")!;
  rctx.fillStyle = "#262B34";
  rctx.fillRect(0, 0, 512, 512);
  // Subtle aggregate grain
  for (let i = 0; i < 1600; i++) {
    rctx.fillStyle = i % 2 === 0 ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.08)";
    rctx.fillRect((i * 73) % 512, (i * 137) % 512, 2, 2);
  }
  // Yellow edge stripes & white center dashed line
  rctx.fillStyle = "#F59E0B";
  rctx.fillRect(20, 0, 8, 512);
  rctx.fillRect(484, 0, 8, 512);
  rctx.fillStyle = "#F8FAFC";
  for (let y = 16; y < 512; y += 64) {
    rctx.fillRect(252, y, 8, 34);
  }
  const roadTexture = new THREE.CanvasTexture(roadCanvas);
  roadTexture.colorSpace = THREE.SRGBColorSpace;
  roadTexture.wrapS = THREE.RepeatWrapping;
  roadTexture.wrapT = THREE.RepeatWrapping;
  roadTexture.repeat.set(1, 10);
  roadTexture.anisotropy = maxAnisotropy;

  // 2. Building facade texture
  const bCanvas = document.createElement("canvas");
  bCanvas.width = 256;
  bCanvas.height = 256;
  const bctx = bCanvas.getContext("2d")!;
  bctx.fillStyle = "#E2E8F0";
  bctx.fillRect(0, 0, 256, 256);
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 4; col++) {
      const lit = (row * 7 + col * 3) % 5 !== 0;
      bctx.fillStyle = lit ? "#FEF3C7" : "#334155";
      bctx.fillRect(16 + col * 60, 12 + row * 30, 38, 18);
      bctx.strokeStyle = "#94A3B8";
      bctx.lineWidth = 2;
      bctx.strokeRect(16 + col * 60, 12 + row * 30, 38, 18);
    }
  }
  const buildingTexture = new THREE.CanvasTexture(bCanvas);
  buildingTexture.colorSpace = THREE.SRGBColorSpace;
  buildingTexture.wrapS = THREE.RepeatWrapping;
  buildingTexture.wrapT = THREE.RepeatWrapping;
  buildingTexture.anisotropy = maxAnisotropy;

  // 3. Authentic Bangla Shop Signage Textures
  const signLabels = [
    { bg: "#9F1239", accent: "#FBBF24", text: "রবিট্রেইল হাব" },
    { bg: "#065F46", accent: "#A7F3D0", text: "ডিজিটাল সেবা কেন্দ্র" },
    { bg: "#1E3A8A", accent: "#FDE68A", text: "বাংলাদেশ টেলিকম" },
    { bg: "#7C2D12", accent: "#FED7AA", text: "বই ও তথ্য কর্নার" },
  ];

  const signTextures = signLabels.map((item) => {
    const sCanvas = document.createElement("canvas");
    sCanvas.width = 512;
    sCanvas.height = 128;
    const sctx = sCanvas.getContext("2d")!;
    sctx.fillStyle = item.bg;
    sctx.fillRect(0, 0, 512, 128);
    sctx.strokeStyle = item.accent;
    sctx.lineWidth = 6;
    sctx.strokeRect(8, 8, 496, 112);
    sctx.fillStyle = "#FFFFFF";
    sctx.font = 'bold 42px "Hind Siliguri", sans-serif';
    sctx.textAlign = "center";
    sctx.textBaseline = "middle";
    sctx.fillText(item.text, 256, 66);
    const tex = new THREE.CanvasTexture(sCanvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = maxAnisotropy;
    return tex;
  });

  return {
    roadTexture,
    buildingTexture,
    signTextures,
    dispose: () => {
      roadTexture.dispose();
      buildingTexture.dispose();
      signTextures.forEach((t) => t.dispose());
    },
  };
}

// Composite 6-part CNG Auto-Rickshaw (bottom-center pivot)
export function createCngRickshaw(): THREE.Group {
  const group = new THREE.Group();

  const greenBodyMat = new THREE.MeshStandardMaterial({
    color: 0x15803d,
    roughness: 0.35,
    metalness: 0.4,
  });
  const canopyMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.85,
    metalness: 0.05,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    roughness: 0.4,
    metalness: 0.3,
  });
  const wheelMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.9,
    metalness: 0.1,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x93c5fd,
    roughness: 0.1,
    metalness: 0.8,
  });

  // Lower hull
  const hull = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.55, 2.1), greenBodyMat);
  hull.position.set(0, 0.45, 0);
  hull.castShadow = true;
  group.add(hull);

  // Canopy roof
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.72, 1.55), canopyMat);
  canopy.position.set(0, 1.05, -0.15);
  canopy.castShadow = true;
  group.add(canopy);

  // Yellow Bangladeshi CNG stripe
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.12, 2.12), trimMat);
  stripe.position.set(0, 0.65, 0);
  group.add(stripe);

  // Windshield
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.48, 0.08), glassMat);
  windshield.position.set(0, 0.98, 0.65);
  windshield.rotation.x = -0.2;
  group.add(windshield);

  // 3 Wheels
  const wheelGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.14, 14);
  wheelGeo.rotateZ(Math.PI / 2);
  const wFront = new THREE.Mesh(wheelGeo, wheelMat);
  wFront.position.set(0, 0.22, 0.78);
  const wLeft = new THREE.Mesh(wheelGeo, wheelMat);
  wLeft.position.set(-0.56, 0.22, -0.65);
  const wRight = new THREE.Mesh(wheelGeo, wheelMat);
  wRight.position.set(0.56, 0.22, -0.65);
  group.add(wFront, wLeft, wRight);

  // Headlight
  const lamp = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 10, 10),
    new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xfde047, emissiveIntensity: 1.5 }),
  );
  lamp.position.set(0, 0.52, 1.06);
  group.add(lamp);

  return group;
}

// Composite 5-part Cycle Rickshaw
export function createCycleRickshaw(hoodHex = 0xe11d48): THREE.Group {
  const group = new THREE.Group();
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x0f766e,
    roughness: 0.4,
    metalness: 0.6,
  });
  const hoodMat = new THREE.MeshStandardMaterial({
    color: hoodHex,
    roughness: 0.75,
    metalness: 0.05,
  });
  const wheelMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.85,
    metalness: 0.2,
  });

  const seatBase = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.42, 0.95), frameMat);
  seatBase.position.set(0, 0.46, -0.35);
  seatBase.castShadow = true;
  group.add(seatBase);

  const hood = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.75, 0.85), hoodMat);
  hood.position.set(0, 1.02, -0.42);
  hood.castShadow = true;
  group.add(hood);

  const frontStem = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.75, 0.85), frameMat);
  frontStem.position.set(0, 0.6, 0.45);
  group.add(frontStem);

  const wheelGeo = new THREE.TorusGeometry(0.28, 0.04, 8, 16);
  wheelGeo.rotateY(Math.PI / 2);
  const wf = new THREE.Mesh(wheelGeo, wheelMat);
  wf.position.set(0, 0.28, 0.78);
  const wl = new THREE.Mesh(wheelGeo, wheelMat);
  wl.position.set(-0.5, 0.28, -0.45);
  const wr = new THREE.Mesh(wheelGeo, wheelMat);
  wr.position.set(0.5, 0.28, -0.45);
  group.add(wf, wl, wr);

  return group;
}

// Composite 6-part City Bus
export function createCityBus(bodyHex = 0xdc2626): THREE.Group {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({
    color: bodyHex,
    roughness: 0.4,
    metalness: 0.35,
  });
  const roofMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.6,
    metalness: 0.1,
  });
  const winMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.15,
    metalness: 0.85,
  });
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.9 });

  const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.75, 1.65, 5.2), bodyMat);
  chassis.position.set(0, 1.15, 0);
  chassis.castShadow = true;
  group.add(chassis);

  const roofCap = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.18, 4.9), roofMat);
  roofCap.position.set(0, 2.02, 0);
  group.add(roofCap);

  const windows = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.55, 4.6), winMat);
  windows.position.set(0, 1.42, 0.05);
  group.add(windows);

  const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.22, 16);
  wheelGeo.rotateZ(Math.PI / 2);
  [
    [-0.85, 0.36, 1.6],
    [0.85, 0.36, 1.6],
    [-0.85, 0.36, -1.6],
    [0.85, 0.36, -1.6],
  ].forEach(([x, y, z]) => {
    const w = new THREE.Mesh(wheelGeo, tireMat);
    w.position.set(x, y, z);
    group.add(w);
  });

  return group;
}

// Composite 4-part Pedestrian
export function createPedestrian(shirtColor: number): THREE.Group {
  const group = new THREE.Group();
  const shirtMat = new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.75 });
  const pantMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xc68642, roughness: 0.7 });

  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.7, 0.22), pantMat);
  legs.position.set(0, 0.35, 0);
  legs.castShadow = true;
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.62, 0.24), shirtMat);
  torso.position.set(0, 1.0, 0);
  torso.castShadow = true;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 10), skinMat);
  head.position.set(0, 1.48, 0);
  group.add(legs, torso, head);
  return group;
}

// Composite 3-part Street Lamp
export function createStreetLamp(): THREE.Group {
  const group = new THREE.Group();
  const poleMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    roughness: 0.4,
    metalness: 0.8,
  });
  const bulbMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: 0xf59e0b,
    emissiveIntensity: 1.8,
  });

  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 4.4, 8), poleMat);
  pole.position.set(0, 2.2, 0);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 0.08), poleMat);
  arm.position.set(0.4, 4.35, 0);
  const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.1, 0.22), bulbMat);
  bulb.position.set(0.78, 4.28, 0);
  group.add(pole, arm, bulb);
  return group;
}

// Interactive Telecom Landmark with invisible collision proxy on Layer 1
export interface InteractiveLandmarkHandle {
  group: THREE.Group;
  ring: THREE.Mesh;
  beacon: THREE.Mesh;
  hitbox: THREE.Mesh;
  trailId: string;
  baseY: number;
}

export function createInteractiveLandmark(
  trailId: string,
  position: [number, number, number],
  accentHex: string,
  isCompleted: boolean,
): InteractiveLandmarkHandle {
  const group = new THREE.Group();
  group.position.set(position[0], 0, position[2]);

  const plinthMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.5,
    metalness: 0.4,
  });
  const mastMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.25,
    metalness: 0.85,
  });
  const accentColor = isCompleted ? 0x10b981 : new THREE.Color(accentHex).getHex();
  const beaconMat = new THREE.MeshStandardMaterial({
    color: accentColor,
    emissive: accentColor,
    emissiveIntensity: 1.6,
    roughness: 0.2,
  });

  // 1. Concrete plinth
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.35, 0.5, 16), plinthMat);
  plinth.position.y = 0.25;
  plinth.castShadow = true;
  plinth.receiveShadow = true;
  group.add(plinth);

  // 2. Tower / Kiosk Mast
  const mastHeight = Math.max(2.6, position[1]);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.34, mastHeight, 8), mastMat);
  mast.position.y = 0.5 + mastHeight / 2;
  mast.castShadow = true;
  group.add(mast);

  // 3. Sector Antenna Collar
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.55, 6), plinthMat);
  collar.position.y = 0.5 + mastHeight * 0.85;
  group.add(collar);

  // 4. Glowing Beacon Orb
  const beacon = new THREE.Mesh(new THREE.OctahedronGeometry(0.55, 1), beaconMat);
  beacon.position.y = 0.5 + mastHeight + 0.7;
  group.add(beacon);

  // 5. Animated Orbiting RF Ring
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.05, 0.06, 10, 32),
    new THREE.MeshStandardMaterial({
      color: accentColor,
      emissive: accentColor,
      emissiveIntensity: 1.3,
      transparent: true,
      opacity: 0.85,
    }),
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.5 + mastHeight + 0.7;
  group.add(ring);

  // 6. Invisible simplified raycast collision box on Layer 1
  const hitbox = new THREE.Mesh(
    new THREE.CylinderGeometry(1.6, 1.6, mastHeight + 2.4, 8),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  hitbox.position.y = (mastHeight + 2.4) / 2;
  hitbox.layers.set(1);
  hitbox.userData.trailId = trailId;
  group.add(hitbox);

  return {
    group,
    ring,
    beacon,
    hitbox,
    trailId,
    baseY: 0.5 + mastHeight + 0.7,
  };
}
