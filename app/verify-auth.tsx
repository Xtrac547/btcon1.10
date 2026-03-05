import { useState, useEffect } from 'react';
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

export default function VerifyAuthScreen() {
  const router = useRouter();
  const { useBiometric, verifyPin, verifyBiometric, resetPinWithBiometric, authType } = useAuth();
  const [pin, setPin] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [showBiometric, setShowBiometric] = useState(false);
  const [showResetPin, setShowResetPin] = useState(false);
  const [newPin, setNewPin] = useState<string>('');
  const [confirmNewPin, setConfirmNewPin] = useState<string>('');
  const [resetStep, setResetStep] = useState<'verify' | 'enter-pin' | 'confirm-pin'>('verify');

  useEffect(() => {
    if (authType === 'biometric' || useBiometric) {
      setShowBiometric(true);
    }
  }, [useBiometric, authType]);

  const handleBiometricAuth = async () => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    setIsLoading(true);
    setError('');

    try {
      const success = await verifyBiometric();
      if (success) {
        console.log('Biometric auth successful, redirecting to index');
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        router.replace('/');
      } else {
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
        setError('Authentification échouée. Utilisez votre code PIN.');
        setShowBiometric(false);
      }
    } catch (error) {
      console.error('Biometric auth error:', error);
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      setError('Erreur. Utilisez votre code PIN.');
      setShowBiometric(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePinSubmit = async () => {
    if (pin.length < 4 || pin.length > 6) {
      setError('Le code PIN doit contenir entre 4 et 6 chiffres');
      return;
    }

    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    setIsLoading(true);
    setError('');

    try {
      const success = await verifyPin(pin);
      if (success) {
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        console.log('PIN auth successful, redirecting to index');
        router.replace('/');
      } else {
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
        setError('Code PIN incorrect');
        setPin('');
      }
    } catch (error) {
      console.error('PIN verification error:', error);
      setError('Erreur lors de la vérification');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePinChange = (text: string) => {
    const numericText = text.replace(/[^0-9]/g, '');
    if (numericText.length <= 6) {
      setPin(numericText);
      setError('');
    }
  };



  const handleResetPinWithBio = async () => {
    setIsLoading(true);
    setError('');

    try {
      const success = await verifyBiometric();
      if (success) {
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        setResetStep('enter-pin');
      } else {
        setError('Authentification échouée');
      }
    } catch (error) {
      console.error('Biometric verification error:', error);
      setError('Erreur lors de la vérification');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewPinSubmit = () => {
    if (newPin.length < 4 || newPin.length > 6) {
      setError('Le code PIN doit contenir entre 4 et 6 chiffres');
      return;
    }

    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    setResetStep('confirm-pin');
    setError('');
  };

  const handleConfirmNewPinSubmit = async () => {
    if (confirmNewPin !== newPin) {
      setError('Les codes PIN ne correspondent pas');
      setConfirmNewPin('');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const success = await resetPinWithBiometric(newPin);
      if (success) {
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        setShowResetPin(false);
        setNewPin('');
        setConfirmNewPin('');
        setResetStep('verify');
        setError('');
        setPin('');
      } else {
        setError('Erreur lors de la réinitialisation');
      }
    } catch (error) {
      console.error('Reset PIN error:', error);
      setError('Erreur lors de la réinitialisation');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewPinChange = (text: string, isConfirm: boolean = false) => {
    const numericText = text.replace(/[^0-9]/g, '');
    if (numericText.length <= 6) {
      if (isConfirm) {
        setConfirmNewPin(numericText);
      } else {
        setNewPin(numericText);
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

  if (showResetPin) {
    if (resetStep === 'verify') {
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
            <Text style={styles.title}>Réinitialiser le code PIN</Text>
            <Text style={styles.subtitle}>
              Utilisez votre empreinte digitale pour réinitialiser votre code PIN
            </Text>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.button}
                onPress={handleResetPinWithBio}
                activeOpacity={0.85}
              >
                <Text style={styles.buttonText}>Authentifier avec biométrie</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={() => {
                  setShowResetPin(false);
                  setResetStep('verify');
                  setError('');
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.secondaryButtonText}>Annuler</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      );
    }

    if (resetStep === 'enter-pin') {
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
            <Text style={styles.title}>Nouveau code PIN</Text>
            <Text style={styles.subtitle}>Entrez un nouveau code (4-6 chiffres)</Text>

            <View style={styles.pinInputContainer}>
              <TextInput
                style={styles.pinInput}
                value={newPin}
                onChangeText={(text) => handleNewPinChange(text, false)}
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
                style={[styles.button, (newPin.length < 4 || newPin.length > 6) && styles.buttonDisabled]}
                onPress={handleNewPinSubmit}
                disabled={newPin.length < 4 || newPin.length > 6}
                activeOpacity={0.85}
              >
                <Text style={styles.buttonText}>Continuer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      );
    }

    if (resetStep === 'confirm-pin') {
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
                value={confirmNewPin}
                onChangeText={(text) => handleNewPinChange(text, true)}
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
                style={[styles.button, (confirmNewPin.length < 4 || confirmNewPin.length > 6) && styles.buttonDisabled]}
                onPress={handleConfirmNewPinSubmit}
                disabled={confirmNewPin.length < 4 || confirmNewPin.length > 6}
                activeOpacity={0.85}
              >
                <Text style={styles.buttonText}>Confirmer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      );
    }
  }



  return (
    <View style={styles.container}>
      <View style={styles.backgroundGlow}>
        <View style={[styles.glowCircle, { top: -80, right: -80 }]} />
        <View style={[styles.glowCircle, { bottom: -80, left: -80 }]} />
      </View>
      <View style={styles.content}>
        {showBiometric ? (
          <>
            <View style={styles.iconContainer}>
              <Fingerprint size={72} color="#FF8C00" strokeWidth={1.5} />
            </View>
            <Text style={styles.title}>Authentification requise</Text>
            <Text style={styles.subtitle}>{authType === 'biometric' ? 'Utilisez votre empreinte ou Face ID' : 'Utilisez votre empreinte ou Face ID'}</Text>
            
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.button}
                onPress={handleBiometricAuth}
                activeOpacity={0.85}
              >
                <Text style={styles.buttonText}>Réessayer la biométrie</Text>
              </TouchableOpacity>

              {(authType === 'pin' || authType === 'pin-biometric') && (
                <TouchableOpacity
                  style={[styles.button, styles.secondaryButton]}
                  onPress={() => setShowBiometric(false)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.secondaryButtonText}>Utiliser le code PIN</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        ) : (
          <>
            {authType === 'biometric' ? (
              <>
                <View style={styles.iconContainer}>
                  <Fingerprint size={72} color="#FF8C00" strokeWidth={1.5} />
                </View>
                <Text style={styles.title}>Authentification requise</Text>
                <Text style={styles.subtitle}>Utilisez votre empreinte ou Face ID</Text>
                
                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                <View style={styles.buttonContainer}>
                  <TouchableOpacity
                    style={styles.button}
                    onPress={handleBiometricAuth}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.buttonText}>Authentifier</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <View style={styles.lockIconContainer}>
                  <View style={styles.lockIconCircle}>
                    <Text style={styles.lockIcon}>🔒</Text>
                  </View>
                </View>
                <Text style={styles.title}>Entrez votre code PIN</Text>
                <Text style={styles.subtitle}>Entrez votre code (4-6 chiffres)</Text>

            <View style={styles.pinInputContainer}>
              <TextInput
                style={styles.pinInput}
                value={pin}
                onChangeText={handlePinChange}
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
                <Text style={styles.buttonText}>Confirmer</Text>
              </TouchableOpacity>
            </View>

            {useBiometric && (
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.button, styles.secondaryButton]}
                  onPress={() => setShowBiometric(true)}
                  activeOpacity={0.85}
                >
                  <Fingerprint size={20} color="#FF8C00" strokeWidth={2} />
                  <Text style={styles.secondaryButtonText}>Utiliser la biométrie</Text>
                </TouchableOpacity>
              </View>
            )}

                {authType === 'pin-biometric' && (
                  <TouchableOpacity
                    style={styles.forgotPinButton}
                    onPress={() => {
                      if (Platform.OS !== 'web') {
                        Haptics.selectionAsync();
                      }
                      setShowResetPin(true);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.forgotPinText}>Code oublié ?</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </>
        )}
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
  buttonContainer: {
    width: '100%',
    gap: 12,
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
  secondaryButton: {
    backgroundColor: 'rgba(255, 140, 0, 0.08)',
    borderWidth: 2,
    borderColor: 'rgba(255, 140, 0, 0.3)',
    flexDirection: 'row' as const,
    gap: 10,
    shadowOpacity: 0,
  },
  secondaryButtonText: {
    color: '#FF8C00',
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
  forgotPinButton: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  forgotPinText: {
    color: '#FF8C00',
    fontSize: 15,
    fontWeight: '700' as const,
    textAlign: 'center',
    textDecorationLine: 'underline' as const,
  },
});
