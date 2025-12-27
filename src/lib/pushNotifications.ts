// Push Notifications Service
// Uses the browser's Web Push API with the service worker from vite-plugin-pwa

interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
}

class PushNotificationService {
  private registration: ServiceWorkerRegistration | null = null;

  async init(): Promise<boolean> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push notifications não são suportadas neste navegador');
      return false;
    }

    try {
      this.registration = await navigator.serviceWorker.ready;
      return true;
    } catch (error) {
      console.error('Erro ao inicializar service worker:', error);
      return false;
    }
  }

  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      return 'denied';
    }

    const permission = await Notification.requestPermission();
    return permission;
  }

  isSupported(): boolean {
    return 'Notification' in window && 'serviceWorker' in navigator;
  }

  getPermission(): NotificationPermission {
    if (!('Notification' in window)) {
      return 'denied';
    }
    return Notification.permission;
  }

  async showNotification(payload: PushNotificationPayload): Promise<boolean> {
    const permission = this.getPermission();
    
    if (permission !== 'granted') {
      console.warn('Permissão de notificação não concedida');
      return false;
    }

    try {
      // Try using service worker first (works when app is in background)
      if (this.registration) {
        await this.registration.showNotification(payload.title, {
          body: payload.body,
          icon: payload.icon || '/pwa-192x192.png',
          badge: payload.badge || '/pwa-192x192.png',
          tag: payload.tag,
          data: payload.data,
          requireInteraction: true,
        } as NotificationOptions);
        return true;
      }

      // Fallback to regular notification (foreground only)
      new Notification(payload.title, {
        body: payload.body,
        icon: payload.icon || '/pwa-192x192.png',
        tag: payload.tag,
        data: payload.data,
      });
      return true;
    } catch (error) {
      console.error('Erro ao mostrar notificação:', error);
      return false;
    }
  }

  // Weather alert notification
  async sendWeatherAlert(alertType: string, message: string, plotName?: string): Promise<boolean> {
    const titles: Record<string, string> = {
      chuva: '🌧️ Alerta de Chuva',
      geada: '❄️ Risco de Geada',
      calor: '🌡️ Estresse Térmico',
      pulverizacao: '💨 Janela de Pulverização',
      doencas: '🦠 Risco de Doenças',
    };

    return this.showNotification({
      title: titles[alertType] || '⚠️ Alerta Climático',
      body: plotName ? `${plotName}: ${message}` : message,
      tag: `weather-${alertType}`,
      data: { type: 'weather', alertType },
    });
  }

  // Activity reminder notification
  async sendActivityReminder(activityType: string, plotName: string, date: string): Promise<boolean> {
    return this.showNotification({
      title: '📋 Lembrete de Atividade',
      body: `${activityType} programada para ${date} em ${plotName}`,
      tag: `activity-${Date.now()}`,
      data: { type: 'activity' },
    });
  }
}

export const pushNotificationService = new PushNotificationService();
