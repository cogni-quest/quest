/**
 * OPPONENT CONFIG. Four tables, and normally only the middle two get edited:
 *
 *   ROSTER  — every King's Bounty unit and the level it fights at
 *   IMAGES  — pictures. A UNIT WITHOUT A PICTURE NEVER APPEARS IN THE GAME
 *   ASKS    — which row of the grid each opponent asks, band by band
 *   TUNING  — hand corrections where the level alone gets a unit wrong
 *
 * To add an opponent: a picture in public/monsters/, a line in IMAGES, the id
 * in the smallest pile of its band in ASKS, a name in the text pack
 * (src/locale) under the same id. Length and difficulty come from the level.
 */
import { publicUrl } from '@/assets'
import type { TaskKind } from '@/core/math'
import { t } from '@/locale'

export interface Monster {
  readonly id: string
  /** Localised display name, from `t.monsters`. */
  readonly name: string
  /**
   * Which rows of the grid this fight draws from — a pool, like `levels`, with
   * one drawn afresh for every question. Dealt out by ASKS: one row each today,
   * the run of nothing else the methodology asks for (**G8**). A row whose
   * rungs miss these levels is simply never drawn (`taskChoices` pairs kind
   * with level).
   */
  readonly tasks: readonly TaskKind[]
  /** A picture from public/monsters/. No picture, and the unit stays hidden. */
  readonly image?: string
  /**
   * The unit's King's Bounty level, 1–5, which is what the card shows the child
   * as its strength (`t.strength`).
   *
   * It happens to equal `Math.max(...levels)` — BY_LEVEL is cut so that a
   * unit's top rung is its level — and a test holds that. Carried as a field of
   * its own all the same: the child now reads this number off the screen, and a
   * number on the screen must not depend on two tables agreeing by accident.
   */
  readonly level: number
  /** How many correct answers it takes to win. */
  readonly hearts: number
  /** Which math levels (C1) the tasks are drawn from. */
  readonly levels: readonly number[]
  readonly color: string
}

/**
 * How many hearts the child has, one lost per wrong answer. Set against the
 * longest battle, not the average one: at five hearts, twenty tasks would turn
 * not into «longer» but into «harder».
 */
export const PLAYER_HEARTS = 6

// ─────────────────────────────────────────────────────────────────────────
// How a unit's level turns into a battle (G7)
//
// Math levels (C1, see docs/MATH.md):
//   1 — ± within five                    4 — two-digit, nothing carried
//   2 — ± up to ten, the ten not crossed  5 — two-digit, the units overflow
//   3 — across the ten, and whole tens to a hundred
//
// A unit's level is a King's Bounty number, 1–5; the math ladder is a separate
// list that will grow past five. BY_LEVEL is the join, and the one place to
// re-cut when it does.
// ─────────────────────────────────────────────────────────────────────────

/**
 * What a level is worth: the length of the battle, the rungs (C1) it draws
 * from, the colour of the card.
 *
 * Hearts fall as the rungs rise — twenty bonds within five is a warm-up, twenty
 * two-digit carries is an evening's work.
 *
 * **The colours are one ramp, and that is deliberate.** They used to be five
 * unrelated hues — green, teal, blue, magenta, red — chosen to be told apart at
 * a glance, which is the right choice when a colour is only a name. It is the
 * wrong one now the card prints «Слабый» in that same colour: a ramp from green
 * to brick says «harder» by itself, and five unrelated hues would have said
 * «different» while the word beside them said «harder». The cost is that
 * neighbouring levels are now closer to each other than they were, which is
 * what the word and the rank are there to settle.
 *
 * All five are kept to a middle lightness, and level 5 is a brick rather than
 * the near-black brown the ramp wants to end on: these are drawn as **text** —
 * the rank and the strength label on a selection card — over a background that
 * is off-white in one theme and near-black in the other, and a colour dark
 * enough to read on the first disappears into the second.
 */
const BY_LEVEL: Record<number, { hearts: number; levels: number[]; color: string }> = {
  1: { hearts: 20, levels: [1], color: '#3f9e4d' },
  2: { hearts: 18, levels: [1, 2], color: '#a67c00' },
  3: { hearts: 16, levels: [2, 3], color: '#c2620c' },
  4: { hearts: 12, levels: [3, 4], color: '#cf3a3a' },
  5: { hearts: 10, levels: [4, 5], color: '#8f4028' },
}

/**
 * The shortest and longest battles, read off the table rather than written
 * down beside it. TUNING can still set hearts by hand, and a slip there is how
 * a battle of forty questions would arrive.
 */
const HEARTS_PER_LEVEL = Object.values(BY_LEVEL).map((battle) => battle.hearts)
export const HEARTS_MIN = Math.min(...HEARTS_PER_LEVEL)
export const HEARTS_MAX = Math.max(...HEARTS_PER_LEVEL)

// ─────────────────────────────────────────────────────────────────────────
// IMAGES — who takes part in the game. Keyed by a ROSTER id; a unit missing
// here stays in the roster and off the selection screen.
// ─────────────────────────────────────────────────────────────────────────

const IMAGES: Record<string, string> = {
  'forest-fairy': '/monsters/fairy.webp',
  peasant: '/monsters/peasant.webp',
  robber: '/monsters/robber.webp',
  swordsman: '/monsters/swordsman.webp',
  skeleton: '/monsters/skeleton.webp',
  'skeleton-archer': '/monsters/skeleton-archer.webp',
  archer: '/monsters/archer.webp',
  priest: '/monsters/priest.webp',
  goblin: '/monsters/goblin.webp',
  imp: '/monsters/imp.webp',
  zombie: '/monsters/zombie.webp',
  'ancient-vampire-bat': '/monsters/vampire.webp',
  gorgul: '/monsters/gorgul.webp',
  gobot: '/monsters/gobot.webp',
  'adult-gobot': '/monsters/adult-gobot.webp',
  'fire-spider': '/monsters/spider-fire.webp',
  'sea-devil': '/monsters/sea-devil.webp',
  pirate: '/monsters/pirate.webp',
  'ghost-pirate': '/monsters/ghost-pirate.webp',
  'mage-slayer': '/monsters/mage-slayer.webp',
  guardsman: '/monsters/guardsman.webp',
  inquisitor: '/monsters/inquisitor.webp',
  scout: '/monsters/scout.webp',
  'sky-guard': '/monsters/sky-guard.webp',
  assassin: '/monsters/assassin.webp',
  archmage: '/monsters/archmage.webp',
  cavalryman: '/monsters/cavalryman.webp',
  pyromancer: '/monsters/pyromancer.webp',
  knight: '/monsters/knight.webp',
  paladin: '/monsters/paladin.webp',
  hyena: '/monsters/hyena.webp',
  wolf: '/monsters/wolf.webp',
  snake: '/monsters/snake.webp',
  'swamp-snake': '/monsters/swamp-snake.webp',
  bear: '/monsters/bear.webp',
  'ancient-bear': '/monsters/ancient-bear.webp',
  'white-wolf': '/monsters/white-wolf.webp',
  'frost-spider': '/monsters/frost-spider.webp',
  griffin: '/monsters/griffin.webp',
  beholder: '/monsters/beholder.webp',
  'evil-beholder': '/monsters/evil-beholder.webp',
  'royal-griffin': '/monsters/royal-griffin.webp',
  'royal-thorn': '/monsters/royal-thorn.webp',
  archdemon: '/monsters/archdemon.webp',
  giant: '/monsters/giant.webp',
  'lava-golem': '/monsters/lava-golem.webp',
  'emerald-dragon': '/monsters/emerald-dragon.webp',
  'black-dragon': '/monsters/black-dragon.webp',
}

// ─────────────────────────────────────────────────────────────────────────
// ASKS — which row of the grid each opponent asks. Then TUNING, where a unit
// can be pulled away from what its level computes.
// ─────────────────────────────────────────────────────────────────────────

/**
 * Who asks what: a pile of ids per row, grouped by level band (**G8** — why a
 * row takes a share of the roster, and why the share is even inside a band).
 *
 * Adding an opponent: its id goes in the smallest pile of its band. Bringing a
 * row back: a new key in every band — the `Record` is full, so nothing compiles
 * until each band has said what it gives the row — then take one id from each of
 * the fullest piles. «The rows are shared out evenly, band by band» in
 * Battle.test.ts holds the shares — no pile more than one ahead of another —
 * and `build` throws outright for an opponent with a picture and no pile.
 *
 * A band is the unit's level, which is also its top rung (see BY_LEVEL).
 */
export const ASKS: Record<number, Record<TaskKind, readonly string[]>> = {
  1: {
    addition: ['gobot', 'peasant'],
    subtraction: ['robber', 'skeleton'],
    'comparing-numbers': ['forest-fairy'],
    'making-a-number': ['sea-devil'],
    // Its rungs are 2 and 3; a band-1 pool is [1], so there is nothing to give.
    'missing-number': [],
    'word-problem': ['skeleton-archer'],
  },
  2: {
    addition: ['adult-gobot', 'wolf'],
    subtraction: ['hyena', 'imp', 'zombie'],
    'comparing-numbers': ['fire-spider', 'goblin', 'swamp-snake'],
    'making-a-number': ['mage-slayer', 'pirate'],
    'missing-number': ['archer', 'snake'],
    'word-problem': ['priest', 'swordsman'],
  },
  3: {
    addition: ['griffin', 'guardsman'],
    subtraction: ['bear', 'gorgul'],
    'comparing-numbers': ['frost-spider', 'sky-guard'],
    'making-a-number': ['scout', 'white-wolf'],
    'missing-number': ['ancient-bear', 'beholder'],
    'word-problem': ['inquisitor', 'ghost-pirate'],
  },
  4: {
    addition: ['knight', 'pyromancer'],
    subtraction: ['archmage', 'cavalryman'],
    'comparing-numbers': ['assassin', 'paladin'],
    'making-a-number': ['ancient-vampire-bat', 'royal-thorn'],
    // Rung 3 is in a band-4 pool, so it is asked here — at «до десяти», never higher.
    'missing-number': ['evil-beholder', 'royal-griffin'],
    // Its rungs are 1 and 2; a band-4 pool is [3, 4], so there is nothing to give.
    'word-problem': [],
  },
  5: {
    addition: ['archdemon', 'giant'],
    subtraction: ['emerald-dragon'],
    'comparing-numbers': ['lava-golem'],
    'making-a-number': ['black-dragon'],
    // Band-5 pool is [4, 5]; missing-number's rungs stop at 3.
    'missing-number': [],
    // Band-5 pool is [4, 5]; word-problem's rungs stop at 2.
    'word-problem': [],
  },
}

/** id → the rows it asks, read off ASKS once at load. */
const ASKED_BY: ReadonlyMap<string, readonly TaskKind[]> = (() => {
  const dealt = new Map<string, TaskKind[]>()
  for (const piles of Object.values(ASKS)) {
    for (const [kind, ids] of Object.entries(piles) as [TaskKind, readonly string[]][]) {
      for (const id of ids) dealt.set(id, [...(dealt.get(id) ?? []), kind])
    }
  }
  return dealt
})()

/**
 * What a unit asks when ASKS does not name it — only the picture-less ones,
 * which never appear; listing all hundred would be upkeep for nobody. The test
 * above holds the other half: a unit with a picture is dealt its row by hand.
 */
const UNDEALT_TASKS: readonly TaskKind[] = ['addition']

/** Hand corrections to what the level computes (**G7**). Empty today. */
const TUNING: Record<string, { hearts?: number; levels?: number[] }> = {}

// ─────────────────────────────────────────────────────────────────────────
// ROSTER — every unit, as id · level, ordered by level then id. The battle
// comes from the level alone; King's Bounty's combat stats are not carried.
// ─────────────────────────────────────────────────────────────────────────

type Row = readonly [id: string, level: number]

const ROSTER: readonly Row[] = [
  // Level 1
  ['dead-spider', 1],
  ['forest-fairy', 1],
  ['gobot', 1],
  ['ice-ball', 1],
  ['lizardman', 1],
  ['peasant', 1],
  ['robber', 1],
  ['sea-devil', 1],
  ['skeleton', 1],
  ['skeleton-archer', 1],
  ['slinger', 1],

  // Level 2
  ['adult-gobot', 2],
  ['archer', 2],
  ['barbarian', 2],
  ['dryad', 2],
  ['fire-spider', 2],
  ['frenzied-goblin', 2],
  ['goblin', 2],
  ['hyena', 2],
  ['imp', 2],
  ['mad-barbarian', 2],
  ['mage-slayer', 2],
  ['miner', 2],
  ['minion', 2],
  ['mocking-imp', 2],
  ['pirate', 2],
  ['priest', 2],
  ['rotting-zombie', 2],
  ['shapeshifter', 2],
  ['snake', 2],
  ['spy', 2],
  ['swamp-snake', 2],
  ['swordsman', 2],
  ['viking', 2],
  ['wolf', 2],
  ['zombie', 2],

  // Level 3
  ['ancient-bear', 3],
  ['axe-thrower', 3],
  ['bear', 3],
  ['beholder', 3],
  ['berserker', 3],
  ['cerberus', 3],
  ['cursed-ghost', 3],
  ['dark-elf', 3],
  ['druid', 3],
  ['dwarf', 3],
  ['elf', 3],
  ['frost-spider', 3],
  ['ghost', 3],
  ['ghost-gorguana', 3],
  ['ghost-pirate', 3],
  ['goblin-shaman', 3],
  ['gorguana', 3],
  ['gorgul', 3],
  ['griffin', 3],
  ['guardsman', 3],
  ['inquisitor', 3],
  ['man-eating-wolf', 3],
  ['orc', 3],
  ['scout', 3],
  ['sky-guard', 3],
  ['vampire', 3],
  ['vampire-bat', 3],
  ['white-wolf', 3],

  // Level 4
  ['alchemist', 4],
  ['amazon', 4],
  ['ancient-vampire', 4],
  ['ancient-vampire-bat', 4],
  ['archmage', 4],
  ['assassin', 4],
  ['avenger', 4],
  ['black-knight', 4],
  ['black-unicorn', 4],
  ['brontor', 4],
  ['cannoneer', 4],
  ['cavalryman', 4],
  ['darkwood-ent', 4],
  ['demon', 4],
  ['demoness', 4],
  ['demonologist', 4],
  ['ent', 4],
  ['evil-beholder', 4],
  ['executioner', 4],
  ['frost-unicorn', 4],
  ['gorgon', 4],
  ['guard-droid', 4],
  ['haiterant', 4],
  ['hunter', 4],
  ['jarl', 4],
  ['knight', 4],
  ['mystic', 4],
  ['necromancer', 4],
  ['observer', 4],
  ['orc-hunter', 4],
  ['orc-veteran', 4],
  ['paladin', 4],
  ['pathfinder', 4],
  ['polar-bear', 4],
  ['pyromancer', 4],
  ['royal-griffin', 4],
  ['royal-thorn', 4],
  ['shieldmaiden', 4],
  ['unicorn', 4],

  // Level 5
  ['ancient-darkwood-ent', 5],
  ['ancient-ent', 5],
  ['archdemon', 5],
  ['black-dragon', 5],
  ['bone-dragon', 5],
  ['chosha', 5],
  ['emerald-dragon', 5],
  ['giant', 5],
  ['jotun', 5],
  ['lava-golem', 5],
  ['nekroh', 5],
  ['ogre', 5],
  ['orc-chief', 5],
  ['t-rex', 5],
]

function build(row: Row): Monster {
  const [id, level] = row

  const base = BY_LEVEL[level]
  if (!base) throw new RangeError(`Unit ${id} has an unknown level ${level}`)

  const tuned = TUNING[id] ?? {}
  const image = IMAGES[id]

  // A unit on the selection screen must be dealt its row by hand. Letting it
  // take UNDEALT_TASKS instead would put it on addition without a word and
  // tilt its band (**G8**), and a tilted band is not something the game shows.
  const asked = ASKED_BY.get(id)
  if (image !== undefined && asked === undefined) {
    throw new RangeError(`Unit ${id} has a picture but no pile in ASKS`)
  }

  return {
    id,
    // Falling back to the id keeps a missing translation visible instead of
    // blank. A test makes sure it never actually comes to that.
    name: t.monsters[id] ?? id,
    tasks: asked ?? UNDEALT_TASKS,
    // Written as a root path in IMAGES, resolved against wherever the app is
    // actually served from — see src/assets.ts.
    ...(image !== undefined ? { image: publicUrl(image) } : {}),
    level,
    hearts: tuned.hearts ?? base.hearts,
    levels: tuned.levels ?? base.levels,
    color: base.color,
  }
}

/** The whole roster, including units that have no picture yet. */
export const MONSTERS: readonly Monster[] = ROSTER.map(build)

/**
 * Who is shown on the selection screen: units with a picture, easiest tasks
 * first — which is also longest battle first (**G7**).
 */
export function availableMonsters(): readonly Monster[] {
  return MONSTERS.filter((monster) => monster.image !== undefined).sort(
    (a, b) => Math.max(...a.levels) - Math.max(...b.levels) || a.hearts - b.hearts,
  )
}

export function monsterById(id: string): Monster {
  const monster = MONSTERS.find((candidate) => candidate.id === id)
  if (!monster) throw new RangeError(`No such monster: ${id}`)
  return monster
}

/**
 * Every monster asking `kind` at its own band `level` (1–5) — ASKS's own
 * pile, read out as monsters rather than ids. What a quest's generator
 * (**G10**) draws an opponent from: a demand names a row and a band, exactly
 * the two things a pile is already keyed on, so no second lookup table is
 * needed to answer it.
 *
 * Empty when the band has no pile for that row at all (see the comments on
 * ASKS — band 1 gives nothing to `missing-number`, for one).
 */
export function monstersAsking(level: number, kind: TaskKind): readonly Monster[] {
  const ids = ASKS[level]?.[kind] ?? []
  return ids.map(monsterById)
}
