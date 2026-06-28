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

  return (
    <div style={styles.hud}>
      <div style={styles.levelBadge}>
        Level {level}
        <span style={styles.phaseBadge}>{phase === 'room' ? '🏠' : '🌀'}</span>
      </div>

      <div style={styles.flowerSection}>
        {phase === 'room' ? (
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
        {phase === 'room' && (
          <span style={styles.counter}>{watered.length}/{flowers.length} 💧</span>
        )}
        <span style={styles.timer}>⏱ {timeStr}</span>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  hud: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: 'linear-gradient(135deg, #1a472a 0%, #2d6a4f 100%)',
    padding: '10px 16px',
    borderBottom: '3px solid #52b788',
    minHeight: '56px',
    flexWrap: 'wrap',
    gap: '8px',
    userSelect: 'none',
  },
  levelBadge: {
    background: '#52b788',
    color: '#fff',
    borderRadius: '20px',
    padding: '4px 14px',
    fontWeight: 'bold',
    fontSize: '15px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    whiteSpace: 'nowrap',
  },
  phaseBadge: {
    fontSize: '16px',
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
    fontSize: '22px',
    filter: 'drop-shadow(0 0 4px #52b788)',
  },
  dry: {
    fontSize: '22px',
    opacity: 0.35,
    filter: 'grayscale(80%)',
  },
  done: {
    color: '#b7e4c7',
    fontWeight: 'bold',
    fontSize: '14px',
  },
  mazeHint: {
    color: '#b7e4c7',
    fontSize: '14px',
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
    fontSize: '13px',
    fontWeight: 'bold',
    whiteSpace: 'nowrap',
  },
  timer: {
    color: '#b7e4c7',
    fontSize: '15px',
    fontWeight: 'bold',
    whiteSpace: 'nowrap',
  },
};

export default HUD;
