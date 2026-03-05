import '@/utils/shim';
import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, Alert, Pressable, useWindowDimensions, Modal, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useWallet } from '@/contexts/WalletContext';
import { useAuth } from '@/contexts/AuthContext';
import { useDeveloperHierarchy } from '@/contexts/DeveloperHierarchyContext';
import { ArrowLeft, Eye, EyeOff, Shield, LogOut, Lock, AlertCircle, X, Key, Fingerprint } from 'lucide-react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SettingsScreen() {
  const router = useRouter();
  const { mnemonic, deleteWallet, address } = useWallet();
  const { isAuthConfigured, authType, useBiometric: biometricEnabled, isBiometricAvailable, resetAuth, toggleBiometric, changePin } = useAuth();
  const { isDeveloper } = useDeveloperHierarchy();
  const [showSeed, setShowSeed] = useState(false);
  const [showChangePinModal, setShowChangePinModal] = useState(false);
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');
  const [pinError, setPinError] = useState('');
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isWideScreen = width > 768;

  const handleShowSeed = async () => {
    if (showSeed) {
      setShowSeed(false);
      return;
    }

    if (Platform.OS !== 'web') {
      try {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();

        if (hasHardware && isEnrolled) {
          const result = await LocalAuthentication.authenticateAsync({
            promptMessage: 'Authenticate to view recovery phrase',
            fallbackLabel: 'Use passcode',
          });

          if (!result.success) {
            return;
          }
        }
      } catch (error) {
        console.error('Authentication error:', error);
      }
    }

    setShowSeed(true);
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Êtes-vous sûr de vouloir vous déconnecter ? Vous devrez utiliser votre phrase de récupération pour vous reconnecter.');
      if (confirmed) {
        deleteWallet();
        router.replace('/onboarding');
      }
    } else {
      Alert.alert(
        'Se déconnecter',
        'Êtes-vous sûr de vouloir vous déconnecter ? Vous devrez utiliser votre phrase de récupération pour vous reconnecter.',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Se déconnecter', style: 'destructive', onPress: () => { deleteWallet(); router.replace('/onboarding'); } },
        ]
      );
    }
  };

  const words = mnemonic?.split(' ') || [];

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <View style={styles.backButtonCircle}>
            <ArrowLeft color="#FFF" size={20} strokeWidth={2.5} />
          </View>
        </Pressable>
        <Text style={styles.headerTitle}>Paramètres</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40, maxWidth: isWideScreen ? 700 : width, width: '100%', alignSelf: 'center' }]}>

        <View style={styles.settingsCard}>
          <View style={styles.securitySection}>
            <View style={styles.securityHeader}>
              <View style={styles.iconContainer}>
                <Lock color="#FF8C00" size={24} strokeWidth={2} />
              </View>
              <View style={styles.securityHeaderText}>
                <Text style={styles.securityTitle}>Phrase de Récupération</Text>
                <Text style={styles.securitySubtitle}>Accès sécurisé à votre wallet</Text>
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [styles.actionButton, styles.primaryButton, pressed && styles.buttonPressed]}
              onPress={handleShowSeed}
              testID="toggle-seed-button"
            >
              <View style={styles.buttonContent}>
                {showSeed ? <EyeOff color="#FFF" size={20} strokeWidth={2.5} /> : <Eye color="#FFF" size={20} strokeWidth={2.5} />}
                <Text style={styles.primaryButtonText}>{showSeed ? 'Masquer' : 'Afficher'}</Text>
              </View>
            </Pressable>
          </View>

          {showSeed && mnemonic && (
            <View style={styles.seedRevealCard}>
              <View style={styles.warningBanner}>
                <AlertCircle color="#FF8C00" size={18} strokeWidth={2.5} />
                <Text style={styles.warningText}>Ne partagez jamais cette phrase</Text>
              </View>
              <View style={styles.wordsGrid}>
                {words.map((word, index) => (
                  <View key={index} style={styles.wordChip}>
                    <Text style={styles.wordIndex}>{index + 1}</Text>
                    <Text style={styles.wordValue}>{word}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        {isAuthConfigured && (
          <View style={styles.authCard}>
            <View style={styles.authHeader}>
              <View style={styles.iconContainer}>
                <Key color="#FF8C00" size={24} strokeWidth={2} />
              </View>
              <View style={styles.securityHeaderText}>
                <Text style={styles.securityTitle}>Authentification</Text>
                <Text style={styles.securitySubtitle}>
                  {authType === 'none' ? 'Aucune sécurité activée' : 'Gérer votre code PIN et biométrie'}
                </Text>
              </View>
            </View>

            <View style={styles.authOptions}>
              {authType === 'none' && (
                <Pressable
                  style={({ pressed }) => [styles.authOptionButton, pressed && styles.buttonPressed]}
                  onPress={() => router.push('/setup-auth')}
                >
                  <View style={styles.authOptionContent}>
                    <Key color="#FFF" size={20} strokeWidth={2} />
                    <Text style={styles.authOptionText}>Configurer la sécurité</Text>
                  </View>
                </Pressable>
              )}
              {authType !== 'none' && authType !== 'biometric' && (
                <Pressable
                  style={({ pressed }) => [styles.authOptionButton, pressed && styles.buttonPressed]}
                  onPress={() => setShowChangePinModal(true)}
                >
                  <View style={styles.authOptionContent}>
                    <Key color="#FFF" size={20} strokeWidth={2} />
                    <Text style={styles.authOptionText}>Modifier le code PIN</Text>
                  </View>
                </Pressable>
              )}
              {isBiometricAvailable && authType !== 'none' && authType !== 'biometric' && (
                <Pressable
                  style={({ pressed }) => [styles.authOptionButton, biometricEnabled && styles.authOptionButtonActive, pressed && styles.buttonPressed]}
                  onPress={() => toggleBiometric(!biometricEnabled)}
                >
                  <View style={styles.authOptionContent}>
                    <Fingerprint color={biometricEnabled ? "#FF8C00" : "#FFF"} size={20} strokeWidth={2} />
                    <Text style={[styles.authOptionText, biometricEnabled && styles.authOptionTextActive]}>
                      {biometricEnabled ? 'Biométrie activée' : 'Activer la biométrie'}
                    </Text>
                  </View>
                </Pressable>
              )}
              {authType !== 'none' && (
                <Pressable
                  style={({ pressed }) => [styles.authOptionButton, styles.dangerButton, pressed && styles.dangerButtonPressed]}
                  onPress={() => {
                    if (Platform.OS === 'web') {
                      const confirmed = window.confirm('Êtes-vous sûr de vouloir désactiver l\'authentification ?');
                      if (confirmed) resetAuth();
                    } else {
                      Alert.alert('Désactiver', 'Êtes-vous sûr ?', [
                        { text: 'Annuler', style: 'cancel' },
                        { text: 'Désactiver', style: 'destructive', onPress: () => resetAuth() },
                      ]);
                    }
                  }}
                >
                  <View style={styles.authOptionContent}>
                    <AlertCircle color="#FF4444" size={20} strokeWidth={2} />
                    <Text style={styles.dangerButtonText}>Désactiver l'authentification</Text>
                  </View>
                </Pressable>
              )}
            </View>
          </View>
        )}

        <View style={styles.dangerZone}>
          <View style={styles.dangerHeader}>
            <AlertCircle color="#FF4444" size={20} strokeWidth={2.5} />
            <Text style={styles.dangerTitle}>Zone Sensible</Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.actionButton, styles.dangerButton, pressed && styles.dangerButtonPressed]}
            onPress={handleLogout}
            testID="logout-button"
          >
            <View style={styles.buttonContent}>
              <LogOut color="#FF4444" size={20} strokeWidth={2.5} />
              <Text style={styles.dangerButtonText}>Se Déconnecter</Text>
            </View>
          </Pressable>
          <Text style={styles.dangerHint}>Vous devrez utiliser votre phrase de récupération pour vous reconnecter</Text>
        </View>

        {isDeveloper(address || '') && (
          <Pressable style={styles.adminCard} onPress={() => router.push('/developer-hierarchy')}>
            <View style={styles.adminCardHeader}>
              <View style={styles.adminCardIcon}>
                <Shield color="#FFD700" size={20} />
              </View>
              <Text style={styles.adminCardTitle}>Mode Admin</Text>
            </View>
            <Text style={styles.adminCardDescription}>Gérer les utilisateurs et les paramètres système</Text>
          </Pressable>
        )}

        <View style={styles.footer}>
          <Shield color="#333" size={16} />
          <Text style={styles.footerText}>Btcon Wallet • Sécurisé & Décentralisé</Text>
        </View>
      </ScrollView>

      <Modal
        visible={showChangePinModal}
        animationType="slide"
        transparent
        onRequestClose={() => { setShowChangePinModal(false); setOldPin(''); setNewPin(''); setConfirmNewPin(''); setPinError(''); }}
      >
        <Pressable style={styles.modalOverlay} onPress={() => { setShowChangePinModal(false); setOldPin(''); setNewPin(''); setConfirmNewPin(''); setPinError(''); }}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Modifier le code PIN</Text>
              <Pressable onPress={() => { setShowChangePinModal(false); setOldPin(''); setNewPin(''); setConfirmNewPin(''); setPinError(''); }}>
                <X color="#999" size={24} />
              </Pressable>
            </View>
            <View style={styles.pinInputGroup}>
              <Text style={styles.pinInputLabel}>Code PIN actuel</Text>
              <TextInput style={styles.pinTextInput} value={oldPin} onChangeText={(text) => { const n = text.replace(/[^0-9]/g, ''); if (n.length <= 6) { setOldPin(n); setPinError(''); } }} placeholder="Entrez votre code actuel" placeholderTextColor="#666" keyboardType="number-pad" maxLength={6} secureTextEntry autoFocus />
            </View>
            <View style={styles.pinInputGroup}>
              <Text style={styles.pinInputLabel}>Nouveau code PIN</Text>
              <TextInput style={styles.pinTextInput} value={newPin} onChangeText={(text) => { const n = text.replace(/[^0-9]/g, ''); if (n.length <= 6) { setNewPin(n); setPinError(''); } }} placeholder="Entrez le nouveau code" placeholderTextColor="#666" keyboardType="number-pad" maxLength={6} secureTextEntry />
            </View>
            <View style={styles.pinInputGroup}>
              <Text style={styles.pinInputLabel}>Confirmer le nouveau code</Text>
              <TextInput style={styles.pinTextInput} value={confirmNewPin} onChangeText={(text) => { const n = text.replace(/[^0-9]/g, ''); if (n.length <= 6) { setConfirmNewPin(n); setPinError(''); } }} placeholder="Confirmez le nouveau code" placeholderTextColor="#666" keyboardType="number-pad" maxLength={6} secureTextEntry />
            </View>
            {pinError ? <Text style={styles.pinErrorText}>{pinError}</Text> : null}
            <Pressable
              style={[styles.modalButton, (oldPin.length !== 6 || newPin.length !== 6 || confirmNewPin.length !== 6) && styles.modalButtonDisabled]}
              disabled={oldPin.length !== 6 || newPin.length !== 6 || confirmNewPin.length !== 6}
              onPress={async () => {
                if (newPin !== confirmNewPin) { setPinError('Les codes PIN ne correspondent pas'); return; }
                try {
                  const success = await changePin(oldPin, newPin);
                  if (success) { setShowChangePinModal(false); setOldPin(''); setNewPin(''); setConfirmNewPin(''); setPinError(''); Alert.alert('Succès', 'Code PIN modifié avec succès'); }
                  else { setPinError('Code PIN actuel incorrect'); }
                } catch (error) { console.error('Error changing PIN:', error); setPinError('Erreur lors de la modification'); }
              }}
            >
              <Text style={styles.modalButtonText}>Modifier</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>


    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#0A0A0A',
  },
  backButton: {
    padding: 4,
  },
  backButtonCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700' as const,
    letterSpacing: 0.5,
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  cardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  settingsCard: {
    backgroundColor: '#141414',
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#222',
  },
  securitySection: {
    marginBottom: 0,
  },
  securityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 140, 0, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 140, 0, 0.2)',
  },
  securityHeaderText: {
    flex: 1,
  },
  securityTitle: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  securitySubtitle: {
    color: '#888',
    fontSize: 13,
    fontWeight: '500' as const,
  },
  actionButton: {
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#FF8C00',
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700' as const,
    letterSpacing: 0.3,
  },
  seedRevealCard: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255, 140, 0, 0.1)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 140, 0, 0.2)',
  },
  warningText: {
    color: '#FF8C00',
    fontSize: 13,
    fontWeight: '600' as const,
    flex: 1,
  },
  wordsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  wordChip: {
    width: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  wordIndex: {
    color: '#FF8C00',
    fontSize: 12,
    fontWeight: '700' as const,
    width: 18,
  },
  wordValue: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600' as const,
    flex: 1,
  },
  authCard: {
    backgroundColor: '#141414',
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#222',
  },
  authHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  authOptions: {
    gap: 12,
  },
  authOptionButton: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  authOptionButtonActive: {
    backgroundColor: 'rgba(255, 140, 0, 0.1)',
    borderColor: 'rgba(255, 140, 0, 0.3)',
  },
  authOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  authOptionText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  authOptionTextActive: {
    color: '#FF8C00',
  },
  dangerZone: {
    backgroundColor: '#141414',
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.2)',
  },
  dangerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  dangerTitle: {
    color: '#FF4444',
    fontSize: 16,
    fontWeight: '700' as const,
    letterSpacing: 0.3,
  },
  dangerButton: {
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    borderWidth: 1.5,
    borderColor: '#FF4444',
  },
  dangerButtonPressed: {
    backgroundColor: 'rgba(255, 68, 68, 0.15)',
  },
  dangerButtonText: {
    color: '#FF4444',
    fontSize: 16,
    fontWeight: '700' as const,
    letterSpacing: 0.3,
  },
  dangerHint: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 16,
  },
  adminCard: {
    backgroundColor: 'rgba(255, 215, 0, 0.05)',
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  adminCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  adminCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  adminCardTitle: {
    color: '#FFD700',
    fontSize: 17,
    fontWeight: '700' as const,
  },
  adminCardDescription: {
    color: 'rgba(255, 215, 0, 0.6)',
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 20,
    paddingBottom: 20,
  },
  footerText: {
    color: '#444',
    fontSize: 12,
    fontWeight: '500' as const,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1A1A1A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '700' as const,
  },

  modalHint: {
    color: '#666',
    fontSize: 13,
    marginBottom: 24,
    lineHeight: 18,
  },
  modalButton: {
    backgroundColor: '#FF8C00',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  modalButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700' as const,
  },
  modalButtonDisabled: {
    opacity: 0.5,
  },
  pinInputGroup: {
    marginBottom: 20,
  },
  pinInputLabel: {
    color: '#999',
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  pinTextInput: {
    backgroundColor: '#0A0A0A',
    borderRadius: 12,
    padding: 16,
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600' as const,
    borderWidth: 1,
    borderColor: '#333',
  },
  pinErrorText: {
    color: '#FF4444',
    fontSize: 14,
    marginBottom: 16,
    marginTop: -12,
    textAlign: 'center',
    fontWeight: '600' as const,
  },
});
