import { useMemo, useState } from 'react';
import { ensureNotificationPermission } from '../../lib/notification';
import { formatMMSS, minutesToMs } from '../../lib/time';
import { useAppStore } from '../../store/useAppStore';
import { AlertModal } from '../AlertModal/AlertModal';
import { ClockFace } from './ClockFace';
import { Digit } from './Digit';
import styles from './Timer.module.css';

interface Props {
  now: number;
  onEnterFocus: () => void;
}

function splitTime(text: string): [string, string] {
  const [mm = '00', ss = '00'] = text.split(':');
  return [mm, ss];
}

function ClockIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4l2.5 1.5" />
    </svg>
  );
}

function DigitalIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="2.5" y="7" width="19" height="10" rx="2" />
      <path d="M7 11v2" />
      <path d="M10 11v2" />
      <path d="M14 11v2" />
      <path d="M17 11v2" />
    </svg>
  );
}

function ExpandIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 9V4h5" />
      <path d="M20 9V4h-5" />
      <path d="M4 15v5h5" />
      <path d="M20 15v5h-5" />
    </svg>
  );
}

export function Timer({ now, onEnterFocus }: Props) {
  const status = useAppStore((s) => s.status);
  const workMinutes = useAppStore((s) => s.workMinutes);
  const breakMinutes = useAppStore((s) => s.breakMinutes);
  const endsAt = useAppStore((s) => s.endsAt);
  const pausedRemainingMs = useAppStore((s) => s.pausedRemainingMs);
  const currentTask = useAppStore((s) => s.currentTask);
  const queueLength = useAppStore((s) => s.queue.length);
  const displayMode = useAppStore((s) => s.displayMode);

  const notificationsEnabled = useAppStore((s) => s.notificationsEnabled);

  const startTimer = useAppStore((s) => s.startTimer);
  const pauseTimer = useAppStore((s) => s.pauseTimer);
  const resetTimer = useAppStore((s) => s.resetTimer);
  const setDisplayMode = useAppStore((s) => s.setDisplayMode);

  const isBreakPhase = status === 'breakRunning' || status === 'break';
  const isRunningPhase = status === 'running' || status === 'breakRunning';
  const isIdle = status === 'idle';

  const totalMs = useMemo(() => {
    if (isBreakPhase) {
      return minutesToMs(Math.max(1, breakMinutes));
    }
    return minutesToMs(workMinutes);
  }, [isBreakPhase, breakMinutes, workMinutes]);

  // useTimerTick 의 now 가 stale 일 수 있어(첫 tick이 200ms 늦게 옴),
  // 렌더 시점의 Date.now()를 직접 사용해서 25:01 같은 깜빡임 방지.
  // now 는 dep 으로 두어 매 tick 마다 재계산만 트리거.
  const remainingMs = useMemo(() => {
    if (status === 'running' || status === 'breakRunning') {
      if (endsAt == null) return 0;
      return Math.max(0, Math.min(totalMs, endsAt - Date.now()));
    }
    if (status === 'paused' || status === 'break') {
      return pausedRemainingMs ?? 0;
    }
    return totalMs;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, endsAt, pausedRemainingMs, totalMs, now]);

  const canStart = useMemo(() => {
    if (status === 'idle') return currentTask != null || queueLength > 0;
    return status === 'paused' || status === 'break';
  }, [status, currentTask, queueLength]);

  const phaseLabel = isBreakPhase
    ? '휴식'
    : status === 'paused'
      ? '일시정지'
      : status === 'running'
        ? '집중'
        : '준비';

  const handleStart = async () => {
    if (status === 'idle' && notificationsEnabled) {
      await ensureNotificationPermission();
    }
    startTimer();
  };

  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  const handleReset = () => {
    if (status === 'running' || status === 'paused') {
      setResetConfirmOpen(true);
      return;
    }
    resetTimer();
  };

  const confirmReset = () => {
    resetTimer();
    setResetConfirmOpen(false);
  };

  const toggleDisplayMode = () => {
    setDisplayMode(displayMode === 'clock' ? 'digital' : 'clock');
  };

  const timeText = formatMMSS(remainingMs);
  const [mm, ss] = splitTime(timeText);
  const isCountdown = isRunningPhase && remainingMs <= 10_000;

  return (
    <section className={styles.timer} aria-label="타이머">
      <div className={styles.topActions}>
        <button
          type="button"
          className={styles.iconToggle}
          onClick={toggleDisplayMode}
          aria-label={
            displayMode === 'clock'
              ? '타이머형으로 변경'
              : '시계형으로 변경'
          }
        >
          {displayMode === 'clock' ? <DigitalIcon /> : <ClockIcon />}
        </button>
        <button
          type="button"
          className={styles.iconToggle}
          onClick={onEnterFocus}
          aria-label="포커스 모드"
        >
          <ExpandIcon />
        </button>
      </div>

      {currentTask && !isBreakPhase && (
        <div className={styles.taskLabel} title={currentTask.title}>
          {currentTask.title}
        </div>
      )}

      {displayMode === 'clock' ? (
        <ClockFace
          remainingMs={remainingMs}
          totalMs={totalMs}
          mm={mm}
          ss={ss}
          ariaLabel={`남은 시간 ${timeText}`}
          isBreak={isBreakPhase}
          phaseLabel={phaseLabel}
          isCountdown={isCountdown}
        />
      ) : (
        <>
          <div
            className={`${styles.phase} ${
              isBreakPhase ? styles.phaseBreak : ''
            }`}
          >
            {phaseLabel}
          </div>
          <div
            className={`${styles.digital} ${
              isCountdown ? styles.digitalCountdown : ''
            }`}
            aria-live="polite"
            aria-label={timeText}
          >
            {mm.split('').map((d, i) => (
              <Digit key={`m${i}`} digit={d} />
            ))}
            <span className={styles.colon}>:</span>
            {ss.split('').map((d, i) => (
              <Digit key={`s${i}`} digit={d} />
            ))}
          </div>
        </>
      )}

      <div className={styles.actions}>
        {isRunningPhase ? (
          <button
            type="button"
            className={styles.primaryButton}
            onClick={pauseTimer}
          >
            일시정지
          </button>
        ) : (
          <button
            type="button"
            className={styles.primaryButton}
            onClick={handleStart}
            disabled={!canStart}
          >
            시작
          </button>
        )}
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={handleReset}
          disabled={isIdle}
        >
          리셋
        </button>
      </div>

      <AlertModal
        open={resetConfirmOpen}
        title="진행을 초기화할까요?"
        description="지금까지의 세션 진행이 사라져요."
        confirmLabel="초기화"
        cancelLabel="취소"
        tone="danger"
        onConfirm={confirmReset}
        onCancel={() => setResetConfirmOpen(false)}
      />
    </section>
  );
}
