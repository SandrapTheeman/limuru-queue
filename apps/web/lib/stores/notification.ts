import { create } from 'zustand';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
  dismissible?: boolean;
}

interface NotificationState {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => string;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  success: (title: string, message?: string) => string;
  error: (title: string, message?: string) => string;
  warning: (title: string, message?: string) => string;
  info: (title: string, message?: string) => string;
}

let notificationId = 0;

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],

  addNotification: (notification) => {
    const id = `notification-${++notificationId}`;
    const newNotification: Notification = {
      id,
      duration: 5000,
      dismissible: true,
      ...notification,
    };

    set((state) => ({
      notifications: [...state.notifications, newNotification],
    }));

    if (newNotification.duration && newNotification.duration > 0) {
      setTimeout(() => {
        get().removeNotification(id);
      }, newNotification.duration);
    }

    return id;
  },

  removeNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }));
  },

  clearAll: () => {
    set({ notifications: [] });
  },

  success: (title, message) => {
    return get().addNotification({ type: 'success', title, message });
  },

  error: (title, message) => {
    return get().addNotification({ 
      type: 'error', 
      title, 
      message,
      duration: 8000,
    });
  },

  warning: (title, message) => {
    return get().addNotification({ type: 'warning', title, message });
  },

  info: (title, message) => {
    return get().addNotification({ type: 'info', title, message });
  },
}));

export function useNotifications() {
  const { notifications, addNotification, removeNotification, clearAll, success, error, warning, info } = useNotificationStore();
  return { notifications, addNotification, removeNotification, clearAll, success, error, warning, info };
}
