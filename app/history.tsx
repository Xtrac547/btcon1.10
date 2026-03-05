import '@/utils/shim';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, TouchableOpacity, Platform, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { useWallet } from '@/contexts/WalletContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { ArrowLeft, ArrowUpRight, ArrowDownLeft, Clock, CheckCircle, Loader, RefreshCw } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect, useState, useCallback, useRef } from 'react';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Transaction } from '@/services/esplora';

type TransactionType = 'sent' | 'received';
type TransactionStatus = 'pending' | 'confirmed';

interface ProcessedTransaction {
  txid: string;
  type: TransactionType;
  amount: number;
  status: TransactionStatus;
  timestamp?: number;
  confirmations: number;
}

const NOTIFIED_TX_STORAGE_KEY = 'btcon_notified_transactions';

type NotifiedTransactionsMap = Record<string, TransactionStatus>;

export default function HistoryScreen() {
  const router = useRouter();
  const { transactions, address, esploraService, refreshBalance } = useWallet();
  const { notifyTransaction, notifyPendingTransaction } = useNotifications();
  const insets = useSafeAreaInsets();
  const [processedTransactions, setProcessedTransactions] = useState<ProcessedTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [notifiedTransactions, setNotifiedTransactions] = useState<NotifiedTransactionsMap>({});
  const hasLoadedNotifications = useRef(false);

  useEffect(() => {
    if (!address) return;
    
    const processTransactions = () => {
      const processed: ProcessedTransaction[] = transactions.map((tx: Transaction) => {
        let amount = 0;
        let type: TransactionType = 'received';

        const isSent = tx.vin.some((input) => input.prevout.scriptpubkey_address === address);

        if (isSent) {
          type = 'sent';
          const totalInput = tx.vin.reduce((sum, input) => {
            if (input.prevout.scriptpubkey_address === address) {
              return sum + input.prevout.value;
            }
            return sum;
          }, 0);

          const totalOutput = tx.vout.reduce((sum, output) => {
            if (output.scriptpubkey_address === address) {
              return sum + output.value;
            }
            return sum;
          }, 0);

          amount = totalInput - totalOutput;
        } else {
          tx.vout.forEach((output) => {
            if (output.scriptpubkey_address === address) {
              amount += output.value;
            }
          });
        }

        return {
          txid: tx.txid,
          type,
          amount,
          status: tx.status.confirmed ? 'confirmed' : 'pending',
          timestamp: tx.status.block_time,
          confirmations: 0,
        };
      });

      setProcessedTransactions(processed);
      setIsLoading(false);
    };

    processTransactions();
  }, [transactions, address]);

  useEffect(() => {
    const loadNotifiedTransactions = async () => {
      try {
        const stored = await AsyncStorage.getItem(NOTIFIED_TX_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as NotifiedTransactionsMap;
          setNotifiedTransactions(parsed);
        }
      } catch (error) {
        console.error('Error loading notified transactions:', error);
      } finally {
        hasLoadedNotifications.current = true;
      }
    };

    loadNotifiedTransactions();
  }, []);

  useEffect(() => {
    if (!hasLoadedNotifications.current || processedTransactions.length === 0) return;

    const handleNotifications = async () => {
      const updates: NotifiedTransactionsMap = { ...notifiedTransactions };

      for (const tx of processedTransactions) {
        const previousStatus = notifiedTransactions[tx.txid];

        if (!previousStatus) {
          if (tx.status === 'pending') {
            await notifyPendingTransaction({ type: tx.type, amount: tx.amount });
          } else {
            await notifyTransaction(tx.type, tx.amount);
          }
          updates[tx.txid] = tx.status;
          continue;
        }

        if (previousStatus === 'pending' && tx.status === 'confirmed') {
          await notifyTransaction(tx.type, tx.amount);
          updates[tx.txid] = 'confirmed';
        }
      }

      if (JSON.stringify(updates) !== JSON.stringify(notifiedTransactions)) {
        setNotifiedTransactions(updates);
        await AsyncStorage.setItem(NOTIFIED_TX_STORAGE_KEY, JSON.stringify(updates));
      }
    };

    handleNotifications();
  }, [processedTransactions, notifyPendingTransaction, notifyTransaction, notifiedTransactions]);

  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    try {
      await refreshBalance();
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  }, [isRefreshing, refreshBalance]);

  useEffect(() => {
    const refreshInterval = setInterval(() => {
      console.log('Auto-refresh: Mise à jour des transactions...');
      if (refreshBalance) {
        refreshBalance()
          .then(() => {
            console.log('Auto-refresh: Transactions mises à jour');
          })
          .catch((error) => {
            console.error('Auto-refresh: Erreur lors de la mise à jour', error);
          });
      }
    }, 3.33 * 60 * 1000);

    return () => clearInterval(refreshInterval);
  }, [refreshBalance]);

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return 'En attente';
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays}j`;
    
    return date.toLocaleDateString('fr-FR', { 
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getStatusColor = (status: TransactionStatus, type: TransactionType) => {
    if (status === 'pending') return '#FFD700';
    return type === 'sent' ? '#FF8C00' : '#4CAF50';
  };

  const getIconBackgroundColor = (status: TransactionStatus, type: TransactionType) => {
    if (status === 'pending') return '#FFD700';
    return type === 'sent' ? '#FF8C00' : '#4CAF50';
  };

  const getStatusIcon = (status: TransactionStatus) => {
    if (status === 'confirmed') {
      return <CheckCircle color="#4CAF50" size={20} strokeWidth={2.5} />;
    }
    return <Clock color="#FFD700" size={20} strokeWidth={2.5} />;
  };

  const getStatusText = (status: TransactionStatus) => {
    return status === 'confirmed' ? 'Confirmé' : 'En attente';
  };

  const handleTransactionPress = (txid: string) => {
    const url = esploraService.getExplorerUrl(txid);
    console.log('Opening transaction:', url);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <View style={styles.backButtonCircle}>
            <ArrowLeft color="#FFF" size={20} strokeWidth={2.5} />
          </View>
        </Pressable>
        <Text style={styles.headerTitle}>Historique</Text>
        <TouchableOpacity
          style={[styles.refreshButton, isRefreshing && styles.refreshingButton]}
          onPress={handleRefresh}
          disabled={isRefreshing}
          testID="refresh-history-button"
        >
          <Animated.View
            style={{
              transform: [{
                rotate: isRefreshing ? '360deg' : '0deg'
              }]
            }}
          >
            <RefreshCw color="#FF8C00" size={20} />
          </Animated.View>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF8C00" />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      ) : (
        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        >
          {processedTransactions.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIcon}>
                <Loader color="#666" size={48} strokeWidth={1.5} />
              </View>
              <Text style={styles.emptyTitle}>Aucune transaction</Text>
              <Text style={styles.emptyText}>
                Vos transactions apparaîtront ici
              </Text>
            </View>
          ) : (
            <View style={styles.transactionsList}>
              {processedTransactions.map((tx) => (
                <Pressable
                  key={tx.txid}
                  style={({ pressed }) => [
                    styles.transactionCard,
                    tx.status === 'pending' && styles.transactionCardPending,
                    pressed && styles.transactionCardPressed,
                  ]}
                  onPress={() => handleTransactionPress(tx.txid)}
                >
                  <View style={styles.transactionLeft}>
                    <View style={[
                      styles.transactionIcon,
                      { backgroundColor: getIconBackgroundColor(tx.status, tx.type) },
                    ]}>
                      {tx.type === 'sent' ? (
                        <ArrowUpRight color="#FFF" size={20} strokeWidth={2.5} />
                      ) : (
                        <ArrowDownLeft color="#FFF" size={20} strokeWidth={2.5} />
                      )}
                    </View>
                    
                    <View style={styles.transactionInfo}>
                      <Text style={styles.transactionType}>
                        {tx.type === 'sent' ? 'Envoyé' : 'Reçu'}
                      </Text>
                      <Text style={styles.transactionDate}>
                        {formatDate(tx.timestamp)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.transactionRight}>
                    <Text style={[
                      styles.transactionAmount,
                      tx.status === 'pending' ? styles.transactionAmountPending : 
                        (tx.type === 'sent' ? styles.transactionAmountSent : styles.transactionAmountReceived),
                    ]}>
                      {tx.type === 'sent' ? '-' : '+'}{tx.amount.toLocaleString()} Btcon
                    </Text>
                    
                    <View style={[
                      styles.statusBadge,
                      { backgroundColor: `${getStatusColor(tx.status, tx.type)}15`, borderColor: getStatusColor(tx.status, tx.type) }
                    ]}>
                      {getStatusIcon(tx.status)}
                      <Text style={[styles.statusText, { color: getStatusColor(tx.status, tx.type) }]}>
                        {getStatusText(tx.status)}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>
      )}
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
  },
  placeholder: {
    width: 40,
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  refreshingButton: {
    opacity: 0.6,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: '#999',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#141414',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#222',
  },
  emptyTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '700' as const,
    marginBottom: 8,
  },
  emptyText: {
    color: '#999',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  transactionsList: {
    gap: 12,
  },
  transactionCard: {
    backgroundColor: '#141414',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#222',
  },
  transactionCardPending: {
    borderColor: '#FFD700',
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    borderWidth: 2,
  },
  transactionCardPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  transactionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transactionInfo: {
    flex: 1,
  },
  transactionType: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  transactionDate: {
    color: '#999',
    fontSize: 13,
    fontWeight: '500' as const,
  },
  transactionRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  transactionAmountSent: {
    color: '#FF8C00',
  },
  transactionAmountReceived: {
    color: '#4CAF50',
  },
  transactionAmountPending: {
    color: '#FFD700',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700' as const,
  },
});
