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

const GATE_TIME_LIMIT = 15; // Sekunden

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

  // Gate state
  const [gateHoleCol, setGateHoleCol] = useState(0);
  const [gatePassedRow, setGatePassedRow] = useState<number | null>(null); // null = Tor noch nicht passiert
  const [gateTimeLeft, setGateTimeLeft] = useState(GATE_TIME_LIMIT);
  const [gatePenalty, setGatePenalty] = useState(false);

  const startTimeRef = useRef<number>(Date.now());
  const timerRef = useRef<number>(0);
  const gateTimerRef = useRef<number>(0);
  const gateHoleRef = useRef(0);
  const gateDirectionRef = useRef(1);

  // ── Load room phase ──────────────────────────────────────────────────────
  const loadRoom = useCallback((level: number) => {
    const newLevel = generateRoom(level);
    setGameLevel(newLevel);
    setFlowers(newLevel.flowers);
    setPlayerPos(newLevel.playerStart);
    setPhase('room');
    setGameState('playing');
    setMessage('');
    setElapsed(0);
    setGatePassedRow(null);
    setGatePenalty(false);
    setGateTimeLeft(GATE_TIME_LIMIT);
    startTimeRef.current = Date.now();

    if (newLevel.hasGate && newLevel.gateStartCol !== undefined) {
      gateHoleRef.current = newLevel.gateStartCol;
      setGateHoleCol(newLevel.gateStartCol);
    }
  }, []);

  // ── Load maze phase ──────────────────────────────────────────────────────
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

  // ── Haupt-Timer ─────────────────────────────────────────────────────────
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

  // ── Tor-Loch Animation ───────────────────────────────────────────────────
  useEffect(() => {
    if (!gameLevel.hasGate || gatePassedRow !== null || gameState !== 'playing') {
      clearInterval(gateTimerRef.current);
      return;
    }
    const { gateStartCol = 0, gateEndCol = 0 } = gameLevel;
    const speed = Math.max(300, 800 - levelNumber * 50); // schneller mit höherem Level

    gateTimerRef.current = window.setInterval(() => {
      gateHoleRef.current += gateDirectionRef.current;
      if (gateHoleRef.current >= gateEndCol) gateDirectionRef.current = -1;
      if (gateHoleRef.current <= gateStartCol) gateDirectionRef.current = 1;
      setGateHoleCol(gateHoleRef.current);

      // 15-Sekunden-Countdown
      setGateTimeLeft((prev) => {
        const next = prev - speed / 1000;
        if (next <= 0) {
          // Zeit abgelaufen → Strafe
          setGatePenalty(true);
          setMessage('⏰ Zeit abgelaufen! Warte kurz...');
          setTimeout(() => {
            setGatePenalty(false);
            setGateTimeLeft(GATE_TIME_LIMIT);
            setMessage('');
            // Spieler zurück vor das Tor
          }, 2000);
          return GATE_TIME_LIMIT;
        }
        return next;
      });
    }, speed);

    return () => clearInterval(gateTimerRef.current);
  }, [gameLevel, gatePassedRow, gameState, levelNumber]);

  const allWatered = flowers.every((f) => f.watered);

  // ── Movement ────────────────────────────────────────────────────────────
  const move = useCallback(
    (dx: number, dy: number) => {
      if (gameState !== 'playing') return;
      if (gatePenalty) return;

      const newX = playerPos.x + dx;
      const newY = playerPos.y + dy;
      const { cols, rows, cells } = gameLevel;

      if (newX < 0 || newX >= cols || newY < 0 || newY >= rows) return;

      const cell = cells[playerPos.y][playerPos.x];
      if (dx === 1  && cell.walls.right)  return;
      if (dx === -1 && cell.walls.left)   return;
      if (dy === 1  && cell.walls.bottom) return;
      if (dy === -1 && cell.walls.top)    return;

      // Tor-Prüfung: Tor-Zeile betreten nur durch das Loch
      const targetCell = cells[newY][newX];
      if (
        targetCell.isGate &&
        gameLevel.hasGate &&
        gatePassedRow === null &&
        newX !== gateHoleRef.current
      ) {
        setMessage('🚧 Warte auf das Loch!');
        setTimeout(() => setMessage(''), 1000);
        return;
      }

      // Tor-Loch passiert!
      if (targetCell.isGate && newX === gateHoleRef.current && gatePassedRow === null) {
        setGatePassedRow(newY);
        setMessage('✅ Tor passiert!');
        setTimeout(() => setMessage(''), 1500);
      }

      setPlayerPos({ x: newX, y: newY });

      if (targetCell.isExit) {
        if (phase === 'room') {
          if (allWatered) {
            setFinalTime(Date.now() - startTimeRef.current);
            setGameState('levelComplete');
          } else {
            setMessage('🔒 Gieße erst alle Blumen!');
            setTimeout(() => setMessage(''), 2000);
          }
        } else {
          setFinalTime(Date.now() - startTimeRef.current);
          setGameState('levelComplete');
        }
      }
    },
    [playerPos, gameLevel, allWatered, gameState, phase, gatePassedRow, gatePenalty]
  );

  // ── Keyboard ────────────────────────────────────────────────────────────
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

  // ── Canvas tap: nur Blumen gießen ───────────────────────────────────────
  const handleTap = useCallback(
    (cellX: number, cellY: number) => {
      if (gameState !== 'playing') return;
      if (phase !== 'room') return;
      if (cellX === playerPos.x && cellY === playerPos.y) {
        const flower = flowers.find(
          (f) => f.position.x === playerPos.x && f.position.y === playerPos.y && !f.watered
        );
        if (flower) {
          setFlowers((prev) =>
            prev.map((f) => (f.id === flower.id ? { ...f, watered: true } : f))
          );
          const remaining = flowers.filter((f) => !f.watered).length - 1;
          if (remaining === 0) {
            setMessage('🌟 Alle Blumen gegossen! Geh zur Burg!');
            setTimeout(() => setMessage(''), 3000);
          }
        }
      }
    },
    [playerPos, flowers, gameState, phase]
  );

  // ── Auto-hint Blume ─────────────────────────────────────────────────────
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

  // ── Gate hint ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!gameLevel.hasGate || gatePassedRow !== null) return;
    if (gameLevel.gateRow !== undefined && playerPos.y === (gameLevel.gateRow) - 1) {
      setMessage(`🚧 Warte auf das Loch im Tor! Noch ${Math.ceil(gateTimeLeft)}s`);
      setTimeout(() => setMessage(''), 2000);
    }
  }, [playerPos]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleNext = () => {
    if (phase === 'room') loadMaze(levelNumber);
    else setLevelNumber((n) => n + 1);
  };

  const restart = () => loadRoom(levelNumber);

  const overlayTitle = phase === 'room' ? `Garten ${levelNumber} geschafft!` : `Labyrinth ${levelNumber} durchquert!`;
  const overlayText = phase === 'room' ? 'Alle Blumen gegossen. Jetzt das Labyrinth!' : `Level ${levelNumber} komplett! 🎉`;
  const nextBtnLabel = phase === 'room' ? 'Ins Labyrinth →' : 'Nächstes Level →';

  if (showTitle) {
    return (
      <div style={{ minHeight: '100dvh', background: 'linear-gradient(135deg, #064e3b 0%, #1e1b4b 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '24px' }}>
        <div style={{ fontSize: '72px' }}>🌸</div>
        <h1 style={{ color: '#fff', fontSize: '36px', fontWeight: 'bold', margin: 0, textAlign: 'center', textShadow: '0 0 30px rgba(167,139,250,0.8)' }}>Flower Maze</h1>
        <p style={{ color: '#86efac', fontSize: '16px', margin: 0, textAlign: 'center', maxWidth: '280px', lineHeight: 1.6 }}>Finde alle Blumen, gieße sie und finde die Burg!</p>
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

      {/* Tor-Timer Anzeige */}
      {gameLevel.hasGate && gatePassedRow === null && phase === 'room' && (
        <div style={styles.gateTimer}>
          🚧 Tor: {Math.ceil(gateTimeLeft)}s
        </div>
      )}

      <div style={styles.gameArea}>
        <MazeCanvas
          gameLevel={gameLevel}
          playerPos={playerPos}
          flowers={flowers}
          allWatered={allWatered}
          phase={phase}
          gateHoleCol={gateHoleCol}
          gatePassedRow={gatePassedRow}
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
              <button style={styles.overlayBtn} onClick={handleNext}>{nextBtnLabel}</button>
            </div>
          </div>
        )}
      </div>

      <DPad onMove={move} />

      <div style={styles.hint}>
        {phase === 'room'
          ? gameLevel.hasGate && gatePassedRow === null
            ? '🚧 Warte auf das Loch und laufe durch!'
            : 'Pfeile / WASD • Tippe auf eine Blume zum Gießen'
          : 'Finde den Ausgang 🏁'}
      </div>

      <button style={styles.restartBtn} onClick={restart}>🔄 Level neu starten</button>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  root: { display: 'flex', flexDirection: 'column', minHeight: '100dvh', background: '#081c15', color: '#b7e4c7', fontFamily: "'Segoe UI', sans-serif", overflow: 'hidden' },
  gameArea: { position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '8px' },
  gateTimer: {
    textAlign: 'center',
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#fbbf24',
    padding: '4px',
    background: 'rgba(0,0,0,0.4)',
  },
  toast: { position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.85)', color: '#b7e4c7', padding: '8px 20px', borderRadius: '20px', border: '1px solid #52b788', fontSize: '14px', whiteSpace: 'nowrap', zIndex: 10, pointerEvents: 'none' },
  overlay: { position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.78)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20 },
  overlayBox: { background: 'linear-gradient(135deg, #1a472a, #2d6a4f)', border: '2px solid #52b788', borderRadius: '20px', padding: '32px 40px', textAlign: 'center', boxShadow: '0 0 40px rgba(82,183,136,0.4)' },
  overlayEmoji: { fontSize: '56px', lineHeight: 1, marginBottom: '12px' },
  overlayTitle: { color: '#b7e4c7', margin: '0 0 8px', fontSize: '22px' },
  overlayText: { color: '#74c69d', margin: '0 0 16px', fontSize: '14px' },
  timeBox: { background: 'rgba(0,0,0,0.3)', border: '1px solid #52b788', borderRadius: '12px', padding: '10px 24px', fontSize: '28px', fontWeight: 'bold', color: '#b7e4c7', letterSpacing: '2px', marginBottom: '20px' },
  overlayBtn: { background: '#52b788', color: '#fff', border: 'none', padding: '12px 28px', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', touchAction: 'manipulation' },
  hint: { textAlign: 'center', fontSize: '11px', color: '#40916c', padding: '4px 8px' },
  restartBtn: { margin: '0 auto 12px', background: 'transparent', border: '1px solid #40916c', color: '#74c69d', padding: '6px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', touchAction: 'manipulation' },
};

export default Game;
