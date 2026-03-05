import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

export default function NotFoundScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Page introuvable</Text>
      <Text style={styles.subtitle}>Cette page n&apos;existe pas.</Text>
      <TouchableOpacity style={styles.button} onPress={() => router.replace('/')}>
        <Text style={styles.buttonText}>Retour</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '700' as const,
    marginBottom: 8,
  },
  subtitle: {
    color: '#999',
    fontSize: 16,
    marginBottom: 32,
  },
  button: {
    backgroundColor: '#FF8C00',
    borderRadius: 16,
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  buttonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700' as const,
  },
});
