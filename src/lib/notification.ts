export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export async function ensureNotificationPermission(): Promise<NotificationPermission> {
  if (!notificationsSupported()) return 'denied';
  if (Notification.permission === 'default') {
    try {
      return await Notification.requestPermission();
    } catch {
      return 'denied';
    }
  }
  return Notification.permission;
}

const NOTIFICATION_ICON = '/notification-icon.png';

export function notify(title: string, body: string): void {
  if (!notificationsSupported()) return;
  if (Notification.permission !== 'granted') return;
  try {
    new Notification(title, { body, icon: NOTIFICATION_ICON, silent: true });
  } catch {
    // some browsers throw on focus; ignore
  }
}
