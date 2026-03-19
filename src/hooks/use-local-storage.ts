"use client"

import { useCallback, useSyncExternalStore } from "react"

/**
 * React 19-compatible hook for reading/writing a single localStorage key.
 * Uses useSyncExternalStore to avoid setState-in-effect lint violations
 * and ensure the value is always current across re-renders.
 *
 * Returns [value, setValue] where setValue(null) removes the key.
 */
export function useLocalStorage(
  key: string,
): [string | null, (value: string | null) => void] {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      // Cross-tab changes
      const handleStorage = (e: StorageEvent) => {
        if (e.key === key) onStoreChange()
      }
      // Same-tab changes (dispatched manually by setValue)
      const handleLocal = () => onStoreChange()

      window.addEventListener("storage", handleStorage)
      window.addEventListener("local-storage-update", handleLocal)
      return () => {
        window.removeEventListener("storage", handleStorage)
        window.removeEventListener("local-storage-update", handleLocal)
      }
    },
    [key],
  )

  const getSnapshot = useCallback(() => localStorage.getItem(key), [key])
  const getServerSnapshot = () => null

  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const setValue = useCallback(
    (newValue: string | null) => {
      if (newValue === null) {
        localStorage.removeItem(key)
      } else {
        localStorage.setItem(key, newValue)
      }
      window.dispatchEvent(new Event("local-storage-update"))
    },
    [key],
  )

  return [value, setValue]
}
