import { Suspense, useRef, useEffect, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, useAnimations } from "@react-three/drei";
import { EncryptedText } from "@/components/ui/encrypted-text";
import * as THREE from "three";

function HorrorModel({
  target,
}: {
  target: React.MutableRefObject<{ x: number; y: number }>;
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

    const MAX_V = (100 / 2) * (Math.PI / 180);
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

function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: -100, y: -100 });
  const ring = useRef({ x: -100, y: -100 });
  const rafId = useRef<number>(0);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pos.current = { x: e.clientX, y: e.clientY };
    };
    document.addEventListener("pointermove", onMove, { capture: true });

    const animate = () => {
      ring.current.x += (pos.current.x - ring.current.x) * 0.12;
      ring.current.y += (pos.current.y - ring.current.y) * 0.12;

      if (dotRef.current) {
        dotRef.current.style.transform = `translate(${pos.current.x - 4}px, ${pos.current.y - 4}px)`;
      }
      if (ringRef.current) {
        ringRef.current.style.transform = `translate(${ring.current.x - 14}px, ${ring.current.y - 14}px)`;
      }
      rafId.current = requestAnimationFrame(animate);
    };
    rafId.current = requestAnimationFrame(animate);

    return () => {
      document.removeEventListener("pointermove", onMove, { capture: true });
      cancelAnimationFrame(rafId.current);
    };
  }, []);

  return (
    <>
      <div
        ref={dotRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: "#ff2200",
          boxShadow: "0 0 8px 3px rgba(255,34,0,0.8)",
          pointerEvents: "none",
          zIndex: 9999,
          willChange: "transform",
          animation: "cursorPulse 1.2s ease-in-out infinite",
        }}
      />
      <div
        ref={ringRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: 28,
          height: 28,
          borderRadius: "50%",
          border: "1.5px solid rgba(255,80,0,0.7)",
          pointerEvents: "none",
          zIndex: 9998,
          willChange: "transform",
        }}
      />
    </>
  );
}

export default function App() {
  const target = useRef({ x: 0, y: 0 });
  const [, setTick] = useState(0);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      target.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
      target.current.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };

    document.addEventListener("pointermove", onMove, { capture: true });
    setTick(t => t + 1);
    return () => {
      document.removeEventListener("pointermove", onMove, { capture: true });
    };
  }, []);

  return (
    <>
      <style>{`
        @keyframes cursorPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.5); opacity: 0.6; }
        }
        * { cursor: none !important; }
      `}</style>

      <div
        style={{
          width: "100vw",
          height: "100vh",
          background: "#111",
          overflow: "hidden",
          position: "relative",
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
            <HorrorModel target={target} />
          </Suspense>
        </Canvas>

        <div
          style={{
            position: "absolute",
            bottom: 18,
            right: 22,
          }}
        >
          <p className="text-right">
            <EncryptedText
              text="Made By AMIT"
              encryptedClassName="text-neutral-500"
              revealedClassName="dark:text-white text-white"
              revealDelayMs={50}
            />
          </p>
        </div>
      </div>

      <CustomCursor />
    </>
  );
}
