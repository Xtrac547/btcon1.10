import '@/utils/shim';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapPin, UserCheck, UserPlus, Users } from 'lucide-react-native';
import { useMemo } from 'react';
import { useRouter } from 'expo-router';
import { followingData } from '@/mocks/following';

export default function FollowingScreen() {
  const router = useRouter();

  const sections = useMemo(() => followingData, []);

  return (
    <View style={styles.page}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIcon}>
              <Users color="#FF8C00" size={22} />
            </View>
            <View>
              <Text style={styles.headerTitle}>Réseau</Text>
              <Text style={styles.headerSubtitle}>Suivi, abonnés et proches</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => router.back()}
            testID="following-back-button"
          >
            <Text style={styles.headerButtonText}>Retour</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {sections.map((section) => (
            <View key={section.id} style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIconWrapper}>
                  {section.type === 'following' && <UserCheck color="#FF8C00" size={18} />}
                  {section.type === 'followers' && <UserPlus color="#FF8C00" size={18} />}
                  {section.type === 'nearby' && <MapPin color="#FF8C00" size={18} />}
                </View>
                <View>
                  <Text style={styles.sectionTitle}>{section.title}</Text>
                  <Text style={styles.sectionSubtitle}>{section.subtitle}</Text>
                </View>
              </View>

              <View style={styles.cards}>
                {section.people.map((person) => (
                  <View key={person.id} style={styles.card}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{person.name.slice(0, 2).toUpperCase()}</Text>
                    </View>
                    <View style={styles.cardBody}>
                      <View style={styles.cardRow}>
                        <Text style={styles.cardName}>{person.name}</Text>
                        {person.distance && (
                          <View style={styles.distancePill}>
                            <MapPin color="#FF8C00" size={12} />
                            <Text style={styles.distanceText}>{person.distance}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.cardHandle}>{person.handle}</Text>
                      <Text style={styles.cardNote}>{person.note}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.actionButton}
                      testID={`follow-action-${person.id}`}
                    >
                      <Text style={styles.actionButtonText}>{person.action}</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#000000',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#0f0f0f',
    borderWidth: 1,
    borderColor: 'rgba(255, 140, 0, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800' as const,
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.55)',
    fontSize: 12,
    marginTop: 4,
  },
  headerButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: 'rgba(255, 140, 0, 0.2)',
  },
  headerButtonText: {
    color: '#FF8C00',
    fontSize: 12,
    fontWeight: '700' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.6,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 28,
    backgroundColor: '#0a0a0a',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 140, 0, 0.1)',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  sectionIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 140, 0, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700' as const,
  },
  sectionSubtitle: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    marginTop: 4,
  },
  cards: {
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111111',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#222222',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FF8C00',
    fontSize: 14,
    fontWeight: '700' as const,
  },
  cardBody: {
    flex: 1,
    marginLeft: 12,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700' as const,
  },
  cardHandle: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 12,
    marginTop: 2,
  },
  cardNote: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 11,
    marginTop: 6,
  },
  distancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 140, 0, 0.15)',
  },
  distanceText: {
    color: '#FF8C00',
    fontSize: 10,
    fontWeight: '700' as const,
  },
  actionButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#FF8C00',
  },
  actionButtonText: {
    color: '#0b0b0b',
    fontSize: 10,
    fontWeight: '800' as const,
    textTransform: 'uppercase' as const,
  },
});
