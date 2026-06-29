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
  furniture?: string;   // emoji of a furniture piece blocking the cell
  hiddenFlower?: boolean; // flower is hidden behind furniture here
}

export interface GameLevel {
  level: number;
  cols: number;
  rows: number;
  cells: Cell[][];
  flowers: Flower[];
  playerStart: Position;
  exitPosition: Position;
}

// 'room' = Blumen gießen im Raum
// 'maze' = Labyrinth zum nächsten Raum durchqueren
export type GamePhase = 'room' | 'maze';
export type GameState = 'playing' | 'levelComplete';
