import { Modal } from '../Modal/Modal';
import styles from './DurationPickerModal.module.css';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  value: number;
  min: number;
  max: number;
  presets: number[];
  unit?: string;
  zeroLabel?: string;
  onChange: (n: number) => void;
}

export function DurationPickerModal({
  open,
  onClose,
  title,
  value,
  min,
  max,
  presets,
  unit = '분',
  zeroLabel,
  onChange,
}: Props) {
  const isZero = zeroLabel != null && value === 0;
  const display = isZero ? zeroLabel : String(value);

  const sliderPct = ((value - min) / Math.max(1, max - min)) * 100;
  const sliderStyle = {
    background: `linear-gradient(to right, var(--brand) 0%, var(--brand) ${sliderPct}%, var(--bg-elevated) ${sliderPct}%, var(--bg-elevated) 100%)`,
  };

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className={styles.bigValue}>
        <span className={styles.bigNumber}>{display}</span>
        {!isZero && <span className={styles.bigUnit}>{unit}</span>}
      </div>

      <div className={styles.range}>
        <input
          type="range"
          min={min}
          max={max}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className={styles.slider}
          style={sliderStyle}
          aria-label={title}
        />
        <div className={styles.rangeBounds}>
          <span>
            {zeroLabel && min === 0 ? zeroLabel : `${min}${unit}`}
          </span>
          <span>{max}{unit}</span>
        </div>
      </div>

      <div className={styles.presetGrid}>
        {presets.map((p) => {
          const label = zeroLabel && p === 0 ? zeroLabel : `${p}${unit}`;
          const active = p === value;
          return (
            <button
              key={p}
              type="button"
              className={`${styles.preset} ${active ? styles.presetActive : ''}`}
              onClick={() => onChange(p)}
            >
              {label}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        className={styles.confirm}
        onClick={onClose}
      >
        완료
      </button>
    </Modal>
  );
}
