import { useState, useCallback, useMemo, useEffect } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DEVELOPER_ADDRESSES = [
  'bc1qdff8680vyy0qthr5vpe3ywzw48r8rr4jn4jvac',
  'bc1qh78w8awednuw3336fnwcnr0sr4q5jxu980eyyd',
];

const STORAGE_KEYS = {
  DEVELOPER_PIN: 'btcon_developer_pin',
};

interface NotificationState {
  hasPermission: boolean;
  isDeveloper: boolean;
  hasDeveloperPin: boolean;
}

interface PendingNotificationPayload {
  type: 'sent' | 'received';
  amount: number;
}

export const [NotificationProvider, useNotifications] = createContextHook(() => {
  const [state, setState] = useState<NotificationState>({
    hasPermission: false,
    isDeveloper: false,
    hasDeveloperPin: false,
  });

  const requestPermissions = useCallback(async () => {
    console.log('Notifications requièrent un build développeur - utilisation des alertes');
    setState(prev => ({ ...prev, hasPermission: false }));
    return false;
  }, []);

  const checkDeveloperStatus = useCallback((address: string | null): boolean => {
    if (!address) return false;
    return DEVELOPER_ADDRESSES.includes(address);
  }, []);

  const sendLocalNotification = useCallback(async (title: string, body: string) => {
    console.log('Notification:', title, body);
    Alert.alert(title, body, [{ text: 'OK' }]);
  }, []);

  const notifyTransaction = useCallback(async (type: 'sent' | 'received', amount: number) => {
    const btcon = Math.floor(amount);
    const title = type === 'sent' ? '💸 Transaction envoyée' : '💰 Transaction reçue';
    const body = type === 'sent' 
      ? `Vous avez envoyé ${btcon} Btcon`
      : `Vous avez reçu ${btcon} Btcon`;
    
    await sendLocalNotification(title, body);
  }, [sendLocalNotification]);

  const notifyPendingTransaction = useCallback(async ({ type, amount }: PendingNotificationPayload) => {
    const btcon = Math.floor(amount);
    const title = '⏳ Transaction en attente';
    const body = type === 'sent'
      ? `Votre envoi de ${btcon} Btcon est en attente`
      : `Votre réception de ${btcon} Btcon est en attente`;

    await sendLocalNotification(title, body);
  }, [sendLocalNotification]);

  const notifyDeveloperLogin = useCallback(() => {
    if (Platform.OS === 'web') {
      Alert.alert(
        '👨‍💻 Mode Développeur',
        'Vous êtes connecté avec une adresse développeur. Accédez aux fonctionnalités avancées dans les paramètres.'
      );
    } else {
      Alert.alert(
        '👨‍💻 Mode Développeur',
        'Vous êtes connecté avec une adresse développeur. Accédez aux fonctionnalités avancées dans les paramètres.',
        [{ text: 'OK' }]
      );
    }
  }, []);

  const setDeveloperStatus = useCallback((address: string | null) => {
    const isDev = checkDeveloperStatus(address);
    setState(prev => ({ ...prev, isDeveloper: isDev }));
    
    if (isDev) {
      notifyDeveloperLogin();
    }
  }, [checkDeveloperStatus, notifyDeveloperLogin]);

  const setDeveloperPin = useCallback(async (pin: string): Promise<boolean> => {
    try {
      if (pin.length !== 6 || !/^\d{6}$/.test(pin)) {
        return false;
      }
      await AsyncStorage.setItem(STORAGE_KEYS.DEVELOPER_PIN, pin);
      setState(prev => ({ ...prev, hasDeveloperPin: true }));
      return true;
    } catch (error) {
      console.error('Error setting developer PIN:', error);
      return false;
    }
  }, []);

  const verifyDeveloperPin = useCallback(async (pin: string): Promise<boolean> => {
    try {
      const storedPin = await AsyncStorage.getItem(STORAGE_KEYS.DEVELOPER_PIN);
      return storedPin === pin;
    } catch (error) {
      console.error('Error verifying developer PIN:', error);
      return false;
    }
  }, []);

  const hasDeveloperPinSet = useCallback(async (): Promise<boolean> => {
    try {
      const pin = await AsyncStorage.getItem(STORAGE_KEYS.DEVELOPER_PIN);
      return pin !== null;
    } catch (error) {
      console.error('Error checking developer PIN:', error);
      return false;
    }
  }, []);

  const loadDeveloperPinStatus = useCallback(async () => {
    const hasPinSet = await hasDeveloperPinSet();
    setState(prev => ({ ...prev, hasDeveloperPin: hasPinSet }));
  }, [hasDeveloperPinSet]);

  useEffect(() => {
    loadDeveloperPinStatus();
  }, [loadDeveloperPinStatus]);



  return useMemo(() => ({
    ...state,
    requestPermissions,
    sendLocalNotification,
    notifyTransaction,
    notifyPendingTransaction,
    setDeveloperStatus,
    checkDeveloperStatus,
    setDeveloperPin,
    verifyDeveloperPin,
    hasDeveloperPinSet,
  }), [state, requestPermissions, sendLocalNotification, notifyTransaction, notifyPendingTransaction, setDeveloperStatus, checkDeveloperStatus, setDeveloperPin, verifyDeveloperPin, hasDeveloperPinSet]);
});
