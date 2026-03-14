import { useState, useEffect } from 'react';

let cachedPrice = 0;
let cached24hChange = 0;
let lastFetch = 0;
const CACHE_DURATION = 15000;

interface BtcPriceData {
  price: number;
  change24h: number;
}

const fetchWithTimeout = async (url: string, timeoutMs = 8000): Promise<Response> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
};

export const fetchBtcPrice = async (): Promise<BtcPriceData> => {
  const now = Date.now();
  if (now - lastFetch < CACHE_DURATION && cachedPrice > 0) {
    return { price: cachedPrice, change24h: cached24hChange };
  }

  const apis = [
    {
      name: 'Coinbase',
      fetchData: async (): Promise<BtcPriceData> => {
        const spotRes = await fetchWithTimeout('https://api.coinbase.com/v2/prices/BTC-EUR/spot');
        const spotData = await spotRes.json();
        const currentPrice = parseFloat(spotData?.data?.amount);
        if (!currentPrice || currentPrice <= 0) throw new Error('Invalid Coinbase price');

        let change24h = 0;
        try {
          const statsRes = await fetchWithTimeout('https://api.exchange.coinbase.com/products/BTC-EUR/stats');
          const stats = await statsRes.json();
          const open24h = parseFloat(stats?.open);
          if (open24h > 0) {
            change24h = ((currentPrice - open24h) / open24h) * 100;
          }
        } catch {
          console.log('[BTC Price] Coinbase stats fallback');
        }

        return { price: currentPrice, change24h };
      },
    },
    {
      name: 'CoinGecko',
      fetchData: async (): Promise<BtcPriceData> => {
        const res = await fetchWithTimeout(
          'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=eur&include_24hr_change=true'
        );
        const data = await res.json();
        const price = data?.bitcoin?.eur as number;
        const change24h = data?.bitcoin?.eur_24h_change as number ?? 0;
        if (!price || price <= 0) throw new Error('Invalid CoinGecko price');
        return { price, change24h };
      },
    },
    {
      name: 'Blockchain.com',
      fetchData: async (): Promise<BtcPriceData> => {
        const res = await fetchWithTimeout('https://blockchain.info/ticker');
        const data = await res.json();
        const price = data?.EUR?.last as number;
        if (!price || price <= 0) throw new Error('Invalid Blockchain price');
        return { price, change24h: cached24hChange };
      },
    },
    {
      name: 'Mempool.space',
      fetchData: async (): Promise<BtcPriceData> => {
        const res = await fetchWithTimeout('https://mempool.space/api/v1/prices');
        const data = await res.json();
        const price = data?.EUR as number;
        if (!price || price <= 0) throw new Error('Invalid Mempool price');
        return { price, change24h: cached24hChange };
      },
    },
  ];

  for (const api of apis) {
    try {
      console.log('[BTC Price] Fetching from:', api.name);
      const result = await api.fetchData();
      console.log('[BTC Price] Got from', api.name, ':', result.price, '24h:', result.change24h?.toFixed(2) + '%');
      cachedPrice = result.price;
      cached24hChange = result.change24h;
      lastFetch = now;
      return result;
    } catch (error) {
      console.log('[BTC Price] Error from', api.name, error);
    }
  }

  console.log('[BTC Price] All APIs failed, using cache:', cachedPrice);
  return { price: cachedPrice, change24h: cached24hChange };
};

export const useBtcPrice = () => {
  const [btcPrice, setBtcPrice] = useState<number>(cachedPrice);
  const [change24h, setChange24h] = useState<number>(cached24hChange);

  useEffect(() => {
    const updatePrice = async () => {
      const data = await fetchBtcPrice();
      setBtcPrice(data.price);
      setChange24h(data.change24h);
    };

    updatePrice();
    const interval = setInterval(updatePrice, CACHE_DURATION);
    return () => clearInterval(interval);
  }, []);

  return { btcPrice, change24h };
};

export const btconToEuro = (btcon: number, btcPrice: number = cachedPrice): string => {
  const btc = btcon / 100000000;
  const euro = btc * btcPrice;
  return euro.toFixed(2);
};

export const formatBtconWithEuro = (btcon: number, btcPrice: number = cachedPrice): string => {
  return `${Math.floor(btcon)} Btcon (≈ ${btconToEuro(btcon, btcPrice)} €)`;
};
