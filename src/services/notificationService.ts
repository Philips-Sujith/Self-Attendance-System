import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { AttendanceSession } from '../types';

// Configure foreground notification presentation behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
    priority: Notifications.AndroidNotificationPriority.MAX,
  }),
});

export const notificationService = {
  // Register device for push notifications & get token
  registerForPushNotificationsAsync: async (): Promise<string | null> => {
    if (Platform.OS === 'web') {
      return null;
    }

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        return null;
      }

      // Android Notification Channel with high priority sound and vibration
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('sas-attendance', {
          name: 'SAS Attendance Sessions',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#4F46E5',
          sound: 'default',
        });
      }

      try {
        const tokenData = await Notifications.getExpoPushTokenAsync();
        return tokenData.data;
      } catch {
        return null;
      }
    } catch (e) {
      console.warn('Could not register push notifications:', e);
      return null;
    }
  },

  // Dispatch push alert when faculty starts an attendance session
  sendSessionStartNotifications: async (
    groupName: string,
    groupCode: string,
    session: AttendanceSession
  ): Promise<void> => {
    const title = `📢 Attendance Open: ${groupCode}`;
    const body = `Attendance is open for ${groupName} (${session.period}) — mark it now!`;

    try {
      // Schedule immediate local notification alert on device
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: {
            type: 'session_start',
            sessionId: session.id,
            groupCode,
            groupName,
          },
          sound: 'default',
        },
        trigger: null, // deliver immediately
      });
    } catch (e) {
      console.log('Notification scheduled fallback:', title, body);
    }
  },

  // Add listener for user tapping on notification
  addNotificationResponseListener: (
    callback: (response: Notifications.NotificationResponse) => void
  ) => {
    return Notifications.addNotificationResponseReceivedListener(callback);
  },
};
