import { useEffect, useState } from 'react';
import { TICK_INTERVAL_MS } from '../constants';

/**
 * 타이머 표시용 강제 리렌더 훅.
 * 스토어를 건드리지 않고 일정 주기로 컴포넌트를 다시 그리게 한다.
 * 실제 남은 시간은 컴포넌트가 endsAt - Date.now()로 직접 계산.
 */
export function useTimerTick(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => {
      setNow(Date.now());
    }, TICK_INTERVAL_MS);
    return () => {
      window.clearInterval(id);
    };
  }, [active]);

  return now;
}
