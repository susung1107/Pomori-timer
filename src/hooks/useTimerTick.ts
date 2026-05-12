import { useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore';

/**
 * 표시되는 mm:ss 가 바뀌는 정확한 순간에만 React 리렌더를 트리거한다.
 *
 * - rAF 로 매 프레임 `endsAt - Date.now()` 의 floor-second 를 체크
 * - 표시 초가 바뀐 프레임에만 setNow → 리렌더 (≈ 1Hz)
 * - 표시 정확도: 16ms 이내 — 일시정지 시 화면값과 캡처값이 항상 일치
 * - 백그라운드 탭에선 rAF 자체가 멈춰 자동 정지
 *
 * 이전 구현은 setInterval 1Hz 였는데, tick 시점이 endsAt 의 초 경계와 어긋나면
 * 화면이 최대 1초 늦은 값을 보여주다가 일시정지 시 실제값으로 점프하면서
 * 디지트가 한 칸 더 내려가는 문제가 있었음.
 */
export function useTimerTick(): number {
  const endsAt = useAppStore((s) => s.endsAt);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (endsAt == null) return;

    let rafId = 0;
    let lastSec = -1;

    const loop = () => {
      const t = Date.now();
      const remaining = Math.max(0, endsAt - t);
      const sec = Math.floor(remaining / 1000);
      if (sec !== lastSec) {
        lastSec = sec;
        setNow(t);
      }
      rafId = requestAnimationFrame(loop);
    };

    const start = () => {
      if (rafId) return;
      const t = Date.now();
      setNow(t);
      lastSec = Math.floor(Math.max(0, endsAt - t) / 1000);
      rafId = requestAnimationFrame(loop);
    };
    const stop = () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
    };

    if (document.visibilityState === 'visible') start();

    const onVis = () => {
      if (document.visibilityState === 'visible') start();
      else stop();
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [endsAt]);

  return now;
}
