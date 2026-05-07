import { useEffect, useRef } from 'react';
import { TICK_INTERVAL_MS } from '../constants';
import { notify } from '../lib/notification';
import { useAppStore } from '../store/useAppStore';
import { useToastStore } from '../store/useToastStore';

/**
 * endsAt 도달을 감지해 자동 전이 + 브라우저 알림을 띄운다.
 * - 폴링: TICK_INTERVAL_MS 주기로 endsAt 비교
 * - 백그라운드 복귀(visibilitychange) 시 즉시 한 번 더 체크
 * - 새로고침 직후에도 useEffect 마운트 시 한 번 체크되므로 자동 보정됨
 */
export function useTimerCompletion(): void {
  const lastEndedAtRef = useRef<number | null>(null);

  useEffect(() => {
    function check() {
      const s = useAppStore.getState();
      const isTimed = s.status === 'running' || s.status === 'breakRunning';
      if (!isTimed || s.endsAt == null) return;
      if (Date.now() < s.endsAt) return;

      // 같은 endsAt에 대해 두 번 처리하지 않게 가드
      if (lastEndedAtRef.current === s.endsAt) return;
      lastEndedAtRef.current = s.endsAt;

      const wasRunning = s.status === 'running';
      const completedTitle = s.currentTask?.title;
      const notificationsEnabled = s.notificationsEnabled;

      s.handleTimerEnd();

      const after = useAppStore.getState();
      const allDone =
        after.status === 'idle' &&
        after.currentTask == null &&
        after.queue.length === 0;

      if (allDone) {
        useToastStore.getState().push({
          message: '모든 할 일을 끝냈어요. 오늘 정말 수고했어요',
          tone: 'success',
          duration: 5000,
        });
      }

      if (!notificationsEnabled) return;

      if (wasRunning) {
        notify(
          '수고했어요',
          completedTitle
            ? `'${completedTitle}' 세션이 끝났어요. 잠깐 쉬어가요`
            : '집중 세션이 끝났어요. 잠깐 쉬어가요',
        );
      } else {
        notify('잘 쉬었어요', '휴식 시간이 끝났어요. 다시 집중해볼까요?');
      }
    }

    const id = window.setInterval(check, TICK_INTERVAL_MS);
    const onVis = () => {
      if (document.visibilityState === 'visible') check();
    };
    document.addEventListener('visibilitychange', onVis);
    // 마운트 직후 한 번 체크 (새로고침 직후 endsAt이 이미 지난 경우 처리)
    check();

    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);
}
