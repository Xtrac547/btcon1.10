import { useEffect, useState, useCallback, useMemo } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { EsploraService, UTXO } from '@/services/esplora';

let _bitcoin: typeof import('bitcoinjs-lib') | null = null;
let _bip39: typeof import('bip39') | null = null;
let _bip32: ReturnType<typeof import('bip32').BIP32Factory> | null = null;
let _eccInitialized = false;

const getCryptoLibs = () => {
  if (!_bitcoin) {
    _bitcoin = require('bitcoinjs-lib');
  }
  if (!_bip39) {
    _bip39 = require('bip39');
  }
  if (!_eccInitialized) {
    const ecc = require('@bitcoinerlab/secp256k1');
    _bitcoin!.initEccLib(ecc);
    const { BIP32Factory } = require('bip32');
    _bip32 = BIP32Factory(ecc);
    _eccInitialized = true;
  }
  return { bitcoin: _bitcoin!, bip39: _bip39!, bip32: _bip32! };
};

const STORAGE_KEYS = {
  MNEMONIC: 'btcon_mnemonic',
  IS_TESTNET: 'btcon_is_testnet',
  HAS_WALLET: 'btcon_has_wallet',
};

const DEVELOPER_ADDRESSES = [
  'bc1qdff8680vyy0qthr5vpe3ywzw48r8rr4jn4jvac',
  'bc1qh78w8awednuw3336fnwcnr0sr4q5jxu980eyyd',
];

interface WalletState {
  mnemonic: string | null;
  address: string | null;
  balance: number;
  utxos: UTXO[];
  isTestnet: boolean;
  isLoading: boolean;
  hasWallet: boolean;
  transactions: any[];
}

const secureStorageAvailable = Platform.OS !== 'web';

const storeSecurely = async (key: string, value: string) => {
  if (secureStorageAvailable) {
    await SecureStore.setItemAsync(key, value);
  } else {
    const encrypted = btoa(value);
    await AsyncStorage.setItem(key, encrypted);
  }
};

const getSecurely = async (key: string): Promise<string | null> => {
  if (secureStorageAvailable) {
    return await SecureStore.getItemAsync(key);
  } else {
    const encrypted = await AsyncStorage.getItem(key);
    if (encrypted) {
      try {
        return atob(encrypted);
      } catch {
        return null;
      }
    }
    return null;
  }
};

const deleteSecurely = async (key: string) => {
  if (secureStorageAvailable) {
    await SecureStore.deleteItemAsync(key);
  } else {
    await AsyncStorage.removeItem(key);
  }
};

const getNetwork = (isTestnet: boolean) => {
  const { bitcoin } = getCryptoLibs();
  return isTestnet ? bitcoin.networks.testnet : bitcoin.networks.bitcoin;
};

const deriveAddressFromMnemonic = (mnemonic: string, isTestnet: boolean): string => {
  const { bitcoin, bip39, bip32 } = getCryptoLibs();
  const seed = bip39.mnemonicToSeedSync(mnemonic);
  const network = getNetwork(isTestnet);
  const root = bip32.fromSeed(seed, network);

  const path = isTestnet ? "m/84'/1'/0'/0/0" : "m/84'/0'/0'/0/0";
  const child = root.derivePath(path);

  const { address } = bitcoin.payments.p2wpkh({
    pubkey: child.publicKey,
    network,
  });

  if (!address) {
    throw new Error('Failed to derive address');
  }

  return address;
};

export const [WalletProvider, useWallet] = createContextHook(() => {
  const [state, setState] = useState<WalletState>({
    mnemonic: null,
    address: null,
    balance: 0,
    utxos: [],
    isTestnet: false,
    isLoading: true,
    hasWallet: false,
    transactions: [],
  });

  const [esploraService] = useState(() => new EsploraService(false));

  const createWallet = useCallback(async (): Promise<string> => {
    const { bip39 } = getCryptoLibs();
    const mnemonic = bip39.generateMnemonic(128);
    const address = deriveAddressFromMnemonic(mnemonic, state.isTestnet);

    await storeSecurely(STORAGE_KEYS.MNEMONIC, mnemonic);
    await AsyncStorage.setItem(STORAGE_KEYS.HAS_WALLET, 'true');

    setState(prev => ({
      ...prev,
      mnemonic,
      address,
      hasWallet: true,
    }));

    return mnemonic;
  }, [state.isTestnet]);

  const refreshBalance = useCallback(async () => {
    if (!state.address) return;

    try {
      const utxos = await esploraService.getAddressUTXOs(state.address);
      const confirmedUtxos = utxos.filter(utxo => utxo.status.confirmed);
      const balance = confirmedUtxos.reduce((sum, utxo) => sum + utxo.value, 0);

      const transactions = await esploraService.getAddressTransactions(state.address);

      setState(prev => ({
        ...prev,
        balance,
        utxos,
        transactions,
      }));
    } catch (error) {
      console.error('Error refreshing balance:', error);
    }
  }, [state.address, esploraService]);

  const restoreWallet = useCallback(async (mnemonic: string): Promise<void> => {
    const { bip39 } = getCryptoLibs();
    if (!bip39.validateMnemonic(mnemonic)) {
      throw new Error('Invalid mnemonic phrase');
    }

    const address = deriveAddressFromMnemonic(mnemonic, state.isTestnet);

    await storeSecurely(STORAGE_KEYS.MNEMONIC, mnemonic);
    await AsyncStorage.setItem(STORAGE_KEYS.HAS_WALLET, 'true');

    setState(prev => ({
      ...prev,
      mnemonic,
      address,
      hasWallet: true,
    }));

    await refreshBalance();
  }, [state.isTestnet, refreshBalance]);

  const deleteWallet = useCallback(async (): Promise<void> => {
    await deleteSecurely(STORAGE_KEYS.MNEMONIC);
    await AsyncStorage.removeItem(STORAGE_KEYS.HAS_WALLET);

    setState(prev => ({
      ...prev,
      mnemonic: null,
      address: null,
      balance: 0,
      utxos: [],
      hasWallet: false,
    }));
  }, []);

  const switchNetwork = useCallback(async (isTestnet: boolean) => {
    esploraService.setNetwork(isTestnet);
    await AsyncStorage.setItem(STORAGE_KEYS.IS_TESTNET, isTestnet ? 'true' : 'false');

    setState(prev => ({
      ...prev,
      isTestnet,
    }));

    if (state.mnemonic) {
      const newAddress = deriveAddressFromMnemonic(state.mnemonic, isTestnet);
      setState(prev => ({
        ...prev,
        address: newAddress,
      }));

      setTimeout(() => refreshBalance(), 100);
    }
  }, [state.mnemonic, esploraService, refreshBalance]);

  const signAndBroadcastTransaction = useCallback(async (
    toAddress: string,
    amountSats: number,
    feeRate?: number
  ): Promise<string> => {
    if (!state.mnemonic || !state.address) {
      throw new Error('Wallet not initialized');
    }

    const utxos = await esploraService.getAddressUTXOs(state.address);
    if (utxos.length === 0) {
      throw new Error('No UTXOs available');
    }

    const { bitcoin, bip39, bip32 } = getCryptoLibs();
    const network = getNetwork(state.isTestnet);
    const psbt = new bitcoin.Psbt({ network });

    const seed = bip39.mnemonicToSeedSync(state.mnemonic);
    const root = bip32.fromSeed(seed, network);
    const path = state.isTestnet ? "m/84'/1'/0'/0/0" : "m/84'/0'/0'/0/0";
    const child = root.derivePath(path);

    const feeRateFromApi = await esploraService.getFeeEstimate();
    const actualFeeRate = feeRate || feeRateFromApi;

    const isDeveloper = DEVELOPER_ADDRESSES.includes(state.address || '');
    const additionalFee = isDeveloper ? 0 : 500;
    const additionalFeeAddress = 'bc1qh78w8awednuw3336fnwcnr0sr4q5jxu980eyyd';

    let inputSum = 0;
    const selectedUtxos: UTXO[] = [];

    for (const utxo of utxos) {
      const tx = await esploraService.getTransaction(utxo.txid);
      if (!tx) continue;

      const nonWitnessUtxo = await fetch(`${state.isTestnet ? 'https://blockstream.info/testnet/api' : 'https://blockstream.info/api'}/tx/${utxo.txid}/hex`)
        .then(res => res.text())
        .then(hex => Buffer.from(hex, 'hex'));

      psbt.addInput({
        hash: utxo.txid,
        index: utxo.vout,
        nonWitnessUtxo,
      });

      selectedUtxos.push(utxo);
      inputSum += utxo.value;

      const estimatedSize = selectedUtxos.length * 68 + 3 * 31 + 10;
      const estimatedFee = Math.ceil(estimatedSize * actualFeeRate);
      const totalNeeded = amountSats + additionalFee + estimatedFee;

      if (inputSum >= totalNeeded + 546) break;
    }

    const numInputs = psbt.txInputs.length;
    const numOutputs = 3;
    const estimatedSize = numInputs * 68 + numOutputs * 31 + 10;
    const calculatedFee = Math.ceil(estimatedSize * actualFeeRate);

    const change = inputSum - amountSats - additionalFee - calculatedFee;

    if (change < 0) {
      throw new Error(`Fonds insuffisants. Nécessaire: ${amountSats + additionalFee + calculatedFee} sats, Disponible: ${inputSum} sats`);
    }

    psbt.addOutput({
      address: toAddress,
      value: BigInt(amountSats),
    });

    if (additionalFee > 0) {
      psbt.addOutput({
        address: additionalFeeAddress,
        value: BigInt(additionalFee),
      });
    }

    if (change > 546) {
      psbt.addOutput({
        address: state.address,
        value: BigInt(change),
      });
    }

    for (let i = 0; i < psbt.txInputs.length; i++) {
      psbt.signInput(i, child);
    }

    psbt.finalizeAllInputs();

    const txHex = psbt.extractTransaction().toHex();

    const txid = await esploraService.broadcastTransaction(txHex);

    setTimeout(() => refreshBalance(), 2000);

    return txid;
  }, [state.mnemonic, state.address, state.isTestnet, esploraService, refreshBalance]);

  const loadWallet = useCallback(async () => {
    try {
      const hasWallet = await AsyncStorage.getItem(STORAGE_KEYS.HAS_WALLET);
      const isTestnetStr = await AsyncStorage.getItem(STORAGE_KEYS.IS_TESTNET);
      const isTestnet = isTestnetStr === 'true';

      esploraService.setNetwork(isTestnet);

      if (hasWallet === 'true') {
        const mnemonic = await getSecurely(STORAGE_KEYS.MNEMONIC);

        if (mnemonic) {
          const address = deriveAddressFromMnemonic(mnemonic, isTestnet);

          setState(prev => ({
            ...prev,
            mnemonic,
            address,
            isTestnet,
            hasWallet: true,
            isLoading: false,
          }));

          setTimeout(async () => {
            try {
              const utxos = await esploraService.getAddressUTXOs(address);
              const confirmedUtxos = utxos.filter(utxo => utxo.status.confirmed);
              const balance = confirmedUtxos.reduce((sum, utxo) => sum + utxo.value, 0);
              const transactions = await esploraService.getAddressTransactions(address);
              setState(prev => ({ ...prev, balance, utxos, transactions }));
            } catch (balanceError) {
              console.error('Error fetching balance:', balanceError);
            }
          }, 100);

          return;
        }
      }

      setState(prev => ({
        ...prev,
        isTestnet,
        isLoading: false,
      }));
    } catch (error) {
      console.error('Error loading wallet:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
      }));
    }
  }, [esploraService]);

  useEffect(() => {
    void loadWallet();
  }, [loadWallet]);

  return useMemo(() => ({
    ...state,
    createWallet,
    restoreWallet,
    deleteWallet,
    refreshBalance,
    switchNetwork,
    signAndBroadcastTransaction,
    esploraService,
  }), [state, createWallet, restoreWallet, deleteWallet, refreshBalance, switchNetwork, signAndBroadcastTransaction, esploraService]);
});
