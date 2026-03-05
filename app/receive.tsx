import '@/utils/shim';
import { useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions, Alert, TextInput, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useWallet } from '@/contexts/WalletContext';
import { useQRColor } from '@/contexts/QRColorContext';

import { ArrowLeft, Copy, Send } from 'lucide-react-native';
import { useResponsive } from '@/utils/responsive';
import { Image } from 'expo-image';

import * as Clipboard from 'expo-clipboard';


export default function ReceiveScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ amount?: string }>();
  const insets = useSafeAreaInsets();
  const { address } = useWallet();
  const { getQRColors } = useQRColor();
  const { width } = useWindowDimensions();
  const responsive = useResponsive();

  const [isCopied, setIsCopied] = useState(false);
  const [manualAmount, setManualAmount] = useState('');
  
  const requestedAmount = useMemo(() => {
    if (params.amount && parseInt(params.amount) > 0) return parseInt(params.amount);
    if (manualAmount) return parseInt(manualAmount) || 0;
    return 0;
  }, [params.amount, manualAmount]);


  const currentArt = useMemo(() => {
    const qrColors = getQRColors(address);
    return {
      bg: qrColors.background,
      fg: qrColors.qr,
      accent: qrColors.qr,
      borderGlow: qrColors.qr,
    };
  }, [address, getQRColors]);



  const padding = responsive.scale(32);
  const qrArtSize = useMemo(() => {
    const maxSize = responsive.isTablet ? 400 : 320;
    return Math.min(width - 100, maxSize);
  }, [width, responsive.isTablet]);


  const qrCodeUri = useMemo(() => {
    if (!address) return '';
    if (requestedAmount > 0) {
      const btcAmount = (requestedAmount / 100000000).toFixed(8);
      return `bitcoin:${address}?amount=${btcAmount}`;
    }
    return `bitcoin:${address}`;
  }, [address, requestedAmount]);

  const handleCopy = async () => {
    if (!address) return;
    try {
      await Clipboard.setStringAsync(address);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error('Error copying:', error);
      Alert.alert('Erreur', 'Impossible de copier l\'adresse.');
    }
  };



  const handleGoToSend = useCallback(() => {
    router.push({
      pathname: '/send',
      params: {
        preselectedAmount: requestedAmount.toString(),
      },
    });
  }, [requestedAmount, router]);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft color="#FFF" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Recevoir Btcon</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.qrSection}>
          <View style={styles.shareableContent}>
            <View style={styles.addressInfo}>
              <View style={styles.addressHeader}>
                <Text style={styles.addressLabel}>Adresse Btcon</Text>
                <TouchableOpacity onPress={handleCopy} style={styles.copyButton}>
                  <Copy color={isCopied ? "#4CAF50" : "#FF8C00"} size={16} />
                  <Text style={[styles.copyButtonText, isCopied && styles.copyButtonTextCopied]}>
                    {isCopied ? 'Copié' : 'Copier'}
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.addressText}>{address}</Text>
            </View>

            <View style={[styles.qrCodeWrapper, { width: qrArtSize + padding * 2, height: qrArtSize + padding * 2, backgroundColor: currentArt.bg }]}>
              {qrCodeUri ? (
                <Image
                  source={`https://api.qrserver.com/v1/create-qr-code/?size=260x260&bgcolor=${currentArt.bg.replace('#', '')}&color=${currentArt.fg.replace('#', '')}&data=${encodeURIComponent(qrCodeUri)}`}
                  style={{ width: qrArtSize, height: qrArtSize }}
                  contentFit="contain"
                  cachePolicy="memory-disk"
                />
              ) : (
                <Text style={[styles.qrPlaceholderText, { color: currentArt.accent }]}>Génération...</Text>
              )}
            </View>

            {!params.amount && (
              <View style={styles.manualAmountSection}>
                <Text style={styles.manualAmountLabel}>Montant à recevoir (Btcon)</Text>
                <TextInput
                  style={styles.manualAmountInput}
                  value={manualAmount}
                  onChangeText={setManualAmount}
                  placeholder="Ex: 5000"
                  placeholderTextColor="#555"
                  keyboardType="numeric"
                  testID="manual-amount-input"
                />
              </View>
            )}

            <View style={styles.amountInfo}>
              <Text style={styles.amountLabel}>Montant demandé</Text>
              <View style={styles.amountRow}>
                <Text style={styles.amountValue}>{requestedAmount > 0 ? requestedAmount.toLocaleString() : '0'}</Text>
                <Text style={styles.amountUnit}>Btcon</Text>
              </View>

            </View>
          </View>
        </View>

        {requestedAmount > 0 && (
          <TouchableOpacity
            style={styles.sendActionButton}
            onPress={handleGoToSend}
            testID="receive-send-button"
          >
            <Send color="#FFF" size={20} />
            <Text style={styles.sendActionButtonText}>Envoyer {requestedAmount.toLocaleString()} Btcon</Text>
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
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
  scrollView: {
    flex: 1,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  qrSection: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  shareableContent: {
    alignItems: 'center',
    gap: 20,
  },
  qrCodeWrapper: {
    borderRadius: 28,
    shadowColor: '#FF8C00',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.6,
    shadowRadius: 32,
    elevation: 16,
    borderWidth: 4,
    borderColor: 'rgba(255, 140, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  qrPlaceholderText: {
    fontSize: 16,
    fontWeight: '600' as const,
  },

  modalContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  scannerHeader: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    zIndex: 10,
  },
  scannerTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '700' as const,
  },
  closeButton: {
    padding: 8,
    backgroundColor: 'rgba(255, 140, 0, 0.2)',
    borderRadius: 12,
  },
  camera: {
    flex: 1,
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
  addressInfo: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 140, 0, 0.3)',
    maxWidth: 360,
    alignSelf: 'center',
  },
  addressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  addressLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 11,
    fontWeight: '700' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 1.2,
  },
  copyButton: {
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
  copyButtonText: {
    color: '#FF8C00',
    fontSize: 10,
    fontWeight: '700' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  copyButtonTextCopied: {
    color: '#4CAF50',
  },
  addressText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '600' as const,
    fontFamily: 'monospace' as const,
    textAlign: 'center' as const,
    lineHeight: 16,
  },
  amountInfo: {
    paddingVertical: 20,
    paddingHorizontal: 32,
    backgroundColor: 'rgba(255, 140, 0, 0.15)',
    borderRadius: 18,
    borderWidth: 2.5,
    borderColor: '#FF8C00',
    alignItems: 'center',
  },
  amountLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    fontWeight: '700' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
    marginBottom: 6,
  },
  amountValue: {
    color: '#FFF',
    fontSize: 36,
    fontWeight: '900' as const,
    letterSpacing: -1.5,
  },
  amountUnit: {
    color: '#FF8C00',
    fontSize: 18,
    fontWeight: '800' as const,
  },
  amountEuro: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  manualAmountSection: {
    width: '100%',
    maxWidth: 360,
    gap: 8,
  },
  manualAmountLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    fontWeight: '700' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
  },
  manualAmountInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    padding: 16,
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700' as const,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 140, 0, 0.3)',
    textAlign: 'center' as const,
  },
  sendActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#FF8C00',
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 32,
    marginTop: 24,
    width: '100%',
    maxWidth: 360,
    shadowColor: '#FF8C00',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  sendActionButtonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '900' as const,
    letterSpacing: 0.5,
  },
});
