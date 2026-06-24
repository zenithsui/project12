import { Suspense, useRef, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, useAnimations } from "@react-three/drei";
import * as THREE from "three";

function HorrorModel({
  target,
  frozen,
}: {
  target: React.MutableRefObject<{ x: number; y: number }>;
  frozen: React.MutableRefObject<boolean>;
}) {
  const { scene, animations } = useGLTF("/horror.glb");
  const groupRef = useRef<THREE.Group>(null);
  const { actions, mixer } = useAnimations(animations, groupRef);
  const rotY = useRef(0);
  const rotX = useRef(0);

  useEffect(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const center = new THREE.Vector3();
    box.getCenter(center);
    scene.position.sub(center);

    scene.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((mat) => {
        const m = mat as THREE.MeshStandardMaterial;
        if (m.isMeshStandardMaterial) {
          m.roughness = Math.min(m.roughness ?? 0.8, 0.85);
          m.metalness = Math.max(m.metalness ?? 0, 0.05);
          m.needsUpdate = true;
        }
      });
    });
  }, [scene]);

  useEffect(() => {
    if (!actions) return;
    const keys = Object.keys(actions);
    if (keys.length > 0) {
      actions[keys[0]]?.reset().fadeIn(0.5).play();
    }
    return () => { keys.forEach((k) => actions[k]?.stop()); };
  }, [actions]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    mixer?.update(delta);

    // completely skip rotation update when frozen
    if (frozen.current) return;

    const MAX_V = (100 / 2) * (Math.PI / 180);
    // clamp to [0, MAX_V]: mouse above center tilts model forward (look down at it), block upward tilt
    const targetX = THREE.MathUtils.clamp(target.current.y * -MAX_V, 0, MAX_V);
    const targetY = target.current.x * Math.PI;

    rotX.current = THREE.MathUtils.lerp(rotX.current, targetX, 0.06);
    rotY.current = THREE.MathUtils.lerp(rotY.current, targetY, 0.06);

    groupRef.current.rotation.x = rotX.current;
    groupRef.current.rotation.y = rotY.current;
  });

  return (
    <group ref={groupRef} position={[0, -3.5, 0]}>
      <primitive object={scene} />
    </group>
  );
}

function ZoomController({ zoom }: { zoom: number }) {
  const { camera } = useThree();
  useFrame(() => {
    (camera as THREE.PerspectiveCamera).position.z = THREE.MathUtils.lerp(
      (camera as THREE.PerspectiveCamera).position.z,
      zoom,
      0.08
    );
  });
  return null;
}

export default function App() {
  const target = useRef({ x: 0, y: 0 });
  const frozen = useRef(false);
  const [zoom] = useState(62);
  const [cursor, setCursor] = useState("grab");

  useEffect(() => {
    // Read e.buttons directly — 0 = no button held, >0 = button is pressed
    // This is guaranteed to be correct regardless of event capture/bubble order
    const onMove = (e: PointerEvent) => {
      const pressed = e.buttons !== 0;
      frozen.current = pressed;

      if (pressed) {
        setCursor("grabbing");
        return; // block ALL rotation updates while any button is held
      }

      setCursor("grab");
      target.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
      target.current.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };

    // Also freeze immediately on first click (before first move fires)
    const onDown = () => {
      frozen.current = true;
      setCursor("grabbing");
    };
    const onUp = () => {
      frozen.current = false;
      setCursor("grab");
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
    };

    // capture: true — fires before canvas can intercept
    document.addEventListener("pointermove", onMove, { capture: true });
    document.addEventListener("pointerdown", onDown, { capture: true });
    document.addEventListener("pointerup", onUp, { capture: true });
    document.addEventListener("pointercancel", onUp, { capture: true });
    window.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      document.removeEventListener("pointermove", onMove, { capture: true });
      document.removeEventListener("pointerdown", onDown, { capture: true });
      document.removeEventListener("pointerup", onUp, { capture: true });
      document.removeEventListener("pointercancel", onUp, { capture: true });
      window.removeEventListener("wheel", onWheel);
    };
  }, []);

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        background: "#111",
        overflow: "hidden",
        position: "relative",
        cursor,
        userSelect: "none",
      }}
    >
      <Canvas
        frameloop="always"
        dpr={[1, 2]}
        camera={{ position: [0, 2, 62], fov: 40 }}
        gl={{
          antialias: true,
          powerPreference: "high-performance",
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.1,
          outputColorSpace: THREE.SRGBColorSpace,
          failIfMajorPerformanceCaveat: false,
        }}
      >
        <ambientLight intensity={1.0} />
        <directionalLight position={[5, 10, 5]} intensity={2.5} />
        <directionalLight position={[-5, 2, -5]} intensity={0.8} color="#ffd0a0" />
        <pointLight position={[0, 8, 0]} intensity={1.2} color="#ff4400" decay={2} />

        <Suspense fallback={null}>
          <HorrorModel target={target} frozen={frozen} />
        </Suspense>

        <ZoomController zoom={zoom} />
      </Canvas>

      <div
        style={{
          position: "absolute",
          bottom: 20,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          gap: 12,
          alignItems: "center",
          whiteSpace: "nowrap",
        }}
      >
        <a
          href="/horror.glb"
          download="horror.glb"
          style={{
            padding: "10px 24px",
            background: "rgba(220,40,0,0.88)",
            color: "#fff",
            borderRadius: 8,
            fontFamily: "sans-serif",
            fontWeight: 700,
            fontSize: 14,
            textDecoration: "none",
            border: "1px solid rgba(255,80,0,0.5)",
            letterSpacing: "0.04em",
            boxShadow: "0 0 20px rgba(255,40,0,0.35)",
          }}
        >
          ⬇ Download Model (.glb)
        </a>
        <span
          style={{
            color: "rgba(255,255,255,0.4)",
            fontFamily: "sans-serif",
            fontSize: 12,
          }}
        >
          Hold to freeze · Scroll to zoom
        </span>
      </div>
    </div>
  );
}
