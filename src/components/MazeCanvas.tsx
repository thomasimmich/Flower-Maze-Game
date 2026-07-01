import React, { useRef, useEffect, useCallback } from 'react';
import { GameLevel, Position, Flower, GamePhase, LevelActivity } from '../types/game';

interface MazeCanvasProps {
  gameLevel: GameLevel;
  playerPos: Position;
  flowers: Flower[];
  allWatered: boolean;
  phase: GamePhase;
  activity: LevelActivity;
  gateHoleCol: number;
  gatePassedRow: number | null;
  isDark: boolean;
  onTap: (cellX: number, cellY: number) => void;
}

const CELL_SIZE = 64;
const RAIN_WITHER_TOTAL = 12000;
const EF = (size: number) =>
  `${size}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", serif`;

const MazeCanvas: React.FC<MazeCanvasProps> = ({
  gameLevel, playerPos, flowers, allWatered, phase,
  activity, gateHoleCol, gatePassedRow, isDark, onTap,
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

    const theme = isRoom
      ? { bg: '#1a3a1a', floor: '#3a7d2c', floorAlt: '#4a9438', wall: '#8B4513', wallWidth: 3, exitGlow: [255, 220, 80] as [number,number,number] }
      : { bg: '#070712', floor: '#0f0f2e', floorAlt: '#141440', wall: '#a78bfa', wallWidth: 5, exitGlow: [167, 139, 250] as [number,number,number] };

    // ── Background ──────────────────────────────────────────────────────────
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, W, H);

    // ── Cell floors ──────────────────────────────────────────────────────────
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = cells[r][c];
        const cx = c * CELL_SIZE;
        const cy = r * CELL_SIZE;

        ctx.fillStyle = (r + c) % 2 === 0 ? theme.floor : theme.floorAlt;
        ctx.fillRect(cx, cy, CELL_SIZE, CELL_SIZE);

        if (isRoom) {
          ctx.fillStyle = 'rgba(255,255,255,0.04)';
          ctx.fillRect(cx + CELL_SIZE * 0.2, cy + CELL_SIZE * 0.2, 2, 2);
          ctx.fillRect(cx + CELL_SIZE * 0.6, cy + CELL_SIZE * 0.65, 2, 2);
        }

        if (cell.isExit) {
          const canExit = isRoom ? allWatered : true;
          const [gr, gg, gb] = theme.exitGlow;
          if (canExit) {
            const grd = ctx.createRadialGradient(cx + CELL_SIZE/2, cy + CELL_SIZE/2, 2, cx + CELL_SIZE/2, cy + CELL_SIZE/2, CELL_SIZE);
            grd.addColorStop(0, `rgba(${gr},${gg},${gb},${0.5 + 0.35 * Math.sin(pulseRef.current)})`);
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

    // ── Regen-Effekt: Regentropfen im Hintergrund ────────────────────────────
    if (activity === 'rain' && isRoom) {
      ctx.strokeStyle = 'rgba(147,197,253,0.25)';
      ctx.lineWidth = 1;
      const t = pulseRef.current * 3;
      for (let i = 0; i < 30; i++) {
        const rx = ((i * 137 + t * 20) % W);
        const ry = ((i * 83 + t * 40) % H);
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx - 3, ry + 10);
        ctx.stroke();
      }
    }

    // ── Wände ────────────────────────────────────────────────────────────────
    ctx.strokeStyle = theme.wall;
    ctx.lineWidth = theme.wallWidth;
    ctx.lineCap = 'square';
    ctx.shadowColor = isRoom ? 'rgba(0,0,0,0.5)' : '#a78bfa';
    ctx.shadowBlur = isRoom ? 3 : 8;

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

    // ── Fußballtor (Level 3+) ────────────────────────────────────────────────
    if (isRoom && activity === 'gate' && gameLevel.hasGate && gatePassedRow === null) {
      const { gateRow = 0, gateStartCol = 0, gateEndCol = 0 } = gameLevel;

      // Torpfosten links und rechts
      const gx1 = gateStartCol * CELL_SIZE;
      const gx2 = (gateEndCol + 1) * CELL_SIZE;
      const gy = gateRow * CELL_SIZE;

      // Torrahmen zeichnen (weiß)
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 5;
      ctx.shadowColor = 'rgba(255,255,255,0.6)';
      ctx.shadowBlur = 8;
      // Querlatte oben
      ctx.beginPath();
      ctx.moveTo(gx1, gy);
      ctx.lineTo(gx2, gy);
      ctx.stroke();
      // Linker Pfosten
      ctx.beginPath();
      ctx.moveTo(gx1, gy);
      ctx.lineTo(gx1, gy + CELL_SIZE);
      ctx.stroke();
      // Rechter Pfosten
      ctx.beginPath();
      ctx.moveTo(gx2, gy);
      ctx.lineTo(gx2, gy + CELL_SIZE);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.lineWidth = theme.wallWidth;

      // Tor-Felder
      for (let c = gateStartCol; c <= gateEndCol; c++) {
        const cx = c * CELL_SIZE;
        const cy = gateRow * CELL_SIZE;
        const isHole = c === gateHoleCol;

        if (isHole) {
          // Offenes Loch – grünes Netz-Muster
          ctx.fillStyle = 'rgba(74,222,128,0.3)';
          ctx.fillRect(cx, cy, CELL_SIZE, CELL_SIZE);
          // Netz-Linien
          ctx.strokeStyle = 'rgba(255,255,255,0.4)';
          ctx.lineWidth = 1;
          for (let i = 0; i <= 3; i++) {
            ctx.beginPath();
            ctx.moveTo(cx + i * (CELL_SIZE/3), cy);
            ctx.lineTo(cx + i * (CELL_SIZE/3), cy + CELL_SIZE);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(cx, cy + i * (CELL_SIZE/3));
            ctx.lineTo(cx + CELL_SIZE, cy + i * (CELL_SIZE/3));
            ctx.stroke();
          }
          ctx.lineWidth = theme.wallWidth;
          // Fußball im Loch
          ctx.font = EF(CELL_SIZE * 0.55);
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('⚽', cx + CELL_SIZE / 2, cy + CELL_SIZE / 2);
        } else {
          // Blockiertes Feld – rotes Netz
          ctx.fillStyle = 'rgba(220,50,50,0.6)';
          ctx.fillRect(cx, cy, CELL_SIZE, CELL_SIZE);
          ctx.strokeStyle = 'rgba(180,20,20,0.7)';
          ctx.lineWidth = 1;
          for (let i = 0; i <= 3; i++) {
            ctx.beginPath();
            ctx.moveTo(cx + i * (CELL_SIZE/3), cy);
            ctx.lineTo(cx + i * (CELL_SIZE/3), cy + CELL_SIZE);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(cx, cy + i * (CELL_SIZE/3));
            ctx.lineTo(cx + CELL_SIZE, cy + i * (CELL_SIZE/3));
            ctx.stroke();
          }
          ctx.lineWidth = theme.wallWidth;
        }
      }

      // Label
      ctx.fillStyle = '#fbbf24';
      ctx.font = `bold 13px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText('⚽ Schieß ins Tor!', ((gateStartCol + gateEndCol) / 2 + 0.5) * CELL_SIZE, gateRow * CELL_SIZE - 4);
    }

    // ── Burg / Ausgang ───────────────────────────────────────────────────────
    {
      const ex = exitPosition.x * CELL_SIZE + CELL_SIZE / 2;
      const ey = exitPosition.y * CELL_SIZE + CELL_SIZE / 2;
      const canExit = isRoom ? allWatered : true;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (isRoom) {
        ctx.font = EF(CELL_SIZE * 0.72);
        ctx.globalAlpha = canExit ? 1 : 0.4;
        ctx.fillText('🏰', ex, ey);
        ctx.globalAlpha = 1;
        if (!canExit) {
          ctx.font = EF(CELL_SIZE * 0.35);
          ctx.fillText('🔒', ex + CELL_SIZE * 0.2, ey + CELL_SIZE * 0.2);
        }
      } else {
        ctx.font = EF(CELL_SIZE * 0.6);
        ctx.fillText('🏁', ex, ey);
      }
    }

    // ── Blumen ───────────────────────────────────────────────────────────────
    if (isRoom) {
      for (const flower of flowers) {
        const fx = flower.position.x * CELL_SIZE + CELL_SIZE / 2;
        const fy = flower.position.y * CELL_SIZE + CELL_SIZE / 2;

        // Dunkelheit: nur Blumen in Reichweite 2 sichtbar
        if (isDark) {
          const dist = Math.abs(flower.position.x - playerPos.x) + Math.abs(flower.position.y - playerPos.y);
          if (dist > 2 && !flower.watered) continue;
        }

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
          // Regen: Countdown-Ring
          if (activity === 'rain' && flower.witheredAt) {
            const ratio = Math.max(0, (flower.witheredAt - Date.now()) / RAIN_WITHER_TOTAL);
            ctx.strokeStyle = `rgba(255,${Math.floor(ratio * 180)},0,0.9)`;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(fx, fy, CELL_SIZE * 0.44, -Math.PI / 2, -Math.PI / 2 + ratio * Math.PI * 2);
            ctx.stroke();
            ctx.lineWidth = theme.wallWidth;
          } else {
            ctx.fillStyle = 'rgba(255,220,50,0.2)';
            ctx.beginPath();
            ctx.arc(fx, fy, CELL_SIZE * 0.42, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,220,50,0.7)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(fx, fy, CELL_SIZE * 0.42, 0, Math.PI * 2);
            ctx.stroke();
            ctx.lineWidth = theme.wallWidth;
          }
          ctx.strokeStyle = theme.wall;
          ctx.font = EF(CELL_SIZE * 0.6);
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(flower.emoji, fx, fy);
        }
      }
    }

    // ── Spieler ───────────────────────────────────────────────────────────────
    {
      const px = playerPos.x * CELL_SIZE + CELL_SIZE / 2;
      const py = playerPos.y * CELL_SIZE + CELL_SIZE / 2;

      const grd = ctx.createRadialGradient(px, py, 1, px, py, 26);
      grd.addColorStop(0, 'rgba(255,255,180,0.6)');
      grd.addColorStop(1, 'rgba(255,255,180,0)');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(px, py, 26, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = EF(CELL_SIZE * 0.72);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('👨‍🌾', px, py);
    }

    // ── Dunkelheit-Overlay ────────────────────────────────────────────────────
    if (isDark && isRoom) {
      const px = playerPos.x * CELL_SIZE + CELL_SIZE / 2;
      const py = playerPos.y * CELL_SIZE + CELL_SIZE / 2;
      const visRadius = CELL_SIZE * 2.5;

      const darkGrd = ctx.createRadialGradient(px, py, visRadius * 0.6, px, py, visRadius * 1.6);
      darkGrd.addColorStop(0, 'rgba(0,0,0,0)');
      darkGrd.addColorStop(1, 'rgba(0,0,0,0.96)');
      ctx.fillStyle = darkGrd;
      ctx.fillRect(0, 0, W, H);
    }

  }, [gameLevel, playerPos, flowers, allWatered, phase, activity, gateHoleCol, gatePassedRow, isDark]);

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

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    onTap(Math.floor((e.clientX - rect.left) * canvas.width / rect.width / CELL_SIZE),
          Math.floor((e.clientY - rect.top)  * canvas.height / rect.height / CELL_SIZE));
  }, [onTap]);

  const handleTouch = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const t = e.changedTouches[0];
    onTap(Math.floor((t.clientX - rect.left) * canvas.width / rect.width / CELL_SIZE),
          Math.floor((t.clientY - rect.top)  * canvas.height / rect.height / CELL_SIZE));
  }, [onTap]);

  const { cols, rows } = gameLevel;
  const cW = cols * CELL_SIZE;
  const cH = rows * CELL_SIZE;
  const maxW = Math.min(window.innerWidth - 8, window.innerHeight - 220, 700);
  const scale = Math.min(1, maxW / cW);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', overflow: 'hidden' }}>
      <canvas ref={canvasRef} width={cW} height={cH}
        style={{ width: cW * scale, height: cH * scale, cursor: 'pointer', touchAction: 'none', display: 'block' }}
        onClick={handleClick} onTouchEnd={handleTouch} />
    </div>
  );
};

export default MazeCanvas;
