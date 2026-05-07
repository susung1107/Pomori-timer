import { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';

/**
 * 자정 지나면 일일 카운트 리셋.
 * - 마운트 시 즉시 체크
 * - 1분 주기 폴링
 * - 탭 포그라운드 복귀 시 체크
 */
export function useDailyReset(): void {
  useEffect(() => {
    const check = () => useAppStore.getState().rolloverIfNewDay();
    check();
    const id = window.setInterval(check, 60 * 1000);
    const onVis = () => {
      if (document.visibilityState === 'visible') check();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);
}
