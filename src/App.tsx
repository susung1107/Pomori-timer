import { useEffect, useState } from 'react';
import { CompletedTasksModal } from './components/CompletedTasks/CompletedTasksModal';
import { Footer } from './components/Footer/Footer';
import { GuideModal } from './components/Guide/GuideModal';
import { Header } from './components/Header/Header';
import { SettingsModal } from './components/Settings/SettingsModal';
import {
  TaskBoard,
  TaskBoardModal,
} from './components/TaskBoard/TaskBoard';
import { FocusOverlay } from './components/Timer/FocusOverlay';
import { Timer } from './components/Timer/Timer';
import { ToastContainer } from './components/Toast/ToastContainer';
import { useDailyReset } from './hooks/useDailyReset';
import { useDocumentTitle } from './hooks/useDocumentTitle';
import { useMediaQuery } from './hooks/useMediaQuery';
import { useTimerCompletion } from './hooks/useTimerCompletion';
import { useTimerTick } from './hooks/useTimerTick';
import { useAppStore } from './store/useAppStore';
import styles from './App.module.css';

export default function App() {
  const status = useAppStore((s) => s.status);
  const tickActive =
    status === 'running' ||
    status === 'breakRunning' ||
    status === 'paused' ||
    status === 'break';
  const now = useTimerTick(tickActive);

  useTimerCompletion();
  useDocumentTitle(now);
  useDailyReset();

  const theme = useAppStore((s) => s.theme);
  const accent = useAppStore((s) => s.accent);
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);
  useEffect(() => {
    document.documentElement.setAttribute('data-accent', accent);
  }, [accent]);

  const isDesktop = useMediaQuery('(min-width: 768px)');

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [completedOpen, setCompletedOpen] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);
  const [focusOpen, setFocusOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(
    () => !useAppStore.getState().hasSeenGuide,
  );
  const setHasSeenGuide = useAppStore((s) => s.setHasSeenGuide);

  const closeGuide = () => {
    setGuideOpen(false);
    if (!useAppStore.getState().hasSeenGuide) setHasSeenGuide(true);
  };

  return (
    <div className={styles.root}>
      <div className={styles.container}>
        <Header
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenCompleted={() => setCompletedOpen(true)}
          onOpenGuide={() => setGuideOpen(true)}
        />

        <main className={styles.main}>
          <div className={styles.col}>
            <Timer now={now} onEnterFocus={() => setFocusOpen(true)} />
          </div>
          <div className={styles.col}>
            {isDesktop ? (
              <TaskBoard />
            ) : (
              <TaskBoard
                compact
                onShowAll={() => setQueueOpen(true)}
              />
            )}
          </div>
        </main>

        <Footer />
      </div>

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
      <CompletedTasksModal
        open={completedOpen}
        onClose={() => setCompletedOpen(false)}
      />
      <TaskBoardModal
        open={queueOpen}
        onClose={() => setQueueOpen(false)}
      />
      <GuideModal open={guideOpen} onClose={closeGuide} />
      {focusOpen && (
        <FocusOverlay now={now} onClose={() => setFocusOpen(false)} />
      )}
      <ToastContainer />
    </div>
  );
}
