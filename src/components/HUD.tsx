import React from 'react';
import { Flower, GamePhase } from '../types/game';

interface HUDProps {
  flowers: Flower[];
  level: number;
  elapsed: number;
  phase: GamePhase;
}

const HUD: React.FC<HUDProps> = ({ flowers, level, elapsed, phase }) => {
  const watered = flowers.filter((f) => f.watered);
  const remaining = flowers.filter((f) => !f.watered);

  const totalSeconds = Math.floor(elapsed / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const timeStr = `${minutes > 0 ? `${minutes}:` : ''}${String(seconds).padStart(2, '0')}`;

  const isRoom = phase === 'room';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: isRoom
          ? 'linear-gradient(135deg, #064e3b, #065f46)'
          : 'linear-gradient(135deg, #1e1b4b, #312e81)',
        padding: '12px 20px',
        borderBottom: '3px solid transparent',
        backgroundImage: isRoom
          ? 'linear-gradient(135deg, #064e3b, #065f46), linear-gradient(90deg, #6fcf97, #059669)'
          : 'linear-gradient(135deg, #1e1b4b, #312e81), linear-gradient(90deg, #a78bfa, #7c3aed)',
        backgroundOrigin: 'border-box',
        backgroundClip: 'padding-box, border-box',
        minHeight: '64px',
        flexWrap: 'wrap',
        gap: '8px',
        userSelect: 'none',
      }}
    >
      <div style={styles.levelBadge}>
        Level {level}
        <span style={styles.phaseBadge}>{isRoom ? '🏠' : '🌀'}</span>
      </div>

      <div style={styles.flowerSection}>
        {isRoom ? (
          <>
            {watered.map((f) => (
              <span key={f.id} style={styles.flowered}>{f.emoji}</span>
            ))}
            {remaining.map((f) => (
              <span key={f.id} style={styles.dry}>{f.emoji}</span>
            ))}
            {remaining.length === 0 && flowers.length > 0 && (
              <span style={styles.done}>🚪 Geh zur Tür!</span>
            )}
          </>
        ) : (
          <span style={styles.mazeHint}>Finde den Ausgang 🏁</span>
        )}
      </div>

      <div style={styles.right}>
        {isRoom && (
          <span style={styles.counter}>{watered.length}/{flowers.length} 💧</span>
        )}
        <span style={styles.timer}>⏱ {timeStr}</span>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  levelBadge: {
    background: 'rgba(255,255,255,0.15)',
    color: '#fff',
    borderRadius: '20px',
    padding: '6px 18px',
    fontWeight: 'bold',
    fontSize: '18px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    whiteSpace: 'nowrap',
    backdropFilter: 'blur(4px)',
    border: '1px solid rgba(255,255,255,0.2)',
  },
  phaseBadge: {
    fontSize: '18px',
  },
  flowerSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    flex: 1,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  flowered: {
    fontSize: '26px',
    filter: 'drop-shadow(0 0 5px #6fcf97)',
  },
  dry: {
    fontSize: '26px',
    opacity: 0.35,
    filter: 'grayscale(80%)',
  },
  done: {
    color: '#b7e4c7',
    fontWeight: 'bold',
    fontSize: '16px',
  },
  mazeHint: {
    color: '#c4b5fd',
    fontSize: '16px',
    fontWeight: 'bold',
  },
  right: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '2px',
  },
  counter: {
    color: '#b7e4c7',
    fontSize: '14px',
    fontWeight: 'bold',
    whiteSpace: 'nowrap',
  },
  timer: {
    color: '#fff',
    fontSize: '17px',
    fontWeight: 'bold',
    whiteSpace: 'nowrap',
    letterSpacing: '0.5px',
  },
};

export default HUD;
