import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { pushNotificationService } from '@/lib/pushNotifications';

interface OnboardingState {
  hasCompletedOnboarding: boolean;
  hasFarms: boolean;
  hasPlots: boolean;
  pushEnabled: boolean | null;
  loading: boolean;
}

export function useOnboarding() {
  const { user } = useAuth();
  const [state, setState] = useState<OnboardingState>({
    hasCompletedOnboarding: true, // Assume true until loaded
    hasFarms: false,
    hasPlots: false,
    pushEnabled: null,
    loading: true,
  });

  useEffect(() => {
    if (user) {
      checkOnboardingStatus();
    }
  }, [user]);

  const checkOnboardingStatus = async () => {
    setState(prev => ({ ...prev, loading: true }));

    // Check if user has farms
    const { data: farms } = await supabase
      .from('farms')
      .select('id')
      .limit(1);

    const hasFarms = (farms?.length ?? 0) > 0;

    // Check if user has plots
    const { data: plots } = await supabase
      .from('plots')
      .select('id')
      .limit(1);

    const hasPlots = (plots?.length ?? 0) > 0;

    // Check push notification permission
    let pushEnabled: boolean | null = null;
    if ('Notification' in window) {
      pushEnabled = Notification.permission === 'granted';
    }

    // Check localStorage for onboarding completion
    const onboardingCompleted = localStorage.getItem(`onboarding_${user?.id}`) === 'completed';

    setState({
      hasCompletedOnboarding: onboardingCompleted && hasFarms,
      hasFarms,
      hasPlots,
      pushEnabled,
      loading: false,
    });
  };

  const completeOnboarding = () => {
    if (user) {
      localStorage.setItem(`onboarding_${user.id}`, 'completed');
      setState(prev => ({ ...prev, hasCompletedOnboarding: true }));
    }
  };

  const requestPushPermission = async (): Promise<boolean> => {
    if (!pushNotificationService.isSupported()) {
      return false;
    }

    try {
      await pushNotificationService.init();
      const permission = await pushNotificationService.requestPermission();
      const granted = permission === 'granted';
      setState(prev => ({ ...prev, pushEnabled: granted }));
      
      // Show a test notification on success
      if (granted) {
        await pushNotificationService.showNotification({
          title: '✅ Notificações Ativadas!',
          body: 'Você receberá alertas climáticos e lembretes de atividades.',
        });
      }
      
      return granted;
    } catch (error) {
      console.error('Erro ao solicitar permissão de notificação:', error);
      return false;
    }
  };

  return {
    ...state,
    checkOnboardingStatus,
    completeOnboarding,
    requestPushPermission,
  };
}
