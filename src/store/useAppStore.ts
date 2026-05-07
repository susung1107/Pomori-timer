import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  BREAK_DEFAULT_MIN,
  BREAK_MAX_MIN,
  BREAK_MIN_MIN,
  STORAGE_KEY,
  WORK_DEFAULT_MIN,
  WORK_MAX_MIN,
  WORK_MIN_MIN,
} from '../constants';
import { minutesToMs, todayKey } from '../lib/time';
import type {
  Accent,
  CompletedTask,
  DisplayMode,
  Task,
  Theme,
  TimerStatus,
} from '../types';

interface AppState {
  // Timer
  status: TimerStatus;
  workMinutes: number;
  breakMinutes: number;
  endsAt: number | null;
  pausedRemainingMs: number | null;
  currentSessionStartedAt: number | null;

  // Tasks
  currentTask: Task | null;
  queue: Task[];

  // Daily stats
  completedSessionsToday: number;
  completedTasksToday: CompletedTask[];
  lastResetDate: string;

  // Preferences
  displayMode: DisplayMode;
  theme: Theme;
  accent: Accent;
  autoStartNext: boolean;
  notificationsEnabled: boolean;
  hasSeenGuide: boolean;

  // Actions
  setWorkMinutes: (n: number) => void;
  setBreakMinutes: (n: number) => void;
  setDisplayMode: (mode: DisplayMode) => void;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setAccent: (accent: Accent) => void;
  setAutoStartNext: (v: boolean) => void;
  setNotificationsEnabled: (v: boolean) => void;
  setHasSeenGuide: (v: boolean) => void;
  startTimer: () => void;
  pauseTimer: () => void;
  resetTimer: () => void;
  handleTimerEnd: () => void;
  addTask: (title: string) => void;
  removeTask: (id: string) => void;
  insertTask: (task: Task, index: number) => void;
  editTask: (id: string, title: string) => void;
  reorderAll: (fromId: string, toId: string) => void;
  rolloverIfNewDay: () => void;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function makeTask(title: string): Task {
  return {
    id:
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    title,
    createdAt: Date.now(),
  };
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      status: 'idle',
      workMinutes: WORK_DEFAULT_MIN,
      breakMinutes: BREAK_DEFAULT_MIN,
      endsAt: null,
      pausedRemainingMs: null,
      currentSessionStartedAt: null,

      currentTask: null,
      queue: [],

      completedSessionsToday: 0,
      completedTasksToday: [],
      lastResetDate: todayKey(),

      displayMode: 'clock',
      theme: 'light',
      accent: 'blue',
      autoStartNext: false,
      notificationsEnabled: true,
      hasSeenGuide: false,

      setWorkMinutes: (n) => {
        if (get().status !== 'idle') return;
        set({ workMinutes: clamp(Math.round(n), WORK_MIN_MIN, WORK_MAX_MIN) });
      },

      setBreakMinutes: (n) => {
        if (get().status !== 'idle') return;
        set({ breakMinutes: clamp(Math.round(n), BREAK_MIN_MIN, BREAK_MAX_MIN) });
      },

      setDisplayMode: (mode) => {
        set({ displayMode: mode });
      },

      setTheme: (theme) => {
        set({ theme });
      },

      toggleTheme: () => {
        set({ theme: get().theme === 'dark' ? 'light' : 'dark' });
      },

      setAccent: (accent) => {
        set({ accent });
      },

      setAutoStartNext: (v) => {
        set({ autoStartNext: v });
      },

      setNotificationsEnabled: (v) => {
        set({ notificationsEnabled: v });
      },

      setHasSeenGuide: (v) => {
        set({ hasSeenGuide: v });
      },

      startTimer: () => {
        const s = get();
        const now = Date.now();

        if (s.status === 'idle') {
          // Promote first queue item if no current task
          let currentTask = s.currentTask;
          let queue = s.queue;
          if (!currentTask && queue.length > 0) {
            currentTask = queue[0]!;
            queue = queue.slice(1);
          }
          if (!currentTask) return;
          set({
            status: 'running',
            endsAt: now + minutesToMs(s.workMinutes),
            pausedRemainingMs: null,
            currentTask,
            queue,
            currentSessionStartedAt: now,
          });
          return;
        }

        if (s.status === 'paused' && s.pausedRemainingMs != null) {
          set({
            status: 'running',
            endsAt: now + s.pausedRemainingMs,
            pausedRemainingMs: null,
          });
          return;
        }

        if (s.status === 'break' && s.pausedRemainingMs != null) {
          set({
            status: 'breakRunning',
            endsAt: now + s.pausedRemainingMs,
            pausedRemainingMs: null,
          });
          return;
        }
      },

      pauseTimer: () => {
        const s = get();
        const now = Date.now();
        if (s.status === 'running' && s.endsAt != null) {
          set({
            status: 'paused',
            pausedRemainingMs: Math.max(0, s.endsAt - now),
            endsAt: null,
          });
        } else if (s.status === 'breakRunning' && s.endsAt != null) {
          set({
            status: 'break',
            pausedRemainingMs: Math.max(0, s.endsAt - now),
            endsAt: null,
          });
        }
      },

      resetTimer: () => {
        const s = get();
        if (s.status === 'running' || s.status === 'paused') {
          // 현재 세션 처음부터 다시 시작할 수 있게 idle로 (currentTask 유지)
          set({
            status: 'idle',
            endsAt: null,
            pausedRemainingMs: null,
            currentSessionStartedAt: null,
          });
        } else if (s.status === 'breakRunning' || s.status === 'break') {
          // 휴식 취소: 큐 첫 항목 승격, idle
          let currentTask = s.currentTask;
          let queue = s.queue;
          if (!currentTask && queue.length > 0) {
            currentTask = queue[0]!;
            queue = queue.slice(1);
          }
          set({
            status: 'idle',
            endsAt: null,
            pausedRemainingMs: null,
            currentTask,
            queue,
          });
        }
      },

      handleTimerEnd: () => {
        const s = get();
        const now = Date.now();

        if (s.status === 'running') {
          // Work session 종료: currentTask 완료 처리
          const completed = s.currentTask;
          const completedTasksToday = completed
            ? [
                ...s.completedTasksToday,
                {
                  id: completed.id,
                  title: completed.title,
                  startedAt: s.currentSessionStartedAt ?? now,
                  completedAt: now,
                },
              ]
            : s.completedTasksToday;
          const completedSessionsToday = s.completedSessionsToday + 1;

          if (s.breakMinutes > 0) {
            set({
              status: 'breakRunning',
              endsAt: now + minutesToMs(s.breakMinutes),
              pausedRemainingMs: null,
              currentTask: null,
              currentSessionStartedAt: null,
              completedSessionsToday,
              completedTasksToday,
            });
          } else {
            // 휴식 사용 안 함: 곧바로 큐 승격
            let nextCurrent: Task | null = null;
            let queue = s.queue;
            if (queue.length > 0) {
              nextCurrent = queue[0]!;
              queue = queue.slice(1);
            }
            if (s.autoStartNext && nextCurrent) {
              set({
                status: 'running',
                endsAt: now + minutesToMs(s.workMinutes),
                pausedRemainingMs: null,
                currentTask: nextCurrent,
                queue,
                currentSessionStartedAt: now,
                completedSessionsToday,
                completedTasksToday,
              });
            } else {
              set({
                status: 'idle',
                endsAt: null,
                pausedRemainingMs: null,
                currentTask: nextCurrent,
                queue,
                currentSessionStartedAt: null,
                completedSessionsToday,
                completedTasksToday,
              });
            }
          }
          return;
        }

        if (s.status === 'breakRunning') {
          // Break 종료: 큐 첫 항목 승격
          let nextCurrent: Task | null = null;
          let queue = s.queue;
          if (queue.length > 0) {
            nextCurrent = queue[0]!;
            queue = queue.slice(1);
          }
          if (s.autoStartNext && nextCurrent) {
            // 자동 시작 켜져 있으면 곧바로 다음 work session 진행
            set({
              status: 'running',
              endsAt: now + minutesToMs(s.workMinutes),
              pausedRemainingMs: null,
              currentTask: nextCurrent,
              queue,
              currentSessionStartedAt: now,
            });
          } else {
            set({
              status: 'idle',
              endsAt: null,
              pausedRemainingMs: null,
              currentTask: nextCurrent,
              queue,
            });
          }
        }
      },

      addTask: (title) => {
        const trimmed = title.trim();
        if (!trimmed) return;
        const s = get();
        const task = makeTask(trimmed);
        // currentTask가 비어있고 idle 상태면 currentTask로 직접 배정
        if (!s.currentTask && s.status === 'idle') {
          set({ currentTask: task });
        } else {
          set({ queue: [...s.queue, task] });
        }
      },

      removeTask: (id) => {
        // currentTask는 삭제하지 않고 큐 항목만 삭제
        set((s) => ({ queue: s.queue.filter((t) => t.id !== id) }));
      },

      insertTask: (task, index) => {
        set((s) => {
          if (s.queue.some((t) => t.id === task.id)) return s;
          const next = s.queue.slice();
          const at = Math.max(0, Math.min(next.length, index));
          next.splice(at, 0, task);
          return { queue: next };
        });
      },

      editTask: (id, title) => {
        const trimmed = title.trim();
        if (!trimmed) return;
        set((s) => {
          if (s.currentTask && s.currentTask.id === id) {
            return { currentTask: { ...s.currentTask, title: trimmed } };
          }
          return {
            queue: s.queue.map((t) =>
              t.id === id ? { ...t, title: trimmed } : t,
            ),
          };
        });
      },

      reorderAll: (fromId, toId) => {
        if (fromId === toId) return;
        const s = get();
        const isWorkLocked = s.status === 'running' || s.status === 'paused';

        // currentTask + queue 를 하나의 리스트처럼 다루어 자리 이동.
        const list: Task[] = s.currentTask
          ? [s.currentTask, ...s.queue]
          : [...s.queue];
        const from = list.findIndex((t) => t.id === fromId);
        const to = list.findIndex((t) => t.id === toId);
        if (from < 0 || to < 0) return;

        // 진행 중일 땐 position 0 (currentTask) 슬롯 잠금
        if (isWorkLocked && (from === 0 || to === 0)) return;

        const next = list.slice();
        const [moved] = next.splice(from, 1);
        if (!moved) return;
        next.splice(to, 0, moved);

        if (s.currentTask) {
          set({
            currentTask: next[0] ?? null,
            queue: next.slice(1),
          });
        } else {
          set({ queue: next });
        }
      },

      rolloverIfNewDay: () => {
        const today = todayKey();
        if (get().lastResetDate !== today) {
          set({
            completedSessionsToday: 0,
            completedTasksToday: [],
            lastResetDate: today,
          });
        }
      },
    }),
    {
      name: STORAGE_KEY,
      version: 1,
    },
  ),
);
