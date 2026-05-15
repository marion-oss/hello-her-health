import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import type { OrbState } from './orb.types';

// ─── Constants ────────────────────────────────────────────────────────────────

const CORE_RADIUS   = 80;
const NUM_BARS      = 48;
const BAR_MIN       = 5;
const BAR_MAX       = 42;
const LERP_SPEED    = 0.04;

// ─── Types ────────────────────────────────────────────────────────────────────

interface PulseRing {
  radius:  number;
  opacity: number;
  speed:   number;
}

interface AnimParams {
  glowIntensity: number;
  waveformAmp:   number;
}

interface StateTarget {
  glowIntensity:  number;
  waveformAmp:    number;
  pulseIntervalMs: number;
}

// ─── State targets ────────────────────────────────────────────────────────────

const STATE_TARGETS: Record<OrbState, StateTarget> = {
  idle:     { glowIntensity: 12, waveformAmp: 0.03, pulseIntervalMs: 3200 },
  thinking: { glowIntensity: 28, waveformAmp: 0,    pulseIntervalMs: 1200 },
  speaking: { glowIntensity: 50, waveformAmp: 1,    pulseIntervalMs: 500  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useOrbAnimation(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  state: OrbState,
) {
  const stateRef       = useRef<OrbState>(state);
  const pulseRingsRef  = useRef<PulseRing[]>([]);
  const lastPulseRef   = useRef(0);
  const paramsRef      = useRef<AnimParams>({ glowIntensity: 12, waveformAmp: 0.03 });

  useEffect(() => { stateRef.current = state; }, [state]);

  // ── Resize ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function resize() {
      if (!canvas) return;
      const dpr  = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width  = rect.width  * dpr;
      canvas.height = rect.height * dpr;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [canvasRef]);

  // ── Animation loop ─────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let rafId: number;
    let startTime: number | null = null;

    function animate(timestamp: number) {
      if (!canvas) return;
      if (startTime === null) startTime = timestamp;
      const t = (timestamp - startTime) * 0.001; // seconds

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const w   = canvas.width  / dpr;
      const h   = canvas.height / dpr;
      const cx  = w / 2;
      const cy  = h / 2;

      ctx.clearRect(0, 0, w, h);

      const target = STATE_TARGETS[stateRef.current];
      const p      = paramsRef.current;

      p.glowIntensity = lerp(p.glowIntensity, target.glowIntensity, LERP_SPEED);
      p.waveformAmp   = lerp(p.waveformAmp,   target.waveformAmp,   LERP_SPEED);

      // ── Simulated audio amplitude ─────────────────────────────────────────
      const rawAmp =
        stateRef.current === 'speaking'
          ? (Math.sin(t * 9.1) * 0.35 + Math.sin(t * 14.7) * 0.25 + Math.sin(t * 5.3) * 0.2 + 0.55)
          : 0;
      const amplitude = rawAmp * p.waveformAmp;

      // ── Thinking flicker ─────────────────────────────────────────────────
      const flicker =
        stateRef.current === 'thinking'
          ? 0.82 + Math.sin(t * 19) * 0.1 + Math.sin(t * 37) * 0.08
          : 1;

      // ── Spawn pulse rings ─────────────────────────────────────────────────
      if (
        target.pulseIntervalMs > 0 &&
        timestamp - lastPulseRef.current > target.pulseIntervalMs
      ) {
        pulseRingsRef.current.push({
          radius:  CORE_RADIUS + 2,
          opacity: stateRef.current === 'speaking' ? 0.7 : 0.4,
          speed:   stateRef.current === 'speaking' ? 2.2 : 1.4,
        });
        lastPulseRef.current = timestamp;
      }

      // ── Draw pulse rings ─────────────────────────────────────────────────
      pulseRingsRef.current = pulseRingsRef.current.filter((r) => r.opacity > 0.01);

      for (const ring of pulseRingsRef.current) {
        ring.radius  += ring.speed;
        ring.opacity *= 0.965;

        ctx.beginPath();
        ctx.arc(cx, cy, ring.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(133, 57, 83, ${ring.opacity})`;
        ctx.lineWidth   = 1.5;
        ctx.stroke();
      }

      // ── Draw waveform bars ────────────────────────────────────────────────
      const barOpacity = Math.min(1, p.waveformAmp * 2.5 + 0.15);

      for (let i = 0; i < NUM_BARS; i++) {
        const angle  = (i / NUM_BARS) * Math.PI * 2;
        const noise  =
          Math.sin(angle * 3 + t * 6)  * 0.25 +
          Math.sin(angle * 7 - t * 4)  * 0.15 +
          Math.sin(angle * 11 + t * 2) * 0.1;
        const barH   = BAR_MIN + Math.max(0, amplitude + noise * amplitude) * BAR_MAX;
        const inner  = CORE_RADIUS + 5;
        const outer  = inner + barH;

        const x1 = cx + Math.cos(angle) * inner;
        const y1 = cy + Math.sin(angle) * inner;
        const x2 = cx + Math.cos(angle) * outer;
        const y2 = cy + Math.sin(angle) * outer;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = `rgba(243, 244, 244, ${barOpacity})`;
        ctx.lineWidth   = 3;
        ctx.lineCap     = 'round';
        ctx.stroke();
      }

      // ── Draw core glow ────────────────────────────────────────────────────
      ctx.shadowBlur  = p.glowIntensity * flicker;
      ctx.shadowColor = '#853953';

      // Outer ring
      ctx.beginPath();
      ctx.arc(cx, cy, CORE_RADIUS, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(133, 57, 83, ${0.65 * flicker})`;
      ctx.lineWidth   = 2.5;
      ctx.stroke();

      // Core radial gradient (metallic speaker)
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, CORE_RADIUS);
      grad.addColorStop(0,    `rgba(243, 244, 244, ${0.95 * flicker})`); // light centre
      grad.addColorStop(0.35, `rgba(133, 57,  83,  ${0.85 * flicker})`); // plum-pink mid
      grad.addColorStop(0.72, `rgba(97,  45,  83,  ${0.9  * flicker})`); // deep plum outer
      grad.addColorStop(1,    `rgba(44,  44,  44,  0.95)`);              // blends into bg

      ctx.beginPath();
      ctx.arc(cx, cy, CORE_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      // ── Decorative concentric speaker rings ───────────────────────────────
      ctx.shadowBlur = 0;
      for (const frac of [0.65, 0.45, 0.27]) {
        ctx.beginPath();
        ctx.arc(cx, cy, CORE_RADIUS * frac, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(97, 45, 83, ${0.30 * flicker})`;
        ctx.lineWidth   = 1;
        ctx.stroke();
      }

      // Centre dot
      ctx.beginPath();
      ctx.arc(cx, cy, 5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(243, 244, 244, ${0.95 * flicker})`;
      ctx.fill();

      rafId = requestAnimationFrame(animate);
    }

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [canvasRef]);
}
