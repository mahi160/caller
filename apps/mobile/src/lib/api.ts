import * as SecureStore from 'expo-secure-store';

// Base URL of the PocketBase-backed server. Resolved at runtime via LAN
// discovery or manual entry (see lib/discovery.ts + lib/session.tsx) and
// persisted here; EXPO_PUBLIC_API_URL only pins a fixed default for local
// dev. `let` (not `const`) so imports of API_URL see updates live.
const SERVER_URL_KEY = 'caller_server_url';
export let API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';

export async function loadStoredServerUrl(): Promise<string | null> {
  const stored = await SecureStore.getItemAsync(SERVER_URL_KEY);
  if (stored) API_URL = stored;
  return stored;
}

export async function setServerUrl(url: string): Promise<void> {
  API_URL = url;
  await SecureStore.setItemAsync(SERVER_URL_KEY, url);
}

export type CallerUser = {
  id: string;
  username: string;
  name: string;
  canRequest: boolean;
  canRun: boolean;
  language: 'en' | 'bn';
};

export type AuthResult = {
  token: string;
  record: CallerUser;
};

export type CallerItem = {
  id: string;
  name: string;
  isCustom: boolean;
};

export type CallerPin = {
  id: string;
  user: string;
  item: string;
};

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function loginWithPin(username: string, pin: string): Promise<AuthResult> {
  const res = await fetch(`${API_URL}/api/collections/users/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: username, password: pin }),
  });

  if (!res.ok) {
    if (res.status === 400) {
      throw new ApiError(res.status, 'Wrong username or PIN.');
    }
    throw new ApiError(res.status, 'Could not log in. Please try again.');
  }

  const data = await res.json();
  return { token: data.token, record: data.record };
}

export async function changePin(
  token: string,
  userId: string,
  oldPin: string,
  newPin: string,
): Promise<void> {
  const res = await fetch(`${API_URL}/api/collections/users/records/${userId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token,
    },
    body: JSON.stringify({
      oldPassword: oldPin,
      password: newPin,
      passwordConfirm: newPin,
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    if (body?.data?.oldPassword) {
      throw new ApiError(res.status, 'Current PIN is incorrect.');
    }
    throw new ApiError(res.status, 'Could not change PIN.');
  }
}

export async function saveLanguage(token: string, userId: string, language: 'en' | 'bn'): Promise<void> {
  const res = await fetch(`${API_URL}/api/collections/users/records/${userId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify({ language }),
  });
  if (!res.ok) {
    throw new ApiError(res.status, 'Could not save language.');
  }
}

export async function savePushToken(token: string, userId: string, expoPushToken: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/collections/users/records/${userId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify({ expoPushToken }),
  });
  if (!res.ok) {
    throw new ApiError(res.status, 'Could not save push token.');
  }
}

function authHeaders(token: string) {
  return { Authorization: token };
}

export async function listItems(token: string): Promise<CallerItem[]> {
  const res = await fetch(`${API_URL}/api/collections/items/records?perPage=200&sort=name`, {
    headers: authHeaders(token),
  });
  if (!res.ok) {
    throw new ApiError(res.status, 'Could not load items.');
  }
  const data = await res.json();
  return data.items.map((r: any) => ({ id: r.id, name: r.name, isCustom: r.isCustom }));
}

export async function listPins(token: string): Promise<CallerPin[]> {
  const res = await fetch(`${API_URL}/api/collections/pins/records?perPage=200`, {
    headers: authHeaders(token),
  });
  if (!res.ok) {
    throw new ApiError(res.status, 'Could not load pins.');
  }
  const data = await res.json();
  return data.items.map((r: any) => ({ id: r.id, user: r.user, item: r.item }));
}

export async function pinItem(token: string, userId: string, itemId: string): Promise<CallerPin> {
  const res = await fetch(`${API_URL}/api/collections/pins/records`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify({ user: userId, item: itemId }),
  });
  if (!res.ok) {
    throw new ApiError(res.status, 'Could not pin item.');
  }
  const r = await res.json();
  return { id: r.id, user: r.user, item: r.item };
}

export type CallerTopic = {
  id: string;
  name: string;
  senderRule: 'requesterOnly' | 'anyone';
};

export type CallerSubscription = {
  id: string;
  user: string;
  topic: string;
};

export async function listTopics(token: string): Promise<CallerTopic[]> {
  const res = await fetch(`${API_URL}/api/collections/topics/records?perPage=200&sort=name`, {
    headers: authHeaders(token),
  });
  if (!res.ok) {
    throw new ApiError(res.status, 'Could not load topics.');
  }
  const data = await res.json();
  return data.items.map((r: any) => ({ id: r.id, name: r.name, senderRule: r.senderRule }));
}

export async function listSubscriptions(token: string): Promise<CallerSubscription[]> {
  const res = await fetch(`${API_URL}/api/collections/subscriptions/records?perPage=200`, {
    headers: authHeaders(token),
  });
  if (!res.ok) {
    throw new ApiError(res.status, 'Could not load subscriptions.');
  }
  const data = await res.json();
  return data.items.map((r: any) => ({ id: r.id, user: r.user, topic: r.topic }));
}

export async function subscribeToTopic(token: string, userId: string, topicId: string): Promise<CallerSubscription> {
  const res = await fetch(`${API_URL}/api/collections/subscriptions/records`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify({ user: userId, topic: topicId }),
  });
  if (!res.ok) {
    throw new ApiError(res.status, 'Could not subscribe.');
  }
  const r = await res.json();
  return { id: r.id, user: r.user, topic: r.topic };
}

export async function unsubscribeFromTopic(token: string, subscriptionId: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/collections/subscriptions/records/${subscriptionId}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  if (!res.ok) {
    throw new ApiError(res.status, 'Could not unsubscribe.');
  }
}

export async function unpinItem(token: string, pinId: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/collections/pins/records/${pinId}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  if (!res.ok) {
    throw new ApiError(res.status, 'Could not unpin item.');
  }
}

export type CallerPing = {
  id: string;
  topic: string;
  sentBy: string;
  created: string;
};

export async function sendPing(token: string, topicId: string): Promise<CallerPing> {
  const res = await fetch(`${API_URL}/api/topics/${topicId}/ping`, {
    method: 'POST',
    headers: authHeaders(token),
  });
  if (!res.ok) {
    throw new ApiError(res.status, 'Could not send ping.');
  }
  return res.json();
}

export async function listActivePings(token: string): Promise<CallerPing[]> {
  const res = await fetch(`${API_URL}/api/pings/active`, {
    headers: authHeaders(token),
  });
  if (!res.ok) {
    throw new ApiError(res.status, 'Could not load active pings.');
  }
  return res.json();
}

export type CallStatus = 'pending' | 'accepted' | 'cancelled' | 'completed';
export type CallMode = 'broadcast' | 'direct';

export type CallerCall = {
  id: string;
  requester: string;
  item: string;
  status: CallStatus;
  mode: CallMode;
  targetRunner: string;
  declinedBy: string;
  acceptedBy: string;
  acceptedAt: string;
  isBuy: boolean;
  note: string;
  created: string;
};

export async function listCalls(token: string): Promise<CallerCall[]> {
  const res = await fetch(`${API_URL}/api/collections/calls/records?perPage=200&sort=-created`, {
    headers: authHeaders(token),
  });
  if (!res.ok) {
    throw new ApiError(res.status, 'Could not load calls.');
  }
  const data = await res.json();
  return data.items;
}

export async function createCall(
  token: string,
  requesterId: string,
  itemId: string,
  targetRunnerId?: string,
  buyNote?: string,
): Promise<CallerCall> {
  const res = await fetch(`${API_URL}/api/collections/calls/records`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify({
      requester: requesterId,
      item: itemId,
      status: 'pending',
      targetRunner: targetRunnerId ?? '',
      isBuy: !!buyNote,
      note: buyNote ?? '',
    }),
  });
  if (!res.ok) {
    throw new ApiError(res.status, 'Could not place call.');
  }
  return res.json();
}

export async function declineCall(token: string, callId: string): Promise<CallerCall> {
  const res = await fetch(`${API_URL}/api/calls/${callId}/decline`, {
    method: 'POST',
    headers: authHeaders(token),
  });
  if (!res.ok) {
    throw new ApiError(res.status, 'Could not decline call.');
  }
  return res.json();
}

export async function completeCall(token: string, callId: string): Promise<CallerCall> {
  const res = await fetch(`${API_URL}/api/calls/${callId}/complete`, {
    method: 'POST',
    headers: authHeaders(token),
  });
  if (!res.ok) {
    throw new ApiError(res.status, 'Could not complete call.');
  }
  return res.json();
}

export async function cancelCall(token: string, callId: string): Promise<CallerCall> {
  const res = await fetch(`${API_URL}/api/calls/${callId}/cancel`, {
    method: 'POST',
    headers: authHeaders(token),
  });
  if (!res.ok) {
    throw new ApiError(res.status, 'Could not cancel call.');
  }
  return res.json();
}

export async function refireCall(token: string, callId: string): Promise<CallerCall> {
  const res = await fetch(`${API_URL}/api/calls/${callId}/refire`, {
    method: 'POST',
    headers: authHeaders(token),
  });
  if (!res.ok) {
    throw new ApiError(res.status, 'Could not refire call.');
  }
  return res.json();
}

export async function retargetCall(token: string, callId: string, targetRunnerId: string): Promise<CallerCall> {
  const res = await fetch(`${API_URL}/api/calls/${callId}/retarget`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify({ targetRunner: targetRunnerId }),
  });
  if (!res.ok) {
    throw new ApiError(res.status, 'Could not retarget call.');
  }
  return res.json();
}

export async function countCompletedToday(token: string, runnerId: string, sinceIso: string): Promise<number> {
  const filter = `acceptedBy = "${runnerId}" && status = "completed" && completedAt >= "${sinceIso}"`;
  const res = await fetch(
    `${API_URL}/api/collections/calls/records?perPage=1&filter=${encodeURIComponent(filter)}`,
    { headers: authHeaders(token) },
  );
  if (!res.ok) {
    throw new ApiError(res.status, 'Could not load completed count.');
  }
  const data = await res.json();
  return data.totalItems;
}

export async function countDeclinedToday(token: string, sinceIso: string): Promise<number> {
  const filter = `created >= "${sinceIso}"`;
  const res = await fetch(
    `${API_URL}/api/collections/declines/records?perPage=1&filter=${encodeURIComponent(filter)}`,
    { headers: authHeaders(token) },
  );
  if (!res.ok) {
    throw new ApiError(res.status, 'Could not load declined count.');
  }
  const data = await res.json();
  return data.totalItems;
}

export type CallerRunner = { id: string; name: string };

export async function listRunners(token: string): Promise<CallerRunner[]> {
  const res = await fetch(`${API_URL}/api/collections/users/records?filter=${encodeURIComponent('canRun = true')}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) {
    throw new ApiError(res.status, 'Could not load runners.');
  }
  const data = await res.json();
  return data.items.map((r: any) => ({ id: r.id, name: r.name }));
}

export async function acceptCall(token: string, callId: string): Promise<CallerCall> {
  const res = await fetch(`${API_URL}/api/calls/${callId}/accept`, {
    method: 'POST',
    headers: authHeaders(token),
  });
  if (res.status === 409) {
    throw new ApiError(res.status, 'Someone else already took this call.');
  }
  if (!res.ok) {
    throw new ApiError(res.status, 'Could not accept call.');
  }
  return res.json();
}
