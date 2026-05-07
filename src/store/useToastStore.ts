import { create } from 'zustand';

export type ToastTone = 'info' | 'success' | 'warning';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface Toast {
  id: string;
  message: string;
  tone: ToastTone;
  duration: number;
  action?: ToastAction;
}

interface ToastState {
  toasts: Toast[];
  push: (toast: Omit<Toast, 'id' | 'duration'> & { duration?: number }) => string;
  dismiss: (id: string) => void;
}

const DEFAULT_DURATION_MS = 3000;
const ACTION_DURATION_MS = 5000;

function makeId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export const useToastStore = create<ToastState>()((set) => ({
  toasts: [],

  push: ({ message, tone, action, duration }) => {
    const id = makeId();
    const finalDuration =
      duration ?? (action ? ACTION_DURATION_MS : DEFAULT_DURATION_MS);
    set((s) => ({
      toasts: [
        ...s.toasts,
        { id, message, tone, action, duration: finalDuration },
      ],
    }));
    return id;
  },

  dismiss: (id) => {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },
}));
