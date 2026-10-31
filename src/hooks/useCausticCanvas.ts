import { useEffect, useRef } from 'react';

/**
 * Renders a moving caustic-light shimmer on a canvas overlay.
 * Uses layered sine-wave patterns to mimic underwater light refraction.
 * Purely RAF-driven, no React state updates per frame.
 */
export function useCausticCanvas(
  containerRef: React.RefObject<HTMLElement | null>,
  sceneIndex: number        // changes caustic colour/speed per scene
): void {
  const sceneRef = useRef(sceneIndex);
  useEffect(() => { sceneRef.current = sceneIndex; }, [sceneIndex]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reducedMotion.matches) return;

    const canvas = document.createElement('canvas');
    canvas.style.cssText = `
      position:absolute;inset:0;width:100%;height:100%;
      pointer-events:none;z-index:4;mix-blend-mode:screen;
    `;
    container.appendChild(canvas);

    const resize = () => {
      canvas.width  = Math.round(container.clientWidth  * 0.5); // half-res for perf
      canvas.height = Math.round(container.clientHeight * 0.5);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    let rafId: number;
    let t = 0;

    // Per-scene colour palette
    const palettes = [
      // Scene 0: MOVE — electric cyan + bright white
      [[0, 207, 255], [105, 231, 245], [255, 255, 255]],
      // Scene 1: IMPROVE — warm teal + gold glint
      [[0, 160, 180], [80, 200, 200], [220, 240, 255]],
      // Scene 2: ENJOY — deep ocean + turquoise
      [[0, 130, 200], [0, 207, 255], [180, 240, 255]],
    ] as const;

    const draw = () => {
      t += 0.008;
      const ctx = canvas.getContext('2d');
      if (!ctx) { rafId = requestAnimationFrame(draw); return; }

      const W = canvas.width;
      const H = canvas.height;
      const pal = palettes[sceneRef.current % palettes.length];

      ctx.clearRect(0, 0, W, H);

      // Draw 6 overlapping caustic "cells"
      const count = 6;
      for (let k = 0; k < count; k++) {
        const phase  = (k / count) * Math.PI * 2;
        const cx     = W * (0.3 + 0.4 * Math.sin(t * 0.7 + phase));
        const cy     = H * (0.3 + 0.4 * Math.cos(t * 0.5 + phase * 1.3));
        const radius = W * (0.12 + 0.09 * Math.sin(t * 1.1 + phase * 0.8));
        const [r, g, b] = pal[k % pal.length];
        const alpha  = 0.03 + 0.025 * Math.sin(t * 1.8 + phase);

        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        grad.addColorStop(0,   `rgba(${r},${g},${b},${alpha})`);
        grad.addColorStop(0.5, `rgba(${r},${g},${b},${alpha * 0.4})`);
        grad.addColorStop(1,   `rgba(${r},${g},${b},0)`);

        ctx.beginPath();
        ctx.ellipse(
          cx, cy,
          radius,
          radius * (0.6 + 0.3 * Math.sin(t * 0.9 + phase)),
          t * 0.4 + phase,
          0, Math.PI * 2
        );
        ctx.fillStyle = grad;
        ctx.fill();
      }

      rafId = requestAnimationFrame(draw);
    };
    rafId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      canvas.remove();
    };
  // Only run once; sceneIndex changes are handled via sceneRef
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef]);
}
