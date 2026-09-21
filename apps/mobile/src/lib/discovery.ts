import Zeroconf from 'react-native-zeroconf';

// Browses the LAN for the caller server advertised via mDNS as
// `_caller._tcp.local.` (see server/main.go: advertiseMDNS). Resolves to a
// base URL like "http://192.168.1.50:8090", or null if nothing answered
// within the timeout (multicast blocked, server down, different subnet).
export function discoverServer(timeoutMs = 5000): Promise<string | null> {
  return new Promise((resolve) => {
    const zeroconf = new Zeroconf();
    let done = false;

    const finish = (url: string | null) => {
      if (done) return;
      done = true;
      zeroconf.stop();
      zeroconf.removeAllListeners();
      resolve(url);
    };

    zeroconf.on('resolved', (service) => {
      const host = service.addresses?.[0];
      if (host) finish(`http://${host}:${service.port}`);
    });
    zeroconf.on('error', () => finish(null));

    zeroconf.scan('caller', 'tcp', 'local.');
    setTimeout(() => finish(null), timeoutMs);
  });
}
