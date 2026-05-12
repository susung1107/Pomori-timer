import { useEffect, useMemo, useState } from 'react';
import { ensureNotificationPermission } from '../../lib/notification';
import { formatMMSS, minutesToMs } from '../../lib/time';
import { useAppStore } from '../../store/useAppStore';
import { AlertModal } from '../AlertModal/AlertModal';
import { ClockFace } from './ClockFace';
import { Digit } from './Digit';
import styles from './FocusOverlay.module.css';

interface Props {
  now: number;
  onClose: () => void;
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

function CloseIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

export function FocusOverlay({ now, onClose }: Props) {
  const status = useAppStore((s) => s.status);
  const workMinutes = useAppStore((s) => s.workMinutes);
  const breakMinutes = useAppStore((s) => s.breakMinutes);
  const endsAt = useAppStore((s) => s.endsAt);
  const pausedRemainingMs = useAppStore((s) => s.pausedRemainingMs);
  const currentTask = useAppStore((s) => s.currentTask);
  const queue = useAppStore((s) => s.queue);
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
    if (status === 'idle') return currentTask != null || queue.length > 0;
    return status === 'paused' || status === 'break';
  }, [status, currentTask, queue.length]);

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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !resetConfirmOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, resetConfirmOpen]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const sessionLabel = isBreakPhase
    ? '휴식 중'
    : currentTask
      ? currentTask.title
      : '할 일을 추가해 주세요';

  // 현재가 작업 세션이면 큐 첫 항목이 다음, 휴식이면 currentTask가 다음 작업.
  const upcomingTask = isBreakPhase ? currentTask : queue[0] ?? null;

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label="포커스 모드"
    >
      <div className={styles.topBar}>
        <button
          type="button"
          className={styles.iconButton}
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
          className={styles.iconButton}
          onClick={onClose}
          aria-label="포커스 모드 종료"
        >
          <CloseIcon />
        </button>
      </div>

      <div className={styles.content}>
        <div className={styles.sessionLabel}>{sessionLabel}</div>

        {displayMode === 'clock' ? (
          <div className={styles.clockBox}>
            <ClockFace
              remainingMs={remainingMs}
              totalMs={totalMs}
              mm={mm}
              ss={ss}
              ariaLabel={`남은 시간 ${timeText}`}
              isBreak={isBreakPhase}
              phaseLabel={phaseLabel}
              isCountdown={isCountdown}
              isRunning={isRunningPhase}
              endsAt={endsAt}
              size={520}
            />
          </div>
        ) : (
          <div className={styles.digitalBox}>
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
          </div>
        )}

        {upcomingTask && (
          <div className={styles.nextHint} aria-label="다음 작업">
            <span className={styles.nextLabel}>다음</span>
            <span className={styles.nextTitle}>{upcomingTask.title}</span>
          </div>
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
    </div>
  );
}
