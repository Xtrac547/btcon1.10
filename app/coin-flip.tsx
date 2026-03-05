import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing, Platform, Image } from 'react-native';

const coinImage = require('../assets/images/btcon-icon.png');
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useState, useRef } from 'react';
import * as Haptics from 'expo-haptics';

export default function CoinFlipScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [coinFlipping, setCoinFlipping] = useState(false);
  const [coinResult, setCoinResult] = useState<'heads' | 'tails' | 'fallen' | null>(null);
  const [showCoin, setShowCoin] = useState(true);
  const [hasFlippedOnce, setHasFlippedOnce] = useState(false);
  const coinRotation = useRef(new Animated.Value(0)).current;
  const coinPosition = useRef(new Animated.Value(0)).current;
  const coinOpacity = useRef(new Animated.Value(1)).current;

  const flipCoin = () => {
    if (coinFlipping) return;
    
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    setCoinFlipping(true);
    setCoinResult(null);
    setShowCoin(true);
    setHasFlippedOnce(true);
    coinRotation.setValue(0);
    coinPosition.setValue(0);
    coinOpacity.setValue(1);

    const random = Math.random();
    const result = random < 0.15 ? 'fallen' : random < 0.575 ? 'heads' : 'tails';
    
    if (result === 'fallen') {
      const spins = 3 + Math.floor(Math.random() * 2);
      const rotation = spins * 360 + Math.random() * 180;
      
      Animated.parallel([
        Animated.timing(coinRotation, {
          toValue: rotation,
          duration: 1500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(coinPosition, {
          toValue: 1000,
          duration: 1500,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(coinOpacity, {
          toValue: 0,
          duration: 1500,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start(() => {
        setCoinResult(result);
        setCoinFlipping(false);
        setShowCoin(false);
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }
      });
    } else {
      const spins = 5 + Math.floor(Math.random() * 3);
      const finalRotation = result === 'heads' ? spins * 360 : (spins * 360) + 180;

      Animated.timing(coinRotation, {
        toValue: finalRotation,
        duration: 2000,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start(() => {
        setCoinResult(result);
        setCoinFlipping(false);
        setShowCoin(true);
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      });
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          testID="back-button"
        >
          <ArrowLeft color="#FF8C00" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pile ou Face</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        <View style={styles.coinSection}>
          <View style={styles.coinContainer}>
            <TouchableOpacity
              style={[styles.coinTouchable, !showCoin && { opacity: 0 }]}
              onPress={flipCoin}
              disabled={coinFlipping || !showCoin}
              activeOpacity={0.9}
            >
              <Animated.View
                style={[
                  styles.coin,
                  {
                    opacity: coinOpacity,
                    transform: [
                      {
                        rotateX: coinRotation.interpolate({
                          inputRange: [0, 3600],
                          outputRange: ['0deg', '3600deg'],
                        }),
                      },
                      {
                        translateY: coinPosition,
                      },
                      {
                        rotateZ: coinPosition.interpolate({
                          inputRange: [0, 1000],
                          outputRange: ['0deg', '180deg'],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <View style={[styles.coinFace, styles.coinHeads]}>
                  <Image source={coinImage} style={styles.coinImage} resizeMode="cover" />
                  <View style={styles.coinLabelContainer}>
                    <Text style={styles.coinLabelText}>PILE</Text>
                  </View>
                </View>
                <View style={[styles.coinFace, styles.coinTails]}>
                  <Image
                    source={coinImage}
                    style={[styles.coinImage, styles.coinImageFlipped]}
                    resizeMode="cover"
                  />
                </View>
              </Animated.View>
            </TouchableOpacity>
          </View>

          <View style={styles.resultSlot}>
            {coinResult && (
              <>
                {coinResult === 'heads' && (
                  <View style={styles.coinResultContainer}>
                    <Text style={styles.coinResultText}>PILE</Text>
                  </View>
                )}
                {coinResult === 'tails' && (
                  <View style={styles.coinResultContainer}>
                    <Text style={styles.coinResultText}>FACE</Text>
                  </View>
                )}
                {coinResult === 'fallen' && (
                  <View style={[styles.coinResultContainer, styles.coinResultFallen]}>
                    <Text style={styles.coinResultText}>TOMBÉE !</Text>
                    <Text style={styles.coinResultSubtext}>La pièce est tombée de la table</Text>
                  </View>
                )}
              </>
            )}
          </View>

          <View style={styles.buttonSlot}>
            {!coinFlipping && !coinResult && showCoin && (
              <TouchableOpacity
                style={styles.flipButton}
                onPress={flipCoin}
              >
                <Text style={styles.flipButtonText}>JOUER</Text>
              </TouchableOpacity>
            )}
            
            {!coinFlipping && coinResult && (
              <TouchableOpacity
                style={styles.replayButton}
                onPress={flipCoin}
                testID="replay-button"
              >
                <Text style={styles.replayButtonText}>REJOUER</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.statsSection}>
          <Text style={styles.statsTitle}>Comment jouer</Text>
          <Text style={styles.statsText}>
            Appuyez sur la pièce pour la lancer.{'\n'}
            Le résultat est complètement aléatoire,{'\n'}
            comme une vraie pièce !
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 140, 0, 0.2)',
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0f0f0f',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 140, 0, 0.2)',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700' as const,
    letterSpacing: 0.5,
  },
  placeholder: {
    width: 48,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  coinSection: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: '#0f0f0f',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(255, 140, 0, 0.2)',
    marginBottom: 24,
  },
  coinContainer: {
    width: 180,
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  coinTouchable: {
    width: 180,
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultSlot: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonSlot: {
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  coin: {
    width: 180,
    height: 180,
    borderRadius: 90,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 16,
  },
  coinFace: {
    width: '100%',
    height: '100%',
    borderRadius: 90,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#FF8C00',
  },
  coinHeads: {
    backgroundColor: '#1a1a1a',
    overflow: 'hidden',
  },
  coinTails: {
    backgroundColor: '#1a1a1a',
    position: 'absolute' as const,
    transform: [{ rotateX: '180deg' }],
    overflow: 'hidden',
  },
  coinImage: {
    width: 140,
    height: 140,
    borderRadius: 70,
  },
  coinImageFlipped: {
    opacity: 0.8,
  },
  coinLabelContainer: {
    position: 'absolute' as const,
    bottom: 8,
    backgroundColor: 'rgba(255, 140, 0, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 12,
  },
  coinLabelContainerFace: {
    position: 'absolute' as const,
    bottom: 8,
    backgroundColor: 'rgba(192, 192, 192, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 12,
    transform: [{ rotateX: '180deg' }],
  },
  coinLabelText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800' as const,
    letterSpacing: 2,
  },
  coinLabelTextFace: {
    color: '#1a1a1a',
    fontSize: 14,
    fontWeight: '800' as const,
    letterSpacing: 2,
    transform: [{ rotateX: '180deg' }],
  },
  coinResultContainer: {
    backgroundColor: '#FF8C00',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#FF8C00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  coinResultText: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '800' as const,
    letterSpacing: 2,
  },
  coinResultFallen: {
    backgroundColor: '#DC143C',
    shadowColor: '#DC143C',
  },
  coinResultSubtext: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    fontWeight: '600' as const,
    marginTop: 4,
    textAlign: 'center' as const,
  },
  coinHint: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 16,
    fontWeight: '600' as const,
    marginTop: 8,
  },
  statsSection: {
    backgroundColor: '#0f0f0f',
    borderRadius: 20,
    padding: 24,
    borderWidth: 2,
    borderColor: 'rgba(255, 140, 0, 0.2)',
  },
  statsTitle: {
    color: '#FF8C00',
    fontSize: 18,
    fontWeight: '700' as const,
    marginBottom: 12,
    textAlign: 'center' as const,
  },
  statsText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 15,
    lineHeight: 24,
    textAlign: 'center' as const,
  },
  replayButton: {
    backgroundColor: '#FF8C00',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 16,
    shadowColor: '#FF8C00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  replayButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700' as const,
    letterSpacing: 1,
  },
  flipButton: {
    backgroundColor: '#FF8C00',
    paddingHorizontal: 48,
    paddingVertical: 20,
    borderRadius: 16,
    marginTop: 16,
    shadowColor: '#FF8C00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    width: 240,
  },
  flipButtonText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '800' as const,
    letterSpacing: 2,
    textAlign: 'center' as const,
  },

});
