// Push Notification Service
// Web Push (VAPID) and Mobile Push (Expo)

export interface PushSubscription {
  endpoint: string;
  expirationTime: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface MobilePushToken {
  token: string;
  platform: 'ios' | 'android';
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  type: 'turn_reminder' | 'called' | 'wait_update' | 'emergency' | 'broadcast';
  data?: Record<string, any>;
  actions?: { action: string; title: string }[];
}

export interface PushNotificationResult {
  success: boolean;
  sent?: number;
  failed?: number;
  errors?: string[];
}

export interface PushConfig {
  vapidPublicKey: string;
  vapidPrivateKey: string;
  vapidEmail: string;
  expoAccessToken?: string;
}

export class PushService {
  private vapidPublicKey: string;
  private vapidPrivateKey: string;
  private vapidEmail: string;
  private expoAccessToken?: string;

  constructor(config: PushConfig) {
    this.vapidPublicKey = config.vapidPublicKey;
    this.vapidPrivateKey = config.vapidPrivateKey;
    this.vapidEmail = config.vapidEmail;
    this.expoAccessToken = config.expoAccessToken;
  }

  getVapidPublicKey(): string {
    return this.vapidPublicKey;
  }

  async sendPushNotification(
    subscriptions: PushSubscription[],
    payload: PushNotificationPayload
  ): Promise<PushNotificationResult> {
    const results = await Promise.allSettled(
      subscriptions.map(sub => this.sendWebPush(sub, payload))
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    const errors = results
      .filter(r => r.status === 'rejected')
      .map((r: any) => r.reason?.message || 'Unknown error')
      .slice(0, 5);

    return {
      success: failed === 0,
      sent: successful,
      failed,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  private async sendWebPush(
    subscription: PushSubscription,
    payload: PushNotificationPayload
  ): Promise<void> {
    const headers = new Headers({
      'Content-Type': 'application/json',
      TTL: '86400',
    });

    const body = JSON.stringify({
      subscription,
      payload: JSON.stringify({
        title: payload.title,
        body: payload.body,
        data: payload.data,
        actions: payload.actions,
        icon: '/icon-192.png',
        badge: '/badge-72.png',
      }),
    });

    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers,
      body,
    });

    if (!response.ok && response.status !== 410) {
      const errorText = await response.text();
      throw new Error(`WebPush failed: ${response.status} - ${errorText}`);
    }
  }

  async sendQueueNotification(
    db: D1Database,
    userId: string,
    userType: string,
    payload: PushNotificationPayload
  ): Promise<PushNotificationResult> {
    const webSubscriptions = await db.prepare(`
      SELECT endpoint, p256dh, auth FROM push_subscriptions_web
      WHERE user_id = ? AND user_type = ?
    `).bind(userId, userType).all() as any;

    const mobileTokens = await db.prepare(`
      SELECT token, platform FROM push_tokens_mobile
      WHERE user_id = ? AND user_type = ?
    `).bind(userId, userType).all() as any;

    const webResults = webSubscriptions.results?.length
      ? await this.sendPushNotification(
          webSubscriptions.results.map((s: any) => ({
            endpoint: s.endpoint,
            expirationTime: null,
            keys: { p256dh: s.p256dh, auth: s.auth },
          })),
          payload
        )
      : { success: true, sent: 0 };

    const mobileResults = mobileTokens.results?.length
      ? await this.sendMobilePush(
          mobileTokens.results.map((t: any) => t.token),
          payload
        )
      : { success: true, sent: 0 };

    await this.logNotification(db, userId, userType, payload);

    return {
      success: webResults.success && mobileResults.success,
      sent: (webResults.sent || 0) + (mobileResults.sent || 0),
      failed: (webResults.failed || 0) + (mobileResults.failed || 0),
    };
  }

  async sendCalledNotification(
    db: D1Database,
    patientId: string,
    room: string
  ): Promise<PushNotificationResult> {
    return this.sendQueueNotification(db, patientId, 'patient', {
      title: "It's your turn!",
      body: `Please proceed to room ${room}.`,
      type: 'called',
      data: { patientId, room, screen: 'queue' },
    });
  }

  async sendTurnReminder(
    db: D1Database,
    patientId: string,
    position: number,
    estimatedMinutes: number
  ): Promise<PushNotificationResult> {
    return this.sendQueueNotification(db, patientId, 'patient', {
      title: 'Your turn is coming up!',
      body: `You are #${position} in line, about ${estimatedMinutes} minutes away.`,
      type: 'turn_reminder',
      data: { patientId, position, estimatedMinutes },
    });
  }

  async sendEmergencyAlert(
    db: D1Database,
    department: string,
    message: string
  ): Promise<PushNotificationResult> {
    const doctors = await db.prepare(`
      SELECT DISTINCT user_id FROM user_departments WHERE department = ?
    `).bind(department).all() as any;

    const results = await Promise.all(
      (doctors.results || []).map((d: any) =>
        this.sendQueueNotification(db, d.user_id, 'doctor', {
          title: '🚨 Emergency Patient',
          body: message,
          type: 'emergency',
          data: { department, isEmergency: true },
        })
      )
    );

    const totalSent = results.reduce((sum, r) => sum + (r.sent || 0), 0);
    const totalFailed = results.reduce((sum, r) => sum + (r.failed || 0), 0);

    return {
      success: totalFailed === 0,
      sent: totalSent,
      failed: totalFailed,
    };
  }

  async sendBroadcast(
    db: D1Database,
    message: string,
    targetUserType?: string
  ): Promise<PushNotificationResult> {
    const webQuery = targetUserType
      ? `SELECT DISTINCT user_id, user_type, endpoint, p256dh, auth FROM push_subscriptions_web WHERE user_type = ?`
      : `SELECT DISTINCT user_id, user_type, endpoint, p256dh, auth FROM push_subscriptions_web`;

    const webParams = targetUserType ? [targetUserType] : [];
    const webSubscriptions = await db.prepare(webQuery).bind(...webParams).all() as any;

    const mobileQuery = targetUserType
      ? `SELECT DISTINCT user_id, user_type, token, platform FROM push_tokens_mobile WHERE user_type = ?`
      : `SELECT DISTINCT user_id, user_type, token, platform FROM push_tokens_mobile`;

    const mobileParams = targetUserType ? [targetUserType] : [];
    const mobileTokens = await db.prepare(mobileQuery).bind(...mobileParams).all() as any;

    const payload: PushNotificationPayload = {
      title: 'Announcement',
      body: message,
      type: 'broadcast',
    };

    const webResults = webSubscriptions.results?.length
      ? await this.sendPushNotification(
          webSubscriptions.results.map((s: any) => ({
            endpoint: s.endpoint,
            expirationTime: null,
            keys: { p256dh: s.p256dh, auth: s.auth },
          })),
          payload
        )
      : { success: true, sent: 0 };

    const mobileResults = mobileTokens.results?.length
      ? await this.sendMobilePush(
          mobileTokens.results.map((t: any) => t.token),
          payload
        )
      : { success: true, sent: 0 };

    return {
      success: webResults.success && mobileResults.success,
      sent: (webResults.sent || 0) + (mobileResults.sent || 0),
      failed: (webResults.failed || 0) + (mobileResults.failed || 0),
    };
  }

  private async sendMobilePush(
    tokens: string[],
    payload: PushNotificationPayload
  ): Promise<PushNotificationResult> {
    if (!this.expoAccessToken) {
      return { success: false, errors: ['Expo access token not configured'] };
    }

    const results = await Promise.allSettled(
      tokens.map(token =>
        fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.expoAccessToken}`,
          },
          body: JSON.stringify({
            to: token,
            title: payload.title,
            body: payload.body,
            data: payload.data,
            sound: 'default',
          }),
        })
      )
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return {
      success: failed === 0,
      sent: successful,
      failed,
    };
  }

  async registerDevice(
    db: D1Database,
    userId: string,
    userType: string,
    subscription: PushSubscription
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const existing = await db.prepare(`
        SELECT id FROM push_subscriptions_web
        WHERE user_id = ? AND user_type = ? AND endpoint = ?
      `).bind(userId, userType, subscription.endpoint).first();

      if (existing) {
        return { success: true };
      }

      const id = `push_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await db.prepare(`
        INSERT INTO push_subscriptions_web (id, user_id, user_type, endpoint, p256dh, auth)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(id, userId, userType, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to register device',
      };
    }
  }

  async registerMobileToken(
    db: D1Database,
    userId: string,
    userType: string,
    token: MobilePushToken
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const existing = await db.prepare(`
        SELECT id FROM push_tokens_mobile
        WHERE token = ?
      `).bind(token.token).first();

      if (existing) {
        await db.prepare(`
          UPDATE push_tokens_mobile SET user_id = ?, user_type = ?, platform = ?, updated_at = CURRENT_TIMESTAMP
          WHERE token = ?
        `).bind(userId, userType, token.platform, token.token);
      } else {
        const id = `mobile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await db.prepare(`
          INSERT INTO push_tokens_mobile (id, user_id, user_type, token, platform)
          VALUES (?, ?, ?, ?, ?)
        `).bind(id, userId, userType, token.token, token.platform);
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to register mobile token',
      };
    }
  }

  async unregisterDevice(
    db: D1Database,
    userId: string,
    userType: string,
    endpoint: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await db.prepare(`
        DELETE FROM push_subscriptions_web
        WHERE user_id = ? AND user_type = ? AND endpoint = ?
      `).bind(userId, userType, endpoint);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to unregister device',
      };
    }
  }

  async unregisterMobileToken(
    db: D1Database,
    userId: string,
    token: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await db.prepare(`
        DELETE FROM push_tokens_mobile
        WHERE user_id = ? AND token = ?
      `).bind(userId, token);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to unregister mobile token',
      };
    }
  }

  private async logNotification(
    db: D1Database,
    userId: string,
    userType: string,
    payload: PushNotificationPayload
  ): Promise<void> {
    const id = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await db.prepare(`
      INSERT INTO notification_log (id, user_id, user_type, type, title, body, data)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      userId,
      userType,
      payload.type,
      payload.title,
      payload.body,
      payload.data ? JSON.stringify(payload.data) : null
    );
  }
}

export function createPushService(env: {
  VAPID_PUBLIC_KEY: string;
  VAPID_PRIVATE_KEY: string;
  VAPID_EMAIL: string;
  EXPO_ACCESS_TOKEN?: string;
}): PushService {
  return new PushService({
    vapidPublicKey: env.VAPID_PUBLIC_KEY,
    vapidPrivateKey: env.VAPID_PRIVATE_KEY,
    vapidEmail: env.VAPID_EMAIL,
    expoAccessToken: env.EXPO_ACCESS_TOKEN,
  });
}