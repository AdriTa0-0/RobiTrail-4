import * as THREE from "three";
import type { CityConfig } from "../../data/cities/cities";
import type { TrailConfig } from "../../data/trails/trails";
import {
  createCityBus,
  createCngRickshaw,
  createCycleRickshaw,
  createInteractiveLandmark,
  createPedestrian,
  createStreetLamp,
  type InteractiveLandmarkHandle,
  type ProceduralTexturePack,
} from "./proceduralAssets";

export interface AnimatedActor {
  object: THREE.Object3D;
  axis: "x" | "z";
  min: number;
  max: number;
  speed: number;
  direction: 1 | -1;
}

export interface BuiltCityScene {
  root: THREE.Group;
  actors: AnimatedActor[];
  landmarks: InteractiveLandmarkHandle[];
  waterMesh?: THREE.Mesh;
  metroTrain?: THREE.Group;
}

function addTreeInstances(
  root: THREE.Group,
  positions: [number, number, number][],
  foliageHex: number,
) {
  if (positions.length === 0) return;
  const trunkGeo = new THREE.CylinderGeometry(0.18, 0.25, 1.8, 7);
  trunkGeo.translate(0, 0.9, 0);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 });

  const crownGeo = new THREE.IcosahedronGeometry(1.25, 1);
  crownGeo.translate(0, 2.4, 0);
  const crownMat = new THREE.MeshStandardMaterial({ color: foliageHex, roughness: 0.8 });

  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, positions.length);
  const crowns = new THREE.InstancedMesh(crownGeo, crownMat, positions.length);
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();

  positions.forEach(([x, y, z], i) => {
    const scale = 0.85 + ((i * 37) % 30) / 100;
    dummy.position.set(x, y, z);
    dummy.scale.setScalar(scale);
    dummy.rotation.y = (i * 1.1) % (Math.PI * 2);
    dummy.updateMatrix();
    trunks.setMatrixAt(i, dummy.matrix);
    crowns.setMatrixAt(i, dummy.matrix);

    color.setHex(foliageHex).offsetHSL(0, 0, ((i % 5) - 2) * 0.03);
    crowns.setColorAt(i, color);
  });

  trunks.instanceMatrix.needsUpdate = true;
  crowns.instanceMatrix.needsUpdate = true;
  if (crowns.instanceColor) crowns.instanceColor.needsUpdate = true;
  trunks.computeBoundingSphere();
  crowns.computeBoundingSphere();
  root.add(trunks, crowns);
}

function addBuildingBlock(
  root: THREE.Group,
  x: number,
  z: number,
  w: number,
  h: number,
  d: number,
  wallHex: number,
  tex: THREE.CanvasTexture,
  signTex?: THREE.CanvasTexture,
) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);

  const wallMat = new THREE.MeshStandardMaterial({
    color: wallHex,
    map: tex,
    roughness: 0.72,
    metalness: 0.1,
  });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.85 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
  body.position.y = h / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  const parapet = new THREE.Mesh(new THREE.BoxGeometry(w + 0.18, 0.25, d + 0.18), roofMat);
  parapet.position.y = h + 0.12;
  group.add(parapet);

  if (signTex) {
    const signBoard = new THREE.Mesh(
      new THREE.PlaneGeometry(Math.min(w * 0.82, 4.2), 1.0),
      new THREE.MeshBasicMaterial({ map: signTex }),
    );
    signBoard.position.set(0, 2.3, d / 2 + 0.04);
    group.add(signBoard);
  }

  root.add(group);
}

export function buildCityEnvironment(
  city: CityConfig,
  cityTrails: TrailConfig[],
  completedTrailIds: string[],
  textures: ProceduralTexturePack,
): BuiltCityScene {
  const root = new THREE.Group();
  const actors: AnimatedActor[] = [];
  const landmarks: InteractiveLandmarkHandle[] = [];

  // Ground terrain extending far to horizon fog
  const groundMat = new THREE.MeshStandardMaterial({
    color: city.theme.groundColor,
    roughness: 0.92,
    metalness: 0.02,
  });
  const ground = new THREE.Mesh(new THREE.CircleGeometry(140, 48), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  root.add(ground);

  // Cross-roads (offset +0.03m on Y to prevent Z-fighting)
  const roadMat = new THREE.MeshStandardMaterial({
    map: textures.roadTexture,
    roughness: 0.82,
    metalness: 0.05,
  });
  const roadNS = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 84), roadMat);
  roadNS.rotation.x = -Math.PI / 2;
  roadNS.position.y = 0.03;
  roadNS.receiveShadow = true;

  const roadEW = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 84), roadMat);
  roadEW.rotation.x = -Math.PI / 2;
  roadEW.rotation.z = Math.PI / 2;
  roadEW.position.y = 0.035;
  roadEW.receiveShadow = true;
  root.add(roadNS, roadEW);

  // Sidewalks
  const curbMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.85 });
  [
    [-4.3, -15],
    [4.3, -15],
    [-4.3, 15],
    [4.3, 15],
  ].forEach(([sx, sz]) => {
    const curb = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.14, 22), curbMat);
    curb.position.set(sx, 0.07, sz);
    curb.receiveShadow = true;
    root.add(curb);
  });

  // Street lamps along avenues
  [-16, -8, 8, 16].forEach((pos) => {
    const lamp1 = createStreetLamp();
    lamp1.position.set(-4.3, 0, pos);
    const lamp2 = createStreetLamp();
    lamp2.position.set(4.3, 0, pos);
    lamp2.rotation.y = Math.PI;
    root.add(lamp1, lamp2);
  });

  let waterMesh: THREE.Mesh | undefined;
  let metroTrain: THREE.Group | undefined;

  // CITY-SPECIFIC ARCHITECTURE & GEOGRAPHY
  if (city.id === "chattogram") {
    // Karnaphuli Riverfront along positive Z/X perimeter
    const riverGeo = new THREE.PlaneGeometry(140, 42);
    const riverMat = new THREE.MeshPhysicalMaterial({
      color: 0x0e7490,
      roughness: 0.15,
      metalness: 0.25,
      clearcoat: 0.8,
    });
    waterMesh = new THREE.Mesh(riverGeo, riverMat);
    waterMesh.rotation.x = -Math.PI / 2;
    waterMesh.position.set(0, 0.02, -42);
    root.add(waterMesh);

    // Cargo Vessel on Karnaphuli
    const ship = new THREE.Group();
    const shipHull = new THREE.Mesh(
      new THREE.BoxGeometry(8, 1.8, 2.6),
      new THREE.MeshStandardMaterial({ color: 0x9f1239, roughness: 0.5 }),
    );
    shipHull.position.y = 0.9;
    const shipBridge = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 2.2, 2.0),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 }),
    );
    shipBridge.position.set(-2.2, 2.6, 0);
    ship.add(shipHull, shipBridge);
    ship.position.set(-15, 0, -34);
    root.add(ship);
    actors.push({ object: ship, axis: "x", min: -35, max: 35, speed: 2.2, direction: 1 });

    // Port Gantry Cranes on the distant coast
    [-18, -6, 12].forEach((cx) => {
      const crane = new THREE.Group();
      const tower = new THREE.Mesh(
        new THREE.BoxGeometry(1.1, 10, 1.1),
        new THREE.MeshStandardMaterial({ color: 0xea580c, roughness: 0.4, metalness: 0.6 }),
      );
      tower.position.y = 5;
      const boom = new THREE.Mesh(
        new THREE.BoxGeometry(1.0, 0.7, 8),
        new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.4 }),
      );
      boom.position.set(0, 9.5, -2.5);
      crane.add(tower, boom);
      crane.position.set(cx, 0, -24);
      root.add(crane);
    });

    // Pahartali / Foy's Lake Coastal Urban Hills on perimeter
    const hillMat = new THREE.MeshStandardMaterial({ color: 0x2d6a4f, roughness: 0.9 });
    [
      [-28, -14, 11, 7],
      [26, 22, 13, 8.5],
      [-26, 26, 10, 6.5],
      [30, -8, 9, 5.5],
    ].forEach(([hx, hz, hr, hh]) => {
      const hill = new THREE.Mesh(new THREE.ConeGeometry(hr, hh, 12), hillMat);
      hill.position.set(hx, hh / 2 - 0.3, hz);
      root.add(hill);
    });

    // Agrabad Commercial Buildings with Bangla shop signs
    addBuildingBlock(
      root,
      -11,
      -10,
      6,
      9,
      5,
      0xfde68a,
      textures.buildingTexture,
      textures.signTextures[0],
    );
    addBuildingBlock(
      root,
      11,
      -10,
      6.5,
      11,
      5.5,
      0xe2e8f0,
      textures.buildingTexture,
      textures.signTextures[1],
    );
    addBuildingBlock(
      root,
      -12,
      11,
      7,
      7.5,
      6,
      0xfed7aa,
      textures.buildingTexture,
      textures.signTextures[2],
    );
    addBuildingBlock(
      root,
      12,
      11,
      6.5,
      8.5,
      6,
      0xcbd5e1,
      textures.buildingTexture,
      textures.signTextures[3],
    );

    addTreeInstances(
      root,
      [
        [-8, 0, 18],
        [8, 0, 18],
        [-18, 0, -4],
        [18, 0, -4],
        [-20, 0, 14],
        [20, 0, 14],
      ],
      0x166534,
    );
  } else if (city.id === "dhaka") {
    // Elevated Metro Viaduct spanning across the city
    const viaductMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      roughness: 0.7,
      metalness: 0.15,
    });
    const deck = new THREE.Mesh(new THREE.BoxGeometry(92, 0.9, 3.6), viaductMat);
    deck.position.set(0, 7.2, -13);
    deck.castShadow = true;
    root.add(deck);

    [-28, -14, 0, 14, 28].forEach((px) => {
      const pier = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.85, 7.2, 12), viaductMat);
      pier.position.set(px, 3.6, -13);
      pier.castShadow = true;
      root.add(pier);
    });

    // Animated Dhaka Metro Train
    metroTrain = new THREE.Group();
    const coachMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.25,
      metalness: 0.4,
    });
    const stripeMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.35 });
    for (let c = -1; c <= 1; c++) {
      const coach = new THREE.Mesh(new THREE.BoxGeometry(5.2, 1.55, 1.85), coachMat);
      coach.position.set(c * 5.6, 8.45, -13);
      const band = new THREE.Mesh(new THREE.BoxGeometry(5.22, 0.28, 1.88), stripeMat);
      band.position.set(c * 5.6, 8.3, -13);
      metroTrain.add(coach, band);
    }
    root.add(metroTrain);

    // Denser Multistory Dhaka Skyline
    const towers: [number, number, number, number, number, number, number?][] = [
      [-12, -8, 6.5, 14, 6, 0xcbd5e1, 0],
      [12, -8, 7, 17, 6.5, 0x94a3b8, 1],
      [-13, 11, 7, 12, 6.5, 0xe2e8f0, 2],
      [13, 11, 6.5, 15, 6, 0xf1f5f9, 3],
      [-23, -19, 8, 20, 7, 0x64748b],
      [23, -19, 8, 22, 7, 0x94a3b8],
      [-22, 21, 7.5, 16, 7, 0xcbd5e1],
      [22, 21, 7.5, 18, 7, 0xe2e8f0],
    ];
    towers.forEach(([x, z, w, h, d, col, signIdx]) => {
      addBuildingBlock(
        root,
        x,
        z,
        w,
        h,
        d,
        col,
        textures.buildingTexture,
        typeof signIdx === "number" ? textures.signTextures[signIdx] : undefined,
      );
    });

    addTreeInstances(
      root,
      [
        [-7, 0, 17],
        [7, 0, 17],
        [-17, 0, 3],
        [17, 0, 3],
      ],
      0x15803d,
    );
  } else {
    // SYLHET: Surma River & Keane-Bridge-inspired Red Steel Arch Bridge + Outer Regional Hills
    const surma = new THREE.Mesh(
      new THREE.PlaneGeometry(140, 20),
      new THREE.MeshPhysicalMaterial({ color: 0x0d9488, roughness: 0.18, metalness: 0.2 }),
    );
    surma.rotation.x = -Math.PI / 2;
    surma.position.set(0, 0.025, 22);
    waterMesh = surma;
    root.add(surma);

    // Red Steel Arch Bridge spanning the Surma River along roadNS
    const archMat = new THREE.MeshStandardMaterial({
      color: 0xb91c1c,
      roughness: 0.4,
      metalness: 0.7,
    });
    const bridgeDeck = new THREE.Mesh(
      new THREE.BoxGeometry(7.6, 0.5, 22),
      new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 }),
    );
    bridgeDeck.position.set(0, 1.1, 22);
    root.add(bridgeDeck);

    [-3.5, 3.5].forEach((ax) => {
      const arch = new THREE.Mesh(new THREE.TorusGeometry(9.2, 0.28, 8, 24, Math.PI), archMat);
      arch.rotation.y = Math.PI / 2;
      arch.position.set(ax, 1.1, 22);
      root.add(arch);
    });

    // Authentic Sylhet regional mid-rise urban buildings in central streets
    addBuildingBlock(
      root,
      -11,
      -9,
      6.5,
      7.5,
      5.5,
      0xfef3c7,
      textures.buildingTexture,
      textures.signTextures[1],
    );
    addBuildingBlock(
      root,
      11,
      -9,
      6.5,
      8.5,
      5.5,
      0xe2e8f0,
      textures.buildingTexture,
      textures.signTextures[0],
    );
    addBuildingBlock(
      root,
      -12,
      8,
      6,
      6.5,
      5.5,
      0xd1fae5,
      textures.buildingTexture,
      textures.signTextures[3],
    );
    addBuildingBlock(
      root,
      12,
      8,
      6,
      7.2,
      5.5,
      0xf1f5f9,
      textures.buildingTexture,
      textures.signTextures[2],
    );

    // Distinctive outer green hills strictly along the regional perimeter (never randomly in central city)
    const outerHillMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.88 });
    [
      [-34, -28, 14, 9],
      [34, -26, 15, 10],
      [-36, 38, 13, 8],
      [36, 38, 14, 9],
      [0, -40, 18, 10.5],
    ].forEach(([hx, hz, hr, hh]) => {
      const hill = new THREE.Mesh(new THREE.ConeGeometry(hr, hh, 14), outerHillMat);
      hill.position.set(hx, hh / 2 - 0.4, hz);
      root.add(hill);
    });

    addTreeInstances(
      root,
      [
        [-8, 0, -17],
        [8, 0, -17],
        [-19, 0, -2],
        [19, 0, -2],
        [-24, 0, -18],
        [24, 0, -18],
        [-16, 0, 12],
        [16, 0, 12],
      ],
      0x16a34a,
    );
  }

  // Animated Bangladeshi Street Traffic (CNGs, Cycle Rickshaws, City Buses, Pedestrians)
  const cng1 = createCngRickshaw();
  cng1.position.set(-1.7, 0, -18);
  root.add(cng1);
  actors.push({ object: cng1, axis: "z", min: -28, max: 28, speed: 5.5, direction: 1 });

  const cng2 = createCngRickshaw();
  cng2.position.set(18, 0, -1.7);
  cng2.rotation.y = -Math.PI / 2;
  root.add(cng2);
  actors.push({ object: cng2, axis: "x", min: -28, max: 28, speed: 4.8, direction: -1 });

  const rickshaw1 = createCycleRickshaw(0xe11d48);
  rickshaw1.position.set(1.9, 0, 12);
  rickshaw1.rotation.y = Math.PI;
  root.add(rickshaw1);
  actors.push({ object: rickshaw1, axis: "z", min: -26, max: 26, speed: 2.6, direction: -1 });

  const rickshaw2 = createCycleRickshaw(0x2563eb);
  rickshaw2.position.set(-14, 0, 1.9);
  rickshaw2.rotation.y = Math.PI / 2;
  root.add(rickshaw2);
  actors.push({ object: rickshaw2, axis: "x", min: -26, max: 26, speed: 2.4, direction: 1 });

  const bus = createCityBus(
    city.id === "dhaka" ? 0xdc2626 : city.id === "sylhet" ? 0x059669 : 0x0284c7,
  );
  bus.position.set(1.6, 0, -24);
  root.add(bus);
  actors.push({ object: bus, axis: "z", min: -30, max: 30, speed: 4.1, direction: 1 });

  const ped1 = createPedestrian(0xe11d48);
  ped1.position.set(-4.3, 0, -12);
  root.add(ped1);
  actors.push({ object: ped1, axis: "z", min: -19, max: -5, speed: 1.2, direction: 1 });

  const ped2 = createPedestrian(0x0284c7);
  ped2.position.set(4.3, 0, 14);
  root.add(ped2);
  actors.push({ object: ped2, axis: "z", min: 5, max: 19, speed: 1.1, direction: -1 });

  // Interactive Telecom Landmarks for this city's trails
  cityTrails.forEach((trail) => {
    const done = completedTrailIds.includes(trail.id);
    const handle = createInteractiveLandmark(
      trail.id,
      trail.worldAnchor,
      city.theme.accentHex,
      done,
    );
    root.add(handle.group);
    landmarks.push(handle);
  });

  return { root, actors, landmarks, waterMesh, metroTrain };
}
