export interface Position {
  x: number;
  y: number;
}

export interface Flower {
  id: string;
  position: Position;
  watered: boolean;
  emoji: string;
  witheredAt?: number; // timestamp wann sie verdorrt wenn nicht gegossen
}

export interface Cell {
  x: number;
  y: number;
  walls: {
    top: boolean;
    right: boolean;
    bottom: boolean;
    left: boolean;
  };
  isExit?: boolean;
  isGate?: boolean;
}

export interface GameLevel {
  level: number;
  cols: number;
  rows: number;
  cells: Cell[][];
  flowers: Flower[];
  playerStart: Position;
  exitPosition: Position;
  hasGate?: boolean;
  gateRow?: number;
  gateStartCol?: number;
  gateEndCol?: number;
}

// Aktivitäten pro Level
export type LevelActivity = 'normal' | 'rain' | 'gate' | 'darkness';

export type GamePhase = 'room' | 'maze';
export type GameState = 'playing' | 'levelComplete';
