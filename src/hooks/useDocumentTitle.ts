import { useEffect } from 'react';
import { APP_TITLE } from '../constants';
import { formatMMSS, minutesToMs } from '../lib/time';
import { useAppStore } from '../store/useAppStore';

/**
 * document.title 을 "MM:SS · 할 일" 형태로 갱신.
 * 매 tick 마다 호출되도록 now를 인자로 받지만, 실제 시간은 Date.now()로 계산해
 * stale tick 으로 인한 깜빡임을 방지한다.
 */
export function useDocumentTitle(now: number): void {
  const status = useAppStore((s) => s.status);
  const endsAt = useAppStore((s) => s.endsAt);
  const pausedRemainingMs = useAppStore((s) => s.pausedRemainingMs);
  const currentTask = useAppStore((s) => s.currentTask);
  const workMinutes = useAppStore((s) => s.workMinutes);
  const breakMinutes = useAppStore((s) => s.breakMinutes);

  useEffect(() => {
    let title = APP_TITLE;

    if (status === 'running' && endsAt != null) {
      const totalMs = minutesToMs(workMinutes);
      const remaining = Math.max(0, Math.min(totalMs, endsAt - Date.now()));
      title = currentTask
        ? `${formatMMSS(remaining)} · ${currentTask.title}`
        : `${formatMMSS(remaining)} · ${APP_TITLE}`;
    } else if (status === 'paused' && pausedRemainingMs != null) {
      title = currentTask
        ? `일시정지 ${formatMMSS(pausedRemainingMs)} · ${currentTask.title}`
        : `일시정지 ${formatMMSS(pausedRemainingMs)}`;
    } else if (status === 'breakRunning' && endsAt != null) {
      const totalMs = minutesToMs(Math.max(1, breakMinutes));
      const remaining = Math.max(0, Math.min(totalMs, endsAt - Date.now()));
      title = `휴식 ${formatMMSS(remaining)}`;
    } else if (status === 'break' && pausedRemainingMs != null) {
      title = `휴식 일시정지 ${formatMMSS(pausedRemainingMs)}`;
    }

    document.title = title;
  }, [
    status,
    endsAt,
    pausedRemainingMs,
    currentTask,
    workMinutes,
    breakMinutes,
    now,
  ]);
}
