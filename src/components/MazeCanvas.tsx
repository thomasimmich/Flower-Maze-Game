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
const CELL_SIZE = 64;
const PLAYER_RADIUS = 18;
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
          bg: '#1a3a1a',
          floor: '#3a7d2c',       // helles Grasgrün
          floorAlt: '#4a9438',    // etwas helleres Gras
          wall: '#8B4513',        // braune Gartenzaun-Farbe
          wallWidth: 3,
          exitGlow: [255, 220, 80] as [number, number, number],
        }
      : {
          bg: '#070712',
          floor: '#0f0f2e',
          floorAlt: '#141440',
          wall: '#a78bfa',
          wallWidth: 5,
          exitGlow: [167, 139, 250] as [number, number, number],
        };

    // ── Background ──────────────────────────────────────────────────────────
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, W, H);

    // ── Cell floors (fill entire cell, no gaps) ─────────────────────────────
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = cells[r][c];
        const cx = c * CELL_SIZE;
        const cy = r * CELL_SIZE;

        // Fill full cell — no inset, no gaps
        ctx.fillStyle = (r + c) % 2 === 0 ? theme.floor : theme.floorAlt;
        ctx.fillRect(cx, cy, CELL_SIZE, CELL_SIZE);

        // Garten: kleine Gras-Punkte für Textur
        if (isRoom) {
          ctx.fillStyle = 'rgba(255,255,255,0.04)';
          ctx.fillRect(cx + CELL_SIZE * 0.2, cy + CELL_SIZE * 0.2, 2, 2);
          ctx.fillRect(cx + CELL_SIZE * 0.6, cy + CELL_SIZE * 0.65, 2, 2);
          ctx.fillRect(cx + CELL_SIZE * 0.75, cy + CELL_SIZE * 0.3, 2, 2);
        }

        // Exit door glow
        if (cell.isExit) {
          const canExit = isRoom ? allWatered : true;
          const [gr, gg, gb] = theme.exitGlow;
          if (canExit) {
            const grd = ctx.createRadialGradient(
              cx + CELL_SIZE / 2, cy + CELL_SIZE / 2, 2,
              cx + CELL_SIZE / 2, cy + CELL_SIZE / 2, CELL_SIZE * 1.0
            );
            const a = 0.5 + 0.35 * Math.sin(pulseRef.current);
            grd.addColorStop(0, `rgba(${gr},${gg},${gb},${a})`);
            grd.addColorStop(1, `rgba(${gr},${gg},${gb},0)`);
            ctx.fillStyle = grd;
            ctx.fillRect(cx, cy, CELL_SIZE, CELL_SIZE);
          } else {
            ctx.fillStyle = 'rgba(60,20,0,0.4)';
            ctx.fillRect(cx, cy, CELL_SIZE, CELL_SIZE);
          }
        }
      }
    }

    // ── Walls ───────────────────────────────────────────────────────────────
    ctx.strokeStyle = theme.wall;
    ctx.lineWidth = theme.wallWidth;
    ctx.lineCap = 'square';

    if (!isRoom) {
      ctx.shadowColor = '#a78bfa';
      ctx.shadowBlur = 8;
    } else {
      // Gartenzaun: leichter Schatten
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 3;
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
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      if (isRoom) {
        // Haus-Icon — gesperrt wenn noch Blumen fehlen
        ctx.font = EF(CELL_SIZE * 0.72);
        ctx.globalAlpha = canExit ? 1 : 0.4;
        ctx.fillText('🏠', ex, ey);
        ctx.globalAlpha = 1;
        // Schloss-Overlay wenn gesperrt
        if (!canExit) {
          ctx.font = EF(CELL_SIZE * 0.35);
          ctx.fillText('🔒', ex + CELL_SIZE * 0.2, ey + CELL_SIZE * 0.2);
        }
      } else {
        ctx.font = EF(CELL_SIZE * 0.6);
        ctx.globalAlpha = 1;
        ctx.fillText('🏁', ex, ey);
      }
    }

    // ── Flowers (room phase only) ────────────────────────────────────────────
    if (isRoom) {
      for (const flower of flowers) {
        const fx = flower.position.x * CELL_SIZE + CELL_SIZE / 2;
        const fy = flower.position.y * CELL_SIZE + CELL_SIZE / 2;

        if (flower.watered) {
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
        } else {
          ctx.fillStyle = 'rgba(255,220,50,0.22)';
          ctx.beginPath();
          ctx.arc(fx, fy, CELL_SIZE * 0.42, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = 'rgba(255,220,50,0.7)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(fx, fy, CELL_SIZE * 0.42, 0, Math.PI * 2);
          ctx.stroke();
          ctx.lineWidth = theme.wallWidth;
          ctx.strokeStyle = theme.wall;
          ctx.font = EF(CELL_SIZE * 0.6);
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(flower.emoji, fx, fy);
        }
      }
    }

    // ── Player ──────────────────────────────────────────────────────────────
    {
      const px = playerPos.x * CELL_SIZE + CELL_SIZE / 2;
      const py = playerPos.y * CELL_SIZE + CELL_SIZE / 2;
      const r = PLAYER_RADIUS;

      const grd = ctx.createRadialGradient(px, py, 1, px, py, r + 8);
      grd.addColorStop(0, 'rgba(255,255,180,0.7)');
      grd.addColorStop(1, 'rgba(255,255,180,0)');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(px, py, r + 8, 0, Math.PI * 2);
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
      ctx.arc(px - 5, py - 4, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(px + 5, py - 4, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#333';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(px, py + 2, 6, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();

      ctx.lineWidth = theme.wallWidth;
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
  const maxW = Math.min(window.innerWidth - 8, window.innerHeight - 220, 700);
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
