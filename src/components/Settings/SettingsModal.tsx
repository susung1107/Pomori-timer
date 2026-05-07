import { useState } from 'react';
import {
  AUTHOR_EMAIL,
  AUTHOR_NAME,
  BREAK_MAX_MIN,
  BREAK_MIN_MIN,
  COPYRIGHT_YEAR,
  REPO_URL,
  WORK_MAX_MIN,
  WORK_MIN_MIN,
} from '../../constants';
import {
  ensureNotificationPermission,
  notificationsSupported,
} from '../../lib/notification';
import { useAppStore } from '../../store/useAppStore';
import { useToastStore } from '../../store/useToastStore';
import type { Accent } from '../../types';
import { DurationControl } from '../common/DurationControl';
import { Modal } from '../Modal/Modal';
import styles from './SettingsModal.module.css';

interface Props {
  open: boolean;
  onClose: () => void;
}

const WORK_PRESETS = [10, 15, 20, 25, 30, 45, 50, 60];
const BREAK_PRESETS = [0, 3, 5, 7, 10];

const ACCENT_OPTIONS: { key: Accent; label: string; hint: string; color: string }[] = [
  { key: 'blue', label: '블루', hint: '차분한 집중', color: '#3182f6' },
  { key: 'green', label: '그린', hint: '눈이 편안한', color: '#10b981' },
  { key: 'indigo', label: '인디고', hint: '창의·깊이', color: '#6366f1' },
  { key: 'amber', label: '앰버', hint: '따뜻한 저자극', color: '#f59e0b' },
];

type TabKey = 'timer' | 'automation' | 'notification' | 'display' | 'support';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'timer', label: '타이머' },
  { key: 'automation', label: '자동화' },
  { key: 'notification', label: '알림' },
  { key: 'display', label: '화면' },
  { key: 'support', label: '지원' },
];

export function SettingsModal({ open, onClose }: Props) {
  const status = useAppStore((s) => s.status);
  const workMinutes = useAppStore((s) => s.workMinutes);
  const breakMinutes = useAppStore((s) => s.breakMinutes);
  const displayMode = useAppStore((s) => s.displayMode);
  const theme = useAppStore((s) => s.theme);
  const accent = useAppStore((s) => s.accent);
  const autoStartNext = useAppStore((s) => s.autoStartNext);
  const notificationsEnabled = useAppStore((s) => s.notificationsEnabled);
  const setWorkMinutes = useAppStore((s) => s.setWorkMinutes);
  const setBreakMinutes = useAppStore((s) => s.setBreakMinutes);
  const setDisplayMode = useAppStore((s) => s.setDisplayMode);
  const setTheme = useAppStore((s) => s.setTheme);
  const setAccent = useAppStore((s) => s.setAccent);
  const setAutoStartNext = useAppStore((s) => s.setAutoStartNext);
  const setNotificationsEnabled = useAppStore((s) => s.setNotificationsEnabled);
  const pushToast = useToastStore((s) => s.push);

  const supported = notificationsSupported();

  const handleToggleNotifications = async () => {
    const next = !notificationsEnabled;
    if (next && supported) {
      const permission = await ensureNotificationPermission();
      const granted = permission === 'granted';
      setNotificationsEnabled(granted);
      if (!granted) {
        pushToast({
          message: '브라우저 설정에서 알림을 허용해주세요',
          tone: 'warning',
        });
      }
      return;
    }
    setNotificationsEnabled(next);
  };

  const [tab, setTab] = useState<TabKey>('timer');

  const isIdle = status === 'idle';

  return (
    <Modal open={open} onClose={onClose} title="설정">
      <div className={styles.tabs} role="tablist" aria-label="설정 카테고리">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            className={`${styles.tab} ${
              tab === t.key ? styles.tabActive : ''
            }`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className={styles.tabPanel}>
        {tab === 'timer' && (
          <div className={styles.section}>
            <DurationControl
              label="집중 시간"
              value={workMinutes}
              min={WORK_MIN_MIN}
              max={WORK_MAX_MIN}
              presets={WORK_PRESETS}
              disabled={!isIdle}
              onChange={setWorkMinutes}
            />
            <DurationControl
              label="휴식 시간"
              value={breakMinutes}
              min={BREAK_MIN_MIN}
              max={BREAK_MAX_MIN}
              presets={BREAK_PRESETS}
              disabled={!isIdle}
              onChange={setBreakMinutes}
              zeroLabel="사용 안 함"
            />
            {!isIdle && (
              <p className={styles.hint}>
                세션이 끝난 뒤 시간을 변경할 수 있어요
              </p>
            )}
          </div>
        )}

        {tab === 'automation' && (
          <div className={styles.section}>
            <div className={styles.toggleRow}>
              <div className={styles.toggleText}>
                <span className={styles.toggleLabel}>자동 시작</span>
                <span className={styles.toggleSubtext}>
                  휴식이 끝나면 다음 세션을 자동으로 시작
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={autoStartNext}
                aria-label="자동 시작"
                className={`${styles.toggle} ${
                  autoStartNext ? styles.toggleOn : ''
                }`}
                onClick={() => setAutoStartNext(!autoStartNext)}
              >
                <span className={styles.toggleKnob} />
              </button>
            </div>
          </div>
        )}

        {tab === 'notification' && (
          <div className={styles.section}>
            <div className={styles.toggleRow}>
              <div className={styles.toggleText}>
                <span className={styles.toggleLabel}>브라우저 알림</span>
                <span className={styles.toggleSubtext}>
                  세션과 휴식이 끝날 때 알림으로 알려드릴게요
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={notificationsEnabled}
                aria-label="브라우저 알림"
                disabled={!supported}
                className={`${styles.toggle} ${
                  notificationsEnabled ? styles.toggleOn : ''
                }`}
                onClick={handleToggleNotifications}
              >
                <span className={styles.toggleKnob} />
              </button>
            </div>
            {!supported && (
              <p className={styles.hint}>
                이 브라우저는 알림을 지원하지 않아요
              </p>
            )}
          </div>
        )}

        {tab === 'display' && (
          <div className={styles.section}>
            <div className={styles.field}>
              <span className={styles.sectionLabel}>표시 방식</span>
              <div
                className={styles.segmented}
                role="radiogroup"
                aria-label="타이머 표시 방식"
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={displayMode === 'clock'}
                  className={`${styles.segment} ${
                    displayMode === 'clock' ? styles.segmentActive : ''
                  }`}
                  onClick={() => setDisplayMode('clock')}
                >
                  시계형
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={displayMode === 'digital'}
                  className={`${styles.segment} ${
                    displayMode === 'digital' ? styles.segmentActive : ''
                  }`}
                  onClick={() => setDisplayMode('digital')}
                >
                  타이머형
                </button>
              </div>
            </div>

            <div className={styles.field}>
              <span className={styles.sectionLabel}>테마</span>
              <div
                className={styles.segmented}
                role="radiogroup"
                aria-label="테마"
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={theme === 'light'}
                  className={`${styles.segment} ${
                    theme === 'light' ? styles.segmentActive : ''
                  }`}
                  onClick={() => setTheme('light')}
                >
                  라이트
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={theme === 'dark'}
                  className={`${styles.segment} ${
                    theme === 'dark' ? styles.segmentActive : ''
                  }`}
                  onClick={() => setTheme('dark')}
                >
                  다크
                </button>
              </div>
            </div>

            <div className={styles.field}>
              <span className={styles.sectionLabel}>컬러</span>
              <div
                className={styles.accentGrid}
                role="radiogroup"
                aria-label="컬러 테마"
              >
                {ACCENT_OPTIONS.map((opt) => {
                  const selected = accent === opt.key;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      aria-label={`${opt.label} - ${opt.hint}`}
                      className={`${styles.accentChip} ${
                        selected ? styles.accentChipActive : ''
                      }`}
                      onClick={() => setAccent(opt.key)}
                    >
                      <span
                        className={styles.accentSwatch}
                        style={{ background: opt.color }}
                        aria-hidden
                      >
                        {selected && (
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#ffffff"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden
                          >
                            <path d="M5 12.5 10 17.5 19 8" />
                          </svg>
                        )}
                      </span>
                      <span className={styles.accentText}>
                        <span className={styles.accentLabel}>{opt.label}</span>
                        <span className={styles.accentHint}>{opt.hint}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {tab === 'support' && (
          <div className={styles.section}>
            <div className={styles.aboutLinks}>
              <a
                className={styles.aboutLink}
                href={REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                <GithubIcon />
                <span className={styles.aboutLinkText}>
                  <span className={styles.aboutLinkTitle}>GitHub</span>
                  <span className={styles.aboutLinkSub}>
                    {REPO_URL.replace(/^https?:\/\//, '')}
                  </span>
                </span>
                <ExternalIcon />
              </a>
              <a
                className={styles.aboutLink}
                href={`mailto:${AUTHOR_EMAIL}`}
              >
                <MailIcon />
                <span className={styles.aboutLinkText}>
                  <span className={styles.aboutLinkTitle}>이메일</span>
                  <span className={styles.aboutLinkSub}>{AUTHOR_EMAIL}</span>
                </span>
                <ExternalIcon />
              </a>
            </div>
            <p className={styles.aboutCopyright}>
              © {COPYRIGHT_YEAR} {AUTHOR_NAME}
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}

function GithubIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M12 .5a12 12 0 0 0-3.79 23.4c.6.11.82-.26.82-.58v-2c-3.34.73-4.04-1.6-4.04-1.6-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.74.08-.74 1.21.09 1.85 1.25 1.85 1.25 1.07 1.84 2.81 1.31 3.5 1 .11-.78.42-1.31.76-1.61-2.67-.31-5.47-1.34-5.47-5.95 0-1.32.47-2.39 1.24-3.23-.13-.31-.54-1.55.12-3.22 0 0 1.01-.32 3.3 1.23a11.4 11.4 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.67.25 2.91.12 3.22.77.84 1.24 1.91 1.24 3.23 0 4.62-2.81 5.63-5.49 5.93.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.83.58A12 12 0 0 0 12 .5z" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

function ExternalIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
