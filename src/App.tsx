import { useCallback, useEffect, useState } from 'react';
import { CompletedTasksModal } from './components/CompletedTasks/CompletedTasksModal';
import { Footer } from './components/Footer/Footer';
import { GuideModal } from './components/Guide/GuideModal';
import { Header } from './components/Header/Header';
import { MobileCurrentCard } from './components/MobileCurrentCard/MobileCurrentCard';
import { MobileTaskBoardModal } from './components/MobileTaskBoard/MobileTaskBoard';
import { SettingsModal } from './components/Settings/SettingsModal';
import { TaskBoard } from './components/TaskBoard/TaskBoard';
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
  const now = useTimerTick();

  useTimerCompletion();
  useDocumentTitle();
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

  // memo'd 자식들이 prop ref 변화로 리렌더되지 않도록 콜백 안정화
  const enterFocus = useCallback(() => setFocusOpen(true), []);
  const closeFocus = useCallback(() => setFocusOpen(false), []);
  const openQueue = useCallback(() => setQueueOpen(true), []);

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
            {!focusOpen && !isDesktop && (
              <MobileCurrentCard onOpen={openQueue} />
            )}
            {!focusOpen && (
              <Timer now={now} onEnterFocus={enterFocus} />
            )}
          </div>
          {isDesktop && (
            <div className={styles.col}>
              <TaskBoard />
            </div>
          )}
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
      <MobileTaskBoardModal
        open={queueOpen}
        onClose={() => setQueueOpen(false)}
      />
      <GuideModal open={guideOpen} onClose={closeGuide} />
      {focusOpen && <FocusOverlay now={now} onClose={closeFocus} />}
      <ToastContainer />
    </div>
  );
}
