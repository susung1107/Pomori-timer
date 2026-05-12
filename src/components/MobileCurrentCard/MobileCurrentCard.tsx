import { useAppStore } from '../../store/useAppStore';
import type { TimerStatus } from '../../types';
import styles from './MobileCurrentCard.module.css';

interface Props {
  onOpen: () => void;
}

function PlayIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M8 5.5v13a1 1 0 0 0 1.55.83l10-6.5a1 1 0 0 0 0-1.66l-10-6.5A1 1 0 0 0 8 5.5z" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

function StatusBadge({ status }: { status: TimerStatus }) {
  if (status === 'running') {
    return (
      <span className={`${styles.badge} ${styles.badgeRunning}`}>
        <span className={styles.badgeDot} aria-hidden />
        진행중
      </span>
    );
  }
  if (status === 'paused') {
    return (
      <span className={`${styles.badge} ${styles.badgePaused}`}>일시정지</span>
    );
  }
  return <span className={`${styles.badge} ${styles.badgeIdle}`}>대기</span>;
}

export function MobileCurrentCard({ onOpen }: Props) {
  const status = useAppStore((s) => s.status);
  const currentTask = useAppStore((s) => s.currentTask);
  const queue = useAppStore((s) => s.queue);

  const isBreak = status === 'breakRunning' || status === 'break';
  // 휴식 중: 다음 큐 항목을 '대기'로 보여줌
  const displayTask = currentTask ?? (isBreak ? queue[0] ?? null : null);
  const displayStatus: TimerStatus = currentTask ? status : 'idle';
  const queueRemaining = currentTask ? queue.length : Math.max(0, queue.length - 1);

  return (
    <button
      type="button"
      className={`${styles.card} ${displayTask ? styles.cardActive : ''}`}
      onClick={onOpen}
      aria-label={displayTask ? '할 일 큐 열기' : '할 일 추가'}
    >
      <span className={styles.iconWrap}>
        {displayTask ? <PlayIcon /> : <PlusIcon />}
      </span>

      <span className={styles.body}>
        {displayTask ? (
          <>
            <span className={styles.label}>현재 작업</span>
            <span className={styles.title}>{displayTask.title}</span>
          </>
        ) : (
          <span className={styles.placeholder}>할 일 추가하기</span>
        )}
      </span>

      <span className={styles.right}>
        {displayTask && <StatusBadge status={displayStatus} />}
        {queueRemaining > 0 && (
          <span className={styles.queueHint}>+{queueRemaining}</span>
        )}
        <span className={styles.chevron}>
          <ChevronIcon />
        </span>
      </span>
    </button>
  );
}
