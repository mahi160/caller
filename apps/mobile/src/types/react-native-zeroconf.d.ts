declare module 'react-native-zeroconf' {
  export type ZeroconfService = {
    name: string;
    host: string;
    port: number;
    addresses: string[];
  };

  export default class Zeroconf {
    on(event: 'resolved', listener: (service: ZeroconfService) => void): this;
    on(event: 'error', listener: (error: Error) => void): this;
    removeAllListeners(): void;
    scan(type?: string, protocol?: string, domain?: string): void;
    stop(): void;
  }
}
