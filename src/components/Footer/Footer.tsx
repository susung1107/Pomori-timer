import {
  AUTHOR_NAME,
  COPYRIGHT_YEAR,
  REPO_URL,
} from '../../constants';
import styles from './Footer.module.css';

export function Footer() {
  return (
    <footer className={styles.footer}>
      <span>
        © {COPYRIGHT_YEAR} {AUTHOR_NAME}
      </span>
      <span className={styles.dot} aria-hidden>
        ·
      </span>
      <a
        className={styles.link}
        href={REPO_URL}
        target="_blank"
        rel="noopener noreferrer"
      >
        GitHub
      </a>
    </footer>
  );
}
