import { create } from 'zustand';

export const useNotificationStore = create((set, get) => ({
  notifications: [],

  // Add a notification
  addNotification: (notification) => {
    const id = `${Date.now()}-${Math.random()}`;
    const newNotification = {
      id,
      timestamp: new Date(),
      ...notification
    };

    set((state) => ({
      notifications: [newNotification, ...state.notifications]
    }));

    return id;
  },

  // Remove a notification
  removeNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id)
    }));
  },

  // Mark as read
  markAsRead: (id) => {
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      )
    }));
  },

  // Mark all as read
  markAllAsRead: () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true }))
    }));
  },

  // Clear all notifications
  clearAll: () => {
    set({ notifications: [] });
  },

  // Get unread count
  getUnreadCount: () => {
    return get().notifications.filter((n) => !n.read).length;
  }
}));

export default useNotificationStore;
