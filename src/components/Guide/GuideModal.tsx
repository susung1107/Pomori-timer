import { useRef, useState } from 'react';
import { Modal } from '../Modal/Modal';
import styles from './GuideModal.module.css';

interface Props {
  open: boolean;
  onClose: () => void;
}

interface Step {
  icon: React.ReactNode;
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    icon: <ListIcon />,
    title: '할 일을 먼저 적어요',
    body: '위쪽에 할 일을 추가하면 첫 번째 작업이 현재 할 일로 자동 배정돼요. 여러 개를 적어두면 큐로 차곡차곡 쌓여요.',
  },
  {
    icon: <PlayIcon />,
    title: '시작 버튼 한 번이면 끝',
    body: '집중 시간이 끝나면 휴식이, 휴식이 끝나면 다음 작업이 자연스럽게 이어져요. 잠깐 멈추거나 다시 시작도 자유롭게.',
  },
  {
    icon: <SettingsIcon />,
    title: '내 스타일대로 설정',
    body: '집중·휴식 시간, 자동 시작, 테마, 알림까지 모두 설정에서 조절할 수 있어요. 나에게 맞는 페이스로.',
  },
  {
    icon: <ChartIcon />,
    title: '오늘의 기록을 확인해요',
    body: '완료한 작업과 세션 수가 자동으로 쌓여요. 매일 자정이 되면 새로 시작되니 하루 단위로 집중도를 살펴보세요.',
  },
];

const SWIPE_THRESHOLD = 50;

export function GuideModal({ open, onClose }: Props) {
  return (
    <Modal open={open} onClose={onClose} title="Pomori 사용 가이드">
      <GuideContent onClose={onClose} />
    </Modal>
  );
}

function GuideContent({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const dragStartXRef = useRef<number | null>(null);
  const dragDeltaRef = useRef(0);
  const [dragOffset, setDragOffset] = useState(0);

  const isLast = step === STEPS.length - 1;
  const isFirst = step === 0;

  const goNext = () => {
    if (isLast) {
      onClose();
      return;
    }
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };
  const goPrev = () => setStep((s) => Math.max(0, s - 1));

  const onPointerDown = (e: React.PointerEvent) => {
    dragStartXRef.current = e.clientX;
    dragDeltaRef.current = 0;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (dragStartXRef.current == null) return;
    const delta = e.clientX - dragStartXRef.current;
    dragDeltaRef.current = delta;
    setDragOffset(delta);
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (dragStartXRef.current == null) return;
    const delta = dragDeltaRef.current;
    dragStartXRef.current = null;
    dragDeltaRef.current = 0;
    setDragOffset(0);
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    if (delta <= -SWIPE_THRESHOLD && !isLast) {
      setStep((s) => s + 1);
    } else if (delta >= SWIPE_THRESHOLD && !isFirst) {
      setStep((s) => s - 1);
    }
  };

  return (
    <div className={styles.wrapper}>
        <div
          className={styles.viewport}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div
            className={styles.track}
            style={{
              transform: `translate3d(calc(${-step * 100}% + ${dragOffset}px), 0, 0)`,
              transition: dragOffset === 0 ? 'transform 280ms cubic-bezier(0.22, 1, 0.36, 1)' : 'none',
            }}
          >
            {STEPS.map((s, i) => (
              <div className={styles.slide} key={i}>
                <div className={styles.iconWrap} aria-hidden>
                  {s.icon}
                </div>
                <h3 className={styles.title}>{s.title}</h3>
                <p className={styles.body}>{s.body}</p>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.dots} role="tablist" aria-label="가이드 단계">
          {STEPS.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === step}
              aria-label={`${i + 1}번째 단계로 이동`}
              className={`${styles.dot} ${i === step ? styles.dotActive : ''}`}
              onClick={() => setStep(i)}
            />
          ))}
        </div>

        <div className={styles.buttons}>
          {!isFirst ? (
            <button
              type="button"
              className={`${styles.btn} ${styles.btnSecondary}`}
              onClick={goPrev}
            >
              이전
            </button>
          ) : (
            <button
              type="button"
              className={`${styles.btn} ${styles.btnGhost}`}
              onClick={onClose}
            >
              건너뛰기
            </button>
          )}
          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={goNext}
          >
            {isLast ? '시작하기' : '다음'}
          </button>
        </div>
    </div>
  );
}

function ListIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 6h11" />
      <path d="M9 12h11" />
      <path d="M9 18h11" />
      <path d="M5 6h.01" />
      <path d="M5 12h.01" />
      <path d="M5 18h.01" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M10 8.5v7l6-3.5z" fill="currentColor" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" />
      <path d="M7 15l4-4 3 3 5-6" />
    </svg>
  );
}
