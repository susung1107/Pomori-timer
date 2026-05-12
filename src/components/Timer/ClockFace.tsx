import { memo, useEffect, useLayoutEffect, useRef } from 'react';
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
  // 실행 중일 때 rAF 로 60fps 부드러운 진행 링 업데이트. paused/idle 엔 즉시 스냅.
  isRunning: boolean;
  // rAF 가 endsAt 기준으로 실시간 계산하기 위해 받음.
  endsAt: number | null;
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

function ClockFaceImpl({
  remainingMs,
  totalMs,
  mm,
  ss,
  ariaLabel,
  isBreak,
  phaseLabel,
  isCountdown,
  isRunning,
  endsAt,
  size,
}: Props) {
  const progress =
    totalMs > 0 ? Math.max(0, Math.min(1, remainingMs / totalMs)) : 0;
  const dashOffset = CIRC * (1 - progress);
  const gradientId = isBreak ? GRAD_BREAK_ID : GRAD_ID;

  const ringRef = useRef<SVGCircleElement | null>(null);

  // 비-running 상태: prop 기반 dashOffset 으로 즉시 스냅 (paused / idle / break paused).
  // running 상태에서는 아래 rAF 가 매 프레임 직접 덮어쓰므로 여기선 건드리지 않음.
  useLayoutEffect(() => {
    if (isRunning) return;
    const ring = ringRef.current;
    if (!ring) return;
    ring.style.strokeDashoffset = String(dashOffset);
  }, [isRunning, dashOffset]);

  // running 시 rAF 로 60fps 부드럽게 업데이트. React 리렌더와 무관하게 흐름.
  useEffect(() => {
    if (!isRunning || endsAt == null || totalMs <= 0) return;
    let rafId = 0;
    const tick = () => {
      const ring = ringRef.current;
      if (ring) {
        const remaining = Math.max(0, Math.min(totalMs, endsAt - Date.now()));
        const p = remaining / totalMs;
        ring.style.strokeDashoffset = String(CIRC * (1 - p));
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isRunning, endsAt, totalMs]);

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
          ref={ringRef}
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

export const ClockFace = memo(ClockFaceImpl);
