import React, { useRef, useEffect, useCallback } from 'react';
import { GameLevel, Position, Flower, GamePhase } from '../types/game';

interface MazeCanvasProps {
  gameLevel: GameLevel;
  playerPos: Position;
  flowers: Flower[];
  allWatered: boolean;
  phase: GamePhase;
  onTap: (cellX: number, cellY: number) => void;
}
const CELL_SIZE = 48;
const WALL_WIDTH = 3;
const PLAYER_RADIUS = 14;
const EF = (size: number) =>
  `${size}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", serif`;

const MazeCanvas: React.FC<MazeCanvasProps> = ({
  gameLevel,
  playerPos,
  flowers,
  allWatered,
  phase,
  onTap,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const pulseRef = useRef(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { cols, rows, cells, exitPosition } = gameLevel;
    const W = cols * CELL_SIZE;
    const H = rows * CELL_SIZE;
    canvas.width = W;
    canvas.height = H;

    const isRoom = phase === 'room';

    // ── Theme colors ────────────────────────────────────────────────────────
    const theme = isRoom
      ? {
          bg: '#0a1f0e',
          floor: '#1a4a28',
          floorAlt: '#1e5530',
          wall: '#52c788',
          wallWidth: 2,
          exitGlow: [255, 200, 50] as [number,number,number],
        }
      : {
          bg: '#0a0a1a',
          floor: '#12122e',
          floorAlt: '#1a1a3a',
          wall: '#7c6fc4',
          wallWidth: 4,
          exitGlow: [140, 100, 255] as [number,number,number],
        };

    // ── Background ──────────────────────────────────────────────────────────
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, W, H);

    // ── Subtle grid pattern for maze (stone tiles) ───────────────────────────
    if (!isRoom) {
      ctx.strokeStyle = 'rgba(80,70,140,0.25)';
      ctx.lineWidth = 1;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const cx = c * CELL_SIZE;
          const cy = r * CELL_SIZE;
          // Checkerboard stone effect
          ctx.fillStyle = (r + c) % 2 === 0 ? theme.floor : theme.floorAlt;
          ctx.fillRect(cx + theme.wallWidth, cy + theme.wallWidth,
            CELL_SIZE - theme.wallWidth * 2, CELL_SIZE - theme.wallWidth * 2);
        }
      }
    }

    // ── Cell floors ─────────────────────────────────────────────────────────
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = cells[r][c];
        const cx = c * CELL_SIZE;
        const cy = r * CELL_SIZE;

        if (isRoom) {
          // Warm wood-like floor
          ctx.fillStyle = (r + c) % 2 === 0 ? '#1e5530' : '#1a4a28';
          ctx.fillRect(
            cx + theme.wallWidth, cy + theme.wallWidth,
            CELL_SIZE - theme.wallWidth * 2, CELL_SIZE - theme.wallWidth * 2
          );
        }

        // Exit door glow
        if (cell.isExit) {
          const canExit = isRoom ? allWatered : true;
          const [gr, gg, gb] = theme.exitGlow;
          if (canExit) {
            const grd = ctx.createRadialGradient(
              cx + CELL_SIZE / 2, cy + CELL_SIZE / 2, 2,
              cx + CELL_SIZE / 2, cy + CELL_SIZE / 2, CELL_SIZE * 0.8
            );
            const a = 0.5 + 0.35 * Math.sin(pulseRef.current);
            grd.addColorStop(0, `rgba(${gr},${gg},${gb},${a})`);
            grd.addColorStop(1, `rgba(${gr},${gg},${gb},0)`);
            ctx.fillStyle = grd;
            ctx.fillRect(cx, cy, CELL_SIZE, CELL_SIZE);
          } else {
            ctx.fillStyle = 'rgba(60,20,0,0.6)';
            ctx.fillRect(cx + theme.wallWidth, cy + theme.wallWidth,
              CELL_SIZE - theme.wallWidth * 2, CELL_SIZE - theme.wallWidth * 2);
          }
        }
      }
    }

    // ── Walls ───────────────────────────────────────────────────────────────
    ctx.strokeStyle = theme.wall;
    ctx.lineWidth = theme.wallWidth;
    ctx.lineCap = 'square';

    // Maze walls get a glow effect
    if (!isRoom) {
      ctx.shadowColor = '#7c6fc4';
      ctx.shadowBlur = 6;
    }

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = cells[r][c];
        const cx = c * CELL_SIZE;
        const cy = r * CELL_SIZE;

        ctx.beginPath();
        if (cell.walls.top)    { ctx.moveTo(cx, cy);             ctx.lineTo(cx + CELL_SIZE, cy); }
        if (cell.walls.right)  { ctx.moveTo(cx + CELL_SIZE, cy); ctx.lineTo(cx + CELL_SIZE, cy + CELL_SIZE); }
        if (cell.walls.bottom) { ctx.moveTo(cx, cy + CELL_SIZE); ctx.lineTo(cx + CELL_SIZE, cy + CELL_SIZE); }
        if (cell.walls.left)   { ctx.moveTo(cx, cy);             ctx.lineTo(cx, cy + CELL_SIZE); }
        ctx.stroke();
      }
    }
    ctx.shadowBlur = 0;

    // ── Exit icon ───────────────────────────────────────────────────────────
    {
      const ex = exitPosition.x * CELL_SIZE + CELL_SIZE / 2;
      const ey = exitPosition.y * CELL_SIZE + CELL_SIZE / 2;
      const canExit = isRoom ? allWatered : true;
      ctx.font = EF(CELL_SIZE * 0.55);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.globalAlpha = canExit ? 1 : 0.25;
      ctx.fillText(isRoom ? '🚪' : '🏁', ex, ey);
      ctx.globalAlpha = 1;
    }

    // ── Flowers (room phase only) ────────────────────────────────────────────
    if (isRoom) {
      for (const flower of flowers) {
        const fx = flower.position.x * CELL_SIZE + CELL_SIZE / 2;
        const fy = flower.position.y * CELL_SIZE + CELL_SIZE / 2;
        const cell = gameLevel.cells[flower.position.y][flower.position.x];
        const dist = Math.abs(flower.position.x - playerPos.x)
          + Math.abs(flower.position.y - playerPos.y);
        const isNearby = dist <= 1;

        if (flower.watered) {
          // Watered: always fully visible with green glow
          const grd = ctx.createRadialGradient(fx, fy, 2, fx, fy, CELL_SIZE / 2);
          grd.addColorStop(0, 'rgba(82,183,136,0.55)');
          grd.addColorStop(1, 'rgba(82,183,136,0)');
          ctx.fillStyle = grd;
          ctx.beginPath();
          ctx.arc(fx, fy, CELL_SIZE / 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.font = EF(CELL_SIZE * 0.6);
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(flower.emoji, fx, fy);
          ctx.font = EF(CELL_SIZE * 0.28);
          ctx.fillText('💧', fx + CELL_SIZE * 0.22, fy - CELL_SIZE * 0.22);

        } else if (cell.furniture && !isNearby) {
          // Hidden behind furniture — flower faintly visible
          ctx.globalAlpha = 0.28;
          ctx.font = EF(CELL_SIZE * 0.45);
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(flower.emoji, fx, fy + 4);
          ctx.globalAlpha = 1;
          // Furniture on top
          ctx.font = EF(CELL_SIZE * 0.62);
          ctx.fillText(cell.furniture, fx, fy);

        } else if (cell.furniture && isNearby) {
          // Player is adjacent — flower peeks out from behind furniture
          ctx.fillStyle = 'rgba(255,220,50,0.15)';
          ctx.beginPath();
          ctx.arc(fx, fy, CELL_SIZE * 0.42, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 0.65;
          ctx.font = EF(CELL_SIZE * 0.45);
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(flower.emoji, fx, fy + 4);
          ctx.globalAlpha = 1;
          ctx.font = EF(CELL_SIZE * 0.5);
          ctx.fillText(cell.furniture, fx, fy - 2);

        } else {
          // No furniture — visible flower with yellow ring
          ctx.fillStyle = 'rgba(255,220,50,0.22)';
          ctx.beginPath();
          ctx.arc(fx, fy, CELL_SIZE * 0.42, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = 'rgba(255,220,50,0.7)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(fx, fy, CELL_SIZE * 0.42, 0, Math.PI * 2);
          ctx.stroke();
          ctx.lineWidth = WALL_WIDTH;
          ctx.strokeStyle = isRoom ? '#74c69d' : '#52b788';
          ctx.globalAlpha = 1;
          ctx.font = EF(CELL_SIZE * 0.6);
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(flower.emoji, fx, fy);
        }
      }

      // Decoy furniture (no flower underneath)
      for (let r = 0; r < gameLevel.rows; r++) {
        for (let c = 0; c < gameLevel.cols; c++) {
          const cell = gameLevel.cells[r][c];
          if (!cell.furniture) continue;
          const hasFlower = flowers.some((f) => f.position.x === c && f.position.y === r);
          if (hasFlower) continue;
          const fx = c * CELL_SIZE + CELL_SIZE / 2;
          const fy = r * CELL_SIZE + CELL_SIZE / 2;
          ctx.font = EF(CELL_SIZE * 0.62);
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(cell.furniture, fx, fy);
        }
      }
    }

    // ── Player ──────────────────────────────────────────────────────────────
    {
      const px = playerPos.x * CELL_SIZE + CELL_SIZE / 2;
      const py = playerPos.y * CELL_SIZE + CELL_SIZE / 2;
      const r = PLAYER_RADIUS;

      const grd = ctx.createRadialGradient(px, py, 1, px, py, r + 6);
      grd.addColorStop(0, 'rgba(255,255,180,0.7)');
      grd.addColorStop(1, 'rgba(255,255,180,0)');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(px, py, r + 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#f4d03f';
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#b7950b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#333';
      ctx.beginPath();
      ctx.arc(px - 4, py - 3, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(px + 4, py - 3, 2.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#333';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(px, py + 1, 5, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();

      ctx.lineWidth = WALL_WIDTH;
      ctx.strokeStyle = isRoom ? '#74c69d' : '#52b788';
    }
  }, [gameLevel, playerPos, flowers, allWatered, phase]);

  useEffect(() => {
    let frame = 0;
    const animate = () => {
      frame++;
      pulseRef.current = frame * 0.05;
      draw();
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [draw]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;
      onTap(Math.floor(x / CELL_SIZE), Math.floor(y / CELL_SIZE));
    },
    [onTap]
  );

  const handleTouch = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const touch = e.changedTouches[0];
      const x = (touch.clientX - rect.left) * scaleX;
      const y = (touch.clientY - rect.top) * scaleY;
      onTap(Math.floor(x / CELL_SIZE), Math.floor(y / CELL_SIZE));
    },
    [onTap]
  );

  const { cols, rows } = gameLevel;
  const canvasWidth = cols * CELL_SIZE;
  const canvasHeight = rows * CELL_SIZE;
  const maxW = Math.min(window.innerWidth - 16, 600);
  const scale = Math.min(1, maxW / canvasWidth);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', overflow: 'hidden' }}>
      <canvas
        ref={canvasRef}
        width={canvasWidth}
        height={canvasHeight}
        style={{
          width: canvasWidth * scale,
          height: canvasHeight * scale,
          cursor: 'pointer',
          touchAction: 'none',
          display: 'block',
        }}
        onClick={handleClick}
        onTouchEnd={handleTouch}
      />
    </div>
  );
};

export default MazeCanvas;
