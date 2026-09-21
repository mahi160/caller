# Expo + real push notifications for Call alerts

Status: accepted

The mobile app is built with Expo (React Native) rather than native-per-platform code, primarily to get Expo's push service, which abstracts FCM/APNs certificate management. Real push notifications (not just an in-app SSE/WebSocket feed) are required so a Runner is alerted even when the app is backgrounded or killed — the core value of the app is being reachable without staring at the phone. SSE (via PocketBase realtime) is still used for live list updates while the app is open; push notifications cover the "app not open" case.
