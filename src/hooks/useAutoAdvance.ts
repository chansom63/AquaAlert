import { useEffect, useRef, useCallback } from 'react';

interface UseAutoAdvanceOptions {
  totalScenes: number;
  currentScene: number;
  duration: number; // ms
  paused: boolean;
  onAdvance: () => void;
  onProgress: (progress: number) => void;
}

/**
 * Drives automatic scene progression with smooth progress tracking.
 * Uses requestAnimationFrame for sub-tick accuracy.
 * Fully cleans up on unmount or when dependencies change.
 */
export function useAutoAdvance({
  totalScenes,
  currentScene,
  duration,
  paused,
  onAdvance,
  onProgress,
}: UseAutoAdvanceOptions): void {
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const pausedRef = useRef(paused);
  const onAdvanceRef = useRef(onAdvance);
  const onProgressRef = useRef(onProgress);

  // Keep refs current without re-triggering the effect
  useEffect(() => { pausedRef.current = paused; }, [paused]);
  useEffect(() => { onAdvanceRef.current = onAdvance; }, [onAdvance]);
  useEffect(() => { onProgressRef.current = onProgress; }, [onProgress]);

  const cancel = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    startRef.current = null;
  }, []);

  useEffect(() => {
    // Reset and restart whenever the current scene or duration changes
    cancel();

    let pauseOffset = 0;
    let pauseStart: number | null = null;

    const tick = (ts: number) => {
      if (startRef.current === null) startRef.current = ts;

      if (pausedRef.current) {
        if (pauseStart === null) pauseStart = ts;
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      if (pauseStart !== null) {
        pauseOffset += ts - pauseStart;
        pauseStart = null;
      }

      const elapsed = ts - startRef.current - pauseOffset;
      const progress = Math.min(elapsed / duration, 1);
      onProgressRef.current(progress);

      if (progress >= 1) {
        onAdvanceRef.current();
        return; // The effect will restart from the new scene
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return cancel;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentScene, duration, cancel]);

  // Cleanup on unmount
  useEffect(() => cancel, [cancel]);

  void totalScenes; // Acknowledge but don't use — scene count affects routing, not the timer
}
