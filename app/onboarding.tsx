import '@/utils/shim';
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, ActivityIndicator, Alert, Platform, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useWallet } from '@/contexts/WalletContext';

import * as ScreenCapture from 'expo-screen-capture';


export default function OnboardingScreen() {
  const router = useRouter();
  const { createWallet, restoreWallet, isLoading } = useWallet();

  const [mode, setMode] = useState<'choose' | 'restore' | 'show-seed'>('choose');
  const [restorePhrase, setRestorePhrase] = useState<string>('');
  const [isCreating, setIsCreating] = useState(false);
  const [seedWords, setSeedWords] = useState<string[]>([]);

  const handleCreateWallet = async () => {
    setIsCreating(true);
    try {
      const mnemonic = await createWallet();
      const words = mnemonic.split(' ');
      setSeedWords(words);
      setMode('show-seed');
      
      if (Platform.OS !== 'web') {
        await ScreenCapture.preventScreenCaptureAsync().catch((error: unknown) => {
          console.warn('Failed to prevent screen capture:', error);
        });
      }
    } catch (error) {
      console.error('Error creating wallet:', error);
      Alert.alert('Erreur', 'Échec de la création du portefeuille. Veuillez réessayer.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleConfirmSeed = () => {
    Alert.alert(
      'Confirmation',
      'Avez-vous bien noté vos 12 mots de récupération ? Ils sont nécessaires pour restaurer votre portefeuille.',
      [
        {
          text: 'Non, je veux les revoir',
          style: 'cancel',
        },
        {
          text: 'Oui, j\'ai noté',
          onPress: () => {
            router.replace('/setup-auth');
          },
        },
      ]
    );
  };



  const handleRestoreWallet = async () => {
    if (!restorePhrase.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer votre phrase de récupération');
      return;
    }

    const cleanedPhrase = restorePhrase.trim().toLowerCase().replace(/\s+/g, ' ');
    const words = cleanedPhrase.split(' ');
    
    console.log('Attempting to restore wallet with', words.length, 'words');
    
    if (words.length !== 12) {
      Alert.alert('Erreur', `La phrase de récupération doit contenir 12 mots (vous en avez ${words.length})`);
      return;
    }

    setIsCreating(true);
    try {
      await restoreWallet(cleanedPhrase);
      console.log('Wallet restored successfully, navigating to setup-auth');
      router.replace('/setup-auth');
    } catch (error) {
      console.error('Error restoring wallet:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      Alert.alert(
        'Erreur de restauration',
        `Phrase de récupération invalide. Veuillez vérifier que:\n\n• Les 12 mots sont corrects\n• Ils sont dans le bon ordre\n• Il n'y a pas de fautes de frappe\n\nDétails: ${errorMessage}`
      );
    } finally {
      setIsCreating(false);
    }
  };





  useEffect(() => {
    return () => {
      if (Platform.OS !== 'web') {
        ScreenCapture.allowScreenCaptureAsync().catch((error: unknown) => {
          console.warn('Failed to allow screen capture:', error);
        });
      }
    };
  }, []);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#FF8C00" />
      </View>
    );
  }

  if (mode === 'choose') {
    return (
      <View style={styles.container}>
        <View style={styles.backgroundGlow}>
          <View style={[styles.glowCircle, { top: -100, right: -50 }]} />
          <View style={[styles.glowCircle, { bottom: -100, left: -50 }]} />
        </View>
        <View style={styles.content}>
          <View style={styles.logoSection}>
            <Image
              source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/fycv5rxyn7iqfp2lwp4zb' }}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Image
              source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/ig8yh1pui959enuvw0p3d' }}
              style={styles.btcoinLogoImage}
              resizeMode="contain"
            />
            <Text style={styles.welcomeText}>Votre Portefeuille Btcon</Text>
            <Text style={styles.welcomeSubtext}>Sécurisé • Simple • Décentralisé</Text>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => {
                console.log('Create wallet button pressed');
                handleCreateWallet();
              }}
              disabled={isCreating}
              activeOpacity={0.85}
              testID="create-wallet-button"
            >
              {isCreating ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.primaryButtonText}>Nouveau</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => {
                console.log('Restore wallet button pressed');
                setMode('restore');
              }}
              disabled={isCreating}
              activeOpacity={0.85}
              testID="restore-wallet-button"
            >
              <Text style={styles.secondaryButtonText}>Ancien</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }



  if (mode === 'show-seed') {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={styles.title}>🔐 Phrase de Récupération</Text>
          <Text style={styles.subtitle}>
            Notez ces 12 mots dans l&apos;ordre. Ils sont la seule façon de récupérer votre portefeuille.
          </Text>

          {Platform.OS === 'web' && (
            <View style={styles.warningBox}>
              <Text style={styles.warningText}>⚠️ Attention : les captures d&apos;écran ne sont pas bloquées sur le web</Text>
            </View>
          )}

          <View style={styles.seedContainer}>
            <View style={styles.wordsGrid}>
              {seedWords.map((word, index) => (
                <View
                  key={index}
                  style={styles.wordItem}
                >
                  <Text style={styles.wordNumber}>{index + 1}</Text>
                  <Text style={styles.wordText}>{word}</Text>
                </View>
              ))}
            </View>
          </View>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleConfirmSeed}
          >
            <Text style={styles.primaryButtonText}>J&apos;ai noté mes 12 mots</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.content}>
        <Text style={styles.title}>Restaurer le Portefeuille</Text>
        <Text style={styles.subtitle}>Entrez votre phrase de récupération de 12 mots</Text>

        <TextInput
          style={styles.textArea}
          multiline
          numberOfLines={4}
          value={restorePhrase}
          onChangeText={setRestorePhrase}
          placeholder="mot1 mot2 mot3 ..."
          placeholderTextColor="#666"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleRestoreWallet}
          disabled={isCreating}
          testID="restore-submit-button"
        >
          {isCreating ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.primaryButtonText}>Restaurer le Portefeuille</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => setMode('choose')}
        >
          <Text style={styles.linkText}>Retour</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
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
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#FF8C00',
    opacity: 0.08,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 80,
  },
  logoImage: {
    width: 200,
    height: 200,
    marginBottom: 36,
  },
  btcoinLogoImage: {
    width: 420,
    height: 180,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#FFF',
    marginTop: 32,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  welcomeSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
    letterSpacing: 1,
  },
  btconTextLogo: {
    fontSize: 72,
    fontWeight: '900' as const,
    color: '#FF8C00',
    letterSpacing: 6,
    marginLeft: 12,
    textShadowColor: 'rgba(255, 140, 0, 0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  bitcoinSymbolLogo: {
    fontSize: 72,
    fontWeight: '900' as const,
    color: '#FFD700',
    letterSpacing: 0,
    textShadowColor: 'rgba(255, 215, 0, 0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  logoTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 80,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginBottom: 48,
  },
  buttonContainer: {
    gap: 20,
  },
  primaryButton: {
    backgroundColor: '#FF8C00',
    borderRadius: 28,
    paddingVertical: 32,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF8C00',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 12,
  },
  primaryButtonText: {
    color: '#000',
    fontSize: 28,
    fontWeight: '800' as const,
    letterSpacing: 1,
  },
  primaryButtonSubtext: {
    color: 'rgba(0, 0, 0, 0.7)',
    fontSize: 13,
    fontWeight: '600' as const,
  },
  secondaryButton: {
    backgroundColor: 'rgba(255, 140, 0, 0.08)',
    borderWidth: 2,
    borderColor: 'rgba(255, 140, 0, 0.3)',
    borderRadius: 28,
    paddingVertical: 32,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#FF8C00',
    fontSize: 28,
    fontWeight: '800' as const,
    letterSpacing: 1,
  },
  secondaryButtonSubtext: {
    color: 'rgba(255, 140, 0, 0.7)',
    fontSize: 13,
    fontWeight: '600' as const,
  },
  textArea: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    color: '#FFF',
    fontSize: 16,
    minHeight: 120,
    marginBottom: 24,
    textAlignVertical: 'top',
  },
  linkButton: {
    padding: 16,
    alignItems: 'center',
  },
  linkText: {
    color: '#999',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  seedContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 24,
    marginVertical: 24,
    minHeight: 300,
    justifyContent: 'center',
    alignItems: 'center',
  },

  wordsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    width: '100%',
  },
  wordItem: {
    backgroundColor: '#0a0a0a',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '47%',
    borderWidth: 1,
    borderColor: '#333',
  },
  wordNumber: {
    color: '#666',
    fontSize: 12,
    fontWeight: '700' as const,
    minWidth: 20,
  },
  wordText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600' as const,
    flex: 1,
  },

  warningBox: {
    backgroundColor: '#4A3000',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#FF8C00',
  },
  warningText: {
    color: '#FFB84D',
    fontSize: 14,
    fontWeight: '600' as const,
    textAlign: 'center',
  },
  usernameInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginVertical: 24,
    borderWidth: 2,
    borderColor: '#333',
  },
  atSymbol: {
    color: '#FF8C00',
    fontSize: 24,
    fontWeight: '700' as const,
    marginRight: 4,
  },
  usernameInput: {
    flex: 1,
    color: '#FFF',
    fontSize: 20,
    fontWeight: '600' as const,
    padding: 0,
  },
  hintText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
});
