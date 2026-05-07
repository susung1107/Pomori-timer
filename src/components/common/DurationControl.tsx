import { useState } from 'react';
import styles from './DurationControl.module.css';
import { DurationPickerModal } from './DurationPickerModal';

interface Props {
  label: string;
  value: number;
  min: number;
  max: number;
  presets: number[];
  step?: number;
  unit?: string;
  disabled?: boolean;
  onChange: (n: number) => void;
  zeroLabel?: string;
}

export function DurationControl({
  label,
  value,
  min,
  max,
  presets,
  step = 1,
  unit = '분',
  disabled = false,
  onChange,
  zeroLabel,
}: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const dec = () => onChange(Math.max(min, value - step));
  const inc = () => onChange(Math.min(max, value + step));

  const display = zeroLabel && value === 0 ? zeroLabel : `${value}${unit}`;

  const openPicker = () => {
    if (disabled) return;
    setPickerOpen(true);
  };

  return (
    <>
      <div className={styles.row}>
        <span className={styles.label}>{label}</span>
        <div className={styles.buttons}>
          <button
            type="button"
            className={styles.stepButton}
            onClick={dec}
            disabled={disabled || value <= min}
            aria-label={`${label} 감소`}
          >
            −
          </button>
          <button
            type="button"
            className={styles.valueButton}
            onClick={openPicker}
            disabled={disabled}
            aria-label={`${label} 직접 선택`}
          >
            {display}
          </button>
          <button
            type="button"
            className={styles.stepButton}
            onClick={inc}
            disabled={disabled || value >= max}
            aria-label={`${label} 증가`}
          >
            +
          </button>
        </div>
      </div>
      <DurationPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title={label}
        value={value}
        min={min}
        max={max}
        presets={presets}
        unit={unit}
        zeroLabel={zeroLabel}
        onChange={onChange}
      />
    </>
  );
}
