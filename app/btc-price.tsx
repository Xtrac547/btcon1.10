import '@/utils/shim';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState, useEffect, useRef, useCallback } from 'react';
import { TrendingUp, TrendingDown, RefreshCw, ArrowLeft } from 'lucide-react-native';
import { fetchBtcPrice } from '@/services/btcPrice';
import * as Haptics from 'expo-haptics';

const REFRESH_INTERVAL = 20000;

export default function BtcPriceScreen() {
  const router = useRouter();
  const [price, setPrice] = useState<number>(0);

  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [countdown, setCountdown] = useState(20);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(1)).current;

  const formatTime = useCallback(() => {
    const now = new Date();
    return now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }, []);

  const animatePulse = useCallback(() => {
    Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.05, duration: 150, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
  }, [pulseAnim]);

  const [change24h, setChange24h] = useState<number>(0);

  const loadPrice = useCallback(async (manual = false) => {
    if (manual) {
      setIsLoading(true);
      Animated.loop(
        Animated.timing(spinAnim, { toValue: 1, duration: 800, useNativeDriver: true })
      ).start();
    }

    try {
      const data = await fetchBtcPrice();
      setPrice(data.price);
      setChange24h(data.change24h);
      setLastUpdate(formatTime());
      animatePulse();
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      console.error('[BTC Price Screen] Error:', error);
    } finally {
      setIsLoading(false);
      spinAnim.setValue(0);
      setCountdown(20);
      progressAnim.setValue(1);
      Animated.timing(progressAnim, {
        toValue: 0,
        duration: REFRESH_INTERVAL,
        useNativeDriver: false,
      }).start();
    }
  }, [price, formatTime, animatePulse, pulseAnim, spinAnim, progressAnim]);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    loadPrice();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      loadPrice();
    }, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [loadPrice]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => (prev <= 1 ? 20 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const isUp = change24h >= 0;

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.page}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()} testID="btc-price-back">
            <ArrowLeft color="#FF8C00" size={22} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Prix Btcon</Text>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={() => loadPrice(true)}
            disabled={isLoading}
            testID="btc-price-refresh"
          >
            <Animated.View style={{ transform: [{ rotate: isLoading ? spin : '0deg' }] }}>
              <RefreshCw color="#FF8C00" size={20} />
            </Animated.View>
          </TouchableOpacity>
        </View>

        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          <View style={styles.priceCard}>
            <Text style={styles.priceLabel}>EURO / BTCON</Text>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              {price > 0 ? (
                <Text style={styles.priceValue}>
                  1€ = {Math.round(100000000 / price).toLocaleString()} Btcon
                </Text>
              ) : (
                <Text style={styles.priceValue}>Chargement...</Text>
              )}
            </Animated.View>

            {price > 0 && (
              <View style={[styles.changeBadge, isUp ? styles.changeBadgeUp : styles.changeBadgeDown]}>
                {isUp ? <TrendingUp color="#4ADE80" size={16} /> : <TrendingDown color="#F87171" size={16} />}
                <Text style={[styles.changeText, isUp ? styles.changeTextUp : styles.changeTextDown]}>
                  {isUp ? '+' : ''}{change24h.toFixed(2)}% (24h)
                </Text>
              </View>
            )}
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Dernière mise à jour</Text>
              <Text style={styles.infoValue}>{lastUpdate || '---'}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Prochaine mise à jour</Text>
              <Text style={styles.infoValue}>{countdown}s</Text>
            </View>
            <View style={styles.progressBarContainer}>
              <Animated.View style={[styles.progressBar, { width: progressWidth }]} />
            </View>
          </View>

          <View style={styles.conversionCard}>
            <Text style={styles.conversionTitle}>Conversions rapides</Text>
            {[1, 5, 10, 50, 100].map((euro) => {
              const btcon = price > 0 ? Math.round((euro * 100000000) / price) : 0;
              return (
                <View key={euro} style={styles.conversionRow}>
                  <Text style={styles.conversionBtcon}>{euro}€</Text>
                  <Text style={styles.conversionEuro}>{btcon.toLocaleString()} Btcon</Text>
                </View>
              );
            })}
          </View>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#000000',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#0f0f0f',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 140, 0, 0.25)',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800' as const,
    letterSpacing: 0.3,
  },
  refreshButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#0f0f0f',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 140, 0, 0.25)',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  priceCard: {
    backgroundColor: '#0a0a0a',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 140, 0, 0.2)',
    marginBottom: 16,
  },
  priceLabel: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 14,
    fontWeight: '700' as const,
    letterSpacing: 2,
    textTransform: 'uppercase' as const,
    marginBottom: 12,
  },
  priceValue: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '900' as const,
    letterSpacing: 0.5,
  },
  euroPrice: {
    color: '#FF8C00',
    fontSize: 18,
    fontWeight: '700' as const,
    marginTop: 12,
    letterSpacing: 0.3,
  },
  euroToBtcon: {
    color: 'rgba(255, 140, 0, 0.85)',
    fontSize: 15,
    fontWeight: '700' as const,
    marginTop: 10,
    letterSpacing: 0.3,
  },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  changeBadgeUp: {
    backgroundColor: 'rgba(74, 222, 128, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.25)',
  },
  changeBadgeDown: {
    backgroundColor: 'rgba(248, 113, 113, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.25)',
  },
  changeText: {
    fontSize: 14,
    fontWeight: '700' as const,
  },
  changeTextUp: {
    color: '#4ADE80',
  },
  changeTextDown: {
    color: '#F87171',
  },
  infoCard: {
    backgroundColor: '#0a0a0a',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  infoLabel: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 13,
    fontWeight: '600' as const,
  },
  infoValue: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700' as const,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginVertical: 8,
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: 'rgba(255, 140, 0, 0.1)',
    borderRadius: 2,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#FF8C00',
    borderRadius: 2,
  },
  conversionCard: {
    backgroundColor: '#0a0a0a',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  conversionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700' as const,
    marginBottom: 16,
  },
  conversionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  conversionBtcon: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  conversionEuro: {
    color: '#FF8C00',
    fontSize: 14,
    fontWeight: '700' as const,
  },
});
