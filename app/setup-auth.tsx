import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Fingerprint } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

export default function SetupAuthScreen() {
  const router = useRouter();
  const { setupPinAuth, isBiometricAvailable } = useAuth();
  const [pin, setPin] = useState<string>('');
  const [confirmPin, setConfirmPin] = useState<string>('');
  const [step, setStep] = useState<'choose-method' | 'enter-pin' | 'confirm-pin' | 'choose-biometric'>('choose-method');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');





  const handlePinSubmit = () => {
    if (pin.length < 4 || pin.length > 6) {
      setError('Le code PIN doit contenir entre 4 et 6 chiffres');
      return;
    }

    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    setStep('confirm-pin');
    setError('');
  };

  const handleConfirmPinSubmit = () => {
    if (confirmPin !== pin) {
      setError('Les codes PIN ne correspondent pas');
      setConfirmPin('');
      return;
    }

    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    
    if (isBiometricAvailable) {
      setStep('choose-biometric');
    } else {
      handleSetupComplete(false);
    }
  };

  const handleSetupComplete = async (enableBiometric: boolean) => {
    setIsLoading(true);
    setError('');

    try {
      await setupPinAuth(pin, enableBiometric);
      console.log('PIN setup complete, redirecting to verify-auth');
      router.replace('/verify-auth');
    } catch (error) {
      console.error('Setup error:', error);
      setError('Erreur lors de la configuration');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkipPin = async () => {
    setIsLoading(true);
    setError('');

    try {
      await setupPinAuth('', true);
      console.log('Biometric-only setup complete');
      router.replace('/');
    } catch (error) {
      console.error('Setup error:', error);
      setError('Erreur lors de la configuration');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNoAuth = async () => {
    setIsLoading(true);
    setError('');

    try {
      await setupPinAuth('', false);
      console.log('No auth setup, can configure later');
      router.replace('/');
    } catch (error) {
      console.error('Setup error:', error);
      setError('Erreur lors de la configuration');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePinChange = (text: string, isConfirm: boolean = false) => {
    const numericText = text.replace(/[^0-9]/g, '');
    if (numericText.length <= 6) {
      if (isConfirm) {
        setConfirmPin(numericText);
      } else {
        setPin(numericText);
      }
      setError('');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#FF8C00" />
      </View>
    );
  }

  if (step === 'choose-method') {
    return (
      <View style={styles.container}>
        <View style={styles.backgroundGlow}>
          <View style={[styles.glowCircle, { top: -80, right: -80 }]} />
          <View style={[styles.glowCircle, { bottom: -80, left: -80 }]} />
        </View>
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Fingerprint size={72} color="#FF8C00" strokeWidth={1.5} />
          </View>
          <Text style={styles.title}>Sécuriser votre wallet</Text>
          <Text style={styles.subtitle}>
            Choisissez votre méthode de sécurité
          </Text>

          <View style={styles.buttonContainer}>
            {isBiometricAvailable && (
              <TouchableOpacity
                style={styles.optionButton}
                onPress={() => {
                  if (Platform.OS !== 'web') {
                    Haptics.selectionAsync();
                  }
                  handleSkipPin();
                }}
                activeOpacity={0.85}
              >
                <Fingerprint size={24} color="#000" strokeWidth={2} />
                <Text style={styles.optionButtonText}>Empreinte digitale uniquement</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.optionButton, !isBiometricAvailable && styles.optionButton]}
              onPress={() => {
                if (Platform.OS !== 'web') {
                  Haptics.selectionAsync();
                }
                setStep('enter-pin');
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.optionButtonText}>Code PIN {isBiometricAvailable ? '+ Empreinte' : ''}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.optionButton, styles.secondaryButton]}
              onPress={() => {
                if (Platform.OS !== 'web') {
                  Haptics.selectionAsync();
                }
                handleNoAuth();
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.secondaryButtonText}>Aucune sécurité</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.configHint}>
            Vous pourrez configurer la sécurité plus tard dans les paramètres
          </Text>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>
      </View>
    );
  }

  if (step === 'choose-biometric') {
    return (
      <View style={styles.container}>
        <View style={styles.backgroundGlow}>
          <View style={[styles.glowCircle, { top: -80, right: -80 }]} />
          <View style={[styles.glowCircle, { bottom: -80, left: -80 }]} />
        </View>
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Fingerprint size={72} color="#FF8C00" strokeWidth={1.5} />
          </View>
          <Text style={styles.title}>Activer la biométrie ?</Text>
          <Text style={styles.subtitle}>
            Vous pourrez utiliser votre empreinte digitale ou Face ID en plus du code PIN
          </Text>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.optionButton}
              onPress={() => {
                if (Platform.OS !== 'web') {
                  Haptics.selectionAsync();
                }
                handleSetupComplete(true);
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.optionButtonText}>Activer la biométrie</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.optionButton, styles.secondaryButton]}
              onPress={() => {
                if (Platform.OS !== 'web') {
                  Haptics.selectionAsync();
                }
                handleSetupComplete(false);
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.secondaryButtonText}>Code PIN uniquement</Text>
            </TouchableOpacity>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>
      </View>
    );
  }

  if (step === 'enter-pin') {
    return (
      <View style={styles.container}>
        <View style={styles.backgroundGlow}>
          <View style={[styles.glowCircle, { top: -80, right: -80 }]} />
          <View style={[styles.glowCircle, { bottom: -80, left: -80 }]} />
        </View>
        <View style={styles.content}>
          <View style={styles.lockIconContainer}>
            <View style={styles.lockIconCircle}>
              <Text style={styles.lockIcon}>🔐</Text>
            </View>
          </View>
          <Text style={styles.title}>Créer un code PIN</Text>
          <Text style={styles.subtitle}>Entrez un code (4-6 chiffres)</Text>

          <View style={styles.pinInputContainer}>
            <TextInput
              style={styles.pinInput}
              value={pin}
              onChangeText={(text) => handlePinChange(text, false)}
              keyboardType="number-pad"
              maxLength={6}
              secureTextEntry
              placeholder="••••••"
              placeholderTextColor="#444"
              autoFocus={true}
            />
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, (pin.length < 4 || pin.length > 6) && styles.buttonDisabled]}
              onPress={handlePinSubmit}
              disabled={pin.length < 4 || pin.length > 6}
              activeOpacity={0.85}
            >
              <Text style={styles.buttonText}>Continuer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.backgroundGlow}>
        <View style={[styles.glowCircle, { top: -80, right: -80 }]} />
        <View style={[styles.glowCircle, { bottom: -80, left: -80 }]} />
      </View>
      <View style={styles.content}>
        <View style={styles.lockIconContainer}>
          <View style={styles.lockIconCircle}>
            <Text style={styles.lockIcon}>✅</Text>
          </View>
        </View>
        <Text style={styles.title}>Confirmer le code PIN</Text>
        <Text style={styles.subtitle}>Entrez à nouveau votre code</Text>

        <View style={styles.pinInputContainer}>
          <TextInput
            style={styles.pinInput}
            value={confirmPin}
            onChangeText={(text) => handlePinChange(text, true)}
            keyboardType="number-pad"
            maxLength={6}
            secureTextEntry
            placeholder="••••••"
            placeholderTextColor="#444"
            autoFocus={true}
          />
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, (confirmPin.length < 4 || confirmPin.length > 6 || confirmPin.length !== pin.length) && styles.buttonDisabled]}
            onPress={handleConfirmPinSubmit}
            disabled={confirmPin.length < 4 || confirmPin.length > 6 || confirmPin.length !== pin.length}
            activeOpacity={0.85}
          >
            <Text style={styles.buttonText}>Confirmer</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
  },
  backgroundGlow: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  glowCircle: {
    position: 'absolute' as const,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: '#FF8C00',
    opacity: 0.06,
  },
  content: {
    padding: 32,
    alignItems: 'center',
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 140, 0, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    borderWidth: 2,
    borderColor: 'rgba(255, 140, 0, 0.2)',
  },
  lockIconContainer: {
    marginBottom: 32,
  },
  lockIconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 140, 0, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 140, 0, 0.2)',
  },
  lockIcon: {
    fontSize: 56,
  },
  title: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: '#FFF',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 15,
    color: '#999',
    marginBottom: 48,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  optionButton: {
    backgroundColor: '#FF8C00',
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF8C00',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  optionButtonText: {
    color: '#000',
    fontSize: 17,
    fontWeight: '800' as const,
    letterSpacing: 0.5,
  },
  secondaryButton: {
    backgroundColor: 'rgba(255, 140, 0, 0.08)',
    borderWidth: 2,
    borderColor: 'rgba(255, 140, 0, 0.3)',
    shadowOpacity: 0,
  },
  secondaryButtonText: {
    color: '#FF8C00',
    fontSize: 17,
    fontWeight: '800' as const,
    letterSpacing: 0.5,
  },
  pinContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 40,
    justifyContent: 'center',
  },
  pinDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#1A1A1A',
    borderWidth: 2,
    borderColor: '#333',
  },
  pinDotFilled: {
    backgroundColor: '#FF8C00',
    borderColor: '#FF8C00',
  },
  pinInputHidden: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },
  button: {
    backgroundColor: '#FF8C00',
    padding: 20,
    borderRadius: 20,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#FF8C00',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  buttonDisabled: {
    opacity: 0.4,
    shadowOpacity: 0.1,
  },
  buttonText: {
    color: '#000',
    fontSize: 17,
    fontWeight: '800' as const,
    letterSpacing: 0.5,
  },
  errorText: {
    color: '#FF4444',
    fontSize: 14,
    marginBottom: 24,
    marginTop: -32,
    textAlign: 'center',
    fontWeight: '600' as const,
  },
  skipButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#333',
    shadowOpacity: 0,
  },
  skipButtonText: {
    color: '#999',
    fontSize: 17,
    fontWeight: '800' as const,
    letterSpacing: 0.5,
  },
  pinInputContainer: {
    width: '100%',
    marginBottom: 32,
  },
  pinInput: {
    backgroundColor: '#1A1A1A',
    borderWidth: 2,
    borderColor: '#333',
    borderRadius: 16,
    padding: 20,
    fontSize: 24,
    color: '#FFF',
    textAlign: 'center' as const,
    fontWeight: '700' as const,
    letterSpacing: 8,
  },
  configHint: {
    color: '#666',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 18,
  },
});
