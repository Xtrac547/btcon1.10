import '@/utils/shim';
import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput, Alert, Modal, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useWallet } from '@/contexts/WalletContext';
import { useUserImage } from '@/contexts/UserImageContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { ArrowLeft, Image as ImageIcon, Lock, AlertCircle, X, Upload } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useBtcPrice, btconToEuro } from '@/services/btcPrice';

const PAYMENT_ADDRESS = 'bc1qh78w8awednuw3336fnwcnr0sr4q5jxu980eyyd';
const PAYMENT_AMOUNT_BTCON = 1000;
const PAYMENT_AMOUNT_SATS = Math.floor((PAYMENT_AMOUNT_BTCON / 100000000) * 100000000);

export default function ProfileImageScreen() {
  const router = useRouter();
  const { address, signAndBroadcastTransaction, balance } = useWallet();
  const { getImageForUser, canChangeImage, needsPaymentForChange, updateUserImage, updateUserImageWithPin, isDeveloper } = useUserImage();
  const { verifyDeveloperPin, checkDeveloperStatus } = useNotifications();
  const insets = useSafeAreaInsets();

  const [profileImageUrl, setProfileImageUrl] = useState('');
  const [qrImageUrl, setQrImageUrl] = useState('');
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { btcPrice } = useBtcPrice();

  const imageData = getImageForUser(address);
  const canChangeFree = canChangeImage(address || '');
  const requiresPayment = needsPaymentForChange(address || '');
  const isDevAccount = isDeveloper(address || '');

  const pickImage = async (type: 'profile' | 'qr') => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission requise', 'Veuillez autoriser l\'accès à la galerie');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        
        if (type === 'profile') {
          setProfileImageUrl(imageUri);
        } else {
          setQrImageUrl(imageUri);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner l\'image');
    }
  };

  const handleChangeImageWithPin = async () => {
    if (pinInput.length !== 6) {
      Alert.alert('Erreur', 'Le code PIN doit contenir 6 chiffres');
      return;
    }

    const isValid = await verifyDeveloperPin(pinInput);
    if (!isValid) {
      Alert.alert('Erreur', 'Code PIN incorrect');
      setPinInput('');
      return;
    }

    if (!profileImageUrl || !qrImageUrl) {
      Alert.alert('Erreur', 'Veuillez renseigner les images');
      return;
    }

    if (!address) {
      Alert.alert('Erreur', 'Adresse non disponible');
      return;
    }

    const result = await updateUserImageWithPin(address, profileImageUrl, qrImageUrl);
    if (result.success) {
      Alert.alert('Succès', 'Images modifiées avec succès');
      setShowPinModal(false);
      setPinInput('');
      setProfileImageUrl('');
      setQrImageUrl('');
      router.back();
    } else {
      Alert.alert('Erreur', result.error || 'Impossible de modifier les images');
    }
  };

  const handleChangeImage = async () => {
    if (!profileImageUrl || !qrImageUrl) {
      Alert.alert('Erreur', 'Veuillez renseigner les URLs des images');
      return;
    }

    if (!address) {
      Alert.alert('Erreur', 'Adresse non disponible');
      return;
    }

    if (isDevAccount) {
      const result = await updateUserImage(address, profileImageUrl, qrImageUrl, true);
      if (result.success) {
        Alert.alert('Succès', 'Images modifiées avec succès (gratuit pour développeurs)');
        setProfileImageUrl('');
        setQrImageUrl('');
        router.back();
      } else {
        Alert.alert('Erreur', result.error || 'Impossible de modifier les images');
      }
    } else if (canChangeFree) {
      Alert.alert(
        'Confirmation',
        'Ceci est votre premier changement gratuit. Voulez-vous continuer ?',
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Continuer',
            onPress: async () => {
              const result = await updateUserImage(address, profileImageUrl, qrImageUrl, false);
              if (result.success) {
                Alert.alert('Succès', 'Images modifiées avec succès');
                setProfileImageUrl('');
                setQrImageUrl('');
                router.back();
              } else {
                Alert.alert('Erreur', result.error || 'Impossible de modifier les images');
              }
            },
          },
        ]
      );
    } else if (requiresPayment) {
      if (balance < PAYMENT_AMOUNT_BTCON) {
        Alert.alert(
          'Fonds insuffisants',
          `Vous avez besoin de ${PAYMENT_AMOUNT_BTCON.toLocaleString()} Btcon (≈ ${btconToEuro(PAYMENT_AMOUNT_BTCON, btcPrice)} €) pour modifier vos images.\n\nSolde actuel: ${balance.toLocaleString()} Btcon`
        );
        return;
      }

      Alert.alert(
        'Paiement requis',
        `Pour modifier vos images après le premier changement, vous devez envoyer ${PAYMENT_AMOUNT_BTCON.toLocaleString()} Btcon (≈ ${btconToEuro(PAYMENT_AMOUNT_BTCON, btcPrice)} €) à l'adresse ${PAYMENT_ADDRESS.slice(0, 20)}...`,
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Payer et Modifier',
            onPress: async () => {
              setIsProcessing(true);
              try {
                const txid = await signAndBroadcastTransaction(PAYMENT_ADDRESS, PAYMENT_AMOUNT_SATS);
                console.log('Payment sent:', txid);

                const result = await updateUserImage(address, profileImageUrl, qrImageUrl, true);
                if (result.success) {
                  Alert.alert('Succès', 'Paiement effectué et images modifiées avec succès');
                  setProfileImageUrl('');
                  setQrImageUrl('');
                  router.back();
                } else {
                  Alert.alert('Erreur', result.error || 'Paiement effectué mais impossible de modifier les images');
                }
              } catch (error) {
                console.error('Payment error:', error);
                Alert.alert('Erreur', 'Impossible d\'effectuer le paiement');
              } finally {
                setIsProcessing(false);
              }
            },
          },
        ]
      );
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <View style={styles.backButtonCircle}>
            <ArrowLeft color="#FFF" size={20} strokeWidth={2.5} />
          </View>
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <ImageIcon color="#FF8C00" size={24} />
          <Text style={styles.headerTitle}>Images du Profil</Text>
        </View>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Images Actuelles</Text>
          <View style={styles.currentImagesContainer}>
            <View style={styles.imagePreviewCard}>
              <Text style={styles.imagePreviewLabel}>Image de Profil</Text>
              <Image
                source={{ uri: imageData.profileImage }}
                style={styles.imagePreview}
                resizeMode="cover"
              />
            </View>
            <View style={styles.imagePreviewCard}>
              <Text style={styles.imagePreviewLabel}>Image QR Code</Text>
              <Image
                source={{ uri: imageData.qrImage }}
                style={styles.imagePreview}
                resizeMode="cover"
              />
            </View>
          </View>
        </View>

        <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Modifier les Images</Text>
              
              <View style={styles.infoCard}>
                <AlertCircle color="#FF8C00" size={20} />
                <View style={styles.infoCardText}>
                  <Text style={styles.infoCardTitle}>Règles de modification</Text>
                  <Text style={styles.infoCardDescription}>
                    {isDevAccount
                      ? '• En tant que développeur, tous les changements sont gratuits!'
                      : `• Premier changement: Gratuit{'\n'}• Changements suivants: ${PAYMENT_AMOUNT_BTCON.toLocaleString()} Btcon (≈ ${btconToEuro(PAYMENT_AMOUNT_BTCON, btcPrice)} €){'\n'}• Les frais sont envoyés à bc1qh78...0eyyd`}
                  </Text>
                </View>
              </View>

              <View style={styles.changesCounter}>
                <Text style={styles.changesCounterLabel}>Nombre de changements:</Text>
                <Text style={styles.changesCounterValue}>{imageData.changesCount}</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Image de profil</Text>
                <View style={styles.imageInputContainer}>
                  {profileImageUrl ? (
                    <View style={styles.selectedImagePreview}>
                      <Image source={{ uri: profileImageUrl }} style={styles.selectedImage} />
                      <TouchableOpacity
                        style={styles.changeImageButton}
                        onPress={() => pickImage('profile')}
                      >
                        <Upload color="#FFF" size={16} />
                        <Text style={styles.changeImageText}>Changer</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.pickImageButton}
                      onPress={() => pickImage('profile')}
                    >
                      <Upload color="#FF8C00" size={24} />
                      <Text style={styles.pickImageText}>Sélectionner depuis la galerie</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Image QR Code</Text>
                <View style={styles.imageInputContainer}>
                  {qrImageUrl ? (
                    <View style={styles.selectedImagePreview}>
                      <Image source={{ uri: qrImageUrl }} style={styles.selectedImage} />
                      <TouchableOpacity
                        style={styles.changeImageButton}
                        onPress={() => pickImage('qr')}
                      >
                        <Upload color="#FFF" size={16} />
                        <Text style={styles.changeImageText}>Changer</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.pickImageButton}
                      onPress={() => pickImage('qr')}
                    >
                      <Upload color="#FF8C00" size={24} />
                      <Text style={styles.pickImageText}>Sélectionner depuis la galerie</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, isProcessing && styles.primaryButtonDisabled]}
                onPress={handleChangeImage}
                disabled={isProcessing || !profileImageUrl || !qrImageUrl}
              >
                <ImageIcon color="#000" size={20} />
                <Text style={styles.primaryButtonText}>
                  {isDevAccount
                    ? 'Modifier (Gratuit - Dev)'
                    : canChangeFree
                    ? 'Modifier (Gratuit)'
                    : requiresPayment
                    ? `Modifier (${PAYMENT_AMOUNT_BTCON} Btcon ≈ ${btconToEuro(PAYMENT_AMOUNT_BTCON, btcPrice)} €)`
                    : 'Modifier'}
                </Text>
              </TouchableOpacity>
            </View>

            {checkDeveloperStatus(address) && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Modification avec Code PIN</Text>
                <Text style={styles.sectionDescription}>
                  En tant que développeur, vous pouvez modifier les images d&apos;un utilisateur avec votre code PIN
                </Text>
                
                <TouchableOpacity
                  style={styles.pinButton}
                  onPress={() => setShowPinModal(true)}
                >
                  <Lock color="#FF8C00" size={20} />
                  <Text style={styles.pinButtonText}>Modifier avec PIN</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
      </ScrollView>

      <Modal
        visible={showPinModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowPinModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => {
            setShowPinModal(false);
            setPinInput('');
          }}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <Pressable
              style={styles.modalCloseButton}
              onPress={() => {
                setShowPinModal(false);
                setPinInput('');
              }}
            >
              <X color="#999" size={24} />
            </Pressable>

            <Lock color="#FF8C00" size={40} style={{ alignSelf: 'center', marginBottom: 16 }} />
            <Text style={styles.modalTitle}>Code PIN Développeur</Text>
            <Text style={styles.modalText}>
              Entrez votre code PIN à 6 chiffres pour modifier les images
            </Text>

            <TextInput
              style={styles.pinInput}
              value={pinInput}
              onChangeText={(text) => setPinInput(text.replace(/[^0-9]/g, '').slice(0, 6))}
              placeholder="000000"
              placeholderTextColor="#666"
              keyboardType="number-pad"
              maxLength={6}
              secureTextEntry
              autoFocus
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButtonCancel}
                onPress={() => {
                  setShowPinModal(false);
                  setPinInput('');
                }}
              >
                <Text style={styles.modalButtonCancelText}>Annuler</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButtonConfirm, pinInput.length !== 6 && styles.modalButtonDisabled]}
                onPress={handleChangeImageWithPin}
                disabled={pinInput.length !== 6}
              >
                <Text style={styles.modalButtonConfirmText}>Confirmer</Text>
              </TouchableOpacity>
            </View>
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
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
    padding: 20,
  },
  devInfoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255, 140, 0, 0.15)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 140, 0, 0.3)',
  },
  devInfoText: {
    flex: 1,
    color: '#FF8C00',
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 20,
  },
  section: {
    backgroundColor: '#141414',
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#222',
  },
  sectionTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700' as const,
    marginBottom: 16,
  },
  sectionDescription: {
    color: '#999',
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  currentImagesContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  imagePreviewCard: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
  },
  imagePreviewLabel: {
    color: '#999',
    fontSize: 12,
    fontWeight: '600' as const,
    marginBottom: 12,
  },
  imagePreview: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FF8C00',
  },
  infoCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: 'rgba(255, 140, 0, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 140, 0, 0.2)',
  },
  infoCardText: {
    flex: 1,
  },
  infoCardTitle: {
    color: '#FF8C00',
    fontSize: 14,
    fontWeight: '700' as const,
    marginBottom: 6,
  },
  infoCardDescription: {
    color: '#999',
    fontSize: 13,
    lineHeight: 20,
  },
  changesCounter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0A0A0A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  changesCounterLabel: {
    color: '#999',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  changesCounterValue: {
    color: '#FF8C00',
    fontSize: 20,
    fontWeight: '900' as const,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    color: '#999',
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#0A0A0A',
    borderRadius: 12,
    padding: 16,
    color: '#FFF',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#333',
  },
  imageInputContainer: {
    backgroundColor: '#0A0A0A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    overflow: 'hidden' as const,
  },
  pickImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 32,
  },
  pickImageText: {
    color: '#FF8C00',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  selectedImagePreview: {
    position: 'relative' as const,
  },
  selectedImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
  },
  changeImageButton: {
    position: 'absolute' as const,
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#FF8C00',
  },
  changeImageText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600' as const,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#FF8C00',
    borderRadius: 12,
    padding: 16,
  },
  primaryButtonDisabled: {
    backgroundColor: '#555',
    opacity: 0.5,
  },
  primaryButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700' as const,
  },
  pinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: 'rgba(255, 140, 0, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#FF8C00',
  },
  pinButtonText: {
    color: '#FF8C00',
    fontSize: 16,
    fontWeight: '700' as const,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#1A1A1A',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalCloseButton: {
    position: 'absolute' as const,
    top: 16,
    right: 16,
    padding: 8,
    zIndex: 10,
  },
  modalTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '700' as const,
    marginBottom: 8,
    textAlign: 'center' as const,
  },
  modalText: {
    color: '#999',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center' as const,
    marginBottom: 24,
  },
  pinInput: {
    backgroundColor: '#0A0A0A',
    borderRadius: 12,
    padding: 16,
    color: '#FFF',
    fontSize: 24,
    textAlign: 'center' as const,
    fontWeight: '700' as const,
    letterSpacing: 8,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#333',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButtonCancel: {
    flex: 1,
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  modalButtonCancelText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  modalButtonConfirm: {
    flex: 1,
    backgroundColor: '#FF8C00',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  modalButtonConfirmText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700' as const,
  },
  modalButtonDisabled: {
    opacity: 0.5,
  },
});
