import '@/utils/shim';
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { useWallet } from '@/contexts/WalletContext';
import { useDeveloperHierarchy, DeveloperEntry, DeveloperPermissionLevel } from '@/contexts/DeveloperHierarchyContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { ArrowLeft, Users, UserPlus, Shield, ChevronDown, Mail } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function DeveloperHierarchyScreen() {
  const router = useRouter();
  const { address } = useWallet();
  const { verifyDeveloperPin } = useNotifications();
  const {
    getAllDevelopers,
    getDeveloperEntry,
    addDeveloper,
    updateDeveloperPermissions,
    canModify,
  } = useDeveloperHierarchy();
  const insets = useSafeAreaInsets();

  const [developers, setDevelopers] = useState<DeveloperEntry[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedDev, setSelectedDev] = useState<DeveloperEntry | null>(null);
  const [newAddress, setNewAddress] = useState('');
  const [newPermissionLevel, setNewPermissionLevel] = useState<DeveloperPermissionLevel>('username_only');
  const [reason, setReason] = useState('');
  const [showPinVerification, setShowPinVerification] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const currentDev = getDeveloperEntry(address || '');

  useEffect(() => {
    loadDevelopers();
  }, [getAllDevelopers]);

  const loadDevelopers = () => {
    const devs = getAllDevelopers();
    setDevelopers(devs);
  };

  const requestPinVerification = (action: () => void) => {
    setPendingAction(() => action);
    setPinInput('');
    setShowPinVerification(true);
  };

  const handleVerifyPin = async () => {
    if (pinInput.length !== 6) {
      Alert.alert('Erreur', 'Le code PIN doit contenir 6 chiffres');
      return;
    }

    const isValid = await verifyDeveloperPin(pinInput);
    if (isValid) {
      setShowPinVerification(false);
      setPinInput('');
      if (pendingAction) {
        pendingAction();
        setPendingAction(null);
      }
    } else {
      Alert.alert('Erreur', 'Code PIN incorrect');
      setPinInput('');
    }
  };

  const handleAddDeveloper = () => {
    if (!newAddress.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer une adresse');
      return;
    }

    if (!reason.trim()) {
      Alert.alert('Erreur', 'Veuillez indiquer la raison de cet ajout');
      return;
    }

    requestPinVerification(async () => {
      const result = await addDeveloper(address || '', newAddress, newPermissionLevel, reason);
      
      if (result.success) {
        Alert.alert('Succès', 'Développeur ajouté avec succès');
        setShowAddModal(false);
        setNewAddress('');
        setReason('');
        loadDevelopers();
      } else {
        Alert.alert('Erreur', result.error);
      }
    });
  };

  const handleEditDeveloper = (dev: DeveloperEntry) => {
    const check = canModify(address || '', dev.address, 'username');
    
    if (!check.canModify) {
      Alert.alert('Action refusée', check.reason);
      return;
    }

    setSelectedDev(dev);
    setNewPermissionLevel(dev.permissionLevel);
    setReason('');
    setShowEditModal(true);
  };

  const handleUpdatePermissions = () => {
    if (!selectedDev) return;

    if (!reason.trim()) {
      Alert.alert('Erreur', 'Veuillez indiquer la raison de cette modification');
      return;
    }

    requestPinVerification(async () => {
      const result = await updateDeveloperPermissions(
        address || '',
        selectedDev.address,
        newPermissionLevel,
        reason
      );

      if (result.success) {
        Alert.alert('Succès', 'Permissions mises à jour');
        setShowEditModal(false);
        setSelectedDev(null);
        setReason('');
        loadDevelopers();
      } else {
        Alert.alert('Erreur', result.error);
      }
    });
  };

  const renderPermissionBadge = (level: DeveloperPermissionLevel) => {
    if (level === 'full') {
      return (
        <View style={styles.permissionBadge}>
          <Text style={styles.permissionBadgeText}>100% Dev</Text>
        </View>
      );
    }
    return (
      <View style={[styles.permissionBadge, styles.permissionBadgePartial]}>
        <Text style={styles.permissionBadgeTextPartial}>Limité</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <View style={styles.backButtonCircle}>
            <ArrowLeft color="#FFF" size={20} strokeWidth={2.5} />
          </View>
        </Pressable>
        <View style={styles.headerTitleContainer}>
          <Users color="#FF8C00" size={24} />
          <Text style={styles.headerTitle}>Hiérarchie Dev</Text>
        </View>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}>
        {currentDev && (
          <View style={styles.currentDevCard}>
            <Text style={styles.currentDevLabel}>Votre niveau</Text>
            <Text style={styles.currentDevLevel}>Niveau {currentDev.level}</Text>
            {renderPermissionBadge(currentDev.permissionLevel)}
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Pyramide des développeurs</Text>
            <Pressable
              style={styles.addButton}
              onPress={() => {
                setShowAddModal(true);
                setNewAddress('');
                setReason('');
              }}
            >
              <UserPlus color="#FFF" size={18} />
            </Pressable>
          </View>

          <View style={styles.hierarchyTree}>
            {developers.map((dev, index) => {
              const isYou = dev.address === address;
              const canEdit = canModify(address || '', dev.address, 'username').canModify;

              return (
                <Pressable
                  key={dev.address}
                  style={[
                    styles.devItem,
                    { marginLeft: dev.level * 20 },
                    isYou && styles.devItemYou,
                  ]}
                  onPress={() => canEdit && handleEditDeveloper(dev)}
                  disabled={!canEdit}
                >
                  <View style={styles.devItemLeft}>
                    <View style={styles.levelBadge}>
                      <Text style={styles.levelBadgeText}>{dev.level}</Text>
                    </View>
                    <View style={styles.devInfo}>
                      <Text style={styles.devAddress} numberOfLines={1}>
                        {dev.address.slice(0, 16)}...{isYou ? ' (Vous)' : ''}
                      </Text>
                      {renderPermissionBadge(dev.permissionLevel)}
                    </View>
                  </View>
                  {canEdit && (
                    <ChevronDown color="#666" size={20} style={{ transform: [{ rotate: '-90deg' }] }} />
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.infoCard}>
          <Mail color="#FF8C00" size={20} />
          <View style={styles.infoCardContent}>
            <Text style={styles.infoCardTitle}>Notifications par email</Text>
            <Text style={styles.infoCardText}>
              Toutes les modifications sont notifiées à mateo.peyskens547@gmail.com
            </Text>
          </View>
        </View>

        <View style={styles.legendCard}>
          <Text style={styles.legendTitle}>Légende</Text>
          <View style={styles.legendItem}>
            <Text style={styles.legendBullet}>•</Text>
            <Text style={styles.legendText}>
              Plus le niveau est bas, plus vous avez de permissions
            </Text>
          </View>
          <View style={styles.legendItem}>
            <Text style={styles.legendBullet}>•</Text>
            <Text style={styles.legendText}>
              Vous ne pouvez pas modifier quelqu&apos;un de niveau supérieur ou égal
            </Text>
          </View>
          <View style={styles.legendItem}>
            <Text style={styles.legendBullet}>•</Text>
            <Text style={styles.legendText}>
              100% Dev : Toutes les permissions (images, comptes)
            </Text>
          </View>
          <View style={styles.legendItem}>
            <Text style={styles.legendBullet}>•</Text>
            <Text style={styles.legendText}>
              Limité : Permissions restreintes
            </Text>
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAddModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowAddModal(false)}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <UserPlus color="#FF8C00" size={32} />
              <Text style={styles.modalTitle}>Ajouter un développeur</Text>
            </View>

            <Text style={styles.inputLabel}>Adresse Btcon</Text>
            <TextInput
              style={styles.input}
              value={newAddress}
              onChangeText={setNewAddress}
              placeholder="bc1..."
              placeholderTextColor="#666"
              autoCapitalize="none"
            />

            <Text style={styles.inputLabel}>Type de permissions</Text>
            <View style={styles.permissionSelector}>
              <Pressable
                style={[
                  styles.permissionOption,
                  newPermissionLevel === 'full' && styles.permissionOptionActive,
                ]}
                onPress={() => setNewPermissionLevel('full')}
              >
                <Shield color={newPermissionLevel === 'full' ? '#FF8C00' : '#666'} size={20} />
                <Text
                  style={[
                    styles.permissionOptionText,
                    newPermissionLevel === 'full' && styles.permissionOptionTextActive,
                  ]}
                >
                  100% Dev
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.permissionOption,
                  newPermissionLevel === 'username_only' && styles.permissionOptionActive,
                ]}
                onPress={() => setNewPermissionLevel('username_only')}
              >
                <Users color={newPermissionLevel === 'username_only' ? '#FF8C00' : '#666'} size={20} />
                <Text
                  style={[
                    styles.permissionOptionText,
                    newPermissionLevel === 'username_only' && styles.permissionOptionTextActive,
                  ]}
                >
                  Limité
                </Text>
              </Pressable>
            </View>

            <Text style={styles.inputLabel}>Raison de l&apos;ajout</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={reason}
              onChangeText={setReason}
              placeholder="Expliquez pourquoi vous ajoutez ce développeur..."
              placeholderTextColor="#666"
              multiline
              numberOfLines={4}
            />

            <View style={styles.modalButtons}>
              <Pressable
                style={styles.modalButtonCancel}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.modalButtonCancelText}>Annuler</Text>
              </Pressable>

              <Pressable
                style={styles.modalButtonConfirm}
                onPress={handleAddDeveloper}
              >
                <Text style={styles.modalButtonConfirmText}>Ajouter</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowEditModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowEditModal(false)}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Shield color="#FF8C00" size={32} />
              <Text style={styles.modalTitle}>Modifier les permissions</Text>
            </View>

            {selectedDev && (
              <>
                <Text style={styles.devAddressInModal}>
                  {selectedDev.address}
                </Text>

                <Text style={styles.inputLabel}>Type de permissions</Text>
                <View style={styles.permissionSelector}>
                  <Pressable
                    style={[
                      styles.permissionOption,
                      newPermissionLevel === 'full' && styles.permissionOptionActive,
                    ]}
                    onPress={() => setNewPermissionLevel('full')}
                  >
                    <Shield color={newPermissionLevel === 'full' ? '#FF8C00' : '#666'} size={20} />
                    <Text
                      style={[
                        styles.permissionOptionText,
                        newPermissionLevel === 'full' && styles.permissionOptionTextActive,
                      ]}
                    >
                      100% Dev
                    </Text>
                  </Pressable>

                  <Pressable
                    style={[
                      styles.permissionOption,
                      newPermissionLevel === 'username_only' && styles.permissionOptionActive,
                    ]}
                    onPress={() => setNewPermissionLevel('username_only')}
                  >
                    <Users color={newPermissionLevel === 'username_only' ? '#FF8C00' : '#666'} size={20} />
                    <Text
                      style={[
                        styles.permissionOptionText,
                        newPermissionLevel === 'username_only' && styles.permissionOptionTextActive,
                      ]}
                    >
                      Limité
                    </Text>
                  </Pressable>
                </View>

                <Text style={styles.inputLabel}>Raison de la modification</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={reason}
                  onChangeText={setReason}
                  placeholder="Expliquez pourquoi vous modifiez ces permissions..."
                  placeholderTextColor="#666"
                  multiline
                  numberOfLines={4}
                />
              </>
            )}

            <View style={styles.modalButtons}>
              <Pressable
                style={styles.modalButtonCancel}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={styles.modalButtonCancelText}>Annuler</Text>
              </Pressable>

              <Pressable
                style={styles.modalButtonConfirm}
                onPress={handleUpdatePermissions}
              >
                <Text style={styles.modalButtonConfirmText}>Modifier</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={showPinVerification}
        animationType="fade"
        transparent
        onRequestClose={() => setShowPinVerification(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => {
            setShowPinVerification(false);
            setPinInput('');
            setPendingAction(null);
          }}
        >
          <Pressable style={styles.pinModalContent} onPress={(e) => e.stopPropagation()}>
            <Shield color="#FF8C00" size={40} style={{ alignSelf: 'center', marginBottom: 16 }} />
            <Text style={styles.modalTitle}>Vérification PIN</Text>
            <Text style={styles.modalText}>
              Entrez votre code PIN à 6 chiffres pour continuer.
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
              <Pressable
                style={styles.modalButtonCancel}
                onPress={() => {
                  setShowPinVerification(false);
                  setPinInput('');
                  setPendingAction(null);
                }}
              >
                <Text style={styles.modalButtonCancelText}>Annuler</Text>
              </Pressable>

              <Pressable
                style={[styles.modalButtonConfirm, pinInput.length !== 6 && styles.modalButtonDisabled]}
                onPress={handleVerifyPin}
                disabled={pinInput.length !== 6}
              >
                <Text style={styles.modalButtonConfirmText}>Vérifier</Text>
              </Pressable>
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
  currentDevCard: {
    backgroundColor: 'rgba(255, 140, 0, 0.15)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 140, 0, 0.3)',
    alignItems: 'center',
  },
  currentDevLabel: {
    color: '#999',
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  currentDevLevel: {
    color: '#FF8C00',
    fontSize: 32,
    fontWeight: '800' as const,
    marginBottom: 12,
  },
  section: {
    backgroundColor: '#141414',
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#222',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700' as const,
  },
  addButton: {
    backgroundColor: '#FF8C00',
    borderRadius: 8,
    padding: 8,
  },
  hierarchyTree: {
    gap: 12,
  },
  devItem: {
    backgroundColor: '#0A0A0A',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#222',
  },
  devItemYou: {
    borderColor: '#FF8C00',
    borderWidth: 2,
  },
  devItemLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  levelBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF8C00',
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelBadgeText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '800' as const,
  },
  devInfo: {
    flex: 1,
    gap: 6,
  },
  devAddress: {
    color: '#FFF',
    fontSize: 14,
    fontFamily: 'monospace',
  },
  permissionBadge: {
    backgroundColor: '#FF8C00',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  permissionBadgeText: {
    color: '#000',
    fontSize: 11,
    fontWeight: '700' as const,
  },
  permissionBadgePartial: {
    backgroundColor: '#333',
  },
  permissionBadgeTextPartial: {
    color: '#FF8C00',
    fontSize: 11,
    fontWeight: '700' as const,
  },
  infoCard: {
    backgroundColor: '#141414',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#222',
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  infoCardContent: {
    flex: 1,
  },
  infoCardTitle: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  infoCardText: {
    color: '#999',
    fontSize: 13,
    lineHeight: 18,
  },
  legendCard: {
    backgroundColor: '#141414',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#222',
  },
  legendTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700' as const,
    marginBottom: 12,
  },
  legendItem: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  legendBullet: {
    color: '#FF8C00',
    fontSize: 16,
    fontWeight: '700' as const,
  },
  legendText: {
    flex: 1,
    color: '#999',
    fontSize: 13,
    lineHeight: 18,
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
    maxWidth: 500,
  },
  pinModalContent: {
    backgroundColor: '#1A1A1A',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  modalTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '700' as const,
  },
  modalText: {
    color: '#999',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  devAddressInModal: {
    color: '#666',
    fontSize: 12,
    fontFamily: 'monospace',
    textAlign: 'center',
    marginBottom: 24,
    padding: 12,
    backgroundColor: '#0A0A0A',
    borderRadius: 8,
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
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 20,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  permissionSelector: {
    gap: 12,
    marginBottom: 20,
  },
  permissionOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#0A0A0A',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#333',
  },
  permissionOptionActive: {
    borderColor: '#FF8C00',
    backgroundColor: 'rgba(255, 140, 0, 0.1)',
  },
  permissionOptionText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  permissionOptionTextActive: {
    color: '#FF8C00',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
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
  pinInput: {
    backgroundColor: '#0A0A0A',
    borderRadius: 12,
    padding: 16,
    color: '#FFF',
    fontSize: 24,
    textAlign: 'center',
    fontWeight: '700' as const,
    letterSpacing: 8,
    marginVertical: 24,
    borderWidth: 2,
    borderColor: '#333',
  },
});
