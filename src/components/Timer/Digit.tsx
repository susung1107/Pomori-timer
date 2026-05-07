import { useLayoutEffect, useRef } from 'react';
import styles from './Timer.module.css';

interface Props {
  digit: string;
}

const COLUMN_LENGTH = 30;
const INITIAL_CYCLE_OFFSET = 10;
const COLUMN_DIGITS = Array.from({ length: COLUMN_LENGTH }, (_, i) => i % 10);

/**
 * 자릿수 슬롯. 0~9가 3 사이클 쌓인 컬럼을 항상 *아래로 흐르는 방향*으로만 굴린다.
 * - 1자리 감소(예: 5→4): 컬럼이 1em 내려가며 4가 위에서 슥 들어옴
 * - wrap(예: 0→9): 보이지 않게 컬럼을 한 사이클(10em) 더 아래로 점프시켜 두고
 *   다시 1em 만 굴려, 사용자에겐 매번 똑같이 한 방향으로만 흐르는 듯 보임
 */
export function Digit({ digit }: Props) {
  const parsed = parseInt(digit, 10);
  const value = Number.isFinite(parsed) ? parsed : 0;

  const elRef = useRef<HTMLSpanElement | null>(null);
  const initializedRef = useRef(false);
  const translateYEmRef = useRef(-(INITIAL_CYCLE_OFFSET + value));
  const lastValueRef = useRef(value);

  useLayoutEffect(() => {
    const el = elRef.current;
    if (!el) return;

    if (!initializedRef.current) {
      initializedRef.current = true;
      el.style.transition = 'none';
      el.style.transform = `translateY(${translateYEmRef.current}em)`;
      void el.offsetHeight;
      el.style.transition = '';
      return;
    }

    if (lastValueRef.current === value) return;

    const currentDigit = lastValueRef.current;
    const steps = (((currentDigit - value) % 10) + 10) % 10 || 10;

    let currentY = translateYEmRef.current;
    let nextY = currentY + steps;

    // 다음 위치가 컬럼 상단을 넘어서면 보이지 않게 한 사이클(10em) 아래로 점프.
    // 같은 숫자가 -10em 떨어진 곳에 또 있어 시각적으로 동일하게 유지됨.
    if (nextY > -INITIAL_CYCLE_OFFSET) {
      currentY -= 10;
      nextY -= 10;
      el.style.transition = 'none';
      el.style.transform = `translateY(${currentY}em)`;
      void el.offsetHeight;
      el.style.transition = '';
    }

    translateYEmRef.current = nextY;
    el.style.transform = `translateY(${nextY}em)`;
    lastValueRef.current = value;
  }, [value]);

  return (
    <span className={styles.digitSlot}>
      <span ref={elRef} className={styles.digitColumn}>
        {COLUMN_DIGITS.map((d, i) => (
          <span key={i} className={styles.digitCell}>
            {d}
          </span>
        ))}
      </span>
    </span>
  );
}
