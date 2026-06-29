import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Position, Flower, GameState, GamePhase } from '../types/game';
import { generateRoom, generateMaze } from '../utils/mazeGenerator';
import HUD from './HUD';
import MazeCanvas from './MazeCanvas';
import DPad from './DPad';

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const centis = Math.floor((ms % 1000) / 10);
  return `${minutes > 0 ? `${minutes}:` : ''}${String(seconds).padStart(2, '0')}.${String(centis).padStart(2, '0')}`;
}

const Game: React.FC = () => {
  const [showTitle, setShowTitle] = useState(true);
  const [levelNumber, setLevelNumber] = useState(1);
  const [phase, setPhase] = useState<GamePhase>('room');
  const [gameLevel, setGameLevel] = useState(() => generateRoom(1));
  const [playerPos, setPlayerPos] = useState<Position>({ x: 0, y: 0 });
  const [flowers, setFlowers] = useState<Flower[]>(() => generateRoom(1).flowers);
  const [gameState, setGameState] = useState<GameState>('playing');
  const [message, setMessage] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [finalTime, setFinalTime] = useState(0);
  const startTimeRef = useRef<number>(Date.now());
  const timerRef = useRef<number>(0);

  // ── Load room phase ────────────────────────────────────────────────────────
  const loadRoom = useCallback((level: number) => {
    const newLevel = generateRoom(level);
    setGameLevel(newLevel);
    setFlowers(newLevel.flowers);
    setPlayerPos(newLevel.playerStart);
    setPhase('room');
    setGameState('playing');
    setMessage('');
    setElapsed(0);
    startTimeRef.current = Date.now();
  }, []);

  // ── Load maze phase ────────────────────────────────────────────────────────
  const loadMaze = useCallback((level: number) => {
    const newLevel = generateMaze(level);
    setGameLevel(newLevel);
    setFlowers([]);
    setPlayerPos(newLevel.playerStart);
    setPhase('maze');
    setGameState('playing');
    setMessage('Finde den Ausgang! 🌀');
    setTimeout(() => setMessage(''), 2500);
  }, []);

  useEffect(() => {
    loadRoom(levelNumber);
  }, [levelNumber, loadRoom]);

  // ── Timer ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (gameState !== 'playing') {
      clearInterval(timerRef.current);
      return;
    }
    timerRef.current = window.setInterval(() => {
      setElapsed(Date.now() - startTimeRef.current);
    }, 100);
    return () => clearInterval(timerRef.current);
  }, [gameState]);

  const allWatered = flowers.every((f) => f.watered);

  // ── Movement ───────────────────────────────────────────────────────────────
  const move = useCallback(
    (dx: number, dy: number) => {
      if (gameState !== 'playing') return;

      const newX = playerPos.x + dx;
      const newY = playerPos.y + dy;
      const { cols, rows, cells } = gameLevel;

      if (newX < 0 || newX >= cols || newY < 0 || newY >= rows) return;

      const cell = cells[playerPos.y][playerPos.x];
      if (dx === 1  && cell.walls.right)  return;
      if (dx === -1 && cell.walls.left)   return;
      if (dy === 1  && cell.walls.bottom) return;
      if (dy === -1 && cell.walls.top)    return;

      const targetCell = cells[newY][newX];
      setPlayerPos({ x: newX, y: newY });

      if (targetCell.isExit) {
        if (phase === 'room') {
          if (allWatered) {
            // Room done → enter maze
            setFinalTime(Date.now() - startTimeRef.current);
            setGameState('levelComplete');
          } else {
            setMessage('🔒 Gieße erst alle Blumen!');
            setTimeout(() => setMessage(''), 2000);
          }
        } else {
          // Maze done → next level
          setFinalTime(Date.now() - startTimeRef.current);
          setGameState('levelComplete');
        }
      }
    },
    [playerPos, gameLevel, allWatered, gameState, phase]
  );

  // ── Keyboard ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (['ArrowUp',    'w', 'W'].includes(e.key)) move(0, -1);
      if (['ArrowDown',  's', 'S'].includes(e.key)) move(0,  1);
      if (['ArrowLeft',  'a', 'A'].includes(e.key)) move(-1, 0);
      if (['ArrowRight', 'd', 'D'].includes(e.key)) move(1,  0);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [move]);

  // ── Canvas tap ─────────────────────────────────────────────────────────────
  const handleTap = useCallback(
    (cellX: number, cellY: number) => {
      if (gameState !== 'playing') return;

      // Water flower on same cell (room phase)
      if (phase === 'room') {
        const adx = Math.abs(cellX - playerPos.x);
        const ady = Math.abs(cellY - playerPos.y);

        if (adx === 0 && ady === 0) {
          const flower = flowers.find(
            (f) => f.position.x === playerPos.x && f.position.y === playerPos.y && !f.watered
          );
          if (flower) {
            setFlowers((prev) =>
              prev.map((f) => (f.id === flower.id ? { ...f, watered: true } : f))
            );
            const remaining = flowers.filter((f) => !f.watered).length - 1;
            if (remaining === 0) {
              setMessage('🌟 Alle Blumen gegossen! Geh zur Tür!');
              setTimeout(() => setMessage(''), 3000);
            }
          }
          return;
        }

        // Also water when tapping directly on a flower in same cell
        const onFlower = flowers.find(
          (f) => f.position.x === cellX && f.position.y === cellY
            && cellX === playerPos.x && cellY === playerPos.y && !f.watered
        );
        if (onFlower) {
          setFlowers((prev) =>
            prev.map((f) => (f.id === onFlower.id ? { ...f, watered: true } : f))
          );
          return;
        }

        // Move toward tapped cell
        if (adx >= ady && cellX !== playerPos.x) move(Math.sign(cellX - playerPos.x), 0);
        else if (ady > 0) move(0, Math.sign(cellY - playerPos.y));
      } else {
        // In maze: just move
        const adx = Math.abs(cellX - playerPos.x);
        const ady = Math.abs(cellY - playerPos.y);
        if (adx >= ady && cellX !== playerPos.x) move(Math.sign(cellX - playerPos.x), 0);
        else if (ady > 0) move(0, Math.sign(cellY - playerPos.y));
      }
    },
    [playerPos, flowers, move, gameState, phase]
  );

  // ── Auto-hint when stepping on flower ─────────────────────────────────────
  useEffect(() => {
    if (phase !== 'room') return;
    const flower = flowers.find(
      (f) => f.position.x === playerPos.x && f.position.y === playerPos.y && !f.watered
    );
    if (flower) {
      setMessage(`Tippe nochmal hier um ${flower.emoji} zu gießen!`);
      setTimeout(() => setMessage(''), 2500);
    }
  }, [playerPos]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Next phase / level ─────────────────────────────────────────────────────
  const handleNext = () => {
    if (phase === 'room') {
      loadMaze(levelNumber);
    } else {
      setLevelNumber((n) => n + 1);
    }
  };

  const restart = () => loadRoom(levelNumber);

  const overlayTitle = phase === 'room'
    ? `Raum ${levelNumber} geschafft!`
    : `Labyrinth ${levelNumber} durchquert!`;
  const overlayText = phase === 'room'
    ? 'Alle Blumen gegossen. Jetzt das Labyrinth!'
    : `Level ${levelNumber} komplett abgeschlossen! 🎉`;
  const nextBtnLabel = phase === 'room' ? 'Ins Labyrinth →' : 'Nächstes Level →';

  if (showTitle) {
    return (
      <div style={{ minHeight: '100dvh', background: 'linear-gradient(135deg, #064e3b 0%, #1e1b4b 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '24px' }}>
        <div style={{ fontSize: '72px' }}>🌸</div>
        <h1 style={{ color: '#fff', fontSize: '36px', fontWeight: 'bold', margin: 0, textAlign: 'center', textShadow: '0 0 30px rgba(167,139,250,0.8)' }}>Flower Maze</h1>
        <p style={{ color: '#86efac', fontSize: '16px', margin: 0, textAlign: 'center', maxWidth: '280px', lineHeight: 1.6 }}>Finde alle Blumen, gieße sie und finde den Ausgang!</p>
        <button onClick={() => setShowTitle(false)} style={{ background: 'linear-gradient(135deg, #059669, #7c3aed)', color: '#fff', border: 'none', padding: '16px 48px', borderRadius: '50px', fontSize: '20px', fontWeight: 'bold', cursor: 'pointer', marginTop: '16px', boxShadow: '0 0 30px rgba(167,139,250,0.5)' }}>
          Spielen 🌿
        </button>
        <p style={{ color: '#4ade80', fontSize: '12px', margin: 0 }}>Level 1 • Blumen gießen • Labyrinth lösen</p>
      </div>
    );
  }

  return (
    <div style={styles.root}>
      <HUD flowers={flowers} level={levelNumber} elapsed={elapsed} phase={phase} />

      <div style={styles.gameArea}>
        <MazeCanvas
          gameLevel={gameLevel}
          playerPos={playerPos}
          flowers={flowers}
          allWatered={allWatered}
          phase={phase}
          onTap={handleTap}
        />

        {message && <div style={styles.toast}>{message}</div>}

        {gameState === 'levelComplete' && (
          <div style={styles.overlay}>
            <div style={styles.overlayBox}>
              <div style={styles.overlayEmoji}>{phase === 'room' ? '🌸' : '🎉'}</div>
              <h2 style={styles.overlayTitle}>{overlayTitle}</h2>
              <p style={styles.overlayText}>{overlayText}</p>
              <div style={styles.timeBox}>⏱ {formatTime(finalTime)}</div>
              <button style={styles.overlayBtn} onClick={handleNext}>
                {nextBtnLabel}
              </button>
            </div>
          </div>
        )}
      </div>

      <DPad onMove={move} />

      <div style={styles.hint}>
        {phase === 'room'
          ? 'Bewege dich mit den Pfeilen • Tippe auf eine Blume um sie zu gießen'
          : 'Finde den Ausgang 🏁 des Labyrinths'}
      </div>

      <button style={styles.restartBtn} onClick={restart}>
        🔄 Level neu starten
      </button>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100dvh',
    background: '#081c15',
    color: '#b7e4c7',
    fontFamily: "'Segoe UI', sans-serif",
    overflow: 'hidden',
  },
  gameArea: {
    position: 'relative',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    padding: '8px',
  },
  toast: {
    position: 'absolute',
    bottom: 12,
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(0,0,0,0.85)',
    color: '#b7e4c7',
    padding: '8px 20px',
    borderRadius: '20px',
    border: '1px solid #52b788',
    fontSize: '14px',
    whiteSpace: 'nowrap',
    zIndex: 10,
    pointerEvents: 'none',
  },
  overlay: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(0,0,0,0.78)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  overlayBox: {
    background: 'linear-gradient(135deg, #1a472a, #2d6a4f)',
    border: '2px solid #52b788',
    borderRadius: '20px',
    padding: '32px 40px',
    textAlign: 'center',
    boxShadow: '0 0 40px rgba(82,183,136,0.4)',
  },
  overlayEmoji: { fontSize: '56px', lineHeight: 1, marginBottom: '12px' },
  overlayTitle: { color: '#b7e4c7', margin: '0 0 8px', fontSize: '22px' },
  overlayText: { color: '#74c69d', margin: '0 0 16px', fontSize: '14px' },
  timeBox: {
    background: 'rgba(0,0,0,0.3)',
    border: '1px solid #52b788',
    borderRadius: '12px',
    padding: '10px 24px',
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#b7e4c7',
    letterSpacing: '2px',
    marginBottom: '20px',
  },
  overlayBtn: {
    background: '#52b788',
    color: '#fff',
    border: 'none',
    padding: '12px 28px',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    touchAction: 'manipulation',
  },
  hint: {
    textAlign: 'center',
    fontSize: '11px',
    color: '#40916c',
    padding: '4px 8px',
  },
  restartBtn: {
    margin: '0 auto 12px',
    background: 'transparent',
    border: '1px solid #40916c',
    color: '#74c69d',
    padding: '6px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    touchAction: 'manipulation',
  },
};

export default Game;
