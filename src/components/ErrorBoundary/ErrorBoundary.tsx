import { Component, type ReactNode } from 'react';
import { STORAGE_KEY } from '../../constants';
import styles from './ErrorBoundary.module.css';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: unknown) {
    // 운영 환경에서도 콘솔에는 흔적이 남아 디버깅에 도움이 됨
    console.error('Pomori 런타임 에러:', error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleResetData = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className={styles.root} role="alert">
        <div className={styles.card}>
          <div className={styles.iconWrap} aria-hidden>
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m12 3 10 18H2z" />
              <path d="M12 9v5" />
              <path d="M12 18h.01" />
            </svg>
          </div>
          <h1 className={styles.title}>문제가 발생했어요</h1>
          <p className={styles.body}>
            예상치 못한 오류로 화면이 멈췄어요. 새로고침으로 대부분 해결돼요.
            반복되면 저장된 데이터를 초기화해주세요.
          </p>
          <div className={styles.actions}>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnPrimary}`}
              onClick={this.handleReload}
            >
              새로고침
            </button>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnSecondary}`}
              onClick={this.handleResetData}
            >
              데이터 초기화
            </button>
          </div>
        </div>
      </div>
    );
  }
}
