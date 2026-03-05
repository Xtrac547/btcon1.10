class BufferPolyfill {
  public data: Uint8Array;

  constructor(input?: any, encoding?: string) {
    if (input === undefined) {
      this.data = new Uint8Array(0);
    } else if (typeof input === 'number') {
      this.data = new Uint8Array(input);
    } else if (typeof input === 'string') {
      if (encoding === 'hex') {
        const bytes = [];
        for (let i = 0; i < input.length; i += 2) {
          bytes.push(parseInt(input.substr(i, 2), 16));
        }
        this.data = new Uint8Array(bytes);
      } else if (encoding === 'base64') {
        const binary = atob(input);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        this.data = bytes;
      } else {
        const encoder = new TextEncoder();
        this.data = encoder.encode(input);
      }
    } else if (input instanceof Uint8Array) {
      this.data = input;
    } else if (Array.isArray(input)) {
      this.data = new Uint8Array(input);
    } else if (input instanceof ArrayBuffer) {
      this.data = new Uint8Array(input);
    } else if (input?.data instanceof Uint8Array) {
      this.data = input.data;
    } else {
      this.data = new Uint8Array(0);
    }
  }

  static from(input: any, encoding?: string): BufferPolyfill {
    return new BufferPolyfill(input, encoding);
  }

  static alloc(size: number): BufferPolyfill {
    return new BufferPolyfill(size);
  }

  static concat(buffers: BufferPolyfill[]): BufferPolyfill {
    const totalLength = buffers.reduce((acc, buf) => acc + buf.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const buf of buffers) {
      result.set(buf.data, offset);
      offset += buf.length;
    }
    return new BufferPolyfill(result);
  }

  get length(): number {
    return this.data.length;
  }

  toString(encoding?: string): string {
    if (encoding === 'hex') {
      return Array.from(this.data)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    } else if (encoding === 'base64') {
      const binary = String.fromCharCode(...Array.from(this.data));
      return btoa(binary);
    } else {
      const decoder = new TextDecoder();
      return decoder.decode(this.data);
    }
  }

  slice(start?: number, end?: number): BufferPolyfill {
    return new BufferPolyfill(this.data.slice(start, end));
  }

  subarray(start?: number, end?: number): BufferPolyfill {
    return new BufferPolyfill(this.data.subarray(start, end));
  }

  readUInt32LE(offset: number): number {
    return (
      this.data[offset] |
      (this.data[offset + 1] << 8) |
      (this.data[offset + 2] << 16) |
      (this.data[offset + 3] << 24)
    );
  }

  writeUInt32LE(value: number, offset: number): void {
    this.data[offset] = value & 0xff;
    this.data[offset + 1] = (value >> 8) & 0xff;
    this.data[offset + 2] = (value >> 16) & 0xff;
    this.data[offset + 3] = (value >> 24) & 0xff;
  }

  [Symbol.iterator]() {
    return this.data[Symbol.iterator]();
  }

  [index: number]: number;
}

Object.defineProperty(BufferPolyfill.prototype, Symbol.toStringTag, {
  value: 'Buffer',
  enumerable: false,
  writable: false,
  configurable: true,
});

for (let i = 0; i < 256; i++) {
  Object.defineProperty(BufferPolyfill.prototype, i, {
    get(this: BufferPolyfill) {
      return this.data[i];
    },
    set(this: BufferPolyfill, value: number) {
      this.data[i] = value;
    },
    enumerable: false,
    configurable: true,
  });
}

export const Buffer = BufferPolyfill as any;
