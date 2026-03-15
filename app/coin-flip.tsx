import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing, Platform, Image, ScrollView, PanResponder, Dimensions } from 'react-native';

const coinImage = require('../assets/images/btcon-icon.png');
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, RotateCcw, ChevronDown, History } from 'lucide-react-native';
import { useState, useRef, useCallback } from 'react';
import * as Haptics from 'expo-haptics';

const SCREEN_HEIGHT = Dimensions.get('window').height;

interface FlipRecord {
  id: number;
  result: 'heads' | 'tails' | 'fallen';
  label: string;
  timestamp: Date;
}

export default function CoinFlipScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [coinFlipping, setCoinFlipping] = useState(false);
  const [coinResult, setCoinResult] = useState<'heads' | 'tails' | 'fallen' | null>(null);
  const [showCoin, setShowCoin] = useState(true);
  const [_hasFlippedOnce, setHasFlippedOnce] = useState(false);
  const [history, setHistory] = useState<FlipRecord[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const coinRotation = useRef(new Animated.Value(0)).current;
  const coinPosition = useRef(new Animated.Value(0)).current;
  const coinOpacity = useRef(new Animated.Value(1)).current;
  const flipCount = useRef(0);

  const drawerHeight = SCREEN_HEIGHT * 0.55;
  const drawerTranslateY = useRef(new Animated.Value(-drawerHeight)).current;
  const drawerOpenRef = useRef(false);

  const openDrawer = useCallback(() => {
    setHistoryOpen(true);
    drawerOpenRef.current = true;
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    Animated.spring(drawerTranslateY, {
      toValue: 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  }, [drawerTranslateY]);

  const closeDrawer = useCallback(() => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    Animated.spring(drawerTranslateY, {
      toValue: -drawerHeight,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start(() => {
      setHistoryOpen(false);
      drawerOpenRef.current = false;
    });
  }, [drawerTranslateY, drawerHeight]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        const { dy, dx } = gestureState;
        if (Math.abs(dx) > Math.abs(dy)) return false;
        if (!drawerOpenRef.current && dy > 15) return true;
        if (drawerOpenRef.current && dy < -15) return true;
        return false;
      },
      onPanResponderMove: (_, gestureState) => {
        const { dy } = gestureState;
        if (!drawerOpenRef.current) {
          const clampedY = Math.max(-drawerHeight, Math.min(0, -drawerHeight + dy));
          drawerTranslateY.setValue(clampedY);
        } else {
          const clampedY = Math.max(-drawerHeight, Math.min(0, dy));
          drawerTranslateY.setValue(clampedY);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const { dy, vy } = gestureState;
        const threshold = drawerHeight * 0.3;
        if (!drawerOpenRef.current) {
          if (dy > threshold || vy > 0.5) {
            openDrawer();
          } else {
            Animated.spring(drawerTranslateY, {
              toValue: -drawerHeight,
              useNativeDriver: true,
              tension: 65,
              friction: 11,
            }).start();
          }
        } else {
          if (dy < -threshold || vy < -0.5) {
            closeDrawer();
          } else {
            Animated.spring(drawerTranslateY, {
              toValue: 0,
              useNativeDriver: true,
              tension: 65,
              friction: 11,
            }).start();
          }
        }
      },
    })
  ).current;

  const flipCoin = () => {
    if (coinFlipping) return;
    
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
        flipCount.current += 1;
        setHistory(prev => [{ id: flipCount.current, result, label: 'TOMBÉE', timestamp: new Date() }, ...prev]);
        if (Platform.OS !== 'web') {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
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
        flipCount.current += 1;
        const label = result === 'heads' ? 'PILE' : 'FACE';
        setHistory(prev => [{ id: flipCount.current, result, label, timestamp: new Date() }, ...prev]);
        if (Platform.OS !== 'web') {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      });
    }
  };

  const overlayOpacity = drawerTranslateY.interpolate({
    inputRange: [-drawerHeight, 0],
    outputRange: [0, 0.6],
    extrapolate: 'clamp',
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]} {...panResponder.panHandlers}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          testID="back-button"
        >
          <ArrowLeft color="#FF8C00" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pile ou Face</Text>
        {history.length > 0 ? (
          <TouchableOpacity
            style={styles.backButton}
            onPress={historyOpen ? closeDrawer : openDrawer}
          >
            <History color="#FF8C00" size={22} />
          </TouchableOpacity>
        ) : (
          <View style={styles.placeholder} />
        )}
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
            {coinResult && !coinFlipping && (
              <TouchableOpacity
                style={styles.replayButton}
                onPress={flipCoin}
                testID="replay-button"
              >
                <RotateCcw color="#FFF" size={18} style={{ marginRight: 8 }} />
                <Text style={styles.replayButtonText}>REJOUER</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {history.length === 0 && (
          <View style={styles.statsSection}>
            <Text style={styles.statsTitle}>Comment jouer</Text>
            <Text style={styles.statsText}>
              Appuyez sur la pièce pour la lancer.{'\n'}
              Le résultat est complètement aléatoire,{'\n'}
              comme une vraie pièce !
            </Text>
          </View>
        )}

        {history.length > 0 && !historyOpen && (
          <View style={styles.swipeHint}>
            <ChevronDown color="rgba(255, 140, 0, 0.5)" size={18} />
            <Text style={styles.swipeHintText}>Glissez vers le bas pour l'historique</Text>
          </View>
        )}
      </View>

      {historyOpen && (
        <Animated.View
          style={[styles.drawerOverlay, { opacity: overlayOpacity }]}
          pointerEvents={historyOpen ? 'auto' : 'none'}
        >
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={closeDrawer} />
        </Animated.View>
      )}

      <Animated.View
        style={[
          styles.drawer,
          {
            height: drawerHeight,
            paddingTop: insets.top,
            transform: [{ translateY: drawerTranslateY }],
          },
        ]}
      >
        <View style={styles.drawerHandleContainer}>
          <View style={styles.drawerHandle} />
        </View>
        <View style={styles.drawerHeader}>
          <History color="#FF8C00" size={20} />
          <Text style={styles.drawerTitle}>Historique ({history.length})</Text>
          <TouchableOpacity onPress={closeDrawer} style={styles.drawerCloseBtn}>
            <Text style={styles.drawerCloseBtnText}>Fermer</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.drawerList} showsVerticalScrollIndicator={false}>
          {history.map((record) => (
            <View key={record.id} style={styles.historyItem}>
              <View style={[
                styles.historyDot,
                record.result === 'fallen' ? styles.historyDotFallen : styles.historyDotNormal,
              ]} />
              <Text style={styles.historyLabel}>{record.label}</Text>
              <Text style={styles.historyTime}>
                {record.timestamp.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </Text>
            </View>
          ))}
        </ScrollView>
      </Animated.View>
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
  headerReplayButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0f0f0f',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 140, 0, 0.2)',
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
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: '#FF8C00',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 12,
    shadowColor: '#FF8C00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    width: 240,
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
  drawerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    zIndex: 90,
  },
  drawer: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0a0a0a',
    zIndex: 100,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    borderBottomWidth: 2,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255, 140, 0, 0.3)',
    shadowColor: '#FF8C00',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 20,
  },
  drawerHandleContainer: {
    alignItems: 'center' as const,
    paddingTop: 8,
    paddingBottom: 4,
  },
  drawerHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 140, 0, 0.4)',
  },
  drawerHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 140, 0, 0.15)',
  },
  drawerTitle: {
    color: '#FF8C00',
    fontSize: 18,
    fontWeight: '700' as const,
    marginLeft: 10,
    flex: 1,
  },
  drawerCloseBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 140, 0, 0.12)',
  },
  drawerCloseBtnText: {
    color: '#FF8C00',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  drawerList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  swipeHint: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 12,
    gap: 6,
  },
  swipeHintText: {
    color: 'rgba(255, 140, 0, 0.5)',
    fontSize: 13,
    fontWeight: '500' as const,
  },
  historyItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  historyDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  historyDotNormal: {
    backgroundColor: '#FF8C00',
  },
  historyDotFallen: {
    backgroundColor: '#DC143C',
  },
  historyLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600' as const,
    flex: 1,
  },
  historyTime: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 13,
  },
});
