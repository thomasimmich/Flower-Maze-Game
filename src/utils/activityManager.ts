import { LevelActivity } from '../types/game';

const ACTIVITY_MAP: Record<number, LevelActivity> = {
  1: 'normal',
  2: 'rain',
  3: 'gate',
  4: 'darkness',
};

const RANDOM_POOL: LevelActivity[] = ['rain', 'gate', 'darkness'];

export function getActivity(level: number): LevelActivity {
  if (ACTIVITY_MAP[level]) return ACTIVITY_MAP[level];
  // Level 5+ → zufällig aber deterministisch per Level-Seed
  return RANDOM_POOL[level % RANDOM_POOL.length];
}

export const ACTIVITY_LABELS: Record<LevelActivity, string> = {
  normal:   '🌸 Blumen gießen',
  rain:     '🌧️ Regen – beeil dich!',
  gate:     '🚧 Tor passieren',
  darkness: '🌑 Im Dunkeln',
};
