import { useEffect, useState } from 'react'
import { onShopSpentChange, readShopSpent } from '@/adapters/storage'
import { t } from '@/locale'

/**
 * The bar across the top of every screen that is not a battle.
 *
 * It lived inside the selection screen until the menu appeared and wanted the
 * same thing — which is the only reason it is a component now. Nothing about it
 * was designed for a second caller; it was already carrying two things that
 * belong to the profile rather than to picking a fight (whose game this is, and
 * how to start over), and being locked inside one screen was the accident.
 *
 * Sticky, so it holds while a long roster scrolls under it. `.topbar` in
 * BattleGame.css says how.
 */
export function TopBar({
  name,
  gold,
  onReset,
  /** Where «назад» goes, when there is anywhere to go. The menu has nowhere. */
  onBack,
}: {
  name: string
  /**
   * Coins banked from battles won (arena or quest), all of them ever. What is
   * shown top-right is this less what the shop has spent.
   */
  gold: number
  onReset: () => void
  onBack?: () => void
}) {
  const [confirming, setConfirming] = useState(false)

  // What the shop has taken out of it. Read here rather than threaded through
  // useBattle, because this corner is the only place that shows the balance,
  // and the shop writes it on its own schedule, not the battle's.
  const [spent, setSpent] = useState(readShopSpent)
  useEffect(() => onShopSpentChange(() => setSpent(readShopSpent())), [])
  const left = Math.max(0, gold - spent)

  return (
    <header className="topbar">
      <div className="topbar__reset">
        {onBack && (
          <button className="topbar__back" onClick={onBack}>
            <span className="topbar__back-arrow" aria-hidden="true">
              ←
            </span>
            {t.nav.back}
          </button>
        )}

        {/* Wipes everything, hence two steps: a stray click must not clear the
            child's progress. */}
        {confirming ? (
          <>
            <span className="reset__ask">{t.select.wipeAsk}</span>
            <button className="reset__yes" onClick={onReset}>
              {t.select.wipeYes}
            </button>
            <button className="reset__no" onClick={() => setConfirming(false)}>
              {t.select.wipeNo}
            </button>
          </>
        ) : (
          <button className="reset__start" onClick={() => setConfirming(true)}>
            {t.select.newGame}
          </button>
        )}
      </div>

      {/* The same face that stands for the child in a battle, so the corner of
          the screen and the corner of the fight agree on who they mean. */}
      <div className="topbar__who">
        <span className="avatar avatar--user avatar--emoji" aria-hidden="true">
          🧒
        </span>
        <span className="topbar__name">{name}</span>

        {/* The gold every opponent beaten was worth, arena or quest alike, less
            what was spent in the shop — the outermost thing in the corner,
            since it is the one number here that keeps changing. */}
        <span className="topbar__gold" aria-label={t.topbar.gold(left)}>
          <span aria-hidden="true">🪙</span>
          <span className="topbar__gold-amount">{left}</span>
        </span>
      </div>
    </header>
  )
}
