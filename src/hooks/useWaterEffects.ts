import { useMemo } from 'react';
import type { BubbleConfig, ParticleConfig } from '../types/hero';

/**
 * Returns a stable, randomised set of bubble configs for the atmospheric layer.
 * Memoised so they never re-randomise on every render.
 */
export function useBubbles(count = 18): BubbleConfig[] {
  return useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      x: 5 + Math.random() * 90,
      size: 4 + Math.random() * 14,
      duration: 7 + Math.random() * 10,
      delay: Math.random() * 8,
      opacity: 0.15 + Math.random() * 0.35,
    }));
  }, [count]);
}

/**
 * Returns a stable, randomised set of floating dust/particle configs.
 */
export function useParticles(count = 22): ParticleConfig[] {
  return useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 1.5 + Math.random() * 3,
      duration: 12 + Math.random() * 16,
      delay: Math.random() * 10,
    }));
  }, [count]);
}
