import { useEffect, useState } from 'react';
import type { Toast } from '../../store/useToastStore';
import styles from './Toast.module.css';

interface Props {
  toast: Toast;
  onDismiss: () => void;
}

// CSS exit: 80ms delay + 360ms collapse = 440ms 정도면 자연스럽게 사라짐.
const EXIT_MS = 440;

export function ToastItem({ toast, onDismiss }: Props) {
  const [leaving, setLeaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => setLeaving(true), toast.duration);
    return () => window.clearTimeout(id);
  }, [toast.duration]);

  useEffect(() => {
    if (!leaving) return;
    const id = window.setTimeout(onDismiss, EXIT_MS);
    return () => window.clearTimeout(id);
  }, [leaving, onDismiss]);

  const handleAction = () => {
    toast.action?.onClick();
    setLeaving(true);
  };

  const slotClass = [
    styles.slot,
    !mounted ? styles.slotEntering : '',
    leaving ? styles.slotLeaving : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={slotClass}>
      <div className={styles.slotInner}>
        <div
          role={toast.tone === 'warning' ? 'alert' : 'status'}
          className={`${styles.toast} ${styles[toast.tone]}`}
        >
          <span className={styles.iconWrap} aria-hidden>
            <ToneIcon tone={toast.tone} />
          </span>
          <span className={styles.message}>{toast.message}</span>
          {toast.action && (
            <button
              type="button"
              className={styles.actionButton}
              onClick={handleAction}
            >
              {toast.action.label}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ToneIcon({ tone }: { tone: Toast['tone'] }) {
  if (tone === 'success') {
    return (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    );
  }
  if (tone === 'warning') {
    return (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4" />
        <path d="M12 16h.01" />
      </svg>
    );
  }
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8h.01" />
      <path d="M11 12h1v4h1" />
    </svg>
  );
}
