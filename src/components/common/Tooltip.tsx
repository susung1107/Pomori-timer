import type { ReactNode } from 'react';
import styles from './Tooltip.module.css';

type Placement = 'top' | 'bottom';

interface Props {
  label: string;
  placement?: Placement;
  children: ReactNode;
}

export function Tooltip({ label, placement = 'bottom', children }: Props) {
  return (
    <span className={styles.wrapper} data-placement={placement}>
      {children}
      <span className={styles.tooltip} role="tooltip">
        {label}
      </span>
    </span>
  );
}
