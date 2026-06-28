import React from 'react';

interface DPadProps {
  onMove: (dx: number, dy: number) => void;
}

interface BtnConfig {
  dx: number;
  dy: number;
  label: string;
}

const BTN_UP: BtnConfig    = { dx: 0,  dy: -1, label: '▲' };
const BTN_DOWN: BtnConfig  = { dx: 0,  dy: 1,  label: '▼' };
const BTN_LEFT: BtnConfig  = { dx: -1, dy: 0,  label: '◀' };
const BTN_RIGHT: BtnConfig = { dx: 1,  dy: 0,  label: '▶' };

const DPad: React.FC<DPadProps> = ({ onMove }) => {
  const makeHandlers = (dx: number, dy: number) => ({
    onClick: () => onMove(dx, dy),
    onTouchStart: (e: React.TouchEvent) => {
      e.preventDefault();
      onMove(dx, dy);
    },
  });

  const renderBtn = ({ dx, dy, label }: BtnConfig) => (
    <button
      key={label}
      style={styles.btn}
      aria-label={label}
      {...makeHandlers(dx, dy)}
    >
      {label}
    </button>
  );

  return (
    <div style={styles.container}>
      <div style={styles.row}>{renderBtn(BTN_UP)}</div>
      <div style={styles.row}>
        {renderBtn(BTN_LEFT)}
        <div style={styles.center} />
        {renderBtn(BTN_RIGHT)}
      </div>
      <div style={styles.row}>{renderBtn(BTN_DOWN)}</div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    padding: '16px 0 8px',
  },
  row: {
    display: 'flex',
    gap: '4px',
    alignItems: 'center',
  },
  btn: {
    width: 60,
    height: 60,
    fontSize: '22px',
    background: 'linear-gradient(135deg, #2d6a4f, #1b4332)',
    color: '#b7e4c7',
    border: '2px solid #52b788',
    borderRadius: '12px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    touchAction: 'manipulation',
    userSelect: 'none',
    WebkitTapHighlightColor: 'transparent',
  },
  center: {
    width: 60,
    height: 60,
  },
};

export default DPad;
