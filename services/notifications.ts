
export const NotificationService = {
  isSupported: () => 'Notification' in window,
  
  getPermission: () => 'Notification' in window ? Notification.permission : 'denied',

  requestPermission: async () => {
    if (!('Notification' in window)) return 'denied';
    try {
      return await Notification.requestPermission();
    } catch (e) {
      console.error("Error requesting permission", e);
      return 'denied';
    }
  },

  sendNotification: (title: string, options?: NotificationOptions) => {
    if (Notification.permission === 'granted') {
      try {
         // Basic browser notification
         new Notification(title, options);
      } catch (e) {
        console.error("Notification error", e);
      }
    }
  },

  // Frequency limiting to avoid spamming the user on every reload
  checkFrequency: (): boolean => {
      const last = localStorage.getItem('motorcheck_last_notif_ts');
      if(!last) return true;
      const now = Date.now();
      // Limit to once every 12 hours (12 * 60 * 60 * 1000 ms)
      return (now - parseInt(last)) > (12 * 60 * 60 * 1000); 
  },

  updateTimestamp: () => {
      localStorage.setItem('motorcheck_last_notif_ts', Date.now().toString());
  }
};
