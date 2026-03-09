import '@/utils/shim';
import { useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator, ScrollView, useWindowDimensions, Platform, Animated, Easing, Image } from 'react-native';
import { Coins } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useWallet } from '@/contexts/WalletContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { useDeveloperHierarchy } from '@/contexts/DeveloperHierarchyContext';
import { ArrowLeft, Send, X, Camera } from 'lucide-react-native';
const coinImage = require('../assets/images/btcon-icon.png');
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useResponsive } from '@/utils/responsive';
import * as Haptics from 'expo-haptics';


export default function SendScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    preselectedAmount?: string;
    address?: string;
  }>();
  const { balance, signAndBroadcastTransaction, esploraService, address } = useWallet();
  const { notifyTransaction, notifyPendingTransaction } = useNotifications();
  const { isDeveloper } = useDeveloperHierarchy();
  const { width } = useWindowDimensions();
  const responsive = useResponsive();
  const scrollViewRef = useRef<ScrollView>(null);
  const [toAddress, setToAddress] = useState(params.address || '');
  const [isSending, setIsSending] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [hasScanned, setHasScanned] = useState(false);
  const [amountBtcon, setAmountBtcon] = useState(params.preselectedAmount ? parseInt(params.preselectedAmount, 10) : 0);

  const [feeFlipState, setFeeFlipState] = useState<'idle' | 'choosing' | 'flipping' | 'won' | 'lost'>('idle');
  const [feeFlipChoice, setFeeFlipChoice] = useState<'heads' | 'tails' | null>(null);
  const [feeFlipResult, setFeeFlipResult] = useState<'heads' | 'tails' | null>(null);
  const [feesWaived, setFeesWaived] = useState(false);
  const flipAnim = useRef(new Animated.Value(0)).current;



  const totalAmount = amountBtcon;

  const startFeeFlip = () => {
    setFeeFlipState('choosing');
    setFeeFlipChoice(null);
    setFeeFlipResult(null);
  };

  const doFeeFlip = (choice: 'heads' | 'tails') => {
    setFeeFlipChoice(choice);
    setFeeFlipState('flipping');
    flipAnim.setValue(0);

    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    const result: 'heads' | 'tails' = Math.random() < 0.5 ? 'heads' : 'tails';

    Animated.timing(flipAnim, {
      toValue: 1,
      duration: 1800,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(() => {
      setFeeFlipResult(result);
      const won = result === choice;
      setFeesWaived(won);
      setFeeFlipState(won ? 'won' : 'lost');
      if (Platform.OS !== 'web') {
        void Haptics.notificationAsync(
          won ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error
        );
      }
    });
  };







  const handleSend = async () => {
    const input = toAddress.trim();
    
    if (!input) {
      Alert.alert('Error', 'Veuillez entrer une adresse Btcon');
      return;
    }

    const isDevAddress = address ? isDeveloper(address) : false;

    const resolvedAddress = input;



    if (totalAmount === 0) {
      Alert.alert('Error', 'Veuillez sélectionner un montant');
      return;
    }

    const btconAmount = totalAmount;
    const satsAmount = Math.floor(btconAmount);

    if (satsAmount > balance) {
      Alert.alert('Error', 'Fonds insuffisants');
      return;
    }

    if (satsAmount < 546) {
      Alert.alert('Error', 'Montant trop petit');
      return;
    }

    const totalFeesInSats = isDevAddress ? 0 : (feesWaived ? 0 : 500);
    const totalFeesInBtcon = isDevAddress ? 0 : (feesWaived ? 0 : 500);

    const feeMessage = isDevAddress 
      ? '\n\n✨ Mode développeur : Frais gratuits !' 
      : feesWaived
        ? '\n\n🎉 Pile ou Face gagné — le receveur paye les frais !'
        : `\n\nFrais de réseau: ${Math.floor(totalFeesInBtcon).toLocaleString()} Btcon`;
    
    Alert.alert(
      'Confirmer la transaction',
      `Montant: ${Math.floor(btconAmount).toLocaleString()} Btcon\n\nDestinataire: ${resolvedAddress.slice(0, 10) + '...'}${feeMessage}\n\nTotal à déduire: ${(satsAmount + totalFeesInSats).toLocaleString()} Btcon`,
      [
        {
          text: 'Annuler',
          style: 'cancel',
        },
        {
          text: 'Envoyer',
          onPress: async () => {
            setIsSending(true);
            try {
              const txid = await signAndBroadcastTransaction(resolvedAddress, satsAmount);
              const explorerUrl = esploraService.getExplorerUrl(txid);
              
              await notifyTransaction('sent', btconAmount);
              await notifyPendingTransaction({ type: 'sent', amount: btconAmount });
              
              Alert.alert(
                'Transaction envoyée',
                `Transaction ID: ${txid.slice(0, 10)}...\n\nVoir sur l'explorer: ${explorerUrl}`,
                [
                  {
                    text: 'OK',
                    onPress: () => router.back(),
                  },
                ]
              );

              setToAddress('');
            } catch (error) {
              console.error('Error sending transaction:', error);
              Alert.alert('Error', error instanceof Error ? error.message : 'Failed to send transaction');
            } finally {
              setIsSending(false);
            }
          },
        },
      ]
    );
  };

  const handleOpenCamera = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert('Permission refusée', 'Veuillez autoriser l\'accès à la caméra');
        return;
      }
    }
    setHasScanned(false);
    setShowCamera(true);
  };

  const handleBarcodeScanned = useCallback((data: string) => {
    if (hasScanned) return;
    setHasScanned(true);
    setShowCamera(false);
    
    console.log('QR Code scanné:', data);
    
    let extractedAddress = data.trim();
    let extractedAmount = 0;
    
    if (extractedAddress.toLowerCase().startsWith('bitcoin:')) {
      const uri = extractedAddress.substring(8);
      const parts = uri.split('?');
      extractedAddress = parts[0];
      
      console.log('Adresse extraite de bitcoin URI:', extractedAddress);
      
      if (parts.length > 1) {
        const params = new URLSearchParams(parts[1]);
        const amountBtc = params.get('amount');
        
        if (amountBtc) {
          extractedAmount = Math.floor(parseFloat(amountBtc) * 100000000);
          console.log('Montant extrait:', extractedAmount, 'satoshis');
        }
      }
    }
    
    console.log('Adresse finale:', extractedAddress);
    console.log('Montant final:', extractedAmount);
    
    setToAddress(extractedAddress);
    
    if (extractedAmount > 0) {
      setAmountBtcon(extractedAmount);
      
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [hasScanned, scrollViewRef]);





  return (
    <View style={styles.container}>
      <View style={styles.backgroundPattern}>
        {[...Array(20)].map((_, i) => (
          <View
            key={`pattern-${i}`}
            style={[
              i % 3 === 0 ? styles.patternCircle : styles.patternSquare,
              {
                width: 40 + (i % 3) * 30,
                height: 40 + (i % 3) * 30,
                left: (i * 70) % width,
                top: Math.floor(i / 4) * 180 + 50,
                transform: [{ rotate: `${i * 15}deg` }],
              },
            ]}
          />
        ))}
      </View>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft color="#FFF" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Envoyer</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        ref={scrollViewRef}
        style={styles.scrollView} 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.formCard}>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Destinataire</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={toAddress}
                onChangeText={setToAddress}
                placeholder="Adresse Btcon"
                placeholderTextColor="#666"
                autoCapitalize="none"
                autoCorrect={false}
                testID="recipient-input"
              />
            </View>
          </View>


        </View>

        {totalAmount > 0 && (
          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>Montant:</Text>
            <View style={styles.totalRow}>
              <Text style={[styles.totalAmount, { fontSize: responsive.scale(32) }]}>{totalAmount.toLocaleString()}</Text>
              <Text style={[styles.totalUnit, { fontSize: responsive.scale(14) }]}>Btcon</Text>
            </View>
          </View>
        )}

        {totalAmount > 0 && (
          <View style={styles.feesCard}>
            <View style={styles.feesRow}>
              <Text style={styles.feesTransactionLabel}>Frais de transaction</Text>
              {address && isDeveloper(address) ? (
                <View style={styles.freeFeesContainer}>
                  <Text style={styles.freeFeesBadge}>GRATUIT ✨</Text>
                  <Text style={styles.freeFeesText}>0 Btcon</Text>
                </View>
              ) : feesWaived ? (
                <View style={styles.freeFeesContainer}>
                  <Text style={styles.freeFeesBadge}>GAGNÉ 🎉</Text>
                  <Text style={styles.freeFeesText}>0 Btcon</Text>
                </View>
              ) : (
                <Text style={styles.feesTransactionValue}>
                  500 Btcon
                </Text>
              )}
            </View>

            {!(address && isDeveloper(address)) && (
              <View style={styles.coinFlipSection}>
                {feeFlipState === 'idle' && !feesWaived && (
                  <TouchableOpacity
                    style={styles.coinFlipTrigger}
                    onPress={startFeeFlip}
                    testID="fee-coin-flip-button"
                  >
                    <Coins color="#FFD700" size={20} />
                    <Text style={styles.coinFlipTriggerText}>Pile ou Face pour les frais ?</Text>
                  </TouchableOpacity>
                )}

                {feeFlipState === 'choosing' && (
                  <View style={styles.coinFlipChoosing}>
                    <Text style={styles.coinFlipQuestion}>Choisissez votre côté :</Text>
                    <View style={styles.coinFlipChoices}>
                      <TouchableOpacity
                        style={styles.coinFlipChoiceBtn}
                        onPress={() => doFeeFlip('heads')}
                      >
                        <Text style={styles.coinFlipChoiceEmoji}>👑</Text>
                        <Text style={styles.coinFlipChoiceText}>PILE</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.coinFlipChoiceBtn}
                        onPress={() => doFeeFlip('tails')}
                      >
                        <Text style={styles.coinFlipChoiceEmoji}>🔄</Text>
                        <Text style={styles.coinFlipChoiceText}>FACE</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {feeFlipState === 'flipping' && (
                  <View style={styles.coinFlipAnimArea}>
                    <Animated.View
                      style={[
                        styles.miniCoin,
                        {
                          transform: [
                            {
                              rotateX: flipAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: ['0deg', '1800deg'],
                              }),
                            },
                          ],
                        },
                      ]}
                    >
                      <Image source={coinImage} style={styles.miniCoinImage} resizeMode="cover" />
                    </Animated.View>
                    <Text style={styles.coinFlipFlippingText}>La pièce tourne...</Text>
                  </View>
                )}

                {feeFlipState === 'won' && (
                  <View style={styles.coinFlipResultArea}>
                    <View style={styles.coinFlipWonBadge}>
                      <Text style={styles.coinFlipWonText}>🎉 GAGNÉ !</Text>
                      <Text style={styles.coinFlipResultDetail}>
                        Vous avez choisi {feeFlipChoice === 'heads' ? 'PILE' : 'FACE'} et c'est tombé sur {feeFlipResult === 'heads' ? 'PILE' : 'FACE'}
                      </Text>
                      <Text style={styles.coinFlipFreeText}>Personne ne paye les frais !</Text>
                    </View>
                  </View>
                )}

                {feeFlipState === 'lost' && (
                  <View style={styles.coinFlipResultArea}>
                    <View style={styles.coinFlipLostBadge}>
                      <Text style={styles.coinFlipLostText}>😔 PERDU</Text>
                      <Text style={styles.coinFlipResultDetail}>
                        Vous avez choisi {feeFlipChoice === 'heads' ? 'PILE' : 'FACE'} mais c'est tombé sur {feeFlipResult === 'heads' ? 'PILE' : 'FACE'}
                      </Text>
                      <Text style={styles.coinFlipLostFees}>Frais normaux : 500 Btcon</Text>
                    </View>

                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {!showCamera && (
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity
              style={styles.cameraButton}
              onPress={handleOpenCamera}
              testID="scan-qr-button"
            >
              <Camera color="#FF8C00" size={24} />
              <Text style={styles.cameraButtonText}>Scanner QR Code</Text>
            </TouchableOpacity>
          </View>
        )}

        {showCamera && (
          <View style={styles.cameraContainer}>
            <View style={styles.cameraHeaderInline}>
              <Text style={styles.cameraTitle}>Scanner QR Code</Text>
              <TouchableOpacity
                onPress={() => setShowCamera(false)}
                style={styles.closeCameraButton}
                testID="close-camera-button"
              >
                <X color="#FFF" size={24} />
              </TouchableOpacity>
            </View>
            <CameraView
              style={styles.cameraView}
              facing="back"
              barcodeScannerSettings={{
                barcodeTypes: ['qr'],
              }}
              onBarcodeScanned={(result: { data?: string }) => {
                if (result?.data) {
                  handleBarcodeScanned(result.data);
                }
              }}
            >
              <View style={styles.scannerOverlay}>
                <View style={styles.scannerFrame} />
              </View>
            </CameraView>
          </View>
        )}



        {toAddress.trim() !== '' && totalAmount > 0 && (
          <TouchableOpacity
            style={[styles.sendButton, isSending && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={isSending}
            testID="send-transaction-button"
          >
            {isSending ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Send color="#FFF" size={20} />
                <Text style={styles.sendButtonText}>Envoyer</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>


    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    position: 'relative' as const,
  },
  backgroundPattern: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.06,
  },
  patternCircle: {
    position: 'absolute' as const,
    borderRadius: 1000,
    borderWidth: 3,
    borderColor: '#FF8C00',
  },
  patternSquare: {
    position: 'absolute' as const,
    borderWidth: 3,
    borderColor: '#FFD700',
    borderRadius: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700' as const,
  },
  placeholder: {
    width: 40,
  },
  searchUsersButton: {
    padding: 8,
  },
  followingSection: {
    marginBottom: 24,
  },
  followingSectionTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700' as const,
    marginBottom: 12,
    paddingLeft: 4,
  },
  followingList: {
    gap: 12,
    paddingRight: 24,
  },
  followingCard: {
    backgroundColor: '#0f0f0f',
    borderRadius: 20,
    padding: 18,
    alignItems: 'center',
    gap: 10,
    minWidth: 110,
    borderWidth: 1,
    borderColor: 'rgba(255, 140, 0, 0.15)',
    shadowColor: '#FF8C00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  followingAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FF8C00',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF8C00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  followingAvatarText: {
    color: '#000',
    fontSize: 28,
    fontWeight: '900' as const,
  },
  followingUsername: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700' as const,
    letterSpacing: 0.3,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingTop: 12,
    paddingBottom: 40,
  },
  balanceCard: {
    backgroundColor: '#0f0f0f',
    borderRadius: 24,
    padding: 28,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#FF8C00',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 2,
    borderColor: 'rgba(255, 140, 0, 0.3)',
  },
  balanceLabel: {
    color: '#FFF',
    fontSize: 14,
    marginBottom: 12,
    fontWeight: '600' as const,
    letterSpacing: 0.5,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12,
  },
  balanceAmount: {
    color: '#FFF',
    fontSize: 32,
    fontWeight: '900' as const,
  },
  balanceUnit: {
    color: '#FF8C00',
    fontSize: 14,
    fontWeight: '900' as const,
  },
  balanceSats: {
    color: '#999',
    fontSize: 12,
    marginTop: 8,
    fontWeight: '500' as const,
  },
  balanceEuro: {
    color: '#FF8C00',
    fontSize: 14,
    marginTop: 6,
    fontWeight: '700' as const,
  },
  formCard: {
    backgroundColor: '#0f0f0f',
    borderRadius: 28,
    padding: 28,
    marginBottom: 0,
    gap: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  inputContainer: {
    gap: 8,
  },
  inputLabel: {
    color: '#999',
    fontSize: 12,
    fontWeight: '600' as const,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
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
  tokensSection: {
    marginBottom: 24,
    backgroundColor: '#0f0f0f',
    borderRadius: 28,
    padding: 28,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  tokensLabel: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700' as const,
  },
  tokensContainer: {
    gap: 16,
  },
  topTokensRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  bottomTokenRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  tokenWrapper: {
    width: '35%',
    alignItems: 'center',
  },
  tokenWrapper50k: {
    width: '72%',
    alignItems: 'center',
  },
  tokenCircle: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#2a2a2a',
    borderRadius: 1000,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 6,
    borderColor: '#3a3a3a',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  token1000: {
    backgroundColor: '#5B9BD5',
    borderColor: '#75ADE0',
  },
  token5000: {
    backgroundColor: '#FF9F47',
    borderColor: '#FFB366',
  },
  token5000White: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E0E0E0',
  },
  tokenValueWhite: {
    color: '#000000',
  },
  tokenUnitWhite: {
    color: '#000000',
  },
  tokenSquare: {
    width: '100%',
    aspectRatio: 1.3,
    backgroundColor: '#E8451A',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 6,
    borderColor: '#F5693F',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
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
  tokenValue: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: '900' as const,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  tokenUnit: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700' as const,
    marginTop: 4,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
    opacity: 1,
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
  addressInputCard: {
    marginTop: 0,
    padding: 20,
    backgroundColor: '#0f0f0f',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 140, 0, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  totalContainer: {
    marginTop: 20,
    padding: 20,
    backgroundColor: 'rgba(61, 40, 25, 0.8)',
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 140, 0, 0.4)',
  },
  totalLabel: {
    color: '#FFF',
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '600' as const,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  totalAmount: {
    color: '#FFF',
    fontSize: 32,
    fontWeight: '900' as const,
  },
  totalUnit: {
    color: '#FF8C00',
    fontSize: 14,
    fontWeight: '900' as const,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#000000',
    borderRadius: 16,
    padding: 18,
    color: '#FFFFFF',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  inputIconBubble: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 140, 0, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 140, 0, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  scanButton: {
    backgroundColor: 'rgba(255, 140, 0, 0.1)',
    borderRadius: 16,
    padding: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 140, 0, 0.2)',
  },
  conversionText: {
    color: '#999',
    fontSize: 11,
    marginTop: 6,
    fontWeight: '500' as const,
  },
  conversionTextEuro: {
    color: '#FF8C00',
    fontSize: 13,
    marginTop: 6,
    fontWeight: '700' as const,
  },
  feesCard: {
    backgroundColor: '#0f0f0f',
    borderRadius: 20,
    padding: 24,
    marginTop: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 140, 0, 0.3)',
    shadowColor: '#FF8C00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
    alignItems: 'center',
  },
  feesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  feesTransactionLabel: {
    color: '#999',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  feesTransactionValue: {
    color: '#FF8C00',
    fontSize: 15,
    fontWeight: '900' as const,
  },
  feesLeftLabel: {
    color: '#999',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  feesRightColumn: {
    alignItems: 'flex-end',
  },
  feesValueBig: {
    color: '#FF8C00',
    fontSize: 16,
    fontWeight: '900' as const,
  },
  feesEuroValue: {
    color: '#666',
    fontSize: 12,
    fontWeight: '600' as const,
    marginTop: 2,
  },
  feesDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 140, 0, 0.15)',
    marginVertical: 16,
  },
  feesAddressValue: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700' as const,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  labelWithReset: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryCard: {
    backgroundColor: '#0f0f0f',
    borderRadius: 28,
    padding: 28,
    marginBottom: 28,
    gap: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  summaryLabel: {
    color: '#999',
    fontSize: 12,
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  tokensListContainer: {
    gap: 12,
  },
  tokenSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#000000',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 140, 0, 0.2)',
  },
  tokenSummaryText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  tokenSummaryCount: {
    color: '#FF8C00',
    fontSize: 14,
    fontWeight: '700' as const,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  cameraButton: {
    flex: 1,
    backgroundColor: '#0f0f0f',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 140, 0, 0.15)',
  },
  usersButton: {
    flex: 1,
    backgroundColor: '#0f0f0f',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 140, 0, 0.15)',
  },
  cameraButtonText: {
    color: '#FF8C00',
    fontSize: 13,
    fontWeight: '700' as const,
    letterSpacing: 0.3,
  },
  sendButton: {
    backgroundColor: '#FF8C00',
    borderRadius: 20,
    padding: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 20,
    marginTop: 8,
    shadowColor: '#FF8C00',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '900' as const,
    letterSpacing: 0.5,
  },
  infoCard: {
    backgroundColor: 'rgba(255, 140, 0, 0.05)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 140, 0, 0.1)',
  },
  infoText: {
    color: '#666',
    fontSize: 11,
    lineHeight: 16,
  },
  feesContainer: {
    marginTop: 20,
    padding: 20,
    backgroundColor: '#000000',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 140, 0, 0.3)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  feesLabel: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  feesValue: {
    color: '#FF8C00',
    fontSize: 14,
    fontWeight: '900' as const,
  },
  feesSubtext: {
    color: '#666',
    fontSize: 11,
    marginTop: 2,
  },
  feesEuroText: {
    color: '#FF8C00',
    fontSize: 12,
    fontWeight: '700' as const,
    marginTop: 4,
  },
  cameraContainer: {
    backgroundColor: '#0f0f0f',
    borderRadius: 28,
    overflow: 'hidden',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 140, 0, 0.2)',
  },
  cameraHeaderInline: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#000',
  },
  cameraTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700' as const,
  },
  closeCameraButton: {
    padding: 8,
    backgroundColor: 'rgba(255, 140, 0, 0.2)',
    borderRadius: 12,
  },
  cameraView: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#000',
  },
  scannerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerFrame: {
    width: '80%',
    aspectRatio: 1,
    maxWidth: 340,
    maxHeight: 340,
    borderWidth: 4,
    borderColor: '#FF8C00',
    borderRadius: 32,
    backgroundColor: 'transparent',
    shadowColor: '#FF8C00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 10,
  },
  freeFeesContainer: {
    alignItems: 'flex-end',
    gap: 4,
  },
  freeFeesBadge: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '900' as const,
    letterSpacing: 0.5,
  },
  freeFeesText: {
    color: '#00FF88',
    fontSize: 15,
    fontWeight: '900' as const,
  },
  coinFlipSection: {
    marginTop: 16,
    alignItems: 'center',
    width: '100%',
  },
  coinFlipTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  coinFlipTriggerText: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '700' as const,
  },
  coinFlipChoosing: {
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  coinFlipQuestion: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700' as const,
  },
  coinFlipChoices: {
    flexDirection: 'row',
    gap: 16,
  },
  coinFlipChoiceBtn: {
    flex: 1,
    backgroundColor: 'rgba(255, 140, 0, 0.12)',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 140, 0, 0.3)',
  },
  coinFlipChoiceEmoji: {
    fontSize: 28,
  },
  coinFlipChoiceText: {
    color: '#FF8C00',
    fontSize: 16,
    fontWeight: '800' as const,
    letterSpacing: 1,
  },
  coinFlipAnimArea: {
    alignItems: 'center',
    gap: 16,
    paddingVertical: 12,
  },
  miniCoin: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 3,
    borderColor: '#FF8C00',
    backgroundColor: '#1a1a1a',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  miniCoinImage: {
    width: 54,
    height: 54,
    borderRadius: 27,
  },
  coinFlipFlippingText: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  coinFlipResultArea: {
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  coinFlipWonBadge: {
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 6,
    width: '100%',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 255, 136, 0.3)',
  },
  coinFlipWonText: {
    color: '#00FF88',
    fontSize: 20,
    fontWeight: '900' as const,
  },
  coinFlipResultDetail: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 13,
    textAlign: 'center' as const,
  },
  coinFlipFreeText: {
    color: '#00FF88',
    fontSize: 15,
    fontWeight: '800' as const,
    marginTop: 4,
  },
  coinFlipLostBadge: {
    backgroundColor: 'rgba(220, 20, 60, 0.1)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 6,
    width: '100%',
    borderWidth: 1.5,
    borderColor: 'rgba(220, 20, 60, 0.3)',
  },
  coinFlipLostText: {
    color: '#DC143C',
    fontSize: 20,
    fontWeight: '900' as const,
  },
  coinFlipLostFees: {
    color: '#FF8C00',
    fontSize: 14,
    fontWeight: '700' as const,
    marginTop: 4,
  },
  coinFlipRetry: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  coinFlipRetryText: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '700' as const,
  },
  amountHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchModeButton: {
    backgroundColor: 'rgba(255, 140, 0, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 140, 0, 0.3)',
  },
  switchModeText: {
    color: '#FF8C00',
    fontSize: 12,
    fontWeight: '700' as const,
  },
  currencyBadge: {
    backgroundColor: '#FF8C00',
    paddingHorizontal: 16,
    paddingVertical: 18,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  currencyBadgeText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '900' as const,
  },
  headerWide: {
    paddingHorizontal: 40,
  },
  tokensContainerWide: {
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
  },
  showTokensButton: {
    backgroundColor: '#FF8C00',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  showTokensText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700' as const,
  },
});
