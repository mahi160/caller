import { ScrollViewStyleReset } from 'expo-router/html';

// Root HTML wrapper for the web export, only rendered at build time
// (see https://docs.expo.dev/router/reference/static-rendering/). Adds the
// PWA manifest/icons and registers the service worker so the web build is
// installable.
export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <meta name="theme-color" content="#208AEF" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <ScrollViewStyleReset />
        <script src="/register-sw.js" defer />
      </head>
      <body>{children}</body>
    </html>
  );
}
