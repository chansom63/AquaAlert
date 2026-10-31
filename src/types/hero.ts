// Hero section type definitions

export interface HeroScene {
  id: number;
  keyword: string;
  headline: string;
  subtext: string;
  image: string;
  accentColor: string;
  tintColor: string;
  objectPosition: string;
}

export interface BubbleConfig {
  id: number;
  x: number;        // %
  size: number;     // px
  duration: number; // seconds
  delay: number;    // seconds
  opacity: number;
}

export interface ParticleConfig {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
}
