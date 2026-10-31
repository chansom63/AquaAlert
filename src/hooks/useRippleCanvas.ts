import { useEffect, useRef } from 'react';

/**
 * Renders an interactive water-ripple canvas overlay.
 * Each click (or touch) spawns a concentric wave ring that expands and fades.
 * Runs entirely on a canvas element — no React state updates per frame.
 */

interface Ripple {
  x: number;
  y: number;
  r: number;       // current radius
  maxR: number;    // max radius
  alpha: number;   // current opacity
  speed: number;   // px per frame
}

export function useRippleCanvas(
  containerRef: React.RefObject<HTMLElement | null>
): React.RefObject<HTMLCanvasElement | null> {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Create and insert canvas
    const canvas = document.createElement('canvas');
    canvas.style.cssText = `
      position:absolute;inset:0;width:100%;height:100%;
      pointer-events:none;z-index:6;
    `;
    container.appendChild(canvas);
    canvasRef.current = canvas;

    const ripples: Ripple[] = [];
    let rafId: number;

    const resize = () => {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    // Spawn a ripple at (x, y) relative to container
    const spawn = (x: number, y: number) => {
      const diag = Math.hypot(canvas.width, canvas.height);
      ripples.push({
        x, y, r: 0,
        maxR: diag * 0.55,
        alpha: 0.55,
        speed: 3.5 + Math.random() * 2,
      });
      // Spawn a second, slightly delayed inner ring
      setTimeout(() => {
        ripples.push({
          x, y, r: 0,
          maxR: diag * 0.35,
          alpha: 0.35,
          speed: 2.5 + Math.random(),
        });
      }, 100);
    };

    const onClick = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      spawn(e.clientX - rect.left, e.clientY - rect.top);
    };
    const onTouch = (e: TouchEvent) => {
      const rect = container.getBoundingClientRect();
      for (const t of Array.from(e.touches)) {
        spawn(t.clientX - rect.left, t.clientY - rect.top);
      }
    };

    container.addEventListener('click', onClick);
    container.addEventListener('touchstart', onTouch, { passive: true });

    const draw = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) { rafId = requestAnimationFrame(draw); return; }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = ripples.length - 1; i >= 0; i--) {
        const rp = ripples[i];
        rp.r += rp.speed;
        rp.alpha = Math.max(0, rp.alpha - 0.008);

        if (rp.alpha <= 0 || rp.r > rp.maxR) {
          ripples.splice(i, 1);
          continue;
        }

        // Outer ring
        ctx.beginPath();
        ctx.arc(rp.x, rp.y, rp.r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0,207,255,${rp.alpha * 0.7})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Inner glow ring (slightly smaller)
        if (rp.r > 10) {
          ctx.beginPath();
          ctx.arc(rp.x, rp.y, rp.r * 0.85, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(255,255,255,${rp.alpha * 0.25})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }

      rafId = requestAnimationFrame(draw);
    };
    rafId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      container.removeEventListener('click', onClick);
      container.removeEventListener('touchstart', onTouch);
      canvas.remove();
      canvasRef.current = null;
    };
  }, [containerRef]);

  return canvasRef;
}
