import { useEffect } from "react";
import { APP_TITLE, VISUAL_TICK_INTERVAL_MS } from "../constants";
import { formatMMSS, minutesToMs } from "../lib/time";
import { useAppStore } from "../store/useAppStore";

/**
 * document.title 을 "MM:SS · 할 일" 형태로 갱신.
 * - 상태/할 일이 바뀌면 effect 재구성하며 즉시 한 번 갱신
 * - running/breakRunning 일 때만 자체 1초 interval 로 분/초 갱신
 *   (App 의 tick 에 의존하지 않음 → 매 tick 마다 DOM write 없음)
 */
export function useDocumentTitle(): void {
  const status = useAppStore((s) => s.status);
  const endsAt = useAppStore((s) => s.endsAt);
  const pausedRemainingMs = useAppStore((s) => s.pausedRemainingMs);
  const currentTask = useAppStore((s) => s.currentTask);
  const workMinutes = useAppStore((s) => s.workMinutes);
  const breakMinutes = useAppStore((s) => s.breakMinutes);

  useEffect(() => {
    function compute(): string {
      if (status === "running" && endsAt != null) {
        const totalMs = minutesToMs(workMinutes);
        const remaining = Math.max(0, Math.min(totalMs, endsAt - Date.now()));
        return currentTask
          ? `${formatMMSS(remaining)} · ${currentTask.title}`
          : `${formatMMSS(remaining)} · ${APP_TITLE}`;
      }
      if (status === "paused" && pausedRemainingMs != null) {
        return currentTask
          ? `일시정지 ${formatMMSS(pausedRemainingMs)} · ${currentTask.title}`
          : `일시정지 ${formatMMSS(pausedRemainingMs)}`;
      }
      if (status === "breakRunning" && endsAt != null) {
        const totalMs = minutesToMs(Math.max(1, breakMinutes));
        const remaining = Math.max(0, Math.min(totalMs, endsAt - Date.now()));
        return `휴식 ${formatMMSS(remaining)}`;
      }
      if (status === "break" && pausedRemainingMs != null) {
        return `휴식 일시정지 ${formatMMSS(pausedRemainingMs)}`;
      }
      return APP_TITLE;
    }

    const apply = () => {
      const next = compute();
      if (document.title !== next) document.title = next;
    };
    apply();

    const isTicking = status === "running" || status === "breakRunning";
    if (!isTicking) return;

    const id = window.setInterval(apply, VISUAL_TICK_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [
    status,
    endsAt,
    pausedRemainingMs,
    currentTask,
    workMinutes,
    breakMinutes,
  ]);
}
