import { Suspense, useRef, useEffect, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, useAnimations } from "@react-three/drei";
import { EncryptedText } from "@/components/ui/encrypted-text";
import * as THREE from "three";

function useHorrorAmbient(active: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!active) return;

    const ctx = new AudioContext();
    ctxRef.current = ctx;

    const master = ctx.createGain();
    master.gain.setValueAtTime(0, ctx.currentTime);
    master.gain.linearRampToValueAtTime(0.55, ctx.currentTime + 4);
    master.connect(ctx.destination);

    // ── 1. Deep rumble drone (two detuned saws) ──────────────────────
    const droneGain = ctx.createGain();
    droneGain.gain.value = 0.18;
    droneGain.connect(master);

    const lfo = ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = 0.12;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.06;
    lfo.connect(lfoGain);
    lfoGain.connect(droneGain.gain);
    lfo.start();

    [55, 55.35, 27.5].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = i === 2 ? "sine" : "sawtooth";
      osc.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.value = i === 2 ? 0.6 : 0.4;
      osc.connect(g);
      g.connect(droneGain);
      osc.start();
    });

    // ── 2. Dark filtered noise ────────────────────────────────────────
    const bufLen = ctx.sampleRate * 6;
    const noiseBuffer = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;

    const lpf = ctx.createBiquadFilter();
    lpf.type = "lowpass";
    lpf.frequency.value = 180;
    lpf.Q.value = 3.5;

    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.09;

    noise.connect(lpf);
    lpf.connect(noiseGain);
    noiseGain.connect(master);
    noise.start();

    // ── 3. Eerie high-pitch whisper tones ────────────────────────────
    const whisperGain = ctx.createGain();
    whisperGain.gain.value = 0.04;
    whisperGain.connect(master);

    const whisper1 = ctx.createOscillator();
    whisper1.type = "sine";
    whisper1.frequency.value = 880;
    const whisper2 = ctx.createOscillator();
    whisper2.type = "sine";
    whisper2.frequency.value = 1108;

    const whisperLfo = ctx.createOscillator();
    whisperLfo.type = "sine";
    whisperLfo.frequency.value = 0.07;
    const whisperLfoGain = ctx.createGain();
    whisperLfoGain.gain.value = 0.035;
    whisperLfo.connect(whisperLfoGain);
    whisperLfoGain.connect(whisperGain.gain);
    whisperLfo.start();

    [whisper1, whisper2].forEach(w => { w.connect(whisperGain); w.start(); });

    // ── 4. Occasional deep heartbeat thud ────────────────────────────
    const scheduleThud = () => {
      if (!ctxRef.current || ctxRef.current.state === "closed") return;
      const when = ctx.currentTime + 2 + Math.random() * 6;

      const thud = ctx.createOscillator();
      thud.type = "sine";
      thud.frequency.setValueAtTime(80, when);
      thud.frequency.exponentialRampToValueAtTime(20, when + 0.4);

      const thudGain = ctx.createGain();
      thudGain.gain.setValueAtTime(0.55, when);
      thudGain.gain.exponentialRampToValueAtTime(0.001, when + 0.5);

      thud.connect(thudGain);
      thudGain.connect(master);
      thud.start(when);
      thud.stop(when + 0.55);

      const delay = 3000 + Math.random() * 8000;
      setTimeout(scheduleThud, delay);
    };
    setTimeout(scheduleThud, 3000);

    // ── 5. Slow pitch-bend on drone for unease ────────────────────────
    const bendOsc = ctx.createOscillator();
    bendOsc.type = "triangle";
    bendOsc.frequency.value = 110;
    const bendGain = ctx.createGain();
    bendGain.gain.value = 0.06;
    bendOsc.connect(bendGain);
    bendGain.connect(master);
    bendOsc.start();

    const driftFreq = () => {
      if (!ctxRef.current || ctxRef.current.state === "closed") return;
      const target = 100 + Math.random() * 25;
      bendOsc.frequency.linearRampToValueAtTime(target, ctx.currentTime + 6 + Math.random() * 8);
      setTimeout(driftFreq, (7 + Math.random() * 9) * 1000);
    };
    setTimeout(driftFreq, 4000);

    return () => {
      ctx.close();
      ctxRef.current = null;
    };
  }, [active]);
}

function LoadingScreen({ progress }: { progress: number }) {
  return (
    <div className="loading">
      <style>{`
        @import url(https://fonts.googleapis.com/css?family=Quattrocento+Sans);

        .loading {
          position: fixed;
          top: 0; left: 0;
          width: 100%; height: 100%;
          background: #000;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .loading-text {
          text-align: center;
          line-height: 100px;
          height: 100px;
          margin-bottom: 40px;
        }

        .loading-text span {
          display: inline-block;
          margin: 0 5px;
          color: #fff;
          font-family: 'Quattrocento Sans', sans-serif;
          font-size: 2rem;
          font-weight: 700;
          filter: blur(0px);
        }

        .loading-text span:nth-child(1) { animation: blur-text 1.5s 0s infinite linear alternate; }
        .loading-text span:nth-child(2) { animation: blur-text 1.5s 0.2s infinite linear alternate; }
        .loading-text span:nth-child(3) { animation: blur-text 1.5s 0.4s infinite linear alternate; }
        .loading-text span:nth-child(4) { animation: blur-text 1.5s 0.6s infinite linear alternate; }
        .loading-text span:nth-child(5) { animation: blur-text 1.5s 0.8s infinite linear alternate; }
        .loading-text span:nth-child(6) { animation: blur-text 1.5s 1.0s infinite linear alternate; }
        .loading-text span:nth-child(7) { animation: blur-text 1.5s 1.2s infinite linear alternate; }

        @keyframes blur-text {
          0%   { filter: blur(0px); }
          100% { filter: blur(4px); }
        }

        .progress-container {
          width: 300px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
        }

        .progress-bar-bg {
          width: 100%;
          height: 3px;
          background: rgba(255,255,255,0.15);
          border-radius: 2px;
          overflow: hidden;
        }

        .progress-bar-fill {
          height: 100%;
          background: #fff;
          border-radius: 2px;
          transition: width 0.1s linear;
        }

        .progress-label {
          font-family: 'Quattrocento Sans', sans-serif;
          color: rgba(255,255,255,0.5);
          font-size: 0.75rem;
          letter-spacing: 0.15em;
        }

        .loading-fade-out {
          animation: fadeOut 0.6s ease forwards;
        }

        @keyframes fadeOut {
          from { opacity: 1; }
          to   { opacity: 0; pointer-events: none; }
        }
      `}</style>

      <div className="loading-text">
        {'LOADING'.split('').map((l, i) => (
          <span key={i}>{l}</span>
        ))}
      </div>

      <div className="progress-container">
        <div className="progress-bar-bg">
          <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
        </div>
        <span className="progress-label">{Math.round(progress)}%</span>
      </div>
    </div>
  );
}

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

const LOAD_DURATION = 5000;

export default function App() {
  const target = useRef({ x: 0, y: 0 });
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);

  useHorrorAmbient(done);

  useEffect(() => {
    const start = performance.now();

    const tick = () => {
      const elapsed = performance.now() - start;
      const pct = Math.min((elapsed / LOAD_DURATION) * 100, 100);
      setProgress(pct);

      if (pct < 100) {
        requestAnimationFrame(tick);
      } else {
        setFadingOut(true);
        setTimeout(() => setDone(true), 650);
      }
    };

    requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      target.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
      target.current.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    document.addEventListener("pointermove", onMove, { capture: true });
    return () => document.removeEventListener("pointermove", onMove, { capture: true });
  }, []);

  return (
    <>
      <style>{`* { cursor: none !important; }`}</style>

      {!done && (
        <div className={fadingOut ? "loading-fade-out" : ""}>
          <LoadingScreen progress={progress} />
        </div>
      )}

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
    </>
  );
}
