/*
 * Reply Radar theme model — two modes, dark (primary) and light.
 *
 * Mode lives on <html data-theme>. There is no multi-direction switcher;
 * Reply Radar is the only direction. Color values live in src/themes.css.
 * This file is the typed metadata + the source/type lookups screens reuse.
 */

import { APP_DISPLAY_NAME, APP_NAME } from './constants'

export type ThemeMode = 'dark' | 'light'

/** App brand metadata. The display name comes from constants.ts (one place to rename). */
export const BRAND = {
  name: APP_DISPLAY_NAME,
  tag: 'Reply triage',
  glyph: 'R',
} as const

/** localStorage key for the persisted mode choice. */
export const THEME_STORAGE_KEY = `${APP_NAME}-theme`

/** The five discussion sources Reply Radar triages, in display order. */
export const SOURCES = [
  { id: 'reddit', letter: 'R', label: 'Reddit', onLight: false },
  { id: 'hn', letter: 'H', label: 'Hacker News', onLight: false },
  { id: 'ih', letter: 'I', label: 'Indie Hackers', onLight: false },
  { id: 'devto', letter: 'D', label: 'Dev.to', onLight: false },
  // X's dark tint (#d7dce4) is pale, so its on-chip text is near-black.
  { id: 'x', letter: 'X', label: 'X', onLight: true },
] as const

export type SourceId = (typeof SOURCES)[number]['id']

/** CSS var holding a source's tint, e.g. var(--src-reddit). */
export function srcVar(id: SourceId): string {
  return `var(--src-${id})`
}

/** On-chip text color for a source letter chip. */
export function srcTextColor(id: SourceId): string {
  return id === 'x' ? '#13131a' : '#ffffff'
}

/** Conversation type dots (fixed hex, constant across modes). */
export const TYPES = [
  { id: 'question', label: 'Question', dot: 'var(--type-question)' },
  { id: 'discussion', label: 'Discussion', dot: 'var(--type-discussion)' },
  { id: 'painpoint', label: 'Pain point', dot: 'var(--type-painpoint)' },
] as const

export type TypeId = (typeof TYPES)[number]['id']

/** Read the active mode from <html data-theme>. */
export function getActiveTheme(): ThemeMode {
  if (typeof document === 'undefined') return 'dark'
  const v = document.documentElement.getAttribute('data-theme')
  return v === 'light' ? 'light' : 'dark'
}
