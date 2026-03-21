import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export type NotificationType = 
  | 'queue_update'
  | 'appointment_reminder'
  | 'doctor_calling'
  | 'emergency_alert';

export interface QueueNotificationData {
  type: 'queue_update';
  position: number;
  estimatedWait: number;
  department: string;
  ticketNumber: string;
}

export interface AppointmentNotificationData {
  type: 'appointment_reminder';
  doctorName: string;
  department: string;
  appointmentTime: string;
  appointmentDate: string;
}

export interface DoctorCallingData {
  type: 'doctor_calling';
  doctorName: string;
  roomNumber: string;
  callId: string;
}

export interface EmergencyAlertData {
  type: 'emergency_alert';
  message: string;
  priority: 'high' | 'critical';
}

export type NotificationData = 
  | QueueNotificationData 
  | AppointmentNotificationData 
  | DoctorCallingData 
  | EmergencyAlertData;

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Notification permissions not granted');
    return false;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('queue_updates', {
      name: 'Queue Updates',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#1E40AF',
      sound: 'default',
    });

    await Notifications.setNotificationChannelAsync('appointments', {
      name: 'Appointments',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#4CAF50',
      sound: 'default',
    });

    await Notifications.setNotificationChannelAsync('doctor_calls', {
      name: 'Doctor Calls',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 250, 500, 250, 500],
      lightColor: '#FF9800',
      sound: 'default',
    });

    await Notifications.setNotificationChannelAsync('emergency', {
      name: 'Emergency Alerts',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 1000, 500, 1000, 500, 1000],
      lightColor: '#F44336',
      sound: 'default',
      enableVibrate: true,
    });
  }

  return true;
}

export async function sendQueueUpdateNotification(data: QueueNotificationData): Promise<string | null> {
  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) return null;

  const content: Notifications.NotificationContentInput = {
    title: 'Queue Update',
    body: `You are now #${data.position} in ${data.department}. Est. wait: ${data.estimatedWait} min`,
    data: { ...data, notificationType: 'queue_update' },
    channelId: 'queue_updates',
    categoryIdentifier: 'queue_update',
    autoDismiss: true,
    sticky: false,
  };

  if (data.position <= 3) {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } else {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }

  const response = await Notifications.scheduleNotificationAsync({
    content,
    trigger: null,
  });

  return response;
}

export async function sendAppointmentReminder(data: AppointmentNotificationData): Promise<string | null> {
  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) return null;

  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

  const content: Notifications.NotificationContentInput = {
    title: 'Appointment Reminder',
    body: `Your appointment with Dr. ${data.doctorName} is at ${data.appointmentTime}`,
    data: { ...data, notificationType: 'appointment_reminder' },
    channelId: 'appointments',
    categoryIdentifier: 'appointment_reminder',
    autoDismiss: true,
  };

  const response = await Notifications.scheduleNotificationAsync({
    content,
    trigger: null,
  });

  return response;
}

export async function sendDoctorCallingNotification(data: DoctorCallingData): Promise<string | null> {
  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) return null;

  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

  const content: Notifications.NotificationContentInput = {
    title: 'Doctor Calling',
    body: `Dr. ${data.doctorName} is calling you to Room ${data.roomNumber}`,
    data: { ...data, notificationType: 'doctor_calling' },
    channelId: 'doctor_calls',
    categoryIdentifier: 'doctor_calling',
    autoDismiss: false,
    sticky: true,
    priority: Notifications.AndroidNotificationPriority.MAX,
  };

  const response = await Notifications.scheduleNotificationAsync({
    content,
    trigger: null,
  });

  return response;
}

export async function sendEmergencyAlert(data: EmergencyAlertData): Promise<string | null> {
  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) return null;

  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

  const content: Notifications.NotificationContentInput = {
    title: '⚠️ Emergency Alert',
    body: data.message,
    data: { ...data, notificationType: 'emergency_alert' },
    channelId: 'emergency',
    categoryIdentifier: 'emergency_alert',
    autoDismiss: false,
    sticky: true,
    priority: Notifications.AndroidNotificationPriority.MAX,
    sound: 'default',
  };

  const response = await Notifications.scheduleNotificationAsync({
    content,
    trigger: null,
  });

  return response;
}

export function registerNotificationCategories(): void {
  Notifications.setNotificationCategoryActions('queue_update', [
    {
      identifier: 'VIEW_QUEUE',
      title: 'View Queue',
      foreground: true,
    },
    {
      identifier: 'DISMISS',
      title: 'Dismiss',
      foreground: false,
      destructive: false,
    },
  ]);

  Notifications.setNotificationCategoryActions('appointment_reminder', [
    {
      identifier: 'VIEW_APPOINTMENT',
      title: 'View Details',
      foreground: true,
    },
    {
      identifier: 'DISMISS',
      title: 'Dismiss',
      foreground: false,
      destructive: false,
    },
  ]);

  Notifications.setNotificationCategoryActions('doctor_calling', [
    {
      identifier: 'GO_TO_ROOM',
      title: 'Go to Room',
      foreground: true,
    },
    {
      identifier: 'CALL_BACK',
      title: 'Call Back',
      foreground: true,
    },
  ]);

  Notifications.setNotificationCategoryActions('emergency_alert', [
    {
      identifier: 'VIEW_DETAILS',
      title: 'View Details',
      foreground: true,
    },
    {
      identifier: 'ACKNOWLEDGE',
      title: 'Acknowledge',
      foreground: true,
      destructive: false,
    },
  ]);
}

export async function handleNotificationResponse(response: Notifications.NotificationResponse): Promise<void> {
  const data = response.notification.request.content.data as NotificationData;
  const actionId = response.actionIdentifier;

  switch (data?.type) {
    case 'queue_update':
      if (actionId === 'VIEW_QUEUE') {
        console.log('Navigate to queue view');
      }
      break;
    case 'appointment_reminder':
      if (actionId === 'VIEW_APPOINTMENT') {
        console.log('Navigate to appointment details');
      }
      break;
    case 'doctor_calling':
      if (actionId === 'GO_TO_ROOM') {
        console.log('Navigate to doctor room');
      } else if (actionId === 'CALL_BACK') {
        console.log('Initiate callback');
      }
      break;
    case 'emergency_alert':
      if (actionId === 'VIEW_DETAILS') {
        console.log('Navigate to emergency details');
      } else if (actionId === 'ACKNOWLEDGE') {
        console.log('Mark as acknowledged');
      }
      break;
  }
}
