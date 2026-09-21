/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

// Warm, pastel, card-based palette (not the generic AI blue/purple).
export const Colors = {
  light: {
    text: '#2B2620',
    background: '#FBF7F0',
    backgroundElement: '#F1E9DA',
    backgroundSelected: '#DCEFE4',
    textSecondary: '#8A8072',
    accent: '#2F6D5B',
    accentText: '#FFFFFF',
    danger: '#B5541E',
    dangerBg: '#F4DFCB',
    border: '#E7DECB',
  },
  dark: {
    text: '#F3ECDE',
    background: '#211C15',
    backgroundElement: '#2C261D',
    backgroundSelected: '#33453B',
    textSecondary: '#B7AB96',
    accent: '#6FBFA0',
    accentText: '#122019',
    danger: '#E29A72',
    dangerBg: '#3A2A1E',
    border: '#3A3225',
  },
} as const;

export const Radii = {
  sm: 8,
  md: 14,
  lg: 20,
  pill: 999,
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
