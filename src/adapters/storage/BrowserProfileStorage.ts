import type { ProfileStorage } from '@/core/ports'

/**
 * Saves in the browser (T13). Once packaged into Electron this becomes a file
 * next to the `.exe` — the port does not change, only this class does (A1).
 *
 * Storage can be unavailable: a private window, a per-site block, no space
 * left. For a children's game, quietly carrying on without saves beats
 * crashing.
 */
export class BrowserProfileStorage implements ProfileStorage {
  constructor(private readonly prefix = 'quest:') {}

  async load<T>(key: string): Promise<T | null> {
    try {
      const raw = localStorage.getItem(this.prefix + key)
      return raw === null ? null : (JSON.parse(raw) as T)
    } catch (cause) {
      console.warn('Could not read the save:', cause)
      return null
    }
  }

  async save<T>(key: string, value: T): Promise<void> {
    try {
      localStorage.setItem(this.prefix + key, JSON.stringify(value))
    } catch (cause) {
      console.warn('Could not write the save:', cause)
    }
  }

  async remove(key: string): Promise<void> {
    try {
      localStorage.removeItem(this.prefix + key)
    } catch (cause) {
      console.warn('Could not delete the save:', cause)
    }
  }
}
