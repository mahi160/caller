import { Link, Redirect } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ApiError, type CallerCall, type CallerItem, type CallerRunner } from '@/lib/api';
import { useCalls } from '@/lib/calls';
import { useRunnerDashboardCounts } from '@/lib/dashboard';
import { useT } from '@/lib/i18n';
import { useItemsAndPins } from '@/lib/items';
import { usePings } from '@/lib/pings';
import { useRunners } from '@/lib/runners';
import { useAuth } from '@/lib/session';
import { useTopicsAndSubscriptions } from '@/lib/topics';

function ItemRow({
  item,
  isPinned,
  onCall,
  onTogglePin,
}: {
  item: CallerItem;
  isPinned: boolean;
  onCall: () => void;
  onTogglePin: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable style={[styles.itemRow, { borderBottomColor: theme.border }]} onPress={onCall}>
      <ThemedText>{item.name}</ThemedText>
      <Pressable onPress={onTogglePin} hitSlop={10}>
        <ThemedText style={isPinned ? { color: theme.accent } : undefined}>{isPinned ? '★' : '☆'}</ThemedText>
      </Pressable>
    </Pressable>
  );
}

function runnerName(runners: CallerRunner[], id: string): string {
  return runners.find((r) => r.id === id)?.name ?? '?';
}

function MyCallRow({
  call,
  itemName,
  runners,
  onRetarget,
  onRefire,
  refireOnCooldown,
  onCancel,
}: {
  call: CallerCall;
  itemName: string;
  runners: CallerRunner[];
  onRetarget: () => void;
  onRefire: () => void;
  refireOnCooldown: boolean;
  onCancel: () => void;
}) {
  const { t } = useT();
  const theme = useTheme();
  const cancellable = call.status === 'pending' || call.status === 'accepted';

  return (
    <ThemedView style={[styles.callRow, { borderBottomColor: theme.border }]}>
      <ThemedView type="backgroundElement">
        <ThemedText>{itemName}</ThemedText>
        {call.mode === 'direct' && <ThemedText type="small">→ {runnerName(runners, call.targetRunner)}</ThemedText>}
        {call.declinedBy !== '' && (
          <ThemedText type="small" style={{ color: theme.danger }}>
            {t('declinedBy', { name: runnerName(runners, call.declinedBy) })}
          </ThemedText>
        )}
        {call.isBuy && <ThemedText type="small">{t('buyPrefix', { note: call.note })}</ThemedText>}
        <ThemedText type="small" themeColor="textSecondary">
          {call.status}
        </ThemedText>
      </ThemedView>
      {cancellable && (
        <ThemedView type="backgroundElement" style={styles.rowActions}>
          {call.status === 'pending' && call.declinedBy !== '' && (
            <Pressable onPress={onRetarget}>
              <ThemedText style={{ color: theme.accent, fontWeight: '600' }}>{t('retarget')}</ThemedText>
            </Pressable>
          )}
          {call.status === 'pending' && (
            <Pressable onPress={onRefire} disabled={refireOnCooldown}>
              <ThemedText style={refireOnCooldown ? { color: theme.textSecondary } : { color: theme.accent, fontWeight: '600' }}>
                {t('refire')}
              </ThemedText>
            </Pressable>
          )}
          <Pressable onPress={onCancel}>
            <ThemedText style={{ color: theme.danger }}>{t('cancel')}</ThemedText>
          </Pressable>
        </ThemedView>
      )}
    </ThemedView>
  );
}

function RunnerCallRow({
  call,
  itemName,
  userId,
  onAccept,
  onDecline,
}: {
  call: CallerCall;
  itemName: string;
  userId: string;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const { t } = useT();
  const theme = useTheme();
  const alreadyDeclinedByMe = call.mode === 'direct' && call.declinedBy === userId;

  return (
    <ThemedView style={[styles.callRow, { borderBottomColor: theme.border }]}>
      <ThemedView type="backgroundElement">
        <ThemedText>
          {itemName}
          {call.mode === 'direct' ? t('direct') : ''}
        </ThemedText>
        {call.isBuy && <ThemedText type="small">{t('buyPrefix', { note: call.note })}</ThemedText>}
      </ThemedView>
      {alreadyDeclinedByMe ? (
        <ThemedText themeColor="textSecondary">{t('youDeclined')}</ThemedText>
      ) : (
        <ThemedView type="backgroundElement" style={styles.rowActions}>
          <Pressable onPress={onAccept}>
            <ThemedText style={{ color: theme.accent, fontWeight: '600' }}>{t('accept')}</ThemedText>
          </Pressable>
          {call.mode === 'direct' && (
            <Pressable onPress={onDecline}>
              <ThemedText style={{ color: theme.danger }}>{t('decline')}</ThemedText>
            </Pressable>
          )}
        </ThemedView>
      )}
    </ThemedView>
  );
}

function AcceptedCallRow({ itemName, onComplete }: { itemName: string; onComplete: () => void }) {
  const { t } = useT();
  const theme = useTheme();
  return (
    <ThemedView style={[styles.callRow, { borderBottomColor: theme.border }]}>
      <ThemedText>{itemName}</ThemedText>
      <Pressable onPress={onComplete}>
        <ThemedText style={{ color: theme.accent, fontWeight: '600' }}>{t('markComplete')}</ThemedText>
      </Pressable>
    </ThemedView>
  );
}

export default function HomeScreen() {
  const { isLoading, user, logout } = useAuth();
  const { t } = useT();
  const theme = useTheme();
  const { isLoading: itemsLoading, items, pinned, unpinned, togglePin } = useItemsAndPins();
  const { topics, isSubscribed, toggleSubscription } = useTopicsAndSubscriptions();
  const { pings, send: sendTopicPing } = usePings();
  const { calls, requestItem, accept, decline, retarget, refire, cancel, complete } = useCalls();
  const dashboardCounts = useRunnerDashboardCounts(calls);
  const runners = useRunners();
  const [showAll, setShowAll] = useState(false);
  const [selectedRunnerId, setSelectedRunnerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refireCooldowns, setRefireCooldowns] = useState<Record<string, boolean>>({});
  const [buyNote, setBuyNote] = useState('');

  if (isLoading) {
    return null;
  }

  if (!user) {
    return <Redirect href="/login" />;
  }

  const itemName = (id: string) => items.find((i) => i.id === id)?.name ?? '?';

  const onCall = async (itemId: string) => {
    setError(null);
    try {
      await requestItem(user.id, itemId, selectedRunnerId ?? undefined, buyNote || undefined);
      setBuyNote('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('somethingWrong'));
    }
  };

  const onAccept = async (callId: string) => {
    setError(null);
    try {
      await accept(callId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('somethingWrong'));
    }
  };

  const onDecline = async (callId: string) => {
    setError(null);
    try {
      await decline(callId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('somethingWrong'));
    }
  };

  const onRetarget = async (callId: string) => {
    if (!selectedRunnerId) {
      setError(t('pickRunnerFirst'));
      return;
    }
    setError(null);
    try {
      await retarget(callId, selectedRunnerId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('somethingWrong'));
    }
  };

  const onRefire = async (callId: string) => {
    if (refireCooldowns[callId]) return;
    setRefireCooldowns((prev) => ({ ...prev, [callId]: true }));
    setTimeout(() => setRefireCooldowns((prev) => ({ ...prev, [callId]: false })), 10_000);
    setError(null);
    try {
      await refire(callId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('somethingWrong'));
    }
  };

  const onCancel = async (callId: string) => {
    setError(null);
    try {
      await cancel(callId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('somethingWrong'));
    }
  };

  const onComplete = async (callId: string) => {
    setError(null);
    try {
      await complete(callId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('somethingWrong'));
    }
  };

  const onSendPing = async (topicId: string) => {
    setError(null);
    try {
      await sendTopicPing(topicId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('somethingWrong'));
    }
  };

  const topicName = (id: string) => topics.find((tp) => tp.id === id)?.name ?? '?';

  const pendingCalls = calls.filter((c) => c.status === 'pending');
  const myAcceptedCalls = calls.filter((c) => c.status === 'accepted' && c.acceptedBy === user.id);
  const myCalls = calls.filter((c) => c.requester === user.id);

  const roleText = user.canRequest && user.canRun ? 'roleBoth' : user.canRequest ? 'roleRequestOnly' : user.canRun ? 'roleRunOnly' : 'roleNone';

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="subtitle">{t('greeting', { name: user.name })}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {t(roleText)}
        </ThemedText>

        {error && (
          <ThemedView style={[styles.errorBanner, { backgroundColor: theme.dangerBg }]}>
            <ThemedText style={{ color: theme.danger }}>{error}</ThemedText>
          </ThemedView>
        )}

        <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
          <ThemedText type="smallBold">{t('topics')}</ThemedText>
          <FlatList
            data={topics}
            keyExtractor={(topic) => topic.id}
            renderItem={({ item: topic }) => {
              const subscribed = isSubscribed(topic.id);
              const canSend = topic.senderRule === 'anyone' || user.canRequest;
              return (
                <ThemedView style={[styles.itemRow, { borderBottomColor: theme.border }]}>
                  <Pressable onPress={() => toggleSubscription(topic.id)}>
                    <ThemedText>{topic.name}</ThemedText>
                  </Pressable>
                  <ThemedView style={styles.rowActions}>
                    {canSend && (
                      <Pressable onPress={() => onSendPing(topic.id)}>
                        <ThemedText style={{ color: theme.accent, fontWeight: '600' }}>{t('ping')}</ThemedText>
                      </Pressable>
                    )}
                    <Pressable onPress={() => toggleSubscription(topic.id)} hitSlop={10}>
                      <ThemedText style={subscribed ? { color: theme.accent } : undefined}>
                        {subscribed ? '★' : '☆'}
                      </ThemedText>
                    </Pressable>
                  </ThemedView>
                </ThemedView>
              );
            }}
            ListEmptyComponent={<ThemedText themeColor="textSecondary">{t('noTopics')}</ThemedText>}
          />

          <ThemedText type="smallBold">{t('activePings')}</ThemedText>
          <FlatList
            data={pings}
            keyExtractor={(p) => p.id}
            renderItem={({ item: ping }) => (
              <ThemedView style={[styles.itemRow, { borderBottomColor: theme.border }]}>
                <ThemedText>{topicName(ping.topic)}</ThemedText>
              </ThemedView>
            )}
            ListEmptyComponent={<ThemedText themeColor="textSecondary">{t('noActivePings')}</ThemedText>}
          />
        </ThemedView>

        {user.canRequest && !itemsLoading && (
          <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
            <ThemedText type="smallBold">{t('pinned')}</ThemedText>
            <FlatList
              data={pinned}
              keyExtractor={(i) => i.id}
              renderItem={({ item }) => (
                <ItemRow item={item} isPinned onCall={() => onCall(item.id)} onTogglePin={() => togglePin(item.id)} />
              )}
              ListEmptyComponent={
                <ThemedText themeColor="textSecondary">{t('noPinnedItems')}</ThemedText>
              }
            />

            <Pressable onPress={() => setShowAll((v) => !v)}>
              <ThemedText type="smallBold" style={{ color: theme.accent }}>
                {showAll ? t('hide') : t('more')}
              </ThemedText>
            </Pressable>

            <ThemedText type="smallBold">{t('callTarget')}</ThemedText>
            <FlatList
              horizontal
              data={[{ id: '', name: t('broadcast') }, ...runners]}
              keyExtractor={(r) => r.id}
              renderItem={({ item: r }) => {
                const isSelected = r.id === '' ? selectedRunnerId === null : selectedRunnerId === r.id;
                return (
                  <Pressable
                    style={[
                      styles.runnerPill,
                      { borderColor: theme.border },
                      isSelected && { backgroundColor: theme.accent, borderColor: theme.accent },
                    ]}
                    onPress={() => setSelectedRunnerId(r.id === '' ? null : r.id)}
                  >
                    <ThemedText style={isSelected ? { color: theme.accentText } : undefined}>{r.name}</ThemedText>
                  </Pressable>
                );
              }}
              ItemSeparatorComponent={() => <ThemedView style={{ width: Spacing.two }} />}
            />

            <TextInput
              style={[styles.buyNoteInput, { borderColor: theme.border, color: theme.text }]}
              placeholder={t('buyNotePlaceholder')}
              placeholderTextColor={theme.textSecondary}
              value={buyNote}
              onChangeText={setBuyNote}
            />

            {showAll && (
              <FlatList
                data={unpinned}
                keyExtractor={(i) => i.id}
                renderItem={({ item }) => (
                  <ItemRow
                    item={item}
                    isPinned={false}
                    onCall={() => onCall(item.id)}
                    onTogglePin={() => togglePin(item.id)}
                  />
                )}
              />
            )}

            <ThemedText type="smallBold">{t('myCalls')}</ThemedText>
            <FlatList
              data={myCalls}
              keyExtractor={(c) => c.id}
              renderItem={({ item: call }) => (
                <MyCallRow
                  call={call}
                  itemName={itemName(call.item)}
                  runners={runners}
                  onRetarget={() => onRetarget(call.id)}
                  onRefire={() => onRefire(call.id)}
                  refireOnCooldown={!!refireCooldowns[call.id]}
                  onCancel={() => onCancel(call.id)}
                />
              )}
              ListEmptyComponent={<ThemedText themeColor="textSecondary">{t('noCallsYet')}</ThemedText>}
            />
          </ThemedView>
        )}

        {user.canRun && (
          <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
            <ThemedView type="backgroundSelected" style={styles.statsRow}>
              <ThemedText type="small">
                {t('todayCounts', {
                  completed: dashboardCounts.completedToday,
                  declined: dashboardCounts.declinedToday,
                })}
              </ThemedText>
            </ThemedView>

            <ThemedText type="smallBold">{t('pendingCalls')}</ThemedText>
            <FlatList
              data={pendingCalls}
              keyExtractor={(c) => c.id}
              renderItem={({ item: call }) => (
                <RunnerCallRow
                  call={call}
                  itemName={itemName(call.item)}
                  userId={user.id}
                  onAccept={() => onAccept(call.id)}
                  onDecline={() => onDecline(call.id)}
                />
              )}
              ListEmptyComponent={<ThemedText themeColor="textSecondary">{t('noPendingCalls')}</ThemedText>}
            />

            <ThemedText type="smallBold">{t('myAcceptedCalls')}</ThemedText>
            <FlatList
              data={myAcceptedCalls}
              keyExtractor={(c) => c.id}
              renderItem={({ item: call }) => (
                <AcceptedCallRow itemName={itemName(call.item)} onComplete={() => onComplete(call.id)} />
              )}
              ListEmptyComponent={<ThemedText themeColor="textSecondary">{t('nothingAcceptedYet')}</ThemedText>}
            />
          </ThemedView>
        )}

        <Link href="/settings" asChild>
          <Pressable style={styles.secondaryButton}>
            <ThemedText style={{ color: theme.accent }}>{t('changePin')}</ThemedText>
          </Pressable>
        </Link>

        <Pressable style={[styles.button, { borderColor: theme.border }]} onPress={logout}>
          <ThemedText style={styles.buttonText}>{t('logOut')}</ThemedText>
        </Pressable>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  card: {
    borderWidth: 1,
    borderRadius: Radii.lg,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  button: {
    borderWidth: 1,
    borderRadius: Radii.pill,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  secondaryButton: {
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
  buttonText: { fontWeight: '600' },
  errorBanner: {
    borderRadius: Radii.md,
    padding: Spacing.three,
  },
  statsRow: {
    borderRadius: Radii.md,
    padding: Spacing.two,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  callRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowActions: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  runnerPill: {
    borderWidth: 1,
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  buyNoteInput: {
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
});
