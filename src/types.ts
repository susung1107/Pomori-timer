export type TimerStatus =
  | 'idle'
  | 'running'
  | 'paused'
  | 'break'
  | 'breakRunning';

export type DisplayMode = 'clock' | 'digital';

export type Theme = 'light' | 'dark';

export type Accent = 'blue' | 'green' | 'indigo' | 'amber';

export interface Task {
  id: string;
  title: string;
  createdAt: number;
}

export interface CompletedTask {
  id: string;
  title: string;
  startedAt?: number;
  completedAt: number;
}
