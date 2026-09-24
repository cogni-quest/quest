/**
 * What the child has spent in the shop — Лавка чудес, the sibling site at
 * `/magic-shop/` — read out of the shop's own save.
 *
 * The gold in the profile is everything ever banked and only goes up. What the
 * corner of the screen shows is what is left of it, and that takes the shop's
 * side too: `gold − spent`. Neither app copies the other's number, so neither
 * can overwrite it.
 *
 * Readable because both sites are served from one origin
 * (`cogni-quest.github.io`) and so share one `localStorage`. Under `npm run dev`
 * they sit on different ports — different origins — and this reads nothing.
 * Nor will it once the game is an Electron app with a save file of its own.
 *
 * Read, never written. The ledger is the shop's; `spent` in it is the contract,
 * kept by `magic-shop/src/core/wallet.ts`.
 */

/** The shop's prefix and its ledger key, joined. */
const SHOP_LEDGER_KEY = 'magicshop:ledger'

/** The ledger version that carries `spent`. An older one spent against its own coins. */
const SHOP_LEDGER_VERSION = 2

/**
 * Pulls `spent` out of whatever the shop saved. Nought for anything unreadable.
 *
 * Not only purchases: the shop folds in where the count began — the gold this
 * profile held when the two were joined up, less the coins the child had in
 * hand that day. So it can be negative, when he had more coins than gold, and
 * is taken as it stands.
 */
export function spentIn(raw: unknown): number {
  if (typeof raw !== 'object' || raw === null) return 0
  const data = raw as { version?: unknown; spent?: unknown }
  if (data.version !== SHOP_LEDGER_VERSION) return 0
  if (typeof data.spent !== 'number' || !Number.isFinite(data.spent)) return 0
  return Math.round(data.spent)
}

export function readShopSpent(): number {
  try {
    const raw = localStorage.getItem(SHOP_LEDGER_KEY)
    return raw === null ? 0 : spentIn(JSON.parse(raw))
  } catch (cause) {
    console.warn('Could not read the shop save:', cause)
    return 0
  }
}

/**
 * Calls back whenever the shop may have spent something: a shop tab writing
 * beside this one (`storage`), or this tab coming back into view after the
 * child was shopping in another (`visibilitychange`). Returns the unsubscribe.
 */
export function onShopSpentChange(callback: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === SHOP_LEDGER_KEY || event.key === null) callback()
  }
  const onVisible = () => {
    if (document.visibilityState === 'visible') callback()
  }

  window.addEventListener('storage', onStorage)
  document.addEventListener('visibilitychange', onVisible)

  return () => {
    window.removeEventListener('storage', onStorage)
    document.removeEventListener('visibilitychange', onVisible)
  }
}
