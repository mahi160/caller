import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { useAuth } from '@/lib/session';

export type Language = 'en' | 'bn';

const strings = {
  en: {
    appName: 'caller',
    loginSubtitle: 'Log in with your username and PIN.',
    username: 'Username',
    pin: 'PIN',
    logIn: 'Log in',
    enterCredentials: 'Enter your username and PIN.',
    somethingWrong: 'Something went wrong.',
    greeting: 'Hi, {name}',
    roleBoth: 'You can request and run calls.',
    roleRequestOnly: 'You can request calls.',
    roleRunOnly: 'You can run calls.',
    roleNone: 'You have no roles assigned yet.',
    pinned: 'Pinned',
    noPinnedItems: 'No pinned items yet.',
    more: 'More',
    hide: 'Hide',
    callTarget: 'Call target',
    broadcast: 'Broadcast',
    buyNotePlaceholder: "Optional: buy note (e.g. 'get me a samosa')",
    myCalls: 'My calls',
    noCallsYet: 'No calls yet.',
    waiting: 'waiting...',
    retarget: 'Retarget',
    refire: 'Refire',
    cancel: 'Cancel',
    accepted: 'accepted',
    declinedBy: 'declined by {name}',
    buyPrefix: 'buy: {note}',
    pendingCalls: 'Pending calls',
    noPendingCalls: 'No pending calls.',
    accept: 'Accept',
    decline: 'Decline',
    youDeclined: 'you declined',
    direct: ' (direct)',
    myAcceptedCalls: 'My accepted calls',
    nothingAcceptedYet: 'Nothing accepted yet.',
    markComplete: 'Mark complete',
    todayCounts: '{completed} completed today · {declined} declined today',
    changePin: 'Change PIN',
    logOut: 'Log out',
    settingsTitle: 'Change PIN',
    currentPin: 'Current PIN',
    newPin: 'New PIN',
    save: 'Save',
    pinChanged: 'PIN changed.',
    language: 'Language',
    english: 'English',
    bangla: 'বাংলা',
    pickRunnerFirst: 'Pick a runner above first, then tap Retarget.',
    topics: 'Topics',
    noTopics: 'No topics yet.',
    subscribed: 'subscribed',
    ping: 'Ping',
    activePings: 'Active pings',
    noActivePings: 'No active pings.',
  },
  bn: {
    appName: 'caller',
    loginSubtitle: 'আপনার ইউজারনেম এবং পিন দিয়ে লগ ইন করুন।',
    username: 'ইউজারনেম',
    pin: 'পিন',
    logIn: 'লগ ইন',
    enterCredentials: 'আপনার ইউজারনেম এবং পিন লিখুন।',
    somethingWrong: 'কিছু ভুল হয়েছে।',
    greeting: 'হাই, {name}',
    roleBoth: 'আপনি কল অনুরোধ করতে এবং পূরণ করতে পারবেন।',
    roleRequestOnly: 'আপনি কল অনুরোধ করতে পারবেন।',
    roleRunOnly: 'আপনি কল পূরণ করতে পারবেন।',
    roleNone: 'আপনাকে এখনো কোনো ভূমিকা দেওয়া হয়নি।',
    pinned: 'পিন করা',
    noPinnedItems: 'এখনো কোনো আইটেম পিন করা হয়নি।',
    more: 'আরও',
    hide: 'লুকান',
    callTarget: 'কল লক্ষ্য',
    broadcast: 'সবাইকে জানান',
    buyNotePlaceholder: 'ঐচ্ছিক: কেনার নোট (যেমন: একটা সিঙ্গারা নিয়ে আসো)',
    myCalls: 'আমার কলগুলো',
    noCallsYet: 'এখনো কোনো কল নেই।',
    waiting: 'অপেক্ষা করছে...',
    retarget: 'পুনরায় লক্ষ্য করুন',
    refire: 'আবার পাঠান',
    cancel: 'বাতিল করুন',
    accepted: 'গৃহীত হয়েছে',
    declinedBy: '{name} প্রত্যাখ্যান করেছে',
    buyPrefix: 'কিনতে হবে: {note}',
    pendingCalls: 'অপেক্ষমাণ কলগুলো',
    noPendingCalls: 'কোনো অপেক্ষমাণ কল নেই।',
    accept: 'গ্রহণ করুন',
    decline: 'প্রত্যাখ্যান করুন',
    youDeclined: 'আপনি প্রত্যাখ্যান করেছেন',
    direct: ' (সরাসরি)',
    myAcceptedCalls: 'আমার গৃহীত কলগুলো',
    nothingAcceptedYet: 'এখনো কিছু গৃহীত হয়নি।',
    markComplete: 'সম্পন্ন হিসেবে চিহ্নিত করুন',
    todayCounts: 'আজ {completed} সম্পন্ন · আজ {declined} প্রত্যাখ্যাত',
    changePin: 'পিন পরিবর্তন করুন',
    logOut: 'লগ আউট',
    settingsTitle: 'পিন পরিবর্তন করুন',
    currentPin: 'বর্তমান পিন',
    newPin: 'নতুন পিন',
    save: 'সংরক্ষণ করুন',
    pinChanged: 'পিন পরিবর্তন হয়েছে।',
    language: 'ভাষা',
    english: 'English',
    bangla: 'বাংলা',
    pickRunnerFirst: 'আগে উপরে একজন রানার বেছে নিন, তারপর পুনরায় লক্ষ্য করুন-এ চাপুন।',
    topics: 'টপিক',
    noTopics: 'এখনো কোনো টপিক নেই।',
    subscribed: 'সাবস্ক্রাইব করা হয়েছে',
    ping: 'পিং',
    activePings: 'সক্রিয় পিং',
    noActivePings: 'কোনো সক্রিয় পিং নেই।',
  },
} as const;

export type TranslationKey = keyof typeof strings.en;

type Vars = Record<string, string | number>;

function interpolate(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? ''));
}

type I18nState = {
  language: Language;
  t: (key: TranslationKey, vars?: Vars) => string;
};

const I18nContext = createContext<I18nState | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const language: Language = user?.language === 'bn' ? 'bn' : 'en';

  const value = useMemo<I18nState>(
    () => ({
      language,
      t: (key, vars) => interpolate(strings[language][key], vars),
    }),
    [language],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useT() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useT must be used within an I18nProvider');
  }
  return ctx;
}
