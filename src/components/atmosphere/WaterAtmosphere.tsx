import { useEffect, useRef } from 'react';
import type { FC } from 'react';

const WaterAtmosphere: FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let width = 0,
      height = 0,
      frame = 0,
      raf = 0;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      width = rect.width;
      height = rect.height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const particles = Array.from({ length: 34 }, (_, i) => ({
      x: Math.random(),
      y: Math.random(),
      r: 1 + Math.random() * 2.3,
      s: 0.00008 + Math.random() * 0.00022,
      phase: i * 1.7,
    }));
    const draw = () => {
      frame += 1;
      context.clearRect(0, 0, width, height);
      const glow = context.createRadialGradient(width * 0.72, height * 0.12, 0, width * 0.72, height * 0.12, Math.max(width, height) * 0.72);
      glow.addColorStop(0, 'rgba(15,139,164,.13)');
      glow.addColorStop(1, 'rgba(5,31,50,0)');
      context.fillStyle = glow;
      context.fillRect(0, 0, width, height);
      for (let layer = 0; layer < 3; layer++) {
        context.beginPath();
        const base = height * (0.24 + layer * 0.23);
        for (let x = 0; x <= width; x += 8) {
          const y = base + Math.sin(x * 0.006 + frame * (reducedMotion ? 0 : 0.006) + layer * 1.8) * 11 + Math.sin(x * 0.013 + layer) * 5;
          x === 0 ? context.moveTo(x, y) : context.lineTo(x, y);
        }
        context.strokeStyle = `rgba(74,190,207,${0.055 - layer * 0.01})`;
        context.lineWidth = 1;
        context.stroke();
      }
      particles.forEach(p => {
        if (!reducedMotion) p.y -= p.s;
        if (p.y < -0.02) p.y = 1.02;
        const x = p.x * width + Math.sin(frame * 0.008 + p.phase) * 12,
          y = p.y * height;
        context.beginPath();
        context.arc(x, y, p.r, 0, Math.PI * 2);
        context.fillStyle = `rgba(123,220,228,${0.12 + Math.sin(frame * 0.025 + p.phase) * 0.08})`;
        context.fill();
      });
      if (!reducedMotion) raf = requestAnimationFrame(draw);
    };
    resize();
    draw();
    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);
  return <canvas className="water-atmosphere" ref={canvasRef} aria-hidden="true" />;
};

export default WaterAtmosphere;
