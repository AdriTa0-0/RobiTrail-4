import * as THREE from "three";
import {
  createCityBus,
  createCngRickshaw,
  createPedestrian,
  createProceduralTextures,
} from "../../world/proceduralAssets";

export type GameCityId = "chattogram" | "dhaka" | "sylhet";

export interface CityBackdropHandle {
  update: (delta: number, elapsed: number) => void;
  dispose: () => void;
}

interface BuildCityGameBackdropParams {
  scene: THREE.Scene;
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  city: GameCityId;
  quality: "high" | "balanced" | "reduced";
  maxAnisotropy: number;
}

export function buildCityGameBackdrop({
  scene,
  bounds,
  city,
  quality,
  maxAnisotropy,
}: BuildCityGameBackdropParams): CityBackdropHandle {
  const root = new THREE.Group();
  scene.add(root);

  const texPack = createProceduralTextures(maxAnisotropy);
  const disposables: { dispose: () => void }[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    disposables.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    disposables.push(m);
    return m;
  };

  const spanX = bounds.maxX - bounds.minX;
  const spanZ = bounds.maxZ - bounds.minZ;
  const centerX = (bounds.minX + bounds.maxX) * 0.5;
  const centerZ = (bounds.minZ + bounds.maxZ) * 0.5;

  // 1. Wide Daylight Terrain Base (strictly below y = 0 so local scene floors render cleanly on top)
  const terrainColor = city === "sylhet" ? 0x65a30d : city === "chattogram" ? 0x84cc16 : 0x86efac;
  const outerGround = new THREE.Mesh(
    trackGeo(new THREE.CircleGeometry(115, 48)),
    trackMat(new THREE.MeshStandardMaterial({ color: terrainColor, roughness: 0.95 })),
  );
  outerGround.rotation.x = -Math.PI / 2;
  outerGround.position.set(centerX, -0.06, centerZ);
  outerGround.receiveShadow = true;
  root.add(outerGround);

  // Clean sunlit concrete/stone courtyard pad covering exact mission bounds
  const padColor = city === "dhaka" ? 0xdbeafe : city === "chattogram" ? 0xe2e8f0 : 0xd1fae5;
  const courtyardPad = new THREE.Mesh(
    trackGeo(new THREE.PlaneGeometry(spanX + 2.4, spanZ + 2.4)),
    trackMat(new THREE.MeshStandardMaterial({ color: padColor, roughness: 0.88 })),
  );
  courtyardPad.rotation.x = -Math.PI / 2;
  courtyardPad.position.set(centerX, -0.025, centerZ);
  courtyardPad.receiveShadow = true;
  root.add(courtyardPad);

  // Perimeter Asphalt Road Loop outside the courtyard
  const roadMargin = 3.2;
  const roadWidth = 3.8;
  const outerW = spanX + roadMargin * 2 + roadWidth;
  const outerD = spanZ + roadMargin * 2 + roadWidth;

  const asphaltMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: texPack.roadTexture,
      color: 0xcbd5e1,
      roughness: 0.85,
    }),
  );

  // North & South road segments
  const roadNSGeo = trackGeo(new THREE.PlaneGeometry(outerW, roadWidth));
  const northRoad = new THREE.Mesh(roadNSGeo, asphaltMat);
  northRoad.rotation.x = -Math.PI / 2;
  northRoad.rotation.z = Math.PI / 2;
  // Use clean solid tinted strips with crisp centerline dashes
  const solidRoadMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.85 }),
  );
  const stripeMat = trackMat(new THREE.MeshBasicMaterial({ color: 0xfef08a }));

  const nZ = bounds.minZ - roadMargin - roadWidth * 0.5;
  const sZ = bounds.maxZ + roadMargin + roadWidth * 0.5;
  const wX = bounds.minX - roadMargin - roadWidth * 0.5;
  const eX = bounds.maxX + roadMargin + roadWidth * 0.5;

  [nZ, sZ].forEach((rz) => {
    const seg = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(outerW, 0.03, roadWidth)),
      solidRoadMat,
    );
    seg.position.set(centerX, -0.035, rz);
    seg.receiveShadow = true;
    root.add(seg);

    const line = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(outerW - 4, 0.035, 0.14)),
      stripeMat,
    );
    line.position.set(centerX, -0.032, rz);
    root.add(line);
  });

  [wX, eX].forEach((rx) => {
    const seg = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(roadWidth, 0.03, outerD)),
      solidRoadMat,
    );
    seg.position.set(rx, -0.035, centerZ);
    seg.receiveShadow = true;
    root.add(seg);

    const line = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.14, 0.035, outerD - 4)),
      stripeMat,
    );
    line.position.set(rx, -0.032, centerZ);
    root.add(line);
  });
  void northRoad;

  // 2. City-Specific Horizon Landmarks
  let metroTrain: THREE.Group | null = null;
  let portVessel: THREE.Group | null = null;
  let surmaBoat: THREE.Group | null = null;
  const bayOffset = Math.max(spanX, spanZ) * 0.5 + 14;

  if (city === "chattogram") {
    // Bay of Bengal Coastal Water + Cargo Ship + Containers + Sand Pier on North/Horizon edge
    const sea = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(140, 0.2, 48)),
      trackMat(
        new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.22, metalness: 0.15 }),
      ),
    );
    sea.position.set(centerX, -0.1, bounds.minZ - 32);
    root.add(sea);

    // Coastal quay curb rim & stacked cargo containers
    const quayCurb = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(spanX + 3.2, 0.24, 0.55)),
      trackMat(new THREE.MeshStandardMaterial({ color: 0xf43f5e, roughness: 0.6 })),
    );
    quayCurb.position.set(centerX, 0.08, bounds.minZ - 1.3);
    root.add(quayCurb);

    const containerPalette = [0xe11d48, 0x0284c7, 0xf59e0b, 0x0f766e];
    [-14, -10.5, 11, 14.5].forEach((cx, i) => {
      const box = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(2.8, 1.4, 1.5)),
        trackMat(
          new THREE.MeshStandardMaterial({
            color: containerPalette[i % containerPalette.length],
            roughness: 0.55,
          }),
        ),
      );
      box.position.set(cx, 0.7, bounds.minZ - 11.2);
      root.add(box);
    });

    // Anchored Bay cargo ship silhouette
    portVessel = new THREE.Group();
    const hull = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(13, 1.8, 3.6)),
      trackMat(new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.6 })),
    );
    hull.position.y = 0.7;
    const bridge = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(2.6, 2.2, 2.8)),
      trackMat(new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.45 })),
    );
    bridge.position.set(-4.0, 2.5, 0);
    const cargo1 = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(4.5, 1.2, 2.4)),
      trackMat(new THREE.MeshStandardMaterial({ color: 0x0ea5e9, roughness: 0.5 })),
    );
    cargo1.position.set(1.2, 2.1, 0);
    portVessel.add(hull, bridge, cargo1);
    portVessel.position.set(6, 0, bounds.minZ - 26);
    root.add(portVessel);

    // Coastal Gantry Port Cranes
    const craneSteel = trackMat(
      new THREE.MeshStandardMaterial({ color: 0xe11d48, roughness: 0.45 }),
    );
    const craneAmber = trackMat(
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.45 }),
    );
    [-16, -2, 12].forEach((cx, i) => {
      const crane = new THREE.Group();
      crane.position.set(cx, 0, bounds.minZ - 14);
      const leg1 = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.6, 12, 0.6)), craneSteel);
      leg1.position.set(-1.5, 6, 0);
      const leg2 = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.6, 12, 0.6)), craneSteel);
      leg2.position.set(1.5, 6, 0);
      const boom = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(4.5, 0.7, 9.5)),
        i % 2 === 0 ? craneSteel : craneAmber,
      );
      boom.position.set(0, 11.4, -2.5);
      crane.add(leg1, leg2, boom);
      root.add(crane);
    });

    // Green Coastal Hills along South/West horizon
    const hillMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.9 }));
    [
      [bounds.minX - 18, -10, 9.5, 11],
      [bounds.minX - 20, 12, 12, 14],
      [bounds.maxX + 18, -8, 10, 12],
    ].forEach(([hx, hz, hr, hh]) => {
      const hill = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(hr, hh, 7)), hillMat);
      hill.position.set(hx, hh * 0.45, hz);
      root.add(hill);
    });
  } else if (city === "dhaka") {
    // Urban Metro District Courtyard Curb
    const metroCurb = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(spanX + 3.2, 0.22, 0.5)),
      trackMat(new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.5 })),
    );
    metroCurb.position.set(centerX, 0.08, bounds.minZ - 1.3);
    root.add(metroCurb);

    // Elevated Dhaka Metro Rail Viaduct along North edge + Animated Train
    const viaductMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.75 }),
    );
    const railBeam = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(84, 0.9, 2.4)), viaductMat);
    railBeam.position.set(centerX, 6.4, bounds.minZ - 13.5);
    root.add(railBeam);

    [-28, -14, 0, 14, 28].forEach((px) => {
      const pier = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.65, 0.85, 6.4, 8)),
        viaductMat,
      );
      pier.position.set(px, 3.2, bounds.minZ - 13.5);
      root.add(pier);
    });

    metroTrain = new THREE.Group();
    const trainBody = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(11.5, 1.55, 1.7)),
      trackMat(
        new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.35, roughness: 0.3 }),
      ),
    );
    trainBody.position.y = 7.65;
    const trainStripe = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(11.6, 0.32, 1.74)),
      trackMat(new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.35 })),
    );
    trainStripe.position.y = 7.45;
    const trainCrimson = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(11.6, 0.16, 1.75)),
      trackMat(new THREE.MeshStandardMaterial({ color: 0xe11d48, roughness: 0.4 })),
    );
    trainCrimson.position.y = 7.12;
    metroTrain.add(trainBody, trainStripe, trainCrimson);
    metroTrain.position.set(0, 0, bounds.minZ - 13.5);
    root.add(metroTrain);
  } else {
    // SYLHET: Surma River backdrop + Keane Bridge Steel Arch + Boat + Rolling Emerald Tea Hills
    const valleyCurb = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(spanX + 3.2, 0.22, 0.5)),
      trackMat(new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.65 })),
    );
    valleyCurb.position.set(centerX, 0.08, bounds.minZ - 1.3);
    root.add(valleyCurb);

    const riverMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0x0ea5e9, roughness: 0.25, metalness: 0.12 }),
    );
    const river = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(140, 0.14, 16)), riverMat);
    river.position.set(centerX, -0.07, bounds.minZ - 17);
    root.add(river);

    // Traditional wooden river boat gliding softly across the Surma
    surmaBoat = new THREE.Group();
    const boatHull = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(3.8, 0.45, 1.1)),
      trackMat(new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.85 })),
    );
    const boatCanopy = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.65, 0.65, 1.7, 8, 1, false, 0, Math.PI)),
      trackMat(new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.85 })),
    );
    boatCanopy.rotation.z = Math.PI / 2;
    boatCanopy.position.set(0, 0.45, 0);
    surmaBoat.add(boatHull, boatCanopy);
    surmaBoat.position.set(-12, 0.12, bounds.minZ - 17);
    root.add(surmaBoat);

    // Steel Arch Silhouette across Surma River (Keane Bridge)
    const steelMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0x991b1b, metalness: 0.55, roughness: 0.4 }),
    );
    const bridgeDeck = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(34, 0.45, 2.6)), steelMat);
    bridgeDeck.position.set(centerX, 1.8, bounds.minZ - 17);
    root.add(bridgeDeck);
    const topTie = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(18.5, 0.45, 2.2)), steelMat);
    topTie.position.set(centerX, 5.7, bounds.minZ - 17);
    root.add(topTie);
    [-9, 9].forEach((bx) => {
      const arch = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.45, 4.2, 0.45)), steelMat);
      arch.position.set(bx, 3.8, bounds.minZ - 17);
      root.add(arch);
    });

    // Lush Tea Estate Terraced Hills + Foreground Tea Shrubs
    const teaGreen = trackMat(new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.88 }));
    [
      [bounds.minX - 16, -6, 10, 10],
      [bounds.minX - 18, 9, 11, 12],
      [bounds.maxX + 16, -6, 10, 11],
      [bounds.maxX + 17, 10, 12, 13],
      [centerX - 12, bounds.minZ - 32, 13, 12],
      [centerX + 14, bounds.minZ - 34, 14, 14],
    ].forEach(([hx, hz, hr, hh]) => {
      const cone = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(hr, hh, 7)), teaGreen);
      cone.position.set(hx, hh * 0.45, hz);
      root.add(cone);
    });
  }

  // 3. Bangladeshi Urban Surround Buildings (Outside road loop)
  const palette =
    city === "dhaka"
      ? [0xe2e8f0, 0xfef3c7, 0xdbeafe, 0xf1f5f9]
      : city === "chattogram"
        ? [0xf1f5f9, 0xfde68a, 0xe0f2fe, 0xfce7f3]
        : [0xdcfce7, 0xfef9c3, 0xe2e8f0];

  const bldgRingDistX = spanX * 0.5 + 11.5;
  const bldgRingDistZ = spanZ * 0.5 + 11.5;
  const bldgSlots: [number, number, number][] = [
    [-bldgRingDistX, -10, 11],
    [-bldgRingDistX, 0, 14],
    [-bldgRingDistX, 10, 9],
    [bldgRingDistX, -9, 12],
    [bldgRingDistX, 1, 15],
    [bldgRingDistX, 11, 10],
    [-12, -bldgRingDistZ - 4, 13],
    [2, -bldgRingDistZ - 4, 16],
    [14, -bldgRingDistZ - 4, 11],
    [-11, bldgRingDistZ + 2, 10],
    [11, bldgRingDistZ + 2, 12],
  ];

  bldgSlots.forEach(([bx, bz, bh], i) => {
    const height = city === "dhaka" ? bh * 1.25 : city === "sylhet" ? bh * 0.65 : bh;
    const mat = trackMat(
      new THREE.MeshStandardMaterial({
        map: texPack.buildingTexture,
        color: palette[i % palette.length],
        roughness: 0.72,
      }),
    );
    const bldg = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(5.2, height, 5.2)), mat);
    bldg.position.set(bx, height * 0.5, bz);
    bldg.castShadow = quality === "high";
    bldg.receiveShadow = true;
    root.add(bldg);

    // Bangla rooftop shop sign on first few perimeter buildings
    if (i < texPack.signTextures.length) {
      const sign = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(3.8, 0.95, 0.16)),
        trackMat(new THREE.MeshBasicMaterial({ map: texPack.signTextures[i] })),
      );
      sign.position.set(bx, Math.min(height, 4.4), bz + (bz < 0 ? 2.68 : -2.68));
      if (bz >= 0) sign.rotation.y = Math.PI;
      root.add(sign);
    }
  });

  // 4. Instanced Wind-Swaying Trees around perimeter sidewalks
  const treeCount = quality === "high" ? 32 : 16;
  const trunkGeo = trackGeo(new THREE.CylinderGeometry(0.18, 0.28, 1.8, 6));
  const trunkMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 }));
  const canopyGeo = trackGeo(new THREE.DodecahedronGeometry(1.15, 0));
  const canopyMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.85 }));

  const trunkInst = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCount);
  const canopyInst = new THREE.InstancedMesh(canopyGeo, canopyMat, treeCount);
  const dummy = new THREE.Object3D();
  const treeCoords: { x: number; z: number; scale: number; phase: number }[] = [];

  for (let i = 0; i < treeCount; i++) {
    const angle = (i / treeCount) * Math.PI * 2;
    const rx = (spanX * 0.5 + 8.8) * Math.cos(angle) * 1.12;
    const rz = (spanZ * 0.5 + 8.8) * Math.sin(angle) * 1.12;
    const s = 0.85 + (i % 4) * 0.14;
    treeCoords.push({ x: centerX + rx, z: centerZ + rz, scale: s, phase: i * 0.7 });

    dummy.position.set(centerX + rx, 0.9 * s, centerZ + rz);
    dummy.scale.setScalar(s);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    trunkInst.setMatrixAt(i, dummy.matrix);

    dummy.position.set(centerX + rx, 2.3 * s, centerZ + rz);
    dummy.updateMatrix();
    canopyInst.setMatrixAt(i, dummy.matrix);
  }
  root.add(trunkInst, canopyInst);

  // 5. Drifting Low-Poly Daylight Clouds
  const clouds: { mesh: THREE.Group; speed: number; baseX: number }[] = [];
  const cloudMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95 }));
  const cloudGeo = trackGeo(new THREE.DodecahedronGeometry(1.7, 1));
  const cloudCount = quality === "high" ? 6 : 3;
  for (let i = 0; i < cloudCount; i++) {
    const cg = new THREE.Group();
    const p1 = new THREE.Mesh(cloudGeo, cloudMat);
    const p2 = new THREE.Mesh(cloudGeo, cloudMat);
    p2.scale.set(0.75, 0.7, 0.75);
    p2.position.set(1.4, -0.15, 0.2);
    const p3 = new THREE.Mesh(cloudGeo, cloudMat);
    p3.scale.set(0.7, 0.65, 0.7);
    p3.position.set(-1.3, -0.2, -0.1);
    cg.add(p1, p2, p3);
    const bx = -38 + i * 16;
    cg.position.set(bx, 18 + (i % 3) * 2.5, -24 - (i % 2) * 10);
    root.add(cg);
    clouds.push({ mesh: cg, speed: 0.9 + (i % 3) * 0.35, baseX: bx });
  }

  // 6. Animated Perimeter Vehicles (CNGs & City Bus circling outside gameplay bounds)
  const cng1 = createCngRickshaw();
  const cng2 = createCngRickshaw();
  const bus = createCityBus(city === "dhaka" ? 0xdc2626 : 0x0284c7);
  const ped1 = createPedestrian(0xe11d48);
  const ped2 = createPedestrian(0x0284c7);
  root.add(cng1, cng2, bus, ped1, ped2);

  const halfLoopX = Math.abs(eX - centerX);
  const halfLoopZ = Math.abs(sZ - centerZ);
  const perimeter = (halfLoopX + halfLoopZ) * 4;

  const placeOnLoop = (obj: THREE.Object3D, progress: number) => {
    const d = (((progress % 1) + 1) % 1) * perimeter;
    const seg1 = halfLoopX * 2;
    const seg2 = halfLoopZ * 2;
    let x = centerX;
    let z = centerZ;
    let yaw = 0;

    if (d < seg1) {
      x = centerX - halfLoopX + d;
      z = sZ;
      yaw = Math.PI / 2;
    } else if (d < seg1 + seg2) {
      x = eX;
      z = sZ - (d - seg1);
      yaw = Math.PI;
    } else if (d < seg1 * 2 + seg2) {
      x = eX - (d - seg1 - seg2);
      z = nZ;
      yaw = -Math.PI / 2;
    } else {
      x = wX;
      z = nZ + (d - seg1 * 2 - seg2);
      yaw = 0;
    }
    obj.position.set(x, 0, z);
    obj.rotation.y = yaw;
  };

  placeOnLoop(cng1, 0.12);
  placeOnLoop(cng2, 0.62);
  placeOnLoop(bus, 0.35);
  ped1.position.set(bounds.minX - 2.1, 0, 2);
  ped2.position.set(bounds.maxX + 2.1, 0, -2);
  void bayOffset;

  return {
    update: (_delta: number, elapsed: number) => {
      // Vehicles circling perimeter road
      placeOnLoop(cng1, 0.12 + elapsed * 0.025);
      placeOnLoop(cng2, 0.62 + elapsed * 0.022);
      placeOnLoop(bus, 0.35 + elapsed * 0.016);

      // Gentle pedestrian stroll along sidewalk
      ped1.position.z = Math.sin(elapsed * 0.55) * (spanZ * 0.35);
      ped1.rotation.y = Math.cos(elapsed * 0.55) >= 0 ? 0 : Math.PI;
      ped2.position.z = Math.cos(elapsed * 0.48) * (spanZ * 0.35);
      ped2.rotation.y = -Math.sin(elapsed * 0.48) >= 0 ? 0 : Math.PI;

      // Dhaka Metro Rail glide along North viaduct
      if (metroTrain) {
        metroTrain.position.x = Math.sin(elapsed * 0.32) * 32;
      }

      // Gentle Bay vessel heave
      if (portVessel) {
        portVessel.position.y = Math.sin(elapsed * 1.1) * 0.1;
        portVessel.rotation.z = Math.sin(elapsed * 0.9) * 0.015;
      }

      // Surma River wooden boat glide
      if (surmaBoat) {
        surmaBoat.position.x = Math.sin(elapsed * 0.22) * 18;
      }

      // Drifting clouds
      clouds.forEach((cl) => {
        const span = 96;
        cl.mesh.position.x =
          ((((cl.baseX + elapsed * cl.speed + span * 0.5) % span) + span) % span) - span * 0.5;
      });

      // Subtle canopy wind sway
      for (let i = 0; i < treeCoords.length; i++) {
        const tc = treeCoords[i];
        dummy.position.set(tc.x + Math.sin(elapsed * 1.6 + tc.phase) * 0.06, 2.3 * tc.scale, tc.z);
        dummy.scale.setScalar(tc.scale);
        dummy.rotation.set(0, elapsed * 0.08 + tc.phase, Math.sin(elapsed * 1.4 + tc.phase) * 0.04);
        dummy.updateMatrix();
        canopyInst.setMatrixAt(i, dummy.matrix);
      }
      canopyInst.instanceMatrix.needsUpdate = true;
    },
    dispose: () => {
      scene.remove(root);
      texPack.dispose();
      disposables.forEach((d) => d.dispose());
      root.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
          else obj.material.dispose();
        }
      });
    },
  };
}
