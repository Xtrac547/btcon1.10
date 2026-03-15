import '@/utils/shim';
import { View, Text, StyleSheet, TouchableOpacity, Pressable, Platform, Animated, Modal, Alert, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useWallet } from '@/contexts/WalletContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { ArrowUpRight, ArrowDownLeft, Settings, X, QrCode, Camera, Copy, RefreshCw, Coins, Send, TrendingUp, Clock } from 'lucide-react-native';
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import * as Clipboard from 'expo-clipboard';

import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useResponsive } from '@/utils/responsive';
import { Image } from 'expo-image';
import { useQRColor } from '@/contexts/QRColorContext';
import { useBtcPrice, btconToEuro } from '@/services/btcPrice';


export default function WalletScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { balance, address, refreshBalance } = useWallet();
  const { notifyTransaction } = useNotifications();

  const responsive = useResponsive();
  const prevBalanceRef = useRef<number>(balance);
  const sendButtonScale = useRef(new Animated.Value(1)).current;
  const receiveButtonScale = useRef(new Animated.Value(1)).current;
  const sendButtonGlow = useRef(new Animated.Value(0)).current;
  const receiveButtonGlow = useRef(new Animated.Value(0)).current;
  const { getQRColors } = useQRColor();
  const { btcPrice } = useBtcPrice();

  const [isRefreshing, setIsRefreshing] = useState(false);

  const [tokenCounts, setTokenCounts] = useState<{ [key: number]: number }>({
    1000: 0,
    5000: 0,
    50000: 0,
  });
  



  
  const [showScanner, setShowScanner] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [hasScanned, setHasScanned] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [showScanResult, setShowScanResult] = useState(false);
  const [scannedAddress, setScannedAddress] = useState('');
  const [scannedAmount, setScannedAmount] = useState(0);
  const [scanTokenCounts, setScanTokenCounts] = useState<{ [key: number]: number }>({
    1000: 0,
    5000: 0,
    50000: 0,
  });
  

  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    try {
      await refreshBalance();
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  }, [isRefreshing, refreshBalance]);

  useEffect(() => {
    const interval = setInterval(() => {
      console.log('Auto-refresh balance...');
      void refreshBalance();
    }, 3.33 * 60 * 1000);

    return () => clearInterval(interval);
  }, [refreshBalance]);

  const getTotalAmount = useCallback((): number => {
    return Object.entries(tokenCounts).reduce((total, [value, count]) => {
      return total + (Number(value) * count);
    }, 0);
  }, [tokenCounts]);

  const totalAmount = useMemo(() => getTotalAmount(), [getTotalAmount]);
  const hasSelectedTokens = totalAmount > 0;

  useEffect(() => {
    if (prevBalanceRef.current > 0 && balance > prevBalanceRef.current) {
      const received = balance - prevBalanceRef.current;
      console.log('Balance increased, received:', received, 'Btcon');
      void notifyTransaction('received', received);
    }
    prevBalanceRef.current = balance;
  }, [balance, notifyTransaction]);

  useEffect(() => {
    if (hasSelectedTokens) {
      Animated.parallel([
        Animated.loop(
          Animated.sequence([
            Animated.timing(sendButtonGlow, { toValue: 1, duration: 1200, useNativeDriver: false }),
            Animated.timing(sendButtonGlow, { toValue: 0, duration: 1200, useNativeDriver: false }),
          ])
        ),
        Animated.loop(
          Animated.sequence([
            Animated.timing(receiveButtonGlow, { toValue: 1, duration: 1200, useNativeDriver: false }),
            Animated.timing(receiveButtonGlow, { toValue: 0, duration: 1200, useNativeDriver: false }),
          ])
        ),
      ]).start();
    } else {
      sendButtonGlow.setValue(0);
      receiveButtonGlow.setValue(0);
    }
  }, [hasSelectedTokens, sendButtonGlow, receiveButtonGlow]);

  const animateButtonPress = useCallback((scale: Animated.Value) => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.9, duration: 80, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 3, tension: 200, useNativeDriver: true }),
    ]).start();
  }, []);


  
  const qrColors = useMemo(() => getQRColors(address), [address, getQRColors]);

  const handleTokenPress = useCallback((value: number) => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setTokenCounts(prev => ({
      ...prev,
      [value]: prev[value] + 1,
    }));
  }, []);

  const handleTokenLongPress = useCallback((value: number) => {
    if (Platform.OS !== 'web') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setTokenCounts(prev => ({
      ...prev,
      [value]: 0,
    }));
  }, []);

  const resetAllTokens = useCallback(() => {
    setTokenCounts({
      1000: 0,
      5000: 0,
      50000: 0,
    });
  }, []);

  const handleReceive = useCallback(() => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    animateButtonPress(receiveButtonScale);
    router.push({ pathname: '/receive', params: { amount: totalAmount.toString() } });
  }, [totalAmount, router, animateButtonPress, receiveButtonScale]);

  const handleSend = useCallback(() => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    animateButtonPress(sendButtonScale);
    router.push({ 
      pathname: '/send', 
      params: { 
        preselectedAmount: totalAmount.toString(),
        token1000: tokenCounts[1000].toString(),
        token5000: tokenCounts[5000].toString(),
        token50000: tokenCounts[50000].toString()
      } 
    });
  }, [totalAmount, tokenCounts, router, animateButtonPress, sendButtonScale]);

  const handleOpenScanner = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert('Permission refusée', 'Veuillez autoriser l\'accès à la caméra');
        return;
      }
    }
    setHasScanned(false);
    setShowScanner(true);
  };

  const handleShowQRCode = () => {
    setIsCopied(false);
    setShowQRCode(true);
  };

  const handleCopyAddress = async () => {
    if (!address) return;
    try {
      await Clipboard.setStringAsync(address);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error('Error copying address:', error);
      Alert.alert('Erreur', 'Impossible de copier l\'adresse.');
    }
  };

  const scanTotalAmount = useMemo(() => {
    const fromTokens = Object.entries(scanTokenCounts).reduce((total, [value, count]) => {
      return total + (Number(value) * count);
    }, 0);
    return scannedAmount > 0 ? scannedAmount : fromTokens;
  }, [scanTokenCounts, scannedAmount]);



  const handleScanTokenPress = useCallback((value: number) => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setScannedAmount(0);
    setScanTokenCounts(prev => ({
      ...prev,
      [value]: prev[value] + 1,
    }));
  }, []);

  const handleScanTokenLongPress = useCallback((value: number) => {
    if (Platform.OS !== 'web') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setScanTokenCounts(prev => ({
      ...prev,
      [value]: 0,
    }));
  }, []);

  const handleScanSend = useCallback(() => {
    setShowScanResult(false);
    router.push({
      pathname: '/send',
      params: {
        address: scannedAddress,
        preselectedAmount: scanTotalAmount.toString(),
      },
    });
  }, [scannedAddress, scanTotalAmount, router]);

  const handleBarcodeScanned = useCallback((data: string) => {
    if (hasScanned) return;
    setHasScanned(true);
    setShowScanner(false);
    
    let addr = data;
    let amount = 0;
    
    if (addr.toLowerCase().startsWith('bitcoin:')) {
      const uri = addr.substring(8);
      const parts = uri.split('?');
      addr = parts[0];
      
      if (parts.length > 1) {
        const params = new URLSearchParams(parts[1]);
        const amountBtc = params.get('amount');
        
        if (amountBtc) {
          amount = Math.floor(parseFloat(amountBtc) * 100000000);
        }
      }
    }
    
    setScannedAddress(addr);
    setScannedAmount(amount);
    setScanTokenCounts({ 1000: 0, 5000: 0, 50000: 0 });
    setShowScanResult(true);
  }, [hasScanned]);



  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <TouchableOpacity
            style={styles.topButton}
            onPress={handleOpenScanner}
            testID="scan-qr-wallet-button"
          >
            <Camera color="#FF8C00" size={22} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.topButton}
            onPress={handleShowQRCode}
            testID="show-address-qr-button"
          >
            <QrCode color="#FF8C00" size={22} />
          </TouchableOpacity>
        </View>
        <View style={styles.topBarRight}>
          <TouchableOpacity
            style={[styles.topButton, isRefreshing && styles.refreshingButton]}
            onPress={handleRefresh}
            disabled={isRefreshing}
            testID="refresh-button"
          >
            <RefreshCw color="#FF8C00" size={20} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.topButton}
            onPress={() => router.push('/coin-flip')}
            testID="coin-flip-button"
          >
            <Coins color="#FF8C00" size={20} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.topButton}
            onPress={() => router.push('/settings')}
            testID="settings-button"
          >
            <Settings color="#FF8C00" size={20} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.topButton}
            onPress={() => router.push('/btc-price')}
            testID="btc-price-button"
          >
            <TrendingUp color="#FF8C00" size={20} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.topButton}
            onPress={() => router.push('/history')}
            testID="history-button"
          >
            <Clock color="#FF8C00" size={20} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.mainContent}>
          <View style={styles.balanceCompact}>
            <View style={styles.balanceRow}>
              <Text style={styles.balanceCompactText}>
                {balance.toLocaleString()} Btcon
              </Text>
              {btcPrice > 0 && (
                <Text style={styles.balanceEuroText}>
                  = {btconToEuro(balance, btcPrice)} €
                </Text>
              )}
            </View>
          </View>
          
          <View style={styles.selectedAmountBox}>
            <View style={styles.selectedAmountRow}>
              <Text style={[styles.selectedAmountText, { fontSize: responsive.scale(hasSelectedTokens ? 14 : 15) }]}>
                {totalAmount.toLocaleString()} Btcon sélectionné
              </Text>
              {totalAmount > 0 && btcPrice > 0 && (
                <Text style={styles.selectedAmountEuro}>
                  = {btconToEuro(totalAmount, btcPrice)} €
                </Text>
              )}
            </View>
          </View>


          <View style={styles.tokensSection}>
            <View style={styles.labelRow}>
              <Text style={styles.tokensLabel}>Jetons</Text>
              {totalAmount > 0 && (
                <TouchableOpacity onPress={resetAllTokens} style={styles.resetButton}>
                  <Text style={styles.resetText}>Réinitialiser</Text>
                </TouchableOpacity>
              )}
            </View>
            
            <View style={styles.tokensContainer}>
              <View style={styles.topTokensRow}>
                {[1000, 5000].map((value) => (
                  <Pressable
                    key={value}
                    style={[
                      styles.tokenCircle,
                      value === 1000 && styles.token1000,
                      value === 5000 && styles.token5000,
                      tokenCounts[value] > 0 && styles.tokenSelected,
                    ]}
                    onPress={() => handleTokenPress(value)}
                    onLongPress={() => handleTokenLongPress(value)}
                  >
                    <Text style={styles.tokenValueSmall}>{value.toLocaleString()}</Text>
                    <Text style={styles.tokenUnitSmall}>BTCON</Text>
                    {tokenCounts[value] > 0 && (
                      <View style={styles.countBadge}>
                        <Text style={styles.countText}>{tokenCounts[value]}x</Text>
                      </View>
                    )}
                  </Pressable>
                ))}
              </View>
              <View style={styles.bottomTokenRow}>
                <Pressable
                  style={[
                    styles.tokenSquare,
                    styles.token50000,
                    tokenCounts[50000] > 0 && styles.tokenSelected,
                  ]}
                  onPress={() => handleTokenPress(50000)}
                  onLongPress={() => handleTokenLongPress(50000)}
                >
                  <Text style={styles.tokenValueLarge}>50000</Text>
                  <Text style={styles.tokenUnitLarge}>BTCON</Text>
                  {tokenCounts[50000] > 0 && (
                    <View style={styles.countBadgeRect}>
                      <Text style={styles.countText}>{tokenCounts[50000]}x</Text>
                    </View>
                  )}
                </Pressable>
              </View>
            </View>
          </View>

      </View>



      {hasSelectedTokens && (
        <View style={styles.actionsContainer}>
          <Animated.View style={[styles.actionButtonWrapper, { transform: [{ scale: receiveButtonScale }] }]}>
            <TouchableOpacity
              style={[styles.actionButton, styles.receiveButton]}
              onPress={handleReceive}
              activeOpacity={0.85}
              testID="receive-button"
            >
              <View style={styles.iconContainer}>
                <ArrowDownLeft color="#FFFFFF" size={28} strokeWidth={3} />
              </View>
              <Text style={styles.actionButtonText}>Recevoir</Text>
              <Text style={styles.actionButtonAmount}>{totalAmount.toLocaleString()}</Text>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View style={[styles.actionButtonWrapper, { transform: [{ scale: sendButtonScale }] }]}>
            <TouchableOpacity
              style={[styles.actionButton, styles.sendButton]}
              onPress={handleSend}
              activeOpacity={0.85}
              testID="send-button"
            >
              <View style={styles.iconContainer}>
                <ArrowUpRight color="#FFFFFF" size={28} strokeWidth={3} />
              </View>
              <Text style={styles.actionButtonText}>Envoyer</Text>
              <Text style={styles.actionButtonAmount}>{totalAmount.toLocaleString()}</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      )}

      <Modal
        visible={showScanner}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <View style={styles.modalContainer}>
          <View style={styles.scannerHeader}>
            <Text style={styles.scannerTitle}>Scanner QR Code</Text>
            <TouchableOpacity
              onPress={() => setShowScanner(false)}
              style={styles.closeButton}
              testID="close-scanner-wallet-button"
            >
              <X color="#FFF" size={28} />
            </TouchableOpacity>
          </View>
          <CameraView
            style={styles.camera}
            facing="back"
            barcodeScannerSettings={{
              barcodeTypes: ['qr'],
            }}
            onBarcodeScanned={(result: { data?: string }) => {
              if (result?.data) {
                console.log('QR Code détecté:', result.data);
                handleBarcodeScanned(result.data);
              }
            }}
          >
            <View style={styles.scannerOverlay}>
              <View style={styles.scannerFrame} />
            </View>
          </CameraView>
        </View>
      </Modal>

      <Modal
        visible={showScanResult}
        animationType="slide"
        transparent
        onRequestClose={() => setShowScanResult(false)}
      >
        <View style={styles.scanResultOverlay}>
          <View style={styles.scanResultContent}>
            <View style={styles.scanResultHeader}>
              <Text style={styles.scanResultTitle}>QR Code scanné</Text>
              <TouchableOpacity
                onPress={() => setShowScanResult(false)}
                style={styles.scanResultCloseButton}
                testID="close-scan-result-button"
              >
                <X color="#FFF" size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.scanResultScroll}>
              <View style={styles.scanResultAddressBox}>
                <Text style={styles.scanResultAddressLabel}>DESTINATAIRE</Text>
                <Text style={styles.scanResultAddressText} numberOfLines={2}>{scannedAddress}</Text>
              </View>

              {scannedAmount > 0 && (
                <View style={styles.scanResultAmountBox}>
                  <Text style={styles.scanResultAmountLabel}>MONTANT DEMANDÉ</Text>
                  <Text style={styles.scanResultAmountValue}>{scannedAmount.toLocaleString()} Btcon</Text>
                </View>
              )}

              <View style={styles.scanResultTokensSection}>
                <Text style={styles.scanResultTokensLabel}>Sélectionner des jetons</Text>
                <View style={styles.scanResultTokensGrid}>
                  {[1000, 5000, 50000].map((value) => (
                    <Pressable
                      key={value}
                      style={[
                        styles.scanResultToken,
                        value === 1000 && styles.scanToken1000,
                        value === 5000 && styles.scanToken5000,
                        value === 50000 && styles.scanToken50000,
                        scanTokenCounts[value] > 0 && styles.scanTokenSelected,
                      ]}
                      onPress={() => handleScanTokenPress(value)}
                      onLongPress={() => handleScanTokenLongPress(value)}
                    >
                      <Text style={styles.scanResultTokenValue}>{value.toLocaleString()}</Text>
                      <Text style={styles.scanResultTokenUnit}>BTCON</Text>
                      {scanTokenCounts[value] > 0 && (
                        <View style={styles.scanResultCountBadge}>
                          <Text style={styles.scanResultCountText}>{scanTokenCounts[value]}x</Text>
                        </View>
                      )}
                    </Pressable>
                  ))}
                </View>
              </View>

              {scanTotalAmount > 0 && (
                <View style={styles.scanResultTotalBox}>
                  <Text style={styles.scanResultTotalLabel}>Total</Text>
                  <Text style={styles.scanResultTotalValue}>{scanTotalAmount.toLocaleString()} Btcon</Text>
                </View>
              )}

              <TouchableOpacity
                style={[
                  styles.scanResultSendButton,
                  scanTotalAmount === 0 && styles.scanResultSendButtonDisabled,
                ]}
                onPress={handleScanSend}
                disabled={scanTotalAmount === 0}
                testID="scan-result-send-button"
              >
                <Send color="#FFF" size={20} />
                <Text style={styles.scanResultSendButtonText}>Envoyer</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showQRCode}
        animationType="fade"
        transparent
        onRequestClose={() => setShowQRCode(false)}
      >
        <Pressable 
          style={styles.qrModalOverlay}
          onPress={() => setShowQRCode(false)}
        >
          <View style={styles.qrModalContent}>
            <View style={styles.qrModalHeader}>
              <Text style={styles.qrModalTitle}>Mon adresse Btcon</Text>
              <TouchableOpacity
                onPress={() => setShowQRCode(false)}
                style={styles.qrCloseButton}
                testID="close-qr-modal-button"
              >
                <X color="#FFF" size={24} />
              </TouchableOpacity>
            </View>
            
            <View style={[styles.qrCodeContainer, { backgroundColor: qrColors.background }]}>
              {address ? (
                <Image
                  source={`https://api.qrserver.com/v1/create-qr-code/?size=260x260&bgcolor=${qrColors.background.replace('#', '')}&color=${qrColors.qr.replace('#', '')}&data=bitcoin:${address}`}
                  style={styles.qrCodeImage}
                  contentFit="contain"
                  cachePolicy="memory-disk"
                />
              ) : (
                <Text style={styles.qrLoadingText}>Génération du QR code...</Text>
              )}
            </View>
            
            <View style={styles.qrAddressBox}>
              <View style={styles.qrAddressHeader}>
                <Text style={styles.qrAddressLabel}>ADRESSE BTCON</Text>
                <TouchableOpacity onPress={handleCopyAddress} style={styles.qrCopyButton}>
                  <Copy color={isCopied ? "#4CAF50" : "#FF8C00"} size={16} />
                  <Text style={[styles.qrCopyButtonText, isCopied && styles.qrCopyButtonTextCopied]}>
                    {isCopied ? 'Copié' : 'Copier'}
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.qrAddressText}>{address}</Text>
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  mainContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  mainContentCompact: {
    paddingTop: 6,
    justifyContent: 'flex-start',
  },
  balanceCompact: {
    alignItems: 'center',
    marginBottom: 10,
    backgroundColor: '#0f0f0f',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 140, 0, 0.2)',
  },
  balanceCompactSmall: {
    marginBottom: 10,
    paddingVertical: 10,
    borderRadius: 12,
  },
  balanceCompactText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700' as const,
    letterSpacing: 0.5,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  balanceEuroText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  balanceCompactTextSmall: {
    fontSize: 15,
  },
  selectedAmountBox: {
    alignItems: 'center',
    marginBottom: 10,
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 140, 0, 0.3)',
  },
  selectedAmountBoxCompact: {
    marginBottom: 10,
    paddingVertical: 8,
  },
  selectedAmountText: {
    color: '#FF8C00',
    fontSize: 15,
    fontWeight: '600' as const,
    letterSpacing: 0.3,
  },
  selectedAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  selectedAmountEuro: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 13,
    fontWeight: '600' as const,
  },

  addressContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  addressLabelSmall: {
    color: '#666666',
    fontSize: 12,
    marginBottom: 6,
  },
  addressTextSmall: {
    color: '#999999',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' || Platform.OS === 'android' ? 'Courier' : 'monospace',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    backgroundColor: '#000',
  },
  actionsHidden: {
    opacity: 0,
  },
  actionButtonWrapper: {
    flex: 1,
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 24,
    gap: 6,
    shadowColor: '#FF8C00',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 10,
  },
  receiveButton: {
    backgroundColor: '#FF8C00',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  sendButton: {
    backgroundColor: '#E8451A',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  actionButtonPressed: {
    opacity: 0.85,
  },
  iconContainer: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900' as const,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
  },
  actionButtonAmount: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 13,
    fontWeight: '700' as const,
    letterSpacing: 0.3,
  },
  qrContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  qrTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800' as const,
    marginBottom: 48,
    letterSpacing: 0.5,
  },
  qrCodeWrapper: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 24,
    shadowColor: '#FF8C00',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 12,
    marginBottom: 32,
  },
  qrCode: {
    width: 300,
    height: 300,
  },
  addressBox: {
    backgroundColor: '#0f0f0f',
    padding: 20,
    borderRadius: 16,
    marginBottom: 48,
    borderWidth: 1,
    borderColor: 'rgba(255, 140, 0, 0.2)',
  },
  addressLabel: {
    color: '#888888',
    fontSize: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  addressText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' || Platform.OS === 'android' ? 'Courier' : 'monospace',
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: '#FF8C00',
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800' as const,
    letterSpacing: 0.5,
  },
  tokensSection: {
    marginBottom: 0,
  },
  tokensSectionCompact: {
    marginBottom: 4,
  },
  tokensLabel: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700' as const,
    marginBottom: 16,
  },
  tokensLabelCompact: {
    fontSize: 15,
    marginBottom: 8,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  resetButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
  },
  resetText: {
    color: '#FF8C00',
    fontSize: 12,
    fontWeight: '600' as const,
  },
  tokensContainer: {
    gap: 12,
    alignItems: 'center',
  },
  topTokensRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  bottomTokenRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  tokenWrapper: {
    width: '35%',
    alignItems: 'center',
  },
  tokenWrapper3: {
    width: '30%',
    alignItems: 'center',
  },
  tokenWrapper2: {
    width: '28%',
    alignItems: 'center',
  },
  tokenWrapper2Compact: {
    width: '24%',
  },
  tokenSquare: {
    width: 200,
    height: 150,
    backgroundColor: '#2a2a2a',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 5,
    borderColor: '#3a3a3a',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  countBadgeRect: {
    position: 'absolute',
    top: 8,
    right: 12,
    backgroundColor: '#000',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 28,
    alignItems: 'center',
  },
  tokenWrapper50k: {
    width: '55%',
    alignItems: 'center',
  },
  tokenCircle: {
    width: 120,
    height: 120,
    backgroundColor: '#2a2a2a',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#3a3a3a',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  token1000: {
    backgroundColor: '#5B9BD5',
    borderColor: '#75ADE0',
  },
  token5000: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E0E0E0',
  },
  token50000: {
    backgroundColor: '#E8451A',
    borderColor: '#F5693F',
  },
  token100000: {
    backgroundColor: '#9B59B6',
    borderColor: '#AF7AC5',
  },
  token500000: {
    backgroundColor: '#2ECC71',
    borderColor: '#58D68D',
  },
  token1000000: {
    backgroundColor: '#F1C40F',
    borderColor: '#F4D03F',
  },
  tokenSelected: {
    backgroundColor: '#FF8C00',
    borderColor: '#FFB347',
    shadowColor: '#FF8C00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  tokenValueSmall: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '900' as const,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  tokenUnitSmall: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 8,
    fontWeight: '700' as const,
    marginTop: 2,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
  },
  tokenValueLarge: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: '900' as const,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  tokenUnitLarge: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 10,
    fontWeight: '700' as const,
    marginTop: 4,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
  },
  countBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#000',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 28,
    alignItems: 'center',
  },
  countText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700' as const,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  topBarLeft: {
    flexDirection: 'row',
    gap: 8,
  },
  topBarRight: {
    flexDirection: 'row',
    gap: 8,
  },
  topButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0f0f0f',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 140, 0, 0.2)',
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  bottomButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#0f0f0f',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 140, 0, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  refreshingButton: {
    opacity: 0.6,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  scannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#0a0a0a',
  },
  scannerTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '700' as const,
  },
  closeButton: {
    padding: 8,
  },
  camera: {
    flex: 1,
  },
  scannerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerFrame: {
    width: 280,
    height: 280,
    borderWidth: 3,
    borderColor: '#FF8C00',
    borderRadius: 24,
    backgroundColor: 'transparent',
  },
  qrModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrModalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 24,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    borderWidth: 2,
    borderColor: 'rgba(255, 140, 0, 0.3)',
  },
  qrModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  qrModalTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '700' as const,
  },
  qrCloseButton: {
    padding: 4,
  },
  qrCodeContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    minHeight: 300,
  },
  qrCodeImage: {
    width: 300,
    height: 300,
  },
  qrLoadingText: {
    color: '#666',
    fontSize: 14,
  },
  qrAddressBox: {
    backgroundColor: '#0f0f0f',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 140, 0, 0.2)',
  },
  qrAddressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  qrAddressLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 10,
    fontWeight: '700' as const,
    letterSpacing: 1.5,
  },
  qrCopyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(255, 140, 0, 0.2)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 140, 0, 0.4)',
  },
  qrCopyButtonText: {
    color: '#FF8C00',
    fontSize: 10,
    fontWeight: '700' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  qrCopyButtonTextCopied: {
    color: '#4CAF50',
  },
  qrAddressText: {
    color: '#FFF',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' || Platform.OS === 'android' ? 'Courier' : 'monospace',
    textAlign: 'center' as const,
    lineHeight: 18,
  },
  scanResultOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'flex-end',
  },
  scanResultContent: {
    backgroundColor: '#111',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '85%',
    borderTopWidth: 2,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255, 140, 0, 0.3)',
  },
  scanResultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  scanResultTitle: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '800' as const,
  },
  scanResultCloseButton: {
    padding: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
  },
  scanResultScroll: {
    flexGrow: 0,
  },
  scanResultAddressBox: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 140, 0, 0.2)',
  },
  scanResultAddressLabel: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 10,
    fontWeight: '700' as const,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  scanResultAddressText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600' as const,
    fontFamily: Platform.OS === 'ios' || Platform.OS === 'android' ? 'Courier' : 'monospace',
    lineHeight: 20,
  },
  scanResultAmountBox: {
    backgroundColor: 'rgba(255, 140, 0, 0.12)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 140, 0, 0.3)',
  },
  scanResultAmountLabel: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 10,
    fontWeight: '700' as const,
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  scanResultAmountValue: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '900' as const,
  },
  scanResultAmountEuro: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 14,
    fontWeight: '600' as const,
    marginTop: 4,
  },
  scanResultTokensSection: {
    marginBottom: 16,
  },
  scanResultTokensLabel: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700' as const,
    marginBottom: 12,
  },
  scanResultTokensGrid: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
  scanResultToken: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: '#2a2a2a',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#3a3a3a',
    maxWidth: 110,
  },
  scanToken1000: {
    backgroundColor: '#5B9BD5',
    borderColor: '#75ADE0',
  },
  scanToken5000: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E0E0E0',
  },
  scanToken50000: {
    backgroundColor: '#E8451A',
    borderColor: '#F5693F',
  },
  scanTokenSelected: {
    backgroundColor: '#FF8C00',
    borderColor: '#FFB347',
    shadowColor: '#FF8C00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  scanResultTokenValue: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '900' as const,
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  scanResultTokenUnit: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '700' as const,
    marginTop: 2,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
  },
  scanResultCountBadge: {
    position: 'absolute' as const,
    top: 4,
    right: 4,
    backgroundColor: '#000',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  scanResultCountText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700' as const,
  },
  scanResultTotalBox: {
    backgroundColor: 'rgba(61, 40, 25, 0.8)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 140, 0, 0.4)',
  },
  scanResultTotalLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  scanResultTotalValue: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: '900' as const,
  },
  scanResultTotalEuro: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 14,
    fontWeight: '600' as const,
    marginTop: 4,
  },
  scanResultSendButton: {
    backgroundColor: '#FF8C00',
    borderRadius: 20,
    paddingVertical: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 4,
    shadowColor: '#FF8C00',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  scanResultSendButtonDisabled: {
    opacity: 0.4,
  },
  scanResultSendButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '900' as const,
    letterSpacing: 0.5,
  },
});
