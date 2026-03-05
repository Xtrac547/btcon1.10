import '@/utils/shim';
import { View, Text, StyleSheet, ScrollView, Dimensions, Animated, PanResponder, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState, useRef } from 'react';
import { ArrowUpRight, ArrowDownLeft, Clock } from 'lucide-react-native';
import { useWallet } from '@/contexts/WalletContext';
import { Transaction } from '@/services/esplora';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function TransactionHistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { address, transactions, refreshBalance } = useWallet();
  const translateY = useRef(new Animated.Value(0)).current;
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshBalance();
    setRefreshing(false);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100) {
          Animated.timing(translateY, {
            toValue: SCREEN_HEIGHT,
            duration: 300,
            useNativeDriver: true,
          }).start(() => {
            router.back();
          });
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const formatDate = (timestamp: number | undefined): string => {
    if (!timestamp) return 'En attente';
    const date = new Date(timestamp * 1000);
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getTransactionType = (tx: Transaction): 'sent' | 'received' => {
    const isSent = tx.vin.some(input => input.prevout?.scriptpubkey_address === address);
    return isSent ? 'sent' : 'received';
  };

  const getTransactionAmount = (tx: Transaction): number => {
    const type = getTransactionType(tx);
    
    if (type === 'received') {
      return tx.vout
        .filter(output => output.scriptpubkey_address === address)
        .reduce((sum, output) => sum + output.value, 0);
    } else {
      const sent = tx.vout
        .filter(output => output.scriptpubkey_address !== address)
        .reduce((sum, output) => sum + output.value, 0);
      return sent;
    }
  };

  return (
    <View style={styles.container}>
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.content,
          {
            transform: [{ translateY }],
          },
        ]}
      >
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <View style={styles.dragHandle} />
          <Text style={styles.headerTitle}>Historique des transactions</Text>
        </View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#FF8C00"
              colors={['#FF8C00']}
            />
          }
        >
          {transactions.length === 0 ? (
            <View style={styles.emptyState}>
              <Clock color="#666666" size={64} strokeWidth={1.5} />
              <Text style={styles.emptyTitle}>Aucune transaction</Text>
              <Text style={styles.emptyText}>Vos transactions apparaîtront ici</Text>
            </View>
          ) : (
            transactions.map((tx) => {
              const type = getTransactionType(tx);
              const amount = getTransactionAmount(tx);
              const isConfirmed = tx.status.confirmed;
              
              return (
                <View key={tx.txid} style={styles.transactionCard}>
                  <View style={[
                    styles.iconContainer,
                    type === 'received' ? styles.iconReceived : styles.iconSent
                  ]}>
                    {type === 'received' ? (
                      <ArrowDownLeft color="#FFFFFF" size={24} strokeWidth={2.5} />
                    ) : (
                      <ArrowUpRight color="#FFFFFF" size={24} strokeWidth={2.5} />
                    )}
                  </View>

                  <View style={styles.transactionInfo}>
                    <View style={styles.transactionRow}>
                      <Text style={styles.transactionType}>
                        {type === 'received' ? 'Reçu' : 'Envoyé'}
                      </Text>
                      <Text style={[
                        styles.transactionAmount,
                        type === 'received' ? styles.amountReceived : styles.amountSent
                      ]}>
                        {type === 'received' ? '+' : '-'}{amount.toLocaleString()} Btcon
                      </Text>
                    </View>
                    
                    <View style={styles.transactionRow}>
                      <Text style={styles.transactionDate}>
                        {formatDate(tx.status.block_time)}
                      </Text>
                      <View style={[
                        styles.statusBadge,
                        isConfirmed ? styles.statusConfirmed : styles.statusPending
                      ]}>
                        <Text style={styles.statusText}>
                          {isConfirmed ? 'Confirmé' : 'En attente'}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.txid} numberOfLines={1}>
                      {tx.txid}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  content: {
    flex: 1,
    backgroundColor: '#000000',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  header: {
    alignItems: 'center',
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  dragHandle: {
    width: 48,
    height: 4,
    backgroundColor: '#333333',
    borderRadius: 2,
    marginBottom: 16,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800' as const,
    letterSpacing: 0.5,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    gap: 12,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 16,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700' as const,
  },
  emptyText: {
    color: '#666666',
    fontSize: 16,
    textAlign: 'center',
  },
  transactionCard: {
    flexDirection: 'row',
    backgroundColor: '#0f0f0f',
    borderRadius: 16,
    padding: 16,
    gap: 16,
    borderWidth: 1,
    borderColor: '#1a1a1a',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconReceived: {
    backgroundColor: '#2ECC71',
  },
  iconSent: {
    backgroundColor: '#FF8C00',
  },
  transactionInfo: {
    flex: 1,
    gap: 8,
  },
  transactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transactionType: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700' as const,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '800' as const,
  },
  amountReceived: {
    color: '#2ECC71',
  },
  amountSent: {
    color: '#FF8C00',
  },
  transactionDate: {
    color: '#888888',
    fontSize: 13,
    fontWeight: '500' as const,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusConfirmed: {
    backgroundColor: 'rgba(46, 204, 113, 0.2)',
  },
  statusPending: {
    backgroundColor: 'rgba(255, 140, 0, 0.2)',
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600' as const,
  },
  txid: {
    color: '#555555',
    fontSize: 11,
    fontFamily: 'monospace',
  },
});
