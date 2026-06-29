import { Cell, GameLevel, Flower, Position } from '../types/game';

const FLOWER_EMOJIS = ['🌸', '🌺', '🌼', '🌻', '🌹', '🌷', '💐', '🪷'];

function shuffle<T>(array: T[], rng: () => number): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function makeRng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function carveMaze(cells: Cell[][], rows: number, cols: number, startR: number, startC: number, rng: () => number) {
  const visited: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false));

  function carve(r: number, c: number) {
    visited[r][c] = true;
    const dirs = shuffle(
      [
        { dr: -1, dc: 0, wall: 'top' as const, opp: 'bottom' as const },
        { dr: 1, dc: 0, wall: 'bottom' as const, opp: 'top' as const },
        { dr: 0, dc: -1, wall: 'left' as const, opp: 'right' as const },
        { dr: 0, dc: 1, wall: 'right' as const, opp: 'left' as const },
      ],
      rng
    );
    for (const { dr, dc, wall, opp } of dirs) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !visited[nr][nc]) {
        cells[r][c].walls[wall] = false;
        cells[nr][nc].walls[opp] = false;
        carve(nr, nc);
      }
    }
  }
  carve(startR, startC);
}

const FURNITURE = ['🪑', '🛋️', '📦', '🗄️', '🪣', '🧺', '🪴', '🖼️'];

// ── ROOM: open rectangular room with hidden flowers ──────────────────────────
export function generateRoom(level: number): GameLevel {
  const seed = level * 99991 + 1234;
  const rng = makeRng(seed);

  const cols = Math.min(6 + Math.floor(level * 0.5), 10);
  const rows = Math.min(5 + Math.floor(level * 0.5), 9);

  // Open room — only outer border walls
  const cells: Cell[][] = [];
  for (let r = 0; r < rows; r++) {
    cells[r] = [];
    for (let c = 0; c < cols; c++) {
      cells[r][c] = {
        x: c, y: r,
        walls: {
          top:    r === 0,
          right:  c === cols - 1,
          bottom: r === rows - 1,
          left:   c === 0,
        },
      };
    }
  }

  const playerStart: Position = { x: 0, y: 0 };
  const exitRow = Math.floor(rows / 2);
  const exitPosition: Position = { x: cols - 1, y: exitRow };
  cells[exitRow][cols - 1].walls.right = false;
  cells[exitRow][cols - 1].isExit = true;

  // ── Place flowers ──────────────────────────────────────────────────────
  const flowerCount = 2 + level;
  const allPositions: Position[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (c === 0 && r === 0) continue;
      if (c === cols - 1 && r === exitRow) continue;
      allPositions.push({ x: c, y: r });
    }
  }

  allPositions.sort((a, b) => (b.x + b.y) - (a.x + a.y));
  const farFraction = Math.min(0.4 + level * 0.05, 1.0);
  const pool = shuffle(allPositions.slice(0, Math.ceil(allPositions.length * farFraction)), rng);

  const pickedPositions: Position[] = [];
  for (const pos of pool) {
    const tooClose = pickedPositions.some(
      (p) => Math.abs(p.x - pos.x) + Math.abs(p.y - pos.y) < 2
    );
    if (!tooClose) pickedPositions.push(pos);
    if (pickedPositions.length >= flowerCount) break;
  }
  if (pickedPositions.length < flowerCount) {
    for (const pos of pool) {
      if (!pickedPositions.find((p) => p.x === pos.x && p.y === pos.y)) {
        pickedPositions.push(pos);
      }
      if (pickedPositions.length >= flowerCount) break;
    }
  }

  const shuffledEmojis = shuffle(FLOWER_EMOJIS, rng);
  const flowers: Flower[] = pickedPositions.map((pos, i) => ({
    id: `flower-${level}-${i}`,
    position: pos,
    watered: false,
    emoji: shuffledEmojis[i % shuffledEmojis.length],
  }));

  // ── Place furniture to hide flowers ────────────────────────────────────
  // Every flower cell gets a piece of furniture on top (hidden until adjacent)
  const shuffledFurniture = shuffle(FURNITURE, rng);
  flowers.forEach((flower, i) => {
    cells[flower.position.y][flower.position.x].furniture =
      shuffledFurniture[i % shuffledFurniture.length];
    cells[flower.position.y][flower.position.x].hiddenFlower = true;
  });

  // Add a few extra decoy furniture pieces (no flower underneath)
  const decoyCount = Math.min(level + 1, 5);
  const emptyPositions = allPositions.filter(
    (p) => !pickedPositions.find((f) => f.x === p.x && f.y === p.y)
      && !(p.x === 0 && p.y === 0)
  );
  const decoys = shuffle(emptyPositions, rng).slice(0, decoyCount);
  decoys.forEach((pos, i) => {
    cells[pos.y][pos.x].furniture =
      shuffledFurniture[(flowers.length + i) % shuffledFurniture.length];
  });

  return { level, cols, rows, cells, flowers, playerStart, exitPosition };
}

// ── MAZE: classic labyrinth to reach the next room ───────────────────────────
export function generateMaze(level: number): GameLevel {
  const seed = level * 55555 + 9876;
  const rng = makeRng(seed);

  const cols = Math.min(5 + level, 13);
  const rows = Math.min(5 + level, 13);

  const cells: Cell[][] = [];
  for (let r = 0; r < rows; r++) {
    cells[r] = [];
    for (let c = 0; c < cols; c++) {
      cells[r][c] = {
        x: c,
        y: r,
        walls: { top: true, right: true, bottom: true, left: true },
      };
    }
  }

  carveMaze(cells, rows, cols, 0, 0, rng);

  const playerStart: Position = { x: 0, y: 0 };
  const exitPosition: Position = { x: cols - 1, y: rows - 1 };
  cells[rows - 1][cols - 1].isExit = true;

  return { level, cols, rows, cells, flowers: [], playerStart, exitPosition };
}
