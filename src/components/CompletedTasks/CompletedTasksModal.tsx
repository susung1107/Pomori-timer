import { useAppStore } from '../../store/useAppStore';
import { Modal } from '../Modal/Modal';
import styles from './CompletedTasksModal.module.css';

interface Props {
  open: boolean;
  onClose: () => void;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function formatDuration(startedAt: number, completedAt: number): string {
  const totalSec = Math.max(60, Math.round((completedAt - startedAt) / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (s === 0) return `${m}분`;
  return `${m}분 ${s}초`;
}

export function CompletedTasksModal({ open, onClose }: Props) {
  const sessions = useAppStore((s) => s.completedSessionsToday);
  const tasks = useAppStore((s) => s.completedTasksToday);

  return (
    <Modal open={open} onClose={onClose} title="오늘 완료" size="wide">
      <div className={styles.summary}>
        <span className={styles.summaryValue}>{sessions}</span>
        <span className={styles.summaryLabel}>세션 완료</span>
      </div>

      {tasks.length === 0 ? (
        <p className={styles.empty}>
          아직 완료한 세션이 없어요. 첫 세션을 시작해보세요.
        </p>
      ) : (
        <ul className={styles.list}>
          {tasks
            .slice()
            .reverse()
            .map((t) => (
              <li key={`${t.id}-${t.completedAt}`} className={styles.item}>
                <div className={styles.itemTitle}>{t.title}</div>
                {t.startedAt ? (
                  <div className={styles.itemTimeBar}>
                    <div className={styles.timeRange}>
                      <span className={styles.timeChunk}>
                        <span className={styles.timeLabel}>시작</span>
                        <span className={styles.timeValue}>
                          {formatTime(t.startedAt)}
                        </span>
                      </span>
                      <span className={styles.arrow} aria-hidden>
                        →
                      </span>
                      <span className={styles.timeChunk}>
                        <span className={styles.timeLabel}>종료</span>
                        <span className={styles.timeValue}>
                          {formatTime(t.completedAt)}
                        </span>
                      </span>
                    </div>
                    <span className={styles.durationChip}>
                      {formatDuration(t.startedAt, t.completedAt)}
                    </span>
                  </div>
                ) : (
                  <div className={styles.itemTimeBar}>
                    <div className={styles.timeRange}>
                      <span className={styles.timeChunk}>
                        <span className={styles.timeLabel}>종료</span>
                        <span className={styles.timeValue}>
                          {formatTime(t.completedAt)}
                        </span>
                      </span>
                    </div>
                  </div>
                )}
              </li>
            ))}
        </ul>
      )}
    </Modal>
  );
}
