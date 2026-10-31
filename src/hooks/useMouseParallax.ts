import { useEffect, useRef } from 'react';

interface MousePosition {
  x: number; // -1 to 1
  y: number; // -1 to 1
}

/**
 * Tracks normalised mouse position (-1..1 each axis) for parallax effects.
 * Returns a ref rather than state to avoid re-renders on every mousemove.
 * Skips entirely when prefers-reduced-motion is set.
 */
export function useMouseParallax(): React.RefObject<MousePosition> {
  const posRef = useRef<MousePosition>({ x: 0, y: 0 });

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reducedMotion.matches) return;

    const handler = (e: MouseEvent) => {
      posRef.current = {
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: (e.clientY / window.innerHeight) * 2 - 1,
      };
    };

    window.addEventListener('mousemove', handler, { passive: true });
    return () => window.removeEventListener('mousemove', handler);
  }, []);

  return posRef;
}
