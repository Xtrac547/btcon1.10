import '@/utils/shim';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { CreditCard, Gift, Smartphone, DollarSign, ArrowLeft, ChevronRight } from 'lucide-react-native';
import { useState, useMemo, type ReactNode } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { useDeveloperHierarchy } from '@/contexts/DeveloperHierarchyContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBtcPrice } from '@/services/btcPrice';

type PaymentMethod = 'card' | 'gift' | 'google' | 'paypal';

interface PaymentOption {
  id: PaymentMethod;
  name: string;
  icon: ReactNode;
  description: string;
  enabled: boolean;
}

export default function BuyBTCScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { address } = useWallet();
  const { isDeveloper } = useDeveloperHierarchy();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [amount, setAmount] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { btcPrice } = useBtcPrice();

  const paymentOptions: PaymentOption[] = [
    {
      id: 'card',
      name: 'Carte Bancaire',
      icon: <CreditCard color="#FF8C00" size={28} />,
      description: 'Visa, Mastercard, American Express',
      enabled: true,
    },
    {
      id: 'paypal',
      name: 'PayPal',
      icon: <DollarSign color="#FF8C00" size={28} />,
      description: 'Paiement sécurisé via PayPal',
      enabled: true,
    },
    {
      id: 'google',
      name: 'Google Play',
      icon: <Smartphone color="#FF8C00" size={28} />,
      description: 'Crédit Google Play',
      enabled: Platform.OS === 'android',
    },
    {
      id: 'gift',
      name: 'Carte Cadeau',
      icon: <Gift color="#FF8C00" size={28} />,
      description: 'Codes de cartes cadeaux',
      enabled: true,
    },
  ];

  const handleMethodSelect = (method: PaymentMethod) => {
    console.log('Payment method selected:', method);
    setSelectedMethod(method);
  };

  const handleAmountChange = (text: string) => {
    const numericValue = text.replace(/[^0-9.]/g, '');
    setAmount(numericValue);
  };

  const handlePurchase = async () => {
    if (!selectedMethod) {
      Alert.alert('Erreur', 'Veuillez sélectionner une méthode de paiement');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Erreur', 'Veuillez entrer un montant valide');
      return;
    }

    setIsProcessing(true);

    try {
      console.log('Processing purchase:', {
        method: selectedMethod,
        amount: parseFloat(amount),
        address,
      });

      const isDevAddress = address ? isDeveloper(address) : false;
      const devMessage = isDevAddress ? '\n\n✨ Mode développeur : Service gratuit !' : '';

      Alert.alert(
        'Service temporairement indisponible',
        `L'achat de Btcon via ${paymentOptions.find(p => p.id === selectedMethod)?.name} sera bientôt disponible.\n\nMontant: ${amount} €\nAdresse: ${address}${devMessage}\n\nCette fonctionnalité nécessite l'intégration avec un fournisseur de services de paiement.`,
        [
          {
            text: 'OK',
            onPress: () => {
              setIsProcessing(false);
            },
          },
        ]
      );
    } catch (error) {
      console.error('Purchase error:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors de la transaction');
      setIsProcessing(false);
    }
  };

  const calculatedBtc = useMemo((): string => {
    if (!amount || parseFloat(amount) <= 0) return '0.00000000';
    const btcAmount = parseFloat(amount) / btcPrice;
    return btcAmount.toFixed(8);
  }, [amount, btcPrice]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.backgroundPattern}>
        {[...Array(20)].map((_, i) => (
          <View
            key={`dot-${i}`}
            style={[
              styles.patternDot,
              {
                left: (i * 70 + 40) % 400,
                top: Math.floor(i / 5) * 140 + 100,
                opacity: 0.3 + (i % 3) * 0.15,
              },
            ]}
          />
        ))}
      </View>

      <View style={[styles.header, { paddingTop: 20 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft color="#FFF" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Acheter du Btcon</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Montant en Euros</Text>
          <View style={styles.amountInputContainer}>
            <Text style={styles.currencySymbol}>€</Text>
            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={handleAmountChange}
              placeholder="0.00"
              placeholderTextColor="#444"
              keyboardType="decimal-pad"
            />
          </View>
          {amount && parseFloat(amount) > 0 && (
            <View style={styles.conversionContainer}>
              <Text style={styles.conversionLabel}>≈ {calculatedBtc} Btcon</Text>
              <Text style={styles.conversionNote}>Taux indicatif : 1 Btcon = {btcPrice.toLocaleString('fr-FR')} €</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Méthode de paiement</Text>
          <View style={styles.paymentMethods}>
            {paymentOptions
              .filter(option => option.enabled)
              .map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.paymentOption,
                    selectedMethod === option.id && styles.paymentOptionSelected,
                  ]}
                  onPress={() => handleMethodSelect(option.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.paymentIconContainer}>
                    {option.icon}
                  </View>
                  <View style={styles.paymentInfo}>
                    <Text style={styles.paymentName}>{option.name}</Text>
                    <Text style={styles.paymentDescription}>{option.description}</Text>
                  </View>
                  <ChevronRight 
                    color={selectedMethod === option.id ? '#FF8C00' : '#666'} 
                    size={24} 
                  />
                </TouchableOpacity>
              ))}
          </View>
        </View>

        {selectedMethod && (
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>ℹ️ Information importante</Text>
            <Text style={styles.infoText}>
              Les transactions d&apos;achat de Btcon sont sécurisées et traitées par des fournisseurs
              de paiement certifiés. Votre Btcon sera crédité sur votre portefeuille dans un délai
              de 5 à 30 minutes selon la méthode choisie.
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.purchaseButton,
            (!selectedMethod || !amount || parseFloat(amount) <= 0 || isProcessing) && 
            styles.purchaseButtonDisabled,
          ]}
          onPress={handlePurchase}
          disabled={!selectedMethod || !amount || parseFloat(amount) <= 0 || isProcessing}
          activeOpacity={0.8}
        >
          <Text style={styles.purchaseButtonText}>
            {isProcessing ? 'Traitement...' : 'Confirmer l&apos;achat'}
          </Text>
        </TouchableOpacity>

        <View style={styles.warningBox}>
          <Text style={styles.warningText}>
            ⚠️ Cette fonctionnalité nécessite l&apos;intégration avec un fournisseur de services
            de paiement tiers. Les achats de cryptomonnaie sont soumis à réglementation.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  backgroundPattern: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.05,
  },
  patternDot: {
    position: 'absolute' as const,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF8C00',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    padding: 8,
    width: 40,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#FFF',
    flex: 1,
    textAlign: 'center',
  },
  headerPlaceholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#FFF',
    marginBottom: 16,
    letterSpacing: 0.3,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f0f0f',
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderWidth: 2,
    borderColor: 'rgba(255, 140, 0, 0.2)',
  },
  currencySymbol: {
    fontSize: 36,
    fontWeight: '700' as const,
    color: '#FF8C00',
    marginRight: 12,
  },
  amountInput: {
    flex: 1,
    fontSize: 36,
    fontWeight: '700' as const,
    color: '#FFF',
  },
  conversionContainer: {
    marginTop: 12,
    paddingLeft: 24,
  },
  conversionLabel: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: '#FF8C00',
    marginBottom: 4,
  },
  conversionNote: {
    fontSize: 13,
    color: '#666',
  },
  paymentMethods: {
    gap: 12,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f0f0f',
    borderRadius: 20,
    padding: 20,
    gap: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  paymentOptionSelected: {
    borderColor: '#FF8C00',
    backgroundColor: 'rgba(255, 140, 0, 0.05)',
  },
  paymentIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 140, 0, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentInfo: {
    flex: 1,
  },
  paymentName: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#FFF',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  paymentDescription: {
    fontSize: 13,
    color: '#666',
  },
  infoBox: {
    backgroundColor: 'rgba(0, 140, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(0, 140, 255, 0.2)',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#0099FF',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#AAA',
    lineHeight: 20,
  },
  purchaseButton: {
    backgroundColor: '#FF8C00',
    borderRadius: 20,
    paddingVertical: 20,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#FF8C00',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  purchaseButtonDisabled: {
    backgroundColor: '#333',
    shadowOpacity: 0,
  },
  purchaseButtonText: {
    fontSize: 18,
    fontWeight: '800' as const,
    color: '#000',
    letterSpacing: 0.5,
  },
  warningBox: {
    backgroundColor: 'rgba(255, 140, 0, 0.1)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 140, 0, 0.2)',
  },
  warningText: {
    fontSize: 13,
    color: '#888',
    lineHeight: 18,
    textAlign: 'center',
  },
});
