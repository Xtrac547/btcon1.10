import 'react-native-get-random-values';
import { Platform } from 'react-native';

if (typeof global.Buffer === 'undefined') {
  global.Buffer = require('buffer/').Buffer;
}

if (Platform.OS === 'web') {
  if (typeof window !== 'undefined') {
    if (!window.crypto) {
      window.crypto = {} as any;
    }
    if (!window.crypto.getRandomValues) {
      window.crypto.getRandomValues = (arr: any) => {
        for (let i = 0; i < arr.length; i++) {
          arr[i] = Math.floor(Math.random() * 256);
        }
        return arr;
      };
    }
  }
}

if (Platform.OS === 'android') {
  if (typeof global.crypto === 'undefined') {
    global.crypto = {} as any;
  }
  if (typeof global.crypto.getRandomValues !== 'function') {
    global.crypto.getRandomValues = <T extends ArrayBufferView>(array: T): T => {
      const arr = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return array;
    };
  }
}

if (typeof global.process === 'undefined') {
  global.process = { env: {} } as any;
}

if (typeof global.atob === 'undefined') {
  global.atob = (value: string) => Buffer.from(value, 'base64').toString('binary');
}

if (typeof global.btoa === 'undefined') {
  global.btoa = (value: string) => Buffer.from(value, 'binary').toString('base64');
}

export {};
