/*
 * Theme (mode) controller for Reply Radar.
 *
 * Dark is the default. The choice persists in localStorage and is mirrored
 * onto <html data-theme> plus root.style.colorScheme so native form controls
 * match. A boot script in index.html applies the stored mode before first
 * paint, so this module only handles runtime toggling.
 */

import { useCallback, useSyncExternalStore } from 'react'
import { THEME_STORAGE_KEY, type ThemeMode } from '../themes'

function apply(mode: ThemeMode): void {
  const root = document.documentElement
  root.setAttribute('data-theme', mode)
  root.style.colorScheme = mode
}

function read(): ThemeMode {
  if (typeof document === 'undefined') return 'dark'
  return document.documentElement.getAttribute('data-theme') === 'light'
    ? 'light'
    : 'dark'
}

/** Set the mode, persist it, and apply it to the document. */
export function setTheme(mode: ThemeMode): void {
  apply(mode)
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode)
  } catch {
    // Private mode / storage disabled: in-memory only is acceptable.
  }
  window.dispatchEvent(new Event('reply-radar-theme-change'))
}

export function toggleTheme(): void {
  setTheme(read() === 'dark' ? 'light' : 'dark')
}

function subscribe(cb: () => void): () => void {
  window.addEventListener('reply-radar-theme-change', cb)
  return () => window.removeEventListener('reply-radar-theme-change', cb)
}

/** Reactive hook: current mode plus setter/toggle. */
export function useTheme(): {
  mode: ThemeMode
  setMode: (m: ThemeMode) => void
  toggle: () => void
} {
  const mode = useSyncExternalStore(subscribe, read, () => 'dark' as ThemeMode)
  const setMode = useCallback((m: ThemeMode) => setTheme(m), [])
  const toggle = useCallback(() => toggleTheme(), [])
  return { mode, setMode, toggle }
}
