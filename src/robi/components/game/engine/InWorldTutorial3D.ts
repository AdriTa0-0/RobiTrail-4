import { useCallback, useState } from "react";
import * as THREE from "three";

export interface TutorialBeaconRig {
  group: THREE.Group;
  setTarget: (x: number, y: number, z: number) => void;
  setVisible: (visible: boolean) => void;
  update: (elapsed: number) => void;
  dispose: () => void;
}

/**
 * Creates a self-contained in-world 3D visual cue (animated pointing hand/stylus,
 * bouncing directional arrow, and concentric surface ring) that teaches players
 * WHERE and HOW to interact directly on a 3D object without blocking the world.
 */
export function createTutorialBeaconRig(accentHex = 0x38bdf8): TutorialBeaconRig {
  const group = new THREE.Group();
  const disposables: { dispose: () => void }[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    disposables.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    disposables.push(m);
    return m;
  };

  // 1. Concentric glowing floor/pad rings
  const innerRing = new THREE.Mesh(
    trackGeo(new THREE.RingGeometry(0.65, 0.85, 32)),
    trackMat(
      new THREE.MeshBasicMaterial({
        color: accentHex,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9,
      }),
    ),
  );
  innerRing.rotation.x = -Math.PI / 2;
  innerRing.position.y = 0.08;

  const outerRing = new THREE.Mesh(
    trackGeo(new THREE.RingGeometry(1.05, 1.22, 32)),
    trackMat(
      new THREE.MeshBasicMaterial({
        color: 0xfbbf24,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.75,
      }),
    ),
  );
  outerRing.rotation.x = -Math.PI / 2;
  outerRing.position.y = 0.09;

  // 2. Animated 3D pointer arrow + stylized hand indicator hovering above target
  const pointerGroup = new THREE.Group();
  pointerGroup.position.y = 2.6;

  const arrowMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.85,
      roughness: 0.3,
      metalness: 0.2,
    }),
  );

  const arrowTip = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.32, 0.58, 12)), arrowMat);
  arrowTip.rotation.x = Math.PI;
  arrowTip.position.y = -0.3;

  const arrowShaft = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.11, 0.11, 0.65, 10)),
    arrowMat,
  );
  arrowShaft.position.y = 0.25;

  // Stylized 3D glove/hand palm + pointing finger beside arrow
  const handMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: accentHex,
      emissiveIntensity: 0.4,
      roughness: 0.35,
    }),
  );
  const palm = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.42, 0.44, 0.2)), handMat);
  palm.position.set(0.38, 0.45, 0);
  palm.rotation.z = 0.32;

  const finger = new THREE.Mesh(trackGeo(new THREE.CapsuleGeometry(0.08, 0.32, 4, 8)), handMat);
  finger.position.set(0.2, 0.14, 0);
  finger.rotation.z = 0.48;

  const wristHalo = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(0.48, 0.05, 8, 24)),
    trackMat(
      new THREE.MeshBasicMaterial({
        color: accentHex,
        transparent: true,
        opacity: 0.85,
      }),
    ),
  );
  wristHalo.rotation.x = Math.PI / 2;
  wristHalo.position.y = -0.6;

  pointerGroup.add(arrowTip, arrowShaft, palm, finger, wristHalo);
  group.add(innerRing, outerRing, pointerGroup);

  return {
    group,
    setTarget: (x: number, y: number, z: number) => {
      group.position.set(x, y, z);
    },
    setVisible: (visible: boolean) => {
      group.visible = visible;
    },
    update: (elapsed: number) => {
      if (!group.visible) return;
      const bounce = Math.sin(elapsed * 4.2) * 0.32;
      pointerGroup.position.y = 2.65 + bounce;
      pointerGroup.rotation.y = elapsed * 1.4;

      const pulse = 1 + Math.sin(elapsed * 4.5) * 0.14;
      innerRing.scale.setScalar(pulse);
      outerRing.scale.setScalar(1.04 + Math.cos(elapsed * 4.5) * 0.18);
      if (outerRing.material instanceof THREE.MeshBasicMaterial) {
        outerRing.material.opacity = 0.55 + Math.sin(elapsed * 4.5) * 0.25;
      }
    },
    dispose: () => {
      disposables.forEach((d) => d.dispose());
    },
  };
}

const TUTORIAL_STORAGE_PREFIX = "robitrail_tutorial_seen_";

export function useTutorialState(tutorialKey: string) {
  const storageKey = `${TUTORIAL_STORAGE_PREFIX}${tutorialKey}`;
  const [seenBefore, setSeenBefore] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem(storageKey) === "1";
    } catch {
      return false;
    }
  });
  const [active, setActive] = useState<boolean>(() => !seenBefore);

  const markCompleted = useCallback(() => {
    setActive(false);
    setSeenBefore(true);
    try {
      window.localStorage.setItem(storageKey, "1");
    } catch {
      // Ignore storage quota / private mode failures
    }
  }, [storageKey]);

  const skip = useCallback(() => {
    setActive(false);
    setSeenBefore(true);
    try {
      window.localStorage.setItem(storageKey, "1");
    } catch {
      // Ignore storage quota failures
    }
  }, [storageKey]);

  const replay = useCallback(() => {
    setActive(true);
  }, []);

  return {
    tutorialActive: active,
    seenBefore,
    completeTutorial: markCompleted,
    skipTutorial: skip,
    replayTutorial: replay,
  };
}
