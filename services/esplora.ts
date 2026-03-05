export interface UTXO {
  txid: string;
  vout: number;
  value: number;
  status: {
    confirmed: boolean;
    block_height?: number;
  };
}

import { Platform } from 'react-native';

export interface Transaction {
  txid: string;
  version: number;
  locktime: number;
  vin: Array<{
    txid: string;
    vout: number;
    prevout: {
      scriptpubkey: string;
      scriptpubkey_address: string;
      value: number;
    };
  }>;
  vout: Array<{
    scriptpubkey: string;
    scriptpubkey_address: string;
    value: number;
  }>;
  status: {
    confirmed: boolean;
    block_height?: number;
    block_time?: number;
  };
}

export class EsploraService {
  private baseUrls: string[];
  private isTestnet: boolean;
  private webCorsProxies: string[];

  constructor(isTestnet: boolean = false) {
    this.isTestnet = isTestnet;
    this.baseUrls = this.getBaseUrls(isTestnet);
    this.webCorsProxies = [
      'https://corsproxy.io/?',
      'https://api.allorigins.win/raw?url=',
      'https://cors.isomorphic-git.org/',
      'https://cors.eu.org/',
    ];
  }

  setNetwork(isTestnet: boolean) {
    this.isTestnet = isTestnet;
    this.baseUrls = this.getBaseUrls(isTestnet);
  }

  private getRequestUrls(path: string): string[] {
    const urls = this.baseUrls.map((baseUrl) => `${baseUrl}${path}`);
    if (Platform.OS !== 'web') {
      return urls;
    }
    const proxied: string[] = [];
    for (const url of urls) {
      for (const proxy of this.webCorsProxies) {
        const proxyUrl = proxy.includes('?url=')
          ? `${proxy}${encodeURIComponent(url)}`
          : `${proxy}${url}`;
        proxied.push(proxyUrl);
      }
    }
    return [...urls, ...proxied];
  }

  private getBaseUrls(isTestnet: boolean): string[] {
    if (isTestnet) {
      return ['https://blockstream.info/testnet/api', 'https://mempool.space/testnet/api'];
    }
    return ['https://blockstream.info/api', 'https://mempool.space/api'];
  }

  private async fetchJson<T>(path: string): Promise<T> {
    let lastError: Error | null = null;
    const urls = this.getRequestUrls(path);
    for (const url of urls) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        const response = await fetch(url, {
          headers: {
            Accept: 'application/json',
          },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Request failed: ${response.status} ${errorText}`);
        }
        return (await response.json()) as T;
      } catch (error) {
        lastError = error as Error;
        console.error('Esplora request failed:', url, error);
      }
    }
    throw lastError ?? new Error('All Esplora endpoints failed');
  }

  private async fetchText(path: string, body?: string): Promise<string> {
    let lastError: Error | null = null;
    const urls = this.getRequestUrls(path);
    for (const url of urls) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        const response = await fetch(
          url,
          body
            ? {
                method: 'POST',
                headers: {
                  'Content-Type': 'text/plain',
                },
                body,
                signal: controller.signal,
              }
            : { signal: controller.signal },
        );
        clearTimeout(timeoutId);
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Request failed: ${response.status} ${errorText}`);
        }
        return await response.text();
      } catch (error) {
        lastError = error as Error;
        console.error('Esplora request failed:', url, error);
      }
    }
    throw lastError ?? new Error('All Esplora endpoints failed');
  }

  async getAddressUTXOs(address: string): Promise<UTXO[]> {
    try {
      return await this.fetchJson<UTXO[]>(`/address/${address}/utxo`);
    } catch (error) {
      console.error('Error fetching UTXOs:', error);
      return [];
    }
  }

  async getAddressTransactions(address: string): Promise<Transaction[]> {
    try {
      return await this.fetchJson<Transaction[]>(`/address/${address}/txs`);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      return [];
    }
  }

  async getTransaction(txid: string): Promise<Transaction | null> {
    try {
      return await this.fetchJson<Transaction>(`/tx/${txid}`);
    } catch (error) {
      console.error('Error fetching transaction:', error);
      return null;
    }
  }

  async broadcastTransaction(txHex: string): Promise<string> {
    try {
      return await this.fetchText('/tx', txHex);
    } catch (error) {
      console.error('Error broadcasting transaction:', error);
      throw error;
    }
  }

  async getFeeEstimate(): Promise<number> {
    try {
      const fees = await this.fetchJson<Record<string, number>>('/fee-estimates');
      return fees['6'] || 2;
    } catch (error) {
      console.error('Error fetching fee estimate:', error);
      return 2;
    }
  }

  getExplorerUrl(txid: string): string {
    const baseUrl = this.baseUrls[0] ?? (this.isTestnet ? 'https://blockstream.info/testnet/api' : 'https://blockstream.info/api');
    return baseUrl.replace('/api', '') + `/tx/${txid}`;
  }

  getAddressExplorerUrl(address: string): string {
    const baseUrl = this.baseUrls[0] ?? (this.isTestnet ? 'https://blockstream.info/testnet/api' : 'https://blockstream.info/api');
    return baseUrl.replace('/api', '') + `/address/${address}`;
  }
}
