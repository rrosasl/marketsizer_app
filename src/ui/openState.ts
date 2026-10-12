import { useSyncExternalStore } from 'react'

/**
 * Remembers which sections are open or closed for this browser tab (survives a refresh, not
 * shared in the link). "Restart" clears it, so every section goes back to its default.
 */
const KEY = 'marketsizer-open'

function load(): Record<string, boolean> {
  try {
    const raw = window.sessionStorage.getItem(KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : {}
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, boolean>) : {}
  } catch {
    return {}
  }
}

let state = load()
const listeners = new Set<() => void>()

function save() {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // Storage blocked (private mode): the state still lives in memory for this page.
  }
}

function emit() {
  for (const l of listeners) l()
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function setOpen(id: string, open: boolean) {
  if (state[id] === open) return
  state = { ...state, [id]: open }
  save()
  emit()
}

/** Every section back to its default. */
export function resetOpen() {
  state = {}
  save()
  emit()
}

export function useOpen(id: string, defaultOpen: boolean): [boolean, (open: boolean) => void] {
  const open = useSyncExternalStore(
    subscribe,
    () => state[id] ?? defaultOpen,
    () => defaultOpen,
  )
  return [open, (v: boolean) => setOpen(id, v)]
}
