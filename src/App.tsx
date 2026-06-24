import { Suspense, useRef, useEffect } from "react";
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

export default function App() {
  const target = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      target.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
      target.current.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };

    document.addEventListener("pointermove", onMove, { capture: true });
    return () => {
      document.removeEventListener("pointermove", onMove, { capture: true });
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
        cursor: "url('/harlequin.png') 0 0, auto",
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
          bottom: 20,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 10,
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

        <p className="mx-auto max-w-lg py-2 text-left">
          <EncryptedText
            text="Made By AMIT"
            encryptedClassName="text-neutral-500"
            revealedClassName="dark:text-white text-white"
            revealDelayMs={50}
          />
        </p>
      </div>
    </div>
  );
}
