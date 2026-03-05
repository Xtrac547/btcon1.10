import '@/utils/shim';
import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useWallet } from '@/contexts/WalletContext';
import { useAuth } from '@/contexts/AuthContext';

export default function IndexScreen() {
  const router = useRouter();
  const { hasWallet, isLoading: walletLoading } = useWallet();
  const { isAuthConfigured, authType, isAuthenticated, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (!walletLoading && !authLoading) {
      if (!hasWallet) {
        router.replace('/onboarding');
      } else if (!isAuthConfigured) {
        router.replace('/setup-auth');
      } else if (authType !== 'none' && !isAuthenticated) {
        router.replace('/verify-auth');
      } else {
        router.replace('/wallet');
      }
    }
  }, [hasWallet, walletLoading, authLoading, isAuthConfigured, authType, isAuthenticated, router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#FF8C00" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
