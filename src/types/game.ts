export interface Position {
  x: number;
  y: number;
}

export interface Flower {
  id: string;
  position: Position;
  watered: boolean;
  emoji: string;
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
  isGate?: boolean;     // Teil des Tors (blockiert außer beim Loch)
  isGateHole?: boolean; // Das bewegliche Loch im Tor
}

export interface GameLevel {
  level: number;
  cols: number;
  rows: number;
  cells: Cell[][];
  flowers: Flower[];
  playerStart: Position;
  exitPosition: Position;
  hasGate?: boolean;    // Level 3+ hat ein Tor
  gateRow?: number;     // Zeile des Tors
  gateStartCol?: number;
  gateEndCol?: number;
}

export type GamePhase = 'room' | 'maze';
export type GameState = 'playing' | 'levelComplete' | 'gatePenalty';
