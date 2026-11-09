import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
  type FC,
} from 'react';
import './CinematicHero.css';
import { useAutoAdvance }          from '../../hooks/useAutoAdvance';
import { useBubbles, useParticles } from '../../hooks/useWaterEffects';
import { useMouseParallax }         from '../../hooks/useMouseParallax';
import { useRippleCanvas }          from '../../hooks/useRippleCanvas';
import type { HeroScene }           from '../../types/hero';

/* ─────────────────────────────────────────────────────────────────────────────
   SCENE DATA
   The video is a shared, always-on background layer.
   Each scene controls only its text, accent colour and a subtle colour-grade
   overlay that is blended on top of the video so each scene feels distinct.
───────────────────────────────────────────────────────────────────────────── */
const SCENES: HeroScene[] = [
  {
    id: 0,
    keyword: 'QUALITY',
    headline: 'Water quality alerts',
    subtext: 'A water quality alert system for Gwalior.',
    image: '/images/water-pour.jpg',      // poster / fallback
    accentColor: '#00CFFF',
    tintColor: 'rgba(0, 80, 160, 0.18)', // cool cyan tint
    objectPosition: 'center center',
  },
  {
    id: 1,
    keyword: 'ALERTS',
    headline: 'Readings with context',
    subtext: 'Review sample dates, water parameters, and notices together.',
    image: '/images/water-hands.jpg',
    accentColor: '#69E7F5',
    tintColor: 'rgba(3, 27, 61, 0.28)',  // deeper navy tint
    objectPosition: 'center center',
  },
  {
    id: 2,
    keyword: 'UPDATES',
    headline: 'Clear public updates',
    subtext: 'Check screening and response information across Gwalior wards.',
    image: '/images/water-underwater.jpg',
    accentColor: '#00CFFF',
    tintColor: 'rgba(0, 40, 100, 0.20)', // ocean-depth tint
    objectPosition: 'center center',
  },
  {
    id: 3,
    keyword: 'REPORTS',
    headline: 'Water quality reports',
    subtext: 'Review findings, sample dates, and verification details.',
    image: '/images/water-pour.jpg',
    accentColor: '#FFD166',
    tintColor: 'rgba(8, 54, 88, 0.24)',
    objectPosition: 'center center',
  },
];

const SCENE_DURATION = 7000; // ms

/* ─────────────────────────────────────────────────────────────────────────────
   DUAL-VIDEO BACKGROUND (SEQUENTIAL LOOP)
   Plays Video 1 (rising bubbles) -> Video 2 (water pour/splash) -> Video 1 ...
   Performs a seamless cinematic cross-dissolve with zero black frame or dip.
   Muted, autoplaying, playsInline for universal mobile/desktop compatibility.
───────────────────────────────────────────────────────────────────────────── */
const BACKGROUND_VIDEOS = [
  {
    id: 'bubbles',
    src: '/videos/water-bubbles.mp4',
    poster: '/images/water-underwater.jpg',
  },
  {
    id: 'splash',
    src: '/videos/water-splash.mp4',
    poster: '/images/water-pour.jpg',
  },
];

const VideoBackground: FC<{ tintColor: string }> = ({ tintColor }) => {
  const [activeIdx, setActiveIdx] = useState(0);
  const [prevIdx, setPrevIdx]     = useState<number | null>(null);

  const video0Ref = useRef<HTMLVideoElement>(null);
  const video1Ref = useRef<HTMLVideoElement>(null);

  const activeIdxRef        = useRef(0);
  const lastTriggeredIdxRef = useRef<number | null>(null);
  const cleanupTimerRef     = useRef<number | null>(null);
  const heroVisibleRef      = useRef(true);

  const handleVideoTransition = useCallback((completedIdx: number) => {
    if (!heroVisibleRef.current || document.hidden) return;
    // Prevent duplicate triggers for the same video segment
    if (lastTriggeredIdxRef.current === completedIdx) return;
    lastTriggeredIdxRef.current = completedIdx;

    const nextIdx = (completedIdx + 1) % BACKGROUND_VIDEOS.length;
    const nextVideo = nextIdx === 0 ? video0Ref.current : video1Ref.current;
    const currentVideo = completedIdx === 0 ? video0Ref.current : video1Ref.current;

    if (nextVideo) {
      nextVideo.currentTime = 0;
      nextVideo.muted = true;
      nextVideo.defaultMuted = true;
      const playPromise = nextVideo.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {});
      }
    }

    setActiveIdx(nextIdx);
    activeIdxRef.current = nextIdx;
    setPrevIdx(completedIdx);

    // Cancel any previous cleanup timer before setting a new one
    if (cleanupTimerRef.current !== null) {
      window.clearTimeout(cleanupTimerRef.current);
    }

    cleanupTimerRef.current = window.setTimeout(() => {
      if (currentVideo) {
        currentVideo.pause();
        currentVideo.currentTime = 0;
      }
      setPrevIdx(null);
    }, 1250);
  }, []);

  // Only decode/play the background while the hero is on screen.
  useEffect(() => {
    const hero = video0Ref.current?.closest('.hero');
    if (hero) {
      const bounds = hero.getBoundingClientRect();
      heroVisibleRef.current = bounds.bottom > 0 && bounds.top < window.innerHeight;
    }
    const playCurrentVideo = () => {
      if (!heroVisibleRef.current || document.hidden) return;
      const cur = activeIdxRef.current === 0 ? video0Ref.current : video1Ref.current;
      if (cur && cur.paused) {
        cur.muted = true;
        cur.play().catch(() => {});
      }
    };

    const pauseVideos = () => {
      video0Ref.current?.pause();
      video1Ref.current?.pause();
      if (cleanupTimerRef.current !== null) {
        window.clearTimeout(cleanupTimerRef.current);
        cleanupTimerRef.current = null;
      }
    };

    const observer = hero ? new IntersectionObserver(([entry]) => {
      heroVisibleRef.current = entry.isIntersecting && entry.intersectionRatio > 0;
      if (heroVisibleRef.current) playCurrentVideo();
      else pauseVideos();
    }, { threshold: 0.01 }) : null;
    if (hero) observer?.observe(hero);

    const handleVisibility = () => {
      if (document.hidden) pauseVideos();
      else playCurrentVideo();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    // Attempt autoplay once; the observer gates playback if the hero is offscreen.
    playCurrentVideo();

    return () => {
      observer?.disconnect();
      document.removeEventListener('visibilitychange', handleVisibility);
      pauseVideos();
      if (cleanupTimerRef.current !== null) {
        window.clearTimeout(cleanupTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="hero__video-wrap" aria-hidden="true">
      {BACKGROUND_VIDEOS.map((item, idx) => {
        const isActive   = activeIdx === idx;
        const isOutgoing = prevIdx === idx;
        const statusClass = isActive
          ? 'hero__video--active'
          : isOutgoing
          ? 'hero__video--outgoing'
          : 'hero__video--idle';
        const videoRef = idx === 0 ? video0Ref : video1Ref;

        return (
          <video
            key={item.id}
            ref={videoRef}
            className={`hero__video ${statusClass}`}
            src={item.src}
            poster={item.poster}
            muted
            loop
            playsInline
            disablePictureInPicture
            preload="metadata"
            onTimeUpdate={(e) => {
              if (!isActive) return;
              const el = e.currentTarget;
              if (el.duration && el.currentTime >= el.duration - 1.0) {
                handleVideoTransition(idx);
              }
            }}
            onEnded={() => {
              if (isActive) {
                handleVideoTransition(idx);
              }
            }}
          />
        );
      })}

      {/* Per-scene colour-grade overlay — transitions with the scene */}
      <div
        className="hero__video-tint"
        style={{ background: tintColor }}
      />
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   SCENE NAV BUTTON
───────────────────────────────────────────────────────────────────────────── */
const SceneNavBtn: FC<{
  scene:        HeroScene;
  isActive:     boolean;
  progress:     number;
  onClick:      () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}> = ({ scene, isActive, progress, onClick, onMouseEnter, onMouseLeave }) => (
  <button
    className={`hero__scene-btn${isActive ? ' hero__scene-btn--active' : ''}`}
    onClick={onClick}
    onMouseEnter={onMouseEnter}
    onMouseLeave={onMouseLeave}
    aria-label={`Go to scene: ${scene.keyword}`}
    aria-pressed={isActive}
  >
    <span className="hero__scene-btn-label">{scene.keyword}</span>
    <span className="hero__scene-btn-track" aria-hidden="true">
      <span
        className="hero__scene-btn-fill"
        style={{ width: isActive ? `${progress * 100}%` : '0%' }}
      />
      <span className="hero__scene-btn-dot" />
    </span>
  </button>
);

/* ─────────────────────────────────────────────────────────────────────────────
   BUBBLE / PARTICLE helpers
───────────────────────────────────────────────────────────────────────────── */
const Bubble: FC<{ x:number; size:number; duration:number; delay:number; opacity:number }> = (
  { x, size, duration, delay, opacity }
) => (
  <div
    className="hero__bubble"
    style={{
      left: `${x}%`,
      width:  `${size}px`,
      height: `${size}px`,
      animationDuration: `${duration}s`,
      animationDelay:    `${delay}s`,
      '--bubble-opacity': opacity,
    } as React.CSSProperties}
    aria-hidden="true"
  />
);

const Particle: FC<{ x:number; y:number; size:number; duration:number; delay:number }> = (
  { x, y, size, duration, delay }
) => (
  <div
    className="hero__particle"
    style={{
      left: `${x}%`,
      top:  `${y}%`,
      width:  `${size}px`,
      height: `${size}px`,
      animationDuration: `${duration}s`,
      animationDelay:    `${delay}s`,
    }}
    aria-hidden="true"
  />
);

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN HERO COMPONENT
───────────────────────────────────────────────────────────────────────────── */
const CinematicHero: FC<{ onLoginSelect?: (portal: 'citizen' | 'admin' | 'lab') => void }> = () => {
  const [currentScene, setCurrentScene] = useState(0);
  const [textPhase,    setTextPhase]    = useState<'entering' | 'exiting'>('entering');
  const [paused,       setPaused]       = useState(false);
  const [progress,     setProgress]     = useState(0);

  const mousePos      = useMouseParallax();
  const heroRef       = useRef<HTMLElement>(null);
  const parallaxRafId = useRef<number | null>(null);
  const sceneTransitionTimerRef = useRef<number | null>(null);

  const bubbles   = useBubbles(14);
  const particles = useParticles(18);

  // Click ripple effect
  useRippleCanvas(heroRef);

  /* ── Scene transition ── */
  const goToScene = useCallback((nextIdx: number) => {
    if (nextIdx === currentScene) return;
    if (sceneTransitionTimerRef.current !== null) {
      window.clearTimeout(sceneTransitionTimerRef.current);
    }
    setTextPhase('exiting');
    sceneTransitionTimerRef.current = window.setTimeout(() => {
      setCurrentScene(nextIdx);
      setProgress(0);
      setTextPhase('entering');
      sceneTransitionTimerRef.current = null;
    }, 400);
  }, [currentScene]);

  useEffect(() => () => {
    if (sceneTransitionTimerRef.current !== null) {
      window.clearTimeout(sceneTransitionTimerRef.current);
    }
  }, []);

  const advance = useCallback(() => {
    goToScene((currentScene + 1) % SCENES.length);
  }, [currentScene, goToScene]);

  /* ── Auto-advance ── */
  useAutoAdvance({
    totalScenes: SCENES.length,
    currentScene,
    duration: SCENE_DURATION,
    paused,
    onAdvance: advance,
    onProgress: setProgress,
  });

  /* ── Subtle mouse parallax on the video layer ── */
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let last = { x: 0, y: 0 };
    const loop = () => {
      const target = mousePos.current;
      if (target) {
        last = {
          x: last.x + (target.x - last.x) * 0.03,
          y: last.y + (target.y - last.y) * 0.03,
        };
        const videoWrap = heroRef.current?.querySelector<HTMLElement>('.hero__video-wrap');
        if (videoWrap) {
          videoWrap.style.transform = `translate(${last.x * 12}px, ${last.y * 7}px)`;
        }
      }
      parallaxRafId.current = requestAnimationFrame(loop);
    };
    parallaxRafId.current = requestAnimationFrame(loop);
    return () => {
      if (parallaxRafId.current !== null) cancelAnimationFrame(parallaxRafId.current);
    };
  }, [mousePos]);

  /* ── Keyboard navigation ── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        goToScene((currentScene + 1) % SCENES.length);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        goToScene((currentScene - 1 + SCENES.length) % SCENES.length);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [currentScene, goToScene]);


  const scene = SCENES[currentScene];

  return (
    <section
      className="hero"
      ref={heroRef}
      aria-label="Water Quality Alert System hero section"
      id="home"
    >
      {/* ── Real-video background ── */}
      <VideoBackground tintColor={scene.tintColor} />

      {/* ── Vignette ── */}
      <div className="hero__vignette" aria-hidden="true" />

      {/* ── Pentair-style geometric overlay ── */}
      <div className="hero__diamond-overlay" aria-hidden="true" />

      {/* ── Atmospheric bubbles & particles ── */}
      <div className="hero__atmosphere" aria-hidden="true">
        <div className="hero__light-ray" />
        {bubbles.map(b   => <Bubble   key={b.id} {...b} />)}
        {particles.map(p => <Particle key={p.id} {...p} />)}
      </div>

      {/* ── Brand Logo Header (Clean corner branding with no navbar links or login dropdown) ── */}
      <div className="hero__nav" aria-label="Site branding">
        <div className="hero__logo">
          <span className="hero__logo-name">AquaAlert</span>
          <span className="hero__logo-tagline">Water Quality Alert System</span>
        </div>
      </div>

      {/* ── Foreground content ── */}
      <div className="hero__content">
        <div className="hero__headline-wrap">
          <span
            key={`headline-${currentScene}`}
            className={`hero__headline hero__headline--${textPhase}`}
          >
            {scene.headline}
            <span className="hero__headline-period">.</span>
          </span>
        </div>

        <p
          key={`sub-${currentScene}`}
          className={`hero__sub hero__sub--${textPhase}`}
        >
          {scene.subtext}
        </p>

        <div className="hero__cta-row">
          <a href="#monitoring" className="hero__btn hero__btn--primary"   id="hero-cta-primary">
            Explore Water Network
          </a>
          <a href="#monitoring" className="hero__btn hero__btn--secondary" id="hero-cta-secondary">
            View Sample Dashboard
          </a>
        </div>
      </div>

      {/* ── Scene navigation ── */}
      <nav
        className="hero__scene-nav"
        aria-label="Scene navigation"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {SCENES.map((s, i) => (
          <SceneNavBtn
            key={s.id}
            scene={s}
            isActive={i === currentScene}
            progress={i === currentScene ? progress : 0}
            onClick={() => goToScene(i)}
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
          />
        ))}
      </nav>

    </section>
  );
};

export default CinematicHero;
