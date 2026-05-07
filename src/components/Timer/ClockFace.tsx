import { Digit } from './Digit';
import styles from './Timer.module.css';

interface Props {
  remainingMs: number;
  totalMs: number;
  mm: string;
  ss: string;
  ariaLabel: string;
  isBreak: boolean;
  phaseLabel: string;
  isCountdown: boolean;
  size?: number;
}

const SIZE = 280;
const STROKE = 14;
const RADIUS = (SIZE - STROKE) / 2 - 10;
const CX = SIZE / 2;
const CY = SIZE / 2;
const CIRC = 2 * Math.PI * RADIUS;
const GRAD_ID = 'pomo-clock-grad';
const GRAD_BREAK_ID = 'pomo-clock-grad-break';

export function ClockFace({
  remainingMs,
  totalMs,
  mm,
  ss,
  ariaLabel,
  isBreak,
  phaseLabel,
  isCountdown,
  size,
}: Props) {
  const progress =
    totalMs > 0 ? Math.max(0, Math.min(1, remainingMs / totalMs)) : 0;
  const dashOffset = CIRC * (1 - progress);
  const gradientId = isBreak ? GRAD_BREAK_ID : GRAD_ID;

  const wrapStyle = size != null ? { width: size, maxWidth: '100%' } : undefined;
  const valueStyle =
    size != null ? { fontSize: Math.round(size * 0.22) } : undefined;
  const phaseStyle =
    size != null ? { fontSize: Math.round(size * 0.045) } : undefined;

  return (
    <div className={styles.clockWrap} style={wrapStyle}>
      <svg
        className={styles.clockSvg}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="img"
        aria-label={ariaLabel}
      >
        <defs>
          <linearGradient id={GRAD_ID} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" className={styles.gradStartActive} />
            <stop offset="100%" className={styles.gradEndActive} />
          </linearGradient>
          <linearGradient id={GRAD_BREAK_ID} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" className={styles.gradStartBreak} />
            <stop offset="100%" className={styles.gradEndBreak} />
          </linearGradient>
        </defs>

        <circle
          cx={CX}
          cy={CY}
          r={RADIUS}
          fill="none"
          strokeWidth={STROKE}
          className={styles.ringTrack}
        />

        <circle
          cx={CX}
          cy={CY}
          r={RADIUS}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRC}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${CX} ${CY})`}
          className={styles.clockProgress}
        />
      </svg>
      <div className={styles.clockText}>
        <span
          className={`${styles.clockPhase} ${
            isBreak ? styles.clockPhaseBreak : ''
          }`}
          style={phaseStyle}
        >
          {phaseLabel}
        </span>
        <span
          className={`${styles.clockTextValue} ${
            isCountdown ? styles.clockTextValueCountdown : ''
          }`}
          style={valueStyle}
        >
          {mm.split('').map((d, i) => (
            <Digit key={`m${i}`} digit={d} />
          ))}
          <span className={styles.colon}>:</span>
          {ss.split('').map((d, i) => (
            <Digit key={`s${i}`} digit={d} />
          ))}
        </span>
      </div>
    </div>
  );
}
