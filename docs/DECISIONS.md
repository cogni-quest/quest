# Project decisions

A learning game for a child: math and reading by syllables, answered by voice.

**Last updated:** 2026-09-03
**State:** phase 3 closed on the child; reading (phase 4) is next, and the
ground for it is now clear rather than half-guessed
**What comes next:** [ROADMAP.md](ROADMAP.md)

---

## How to keep this document

- Every decision has an ID (`P1`, `T3`, `A5`). We refer to it in conversation
  and in code comments.
- A decision is never deleted, only ~~struck through~~ with a note on what
  replaced it. History beats tidiness: it explains why we are not going back to
  the rejected option.
- Every decision has a **Why** — without it the rationale is lost in two months
  and everything gets relitigated.
- Statuses: **Accepted** · **Deferred** (to be decided later, deliberately) ·
  **Open** (needs an answer) · **Replaced**.
- Updated in the same commit as the code the decision changes.
- **This is not a description of the code.** What can be read off the source
  does not belong here — the source says it better and never drifts. What
  belongs here is what the source cannot say: what was considered and rejected,
  what was tried and reversed, and why.

---

## P. Product

| ID | Decision | Status |
|---|---|---|
| **P1** | The audience is one particular 6–7 year old who already reads syllables. Not a mass-market product. | Accepted |
| **P2** | Two subjects: math (addition and subtraction up to 100) and reading by syllables. | Accepted |
| **P3** | The language of the content is Russian. | Accepted |
| ~~P4~~ | ~~Platform — an Android tablet.~~ | Replaced by **P8** |
| **P5** | Works fully offline. The internet is needed for nothing, first launch included. | Accepted |
| ~~P6~~ | ~~You cannot lose. A mistake costs stars and time, never progress.~~ | Replaced by **P10** |
| **P10** | A battle can be lost; progress cannot. | Accepted |
| **P7** | A session runs 10–15 minutes, then a gentle «that's enough for today». | Accepted |
| **P8** | The platform is a **PC** (a Windows laptop). A desktop application with a shortcut. | Accepted |
| **P9** | **Math answers are spoken.** That is not an input method but a skill being trained. | Accepted |

**P5 — why.** No network dependency of any kind: no privacy question, no API
bill, no «the internet is down, so no practice today».

**P10 — why it changed.** The battle format (**G6**) needs losing to mean
something: hearts that cannot be lost are not hearts. The original worry has not
gone away — at six, losing means tears and refusing to play tomorrow — so the
price of a defeat is confined to the battle itself: nothing is taken away, a
rematch sits in the result window, **C4** quietly eases the tasks when it gets
hard, and **C5** costs no heart. The battle can be lost; nothing rolls back.

**P8 — why.** A tablet was the original plan, but the game moved to the laptop
the child works at. The side benefit is large: the processor handles speech
recognition with room to spare, and a whole layer of work goes away with
Android — SDKs, signing, screen sizes, rotation, gestures.

**P9 — why.** This was the first requirement of the project. The consequence
drawn from it was **T5**: the fallback input is **not shown** by default,
because with number buttons permanently in view the child will press buttons —
they are easier — and the whole point of the exercise is lost.

**P9 stands; T5 did not (2026-09-01).** The buttons are on screen for every task
now (**T18**), and the reasoning above is not retracted — it is a real risk being
run on purpose. What changed is that hiding them cost more than it protected:
recognition is slow and fallible, and **T5** made every mishearing an answer the
child could not take back. Speaking is still the way in — the microphone is live
first and needs no press — but it now fills a field instead of answering for the
child.

---

## T. Technology

| ID | Decision | Status |
|---|---|---|
| ~~T1~~ | ~~Engine — Unity 6 LTS, C#, 2D.~~ | Replaced by **T9** |
| ~~T2~~ | ~~`Game.Core` on netstandard2.1.~~ | Replaced by **T10** |
| **T3** | Speech recognition — **Vosk**, offline. The **vosk-browser** build (WebAssembly), with the model held locally. | Accepted |
| **T4** | Vosk runs in **grammar mode**: a closed list of expected words instead of the whole language. | Accepted |
| ~~T5~~ | ~~The fallback input (keyboard) is **hidden by default** and slides out only after two misses.~~ | Replaced by **T18** |
| ~~T6~~ | ~~Narration — Android TTS.~~ | Replaced by **T12** |
| ~~T7~~ | ~~Storage — JSON in `Application.persistentDataPath`.~~ | Replaced by **T13** |
| ~~T8~~ | ~~Development loop — Play Mode, Device Simulator, emulator.~~ | Replaced by **T14** |
| **T9** | The stack is **TypeScript + Vite + React**. | Accepted |
| **T10** | The core (`src/core`) is written in TypeScript and depends on **neither** React, nor the DOM, nor the browser. | Accepted |
| **T11** | The playfield is **DOM and CSS animation**, with no canvas engine. | Accepted |
| **T12** | The teacher's narration is the Windows system synthesiser through the Web Speech API, **local voices only**. | Accepted — **silent since 2026-09-01** while the voice is replaced (**O2**) |
| **T13** | Storage is local to the browser, and after packaging a file next to the `.exe`. No database, no cloud. | Accepted |
| **T14** | Packaging is **Electron**, producing an `.exe` with a shortcut. Development still happens in plain Chrome. | Accepted |
| **T15** | Tests are **Vitest**. The core runs in the node environment, browserless, in a second. | Accepted |
| **T16** | The recognition grammar gets the **whole range of plausible answers**, not just the correct one. | Accepted |
| **T17** | The model is **`vosk-model-small-ru-0.22`** (44 MB). The choice was not free: see below. | Accepted |
| **T18** | The pad is **always on screen**. Voice and fingers fill one and the same field, and **only a button press sends it**. | Accepted |

**T9 — why.** UI/UX priority decided it. Interface quality is a function of how
many iterations you get: how many times you moved the button, tweaked an
animation's timing, changed the pause before the praise. In a browser an edit is
visible instantly; in Unity, after a domain reload. Across a hundred iterations
that compounds into a different level of polish.

Dropping C# was deliberate: browsers and C# barely go together for games. Unity
WebGL does not support the `Microphone` class at all, Godot cannot export .NET
assemblies to the web, and Blazor is not a game engine.

**T11 — why.** The game is 80% interface: numbers, syllables, buttons, a map.
DOM and CSS make all of that simpler and debuggable in DevTools. Canvas will
only be needed for the character (**A10**) and possibly for effects — in
specific places, not as the foundation.

**T14 — why.** The child needs a double-click on a shortcut, not a command in a
console. Electron gives us our own window with no address bar and no tabs, the
microphone behaves as it would in a native app, and the internet is not needed
even on first launch. Inside it is always the same Chromium — no «it worked on
my machine». Tauri is lighter (5 MB against 150) but drags in Rust; on a PC
those 150 MB do not matter.

**T16 — why.** An easy trap to fall into: hand Vosk a one-word grammar of
«пять» and it will hear «пять» in anything at all — in «четыре», in a cough. The
child would always be right and the game would stop teaching. So the list gets
every number in the range of the level, plus the `[unk]` token for «that was
something not on the list».

**T17 — why, and this matters.** Found out during implementation: **only
`small` Vosk models support a dynamic grammar.** Bigger models are more accurate
on free speech but will not accept a grammar at all. Which means the choice
between «small or accurate» (**O1**) never existed: a grammar (**T4**, **T16**)
over a closed vocabulary of 11–101 phrases beats what a big model would give
over the full one. We take the small model and do not look back.

**T18 — why it replaced T5.** Recognition is slow and it is not always right.
Both were known and both were budgeted for, but the shape **T5** gave them was
wrong: the child says a number, waits out the pause the recogniser needs to
decide they have stopped talking, and then finds out that what arrived was
already an answer — scored, a heart gone, and no way to say «no, not that». Two
misses had to pile up before there was any other way in at all.

So the two jobs recognition was doing get separated. It **fills the field**; it
does not **answer**. A mishearing now sits in plain sight and is erased instead
of costing a heart; a miss is not even an attempt, so **C5** has nothing left to
forgive; the wait stops being a wall, because the pad is right there; and a dead
microphone costs the mic line rather than the battle, since voice is no longer
the only way in.

**What it costs, and it is the real cost.** **P9** said the buttons must stay
hidden precisely so the child would not reach for the easy way. That protection
is gone, and it was not imaginary. What is kept in its place is smaller but not
nothing: the microphone is always live and always first, the mic line above the
pad asks out loud («🎤 говори»), and voice fills the field faster than ten
presses do. If the child settles into typing anyway, that shows up in play — and
the answer to it is a rule about the pad, not the return of a hidden one.

---

## A. Architecture

### A1. The dependency rule — **Accepted**

Arrows point inward only. The outer layer knows about the inner one, never the
other way round.

```
Theme (data)            characters, colours, lines, sounds
      ↓
Gamification            battle, HP, stars, coins, the map
      ↓                 listens to events, affects nothing
UI (React)              show the task, take the answer
Adapters                voice, keyboard, speech synthesis, storage
      ↓
core                    pure TypeScript, zero dependencies
                        Exercise · Session · Progression · Ports
```

**Why.** The mini-games come first and gamification is hung on later (**G1**).
The theme can change from «wizard against a monster» to space. So the core must
know nothing about the battle, or the theme, or React.

**The stress test:** there is not one import from `react`, from a DOM API or
from an adapter anywhere in `src/core`, and the core tests pass in node without
a browser. The day that stops being true, the architecture has leaked. It used
to be checked by hand, which means checked once; it is now enforced by
`src/architecture.test.ts` (the import half) and `tsconfig.core.json` (the DOM
half, by typechecking the core against a `lib` with no DOM in it). Both are
described where they run — see the README — and both were built default-deny on
purpose: three holes were found while writing them and all three were the same
mistake, a ban-list where an allow-list was needed.

Two limits worth knowing, so they are not rediscovered as bugs. `src/game`
cannot join the DOM-free project even though it is browser-free in spirit: it
reaches `src/assets`, which needs Vite's `import.meta.env`, and typing that
pulls `vite/client` and the whole DOM with it. And node's own globals stay
reachable, because vitest's types carry a hard `/// <reference types="node" />`
that no `types` setting suppresses — which is all this invariant claims anyway:
the core runs in node without a browser.

Text is the single deliberate exception, and a narrow one: `core/math/numerals`
takes number words from `src/locale`. The text pack is pure data with no React
and no DOM, so the invariant above is untouched.

### A2. `Exercise` — one task type for every subject — **Accepted**

`src/core/exercises/Exercise.ts`. Today every task is math: arithmetic
(`2 + 3`), an equation with a hole (`□ + 2 = 5`), a comparison (`5 □ 7`).

**Why.** Every subject produces the same type. Which means the session engine,
progress, mistake review and all of gamification are written once and work for
whatever comes next.

What reading will add — a plan, not a type that exists:

| Task | Prompt | Answer |
|---|---|---|
| read aloud | `["МА","ШИ","НА"]` | the spoken word |
| build the word | 🔊 «машина» | a sequence of syllables |
| catch the syllable | 🔊 «ШИ» | a pick among options |

**The placeholder shapes were taken out on 2026-08-31.** `ExercisePrompt` used
to carry `syllables` and `spoken` variants, `AnswerAttempt` a `sequence` one,
and `Subject` a `reading` member — none of them reachable, all of them forcing
four exhaustive switches to say something about a subject nobody had designed.
Guessing the shape of reading a phase early only guarantees the design has to
fit what math happened to need. The seam itself is untouched: nothing above
`Exercise` names a kind of prompt, so reading adds variants here and changes no
layer above.

### A3. `AnswerInput` — the way to answer plugs in independently — **Accepted**

The port is `src/core/ports/AnswerInput.ts`, implementations are in
`src/adapters/input`.

**Why.** Voice is just one of the inputs. Until recognition is ready we play
with the keyboard; once it is, we add it to the list without rewriting the
mini-game.

**A clarification from phase 3.** The port describes an input the game **asks
and waits for**: «listen for the answer to this task». Voice fits perfectly. The
keyboard works the other way round — the child types when they feel like it, and
there is no telling when. Forcing it into the same shape means wrapping a
promise around component state for the sake of a symmetry that buys nothing.
So: **voice implements the port, the keyboard answers the session directly.**

**Where they meet, since T18.** They used to race and whichever arrived first
counted; they now write to the same place. The loop holds one **draft**, both
fill it, and a button press turns it into an attempt — so the port's return
value is no longer an answer but a reading. Nothing about the port had to change
for that, which is the point of having one.

Reading will keep the same split: «read aloud» through the port, «build the word»
and «catch the syllable» directly.

### A4. `SessionObserver` — the seam gamification will plug into — **Accepted**

`src/core/session/SessionObserver.ts`

**Why.** Today there is one subscriber — the «3 of 8» bar. Tomorrow
`BattleReactor`, `CoinReactor` and `StarReactor` stand beside it. The mini-game
does not change by a line. All methods are optional — a reactor implements only
what interests it.

### A5. The exercise hands out its own recognition grammar — **Accepted**

The `VoiceAnswerable` interface in `src/core/exercises/AnswerSpec.ts`: answer 5
at level 1 yields `["ноль","один",…,"двадцать"]` (the whole range, see
**T16**); the word «машина» would yield it plus its three or four rivals.

**Why.** Vosk gets exactly the list of words it needs (**T4**), while the voice
adapter knows nothing about arithmetic or about syllables. For reading this is
especially strong: the word on screen is known in advance and has three or four
rivals, so accuracy is close to perfect.

### A6. The theme is data, not code — **Accepted**

`src/theme` when it exists — the description of a set: characters, opponents,
colours, sounds, lines. The folder is phase 5/6 work and is not created yet.
What already works this way is `src/game/monsters.ts` — pure data, no logic, one
row per opponent — and `src/locale/ru.ts`. So the decision is not merely drawn:
half of it is load-bearing already.

**Why.** Changing the setting = a new theme file plus an asset folder, with no
code edits. Which is what lets **G2** stay open for months without technical
debt.

### A7. Answer time is always measured — **Accepted**

The `elapsedMs` field on `AnswerResult`.

**Why.** The core merely counts. Rewarding speed, punishing slowness or
ignoring both is for the gamification reactor to decide. That takes the timer
question (**G4**) off the critical path: change our minds and it is an edit in
one class.

### ~~A8. The C# solution layout~~ — **Replaced by A9**

### A9. Project layout — **Accepted**

A hexagonal layout: the core declares **ports** (what it needs from the world)
and the outer layer supplies **adapters** (how it is done). The core can be
tested with stand-in adapters, and the real ones can be swapped without touching
the logic. If vosk-browser disappoints, for instance, one file in
`adapters/speech` changes.

The folder-by-folder tree is in the [README](../README.md), and is not copied
here — the copy that used to stand here still had the project at its old path
months after it moved, which is what a duplicated tree is worth.

Folders the plan calls for and the tree does not have yet: `src/theme/`
(**A6**, phase 5/6), `src/core/reading/` (phase 4), `electron/` (**T14**, phase
7). They stood as empty placeholders until 2026-08-31 and were removed — an
empty folder documents nothing this file does not say better, and a `.gitkeep`
in a folder that has since filled up is just litter.

### A10. The teacher lives behind an abstraction — **Accepted**

The character is drawn through a single interface, behind which a Rive file, a
GLB model or sprites live equally well. The game does not know which.

**Why.** A 3D character is realistically achievable through AI today (mesh
generation in Meshy/Tripo → auto-rigging in Mixamo → animations from there).
But AI is strong at making a mesh and weak exactly where a «teacher» lives:
lip-sync and expressive reactions. Rive, on the other hand, gives handmade
expressiveness cheaply, and its state machine maps onto **A4** events almost
literally. There is no reason to decide in advance — behind the abstraction the
switch costs one file. See **G5**.

---

## C. Learning content

| ID | Decision | Status |
|---|---|---|
| **C1** | Math — one ladder of levels, five of them today, open upwards. | Accepted |
| **C2** | Reading — three alternating mechanics. | Accepted |
| **C3** | Failed tasks come back after 1 / 3 / 7 sessions. | Accepted — wired, not switched on: the queue is filled and saved, never read back |
| **C4** | Three mistakes in a row → the difficulty quietly drops a step. The child does not see it. | Accepted |
| **C5** | **«Did not catch that» is not a mistake in the problem.** | Accepted |

### What the levels actually are

**C1** is elaborated in **[MATH.md](MATH.md)** — the math ladder, level by level
and row by row, methodology only. It is kept there and not here on purpose. The
two used to be copies of each other, and copies drift: the level 2 row in this
document described «± up to 20 without crossing the ten» long after the code had
settled on two operations within ten. This section holds the decision — that
there is one ladder, shared by the rows that ride it — and the catalogue holds
what its rungs contain.

**Five rungs is where it stands, not how long it is.** Grades 1–2 end at
two-digit carrying, so the ladder ends there for now; multiplication, three-digit
numbers and the olympiad questions are rungs six and upwards, added by appending
rather than by re-cutting. Nothing may treat five as the top: the code reads the
ends off the list of rungs (`FIRST_LEVEL`, `LAST_LEVEL`), and the one place that
ties an opponent's difficulty to a rung — `ASKS`/`BY_LEVEL` in
`src/game/monsters.ts`, which joins a King's Bounty unit level to the math
ones — is the one place that has to be re-cut when the ladder grows.

**C2** has no such document. It gets one on its own terms when it is designed,
beside `MATH.md` rather than inside it — the same reason the placeholder types
came out of the code (see **A2**).

**Why three reading mechanics and not one.** Only one of the three needs a
microphone. If syllable recognition turns out weak — a short «ма» is recognised
noticeably worse than «пять» — reading stays playable anyway.

### C5 — why

If recognition did not manage, that is the equipment's problem, not the
child's. Such an attempt takes no star, does not enter the review queue and does
not count as an error. The teacher says «oh, I did not catch that, say it
again». Otherwise the child is punished for the quality of a microphone and
concludes that they are bad at counting.

Encoded in the types: `AnswerAttempt` has a separate `unrecognised` variant, and
`Verdict` a separate value beside `correct` and `wrong`. **Since T18 the types
have less to forgive**, and `unrecognised` no longer reaches the session from a
battle at all. Both stay: the variant is how the decision is written down, and a
way to answer that can miss will come back the moment reading (**C2**) needs one.

---

## G. Gamification

| ID | Decision | Status |
|---|---|---|
| **G1** | Self-sufficient mini-games first; gamification is hung on top later (through **A4**). | Accepted |
| **G6** | The format is a **Mortal Kombat style battle**: hearts on both sides, fought to a win, a result window. | Accepted |
| **G7** | A monster's battle comes from its **level**: how many tasks it runs to, and which math rungs they are drawn from. The harder the tasks, the shorter the battle. | Accepted |
| **G8** | A row coming back takes a **share of the roster**, not a share of every battle: opponents are dealt out between the rows — an equal share inside each level band — so one battle is a run of one row. The split is **probation and dissolves** once the row has proved itself. | Accepted |
| **G9** | A battle takes on **one to five** opponents. Squads are **written in the config**, not assembled on the screen. In order they are a **gauntlet**; shuffled, every question comes from a survivor drawn afresh. Each keeps its own hearts. | Accepted |
| **G10** | A second game beside the arena: the **quest**, a path of opponents walked in order to a mini-boss. The arena is a free pick, a path is a sequence somebody else chose — and choosing it is meant to become the **parent's**, through a list of demands a generator lays out. | Accepted |
| **G2** | The setting: wizard against a little monster / space / something else. | **Open** — phase 6 |
| **G3** | The cast of teacher characters. | **Open** — the child may pick them |
| **G4** | A timer on answers: speed bonus / hard limit / no clock. | **Deferred** — taken off the critical path by **A7** |
| **G5** | The teacher: 3D through AI, or 2D through Rive. | **Open** — phase 5, behind abstraction **A10** |

**G6 — how it works.** The child and their hearts on one side, the opponents and
theirs on the other — one of them, or up to five (**G9**). A correct answer takes
a heart off whichever one is asking, a mistake off the child, and the battle runs
until the child runs out or every opponent does. It is
implemented as an ordinary `SessionObserver` (`src/game/Battle.ts`): delete the
class and the math carries on, which is exactly what the **A4** seam was
conceived for. Because a battle's length is not known in advance,
`ExerciseSession` had to learn to run until stopped from outside.

**The battle works against olympiad tasks, and level 5 is olympiad-flavoured.**
A mistake costs a heart (**P10**), and three in a row quietly ease the
difficulty (**C4**) — so a child who reaches for something hard is punished for
reaching and then steered back down. Both mechanics are right for drilling
fluency and wrong for a question meant to be puzzled over. That column probably
wants a home outside the battle; deciding where is phase 6 work. Recorded here
rather than in the math catalogue, because it is a fact about the format and not
about the mathematics.

**G7 — why the two dials turn together, and in opposite directions.** Length
and difficulty are still two different things, but they are no longer set
independently: both are read off the unit's level.

| Unit level | Tasks | Levels (C1) | What it plays like |
|---|---|---|---|
| 1 | 20 | 1 | long and easy — the bonds within five, drilled |
| 2 | 18 | 1–2 | the same, up to ten |
| 3 | 16 | 2–3 | the ten, crossed and counted whole |
| 4 | 12 | 3–4 | two-digit, and it starts to cost |
| 5 | 10 | 4–5 | short and heavy — carrying |

Hearts used to come from the unit's **health** on a log scale, and that is where
«two independent dials» came from: a tough unit made a long battle. It balanced
the wrong thing. Health is a King's Bounty number tuned for King's Bounty
fights, and it made the hardest opponent the longest one as well — thirty-five
two-digit carries for an ancient ent, against six sums within five for a
peasant, which is exactly backwards.

Easy tasks are quick and the point of them is repetition, so the easy rungs are
the long ones. Two-digit carrying is slow and expensive to hold, so the hard
rungs are short. A child meets roughly the same number of minutes either way.

`TUNING` remains the way to pull one unit away from its level — hearts
included — and it is empty today: every unit takes its battle from its level.

**G8 — why a row comes back across the roster rather than inside every battle.**
Rows sit parked (see [MATH.md](MATH.md)) and the methodology says how one
rejoins: given on its own for a while first, because a run of nothing else says
plainly whether it is understood or merely guessed. The question that leaves open
is what «a while» is made of, and there were three answers. Emptying every pool
down to the new row obeys the rule most literally, at the price of a session
with no addition in it. Putting the row straight into every opponent's pool skips
the run entirely. We split the roster instead: **a battle is already a run of one
row** — ten to twenty tasks of nothing else (**G7**) — so a subtraction opponent
gives the rule what it asks for, while the child who fights the next one is back
on addition without a line of config changing. The mix moves up a level, from
within a battle to across a session.

**The split runs across each level band, never between them, and inside a band
the shares are equal.** Splitting by level instead — the easy opponents add, the
hard ones subtract — would quietly make «subtraction» a name for «a certain
difficulty», and **G7** has two dials already; a third one hidden inside the
choice of row would tangle all three. Equal shares are the same argument taken to
the end: a row given four opponents of a band against another row's one is a
softer version of the same lie about difficulty.

The dealing is one hand-written table (`ASKS`), grouped by band, because the band
is what has to come out even and so is what you read when you rebalance. Piles
rather than a rule: faction was the tempting rule — the undead and the demons
take away — and it does not divide (at level 2 they are two opponents out of
ten); round-robin off the roster would be even for free but would move an
opponent from one row to another every time a neighbour is added. A table alone
cannot hold the rule either, since nothing about a roster row says which pile it
belongs in, so a test does: no pile more than one ahead of another in its band,
and no opponent on the selection screen missing from the table.

**The split is the probation, not the destination — and this is the part to
remember.** It contradicts a standing rule of the methodology, which says a task
is drawn afresh for every question precisely so the child cannot settle into one
operation and stop reading (see «Mixed, not blocked» in [MATH.md](MATH.md)).
Inside one battle they now can. That is the price of the run, paid on purpose and
only for as long as the run is worth having: when a row has shown it is
understood rather than guessed, it joins every opponent's pool, the split
dissolves, and the rule holds again at the level it is written at. Left standing
past that point, this decision turns into blocks wearing the costume of variety —
so it is a decision with an end, not a permanent arrangement.

Two consequences worth stating rather than discovering.

**A card does not say which row it asks.** The row comes with the character, the
way its length and its rungs do, and the child picks by the picture. Whether that
matters is an open question, not a settled one: if a session turns into a lottery
the child is frustrated by, the cheap fix is a `+` or `−` on the card. That is a
sign, not the sentence of `battleHints` that came off the cards on 2026-09-01 —
the objection then was to a label repeating what the card already showed, and the
row is not something the card shows.

**A subtraction opponent is harder than an addition one at the same level.** The
rungs are shared — one generator, one table, `13−6` sitting on the same rung as
`8+5` — but borrowing is harder than carrying for a six-year-old, and the level
number says «which arithmetic», not «how hard the child will find it». Nothing in
the tables is corrected for it: **C4** absorbs it inside the battle, easing the
rung down after three misses in a row. If it turns out to need more than that,
the honest fix is the level table, not a fudge in the roster.

**G9 — why the two modes are the G8 question asked one level down.** A battle was
one opponent because a battle was one row of the grid, so putting several
opponents on the other side puts several rows there, and the order they ask in
decides whether the child meets them blocked or mixed. In order, one opponent
holds the arena until it is beaten: a gauntlet, which is several runs of one row
back to back — exactly what **G8** asks for, at the tempo of one sitting rather
than one a week. Shuffled, the next question comes from whoever is drawn, which
puts «mixed, not blocked» (see [MATH.md](MATH.md)) back inside a single battle.
That is where **G8** says it is heading once the parked rows are all back, and a
shuffled squad gets it there early — so the dissolution of the split becomes
something to try on the child rather than something to schedule.

**Squads are written in the config; a builder on the screen was tried and
reversed.** The first pass gave every roster card a «+ в отряд» button and a bar
along the bottom to gather five in. It went out the same day for one reason:
**what makes a squad worth fighting is its mix of rows, and the mix is not
visible on a card**. A child pressing «+» four times picks four pictures, and
whether the result asks three rows or one row three times over is invisible to
them and uncheckable by us. Written as lineups instead, a group can be aimed and
a test can hold the rule that each covers as many rows as it has slots. What that
cost is the child's freedom to field any five they like, which is a real loss and
not a rounding error.

**Hearts are not divided by the size of the squad.** Dividing them was the
alternative — it would keep a squad the length of a single battle and make it
purely a choice of mix — and it was turned down because a squad plainly means
fighting that many opponents, and **G7**'s table has to keep meaning what it
says. The price is that the groups run forty to seventy tasks against the ten to
fifteen minutes **P7** asks for, and it is no longer the child's price to choose:
while squads were assembled by hand the length was theirs, and now we write it.
That is the one thing here to watch on the child. If it bites, the fix is a cap
on a squad's total beside its lineup, not a fudge in `BY_LEVEL`.

**Beating every member is not beating the group.** A squad is struck through for
a tally of its own, and the tempting shortcut — deriving it from whether all its
members have been beaten — is wrong: four duels are four battles and no group
faced. Which also splits «Побед» from the per-opponent tally it used to be summed
out of, since a win over four opponents is one victory.

**A squad is drawn as a hand of the roster's own cards, and nothing else.** It
was a wide card of its own with the members shrunk to portraits inside it, which
made it a card of cards — a thing that has to be explained before it is read. A
hand explains itself: these are several opponents, each is the card the child
would meet that opponent on alone, at the size they meet it, and the fan shows
how many. The rank sits in the top-left corner of a card, so a closed hand still
reads out every member's level down its left edge.

Everything the frame used to carry went with it — the group's name, its own
strength, the word for how it takes turns. That is a deliberate loss and one of
its parts is worth naming: **a gauntlet squad would now look exactly like a
shuffled one.** All four are shuffled today so nothing is hidden, but the day a
lineup sets `shuffle: false`, the screen will have no way of saying so, and the
wording will have to come back in some form.

**A card still does not say which row it asks**, and a squad makes that matter
more rather than less: picking one is now how the child picks a mix of rows, and
they pick it blind. The cheap fix named under **G8** is the same fix here.

**G10 — why a second game rather than a second roster.** The arena answers «who
do you want to fight?» and the child answers it. That is right for practice they
choose to do, and it is exactly wrong for practice somebody has decided they
need: a child who finds subtraction hard will not pick the subtraction cards. The
quest is the other half — a path laid out in advance, walked from one end to the
other, with no way round anything on it.

The point of laying it out is that **a parent will lay it out**. The plan is a
list of demands — «сложение 1, сложение 1, вычитание 1» — and a generator that
finds opponents asking those rows at those rungs and puts them on the road. That
is what makes this worth being a game rather than a second list: it is the seam
through which somebody who knows what the child is struggling with can say so.

**The generator is built; the parent's list is a JSON file, one per path.**
`src/game/quests.ts` reads every file under `src/game/quests/` — named
`<order>_<id>.json`, `quests/README.md` has the shape — and resolves each
demand (`{ kind, level }`, a row and a band) into the opponent asking it,
drawn from the very `ASKS` pile the arena reads (`monstersAsking` in
`monsters.ts`). A demand asked twice in one file draws two different
opponents from the pile, where the pile has more than one to give, rather
than the same picture twice in a row. A stop with several demands becomes a
squad rather than a duel — assembled by `assembleSquad`, the same function the
hand-written arena squads (**G9**) are built with — and the last stop in a
file is always the boss; nothing marks it, its position does. Nothing here
names a monster by id, so a quest and the arena can never disagree about who
asks what. What was settled first, and stands unchanged, is what a path *is* —
the generator fills that shape rather than replacing it.

**A lost battle costs the stop, not the walk.** The child stays where they are,
everything behind them stays behind them, and «Реванш» in the result window
starts the same fight again — the same rule **P10** already sets for the arena,
which exists because at six a defeat that takes something away means tears and a
refusal to play tomorrow. Progress is a count of stops cleared rather than a set
of them: a path is walked in order, so the third stop is reachable only through
the first two, and «which ones» is the same fact as «how many».

**Only the stop the child is standing on can be pressed.** Ahead of it is locked
because a path with a way round it is a roster; behind it is not offered because
replaying a stop would move nothing. A finished path stays on the screen struck
through, and opens again at its start — nothing here is spent by being played.

**One thing to watch, and it is the same one G9 has.** A path is thirteen battles
of ten to twenty questions each. That is far past the ten to fifteen minutes
**P7** asks of a sitting, so a path is meant to be walked across several — which
is what saving the progress is for, and what has not yet been tried on the child.

### A sketch (not a decision, a starting point for phase 6)

- **The core is «the duel».** The child and the teacher against a little
  monster. A correct answer = a hit. A mistake = the teacher raises a shield, no
  damage, the battle simply lasts longer, and a hint appears right away.
- **Stars:** 3 ⭐ for a clean run, 2 ⭐ for one or two mistakes, 1 ⭐ for finishing.
- **Streaks.** Three correct in a row and the pet joins in and attacks by
  itself. The child aims for streaks, which is exactly what building fluency in
  counting requires.
- **Collecting.** Coins → teacher costumes, pets, decorations for the house. At
  six, collecting beats any number of points.
- **A journey map** across the levels of **C1**: Ten Meadow → Twenty Forest →
  The Crossing Cave → Round Mountain → Hundred Castle.
- **A parent screen** behind a PIN: what is hard, how long was practised,
  progress by week.

---

## Open questions

| ID | Question | When we decide |
|---|---|---|
| ~~O1~~ | ~~Which Vosk model: small or accurate~~ — **closed**: there is no choice, only small models support a grammar (**T17**) | closed 2026-08-29 |
| **O2** | A human narrator instead of the system synthesiser (**T12**) — the synthesiser is unplugged in the meantime, so the game speaks nothing at all | next voice, whichever it turns out to be |
| **G2** | The setting | phase 6 |
| **G3** | Who the teacher characters are | phase 5, possibly with the child |
| **G4** | A timer on answers | phase 6 |
| **G5** | 3D or Rive for the teacher | phase 5 |

**On going back to a tablet.** The game stays a web application, so the same
code will open from a link in a browser and can be wrapped into an Android APK
(through Capacitor) if we ever want to. The door is not shut, but we are not
working in that direction now.

---

## Technical debt

Deliberate simplifications. Not to be forgotten, but not to be fixed early
either.

| What | Why it is like this for now | When to fix |
|---|---|---|
| `ScriptProcessorNode` in `VoskRecognizer` is deprecated | AudioWorklet needs a separate worklet file and is noticeably more complex; this works in Chromium | phase 3, if audio artefacts turn up |
| A 6 MB bundle: the Vosk WASM build is inlined whole | it loads instantly on a local machine, there is nothing to optimise | phase 7 — a lazy import, so the window draws before the model loads |
| The silence thresholds in `VoskRecognizer` are set by feel | retuned on live play 2026-08-30 (the child was being asked to repeat while still thinking), but never measured numerically | when misses come back; the rig logs milliseconds per attempt |

---

## Changelog

One line per change: what moved, and which decision it touched. What the code
actually did is in `git log`, which says it better.

| Date | What |
|---|---|
| 2026-08-28 | Document created. P1–P7, T1–T8, A1–A8, C1–C4, G1 recorded. Stack: Unity + C# + Android. |
| 2026-08-28 | **Stack replayed:** Unity/C#/Android → web/TypeScript/Electron/PC. P4→P8, T1→T9, T2→T10, T6→T12, T7→T13, T8→T14, A8→A9; added P9, T11, T15, T16, C5, A10, G5. |
| 2026-08-29 | Phase 0 closed, phase 1 started: Russian numerals, the `VoskRecognizer` adapter, the measuring rig. Added **T17**, closed **O1**, opened the technical-debt section. |
| 2026-08-29 | **Phase 1 closed: voice works, P9 stands.** Generators for five levels, `ExerciseSession`, `ReviewQueue`, `DifficultyAdapter`. |
| 2026-08-29 | **Phase 2 closed:** `Profile` and the storage adapters. `Profile` subscribes to a session as an ordinary `SessionObserver`, which doubles as proof the **A4** seam works. |
| 2026-08-29 | **Phase 3 assembled:** a playable math screen with voice input, narration, fallback input, a stand-in character. **A3** clarified — the port is for an input you ask; the keyboard answers directly. |
| 2026-08-29 | **The format became a battle (G6, G7).** P6 replaced by **P10**; `src/game/` added; `ExerciseSession` learned sessions of unknown length. |
| 2026-08-30 | **Renamed to CogniQuest.** The save prefix went `smartkid:` → `cogniquest:` with no migration — the progress under the old name was deliberately let go. |
| 2026-08-30 | **Carrying across the place became level 4.** It was generated nowhere before: level 3 forbade it and the old level 4 kept one place per step, so the central skill of the second year had fallen through the ladder. |
| 2026-08-30 | **The math ladder rebuilt to the grades 1–2 grid**, each step adding exactly one difficulty. Round tens stop being a level of their own; subtraction moves with addition because they share one table. Catalogue: [MATH.md](MATH.md). |
| 2026-08-30 | **Phase 3 closed on the child.** A battle fought through by voice start to finish, then a request for another — **P9** survives contact with its only user. The ask for new characters pulled the **G3** conversation forward. |
| 2026-08-30 | **Localisation.** Everything the child sees or hears moved into `src/locale/ru.ts`; code, comments, tests and documents became English, and the decision IDs moved from Cyrillic to Latin (П→P, Т→T, А→A, К→C, Г→G, О→O). |
| 2026-08-30 | **Missing number added** — a base sum with one operand hidden (`□+2=5`), so it rides the addition ladder rather than defining its own. New `equation` prompt shape; the answer is still a number, so the judge and grammar are unchanged. |
| 2026-08-31 | **Comparing numbers — the first answer that is not a number.** **A5** carried it without a change, since the exercise was already handing out its own grammar. Two facts to watch: three words is a very short recognition list, and three answers can be guessed one time in three. |
| 2026-08-31 | **Missing number given its own ladder**, and both new rows went into every opponent's default pool. Zero operands dropped — no `7+□=7`. |
| 2026-08-31 | **A1 stopped being a promise and became a test** (`src/architecture.test.ts`, `tsconfig.core.json`). Three holes were found and closed while building it, all the same mistake — default-allow; the last of the three came from outside review. |
| 2026-08-31 | **The reading placeholders taken out** of `ExercisePrompt`, `AnswerAttempt` and `Subject`, with the four exhaustive switches that existed only to say «nothing to show here». `Profile` lost its unused per-subject level ladder with them. `PROFILE_VERSION` deliberately **not** bumped: `fromJSON` hands back an empty profile on an unknown version, so a bump would have wiped the child's progress to tidy a key nothing reads. |
| 2026-08-31 | **`EXERCISES.md` became [MATH.md](MATH.md)**, methodology and math only — a catalogue of what a child is asked should read the same whether the game around it is a battle, a map or nothing at all. The one format fact worth keeping moved to **G6**. |
| 2026-08-31 | **Every row but addition parked**, to be put back one at a time, while the game is cut back to one thing that can be watched working. Generators, rules and tests are untouched and stay green; only the task table forgets them. |
| 2026-08-31 | **The ladder re-cut around two-digit work, and declared open upwards (C1).** Two rules made explicit: a rung must not be able to draw the rung below it, and the answer range travels with the problem rather than the level number. Missing number gave up the ladder it was granted a day earlier — a second ladder was a second thing to keep in step, and it fell out of step at the first re-cut. Zero stays on level 1. Catalogue: [MATH.md](MATH.md). |
| 2026-09-01 | **A battle's length comes from the level, not from King's Bounty health (G7).** `heartsFromHealth` is gone; health stays in the roster as reference data and out of the battle. |
| 2026-09-01 | **The teacher went quiet, on purpose (T12, O2).** Every spoken line goes to `SilentTeacher`, an implementation of the `TextToSpeech` port that drops what it is given — one line, where tearing the voice out would have been the loop, the text pack and the port. `WebSpeechTts` stays in the tree, unused, as the worked example. |
| 2026-09-01 | **The pad came out of hiding, and the voice stopped answering (T18, replacing T5).** The draft moved up into `useBattle` because two things write to it, `Promise.race` between voice and keyboard is gone (**A3** amended), and a microphone that dies now costs the mic line rather than the battle. |
| 2026-09-01 | **Subtraction is back, and G8 says how any parked row comes back.** The row needed no design: it shares one table and one generator with addition, so switching it on was four uncommented lines and no import. What needed deciding was how a row rejoins play — by taking a share of the roster. Catalogue: [MATH.md](MATH.md). |
| 2026-09-01 | **Comparing numbers is back, re-cut to five rungs (G8).** Rungs 3–5 compare **sums** rather than bare numbers, because the numerals stop at a hundred (**T16**) and a three-digit number could be neither said, heard nor judged. The prompt's two sides became `{terms, ops}` runs; `ComparisonAnswer` and its three-word grammar are untouched. |
| 2026-09-01 | **Dead exports swept out** — seven with no caller anywhere, tests included, and eight more that lost only their `export`. Among the seven, `SessionObserver.onHintShown`: the one event on the **A4** seam nothing has ever raised, since hints do not exist yet; it goes back on in phase 5. Not swept, deliberately: `WebSpeechTts` (**O2**), the parked rows (**G8**), `LAST_LEVEL` (**C1**), and the review queue (**C3** wired but not switched on). |
| 2026-09-01 | **`Monster.stats` deleted after all — reversing the entry above**, which had kept it as King's Bounty reference data «no code consumes». On a second look that argument cuts the other way: data nothing reads is data nothing keeps honest, and the numbers are one search away in the source game. A plain reversal, not a new fact — «unfinished work» was the wrong label for a table that was never going to be finished from inside this repo. |
| 2026-09-01 | **`Monster.avatar` deleted, on the same argument.** An emoji per unit sat between the picture and the letter in `MonsterAvatar` and could not be reached: only units with a picture are ever fielded, so that rung fired solely when an `<img>` failed to load, which the letter already covers. |
| 2026-09-02 | **One table deals the rows out, and the shares inside a band are equal (G8).** `ASKS` replaces the three places that used to say which row an opponent asks — a default, a two-way split, and an exception table — which read well enough for two rows and stopped reading at three. Grouped by band, because the band is what has to come out even; typed as a full record per band, so a row coming off the parking bay cannot compile until every band has said what it gives it. The evenness rule counts piles rather than naming rows, so it survives the next row coming back, and `build` throws for a unit with a picture and no pile. |
| 2026-09-02 | **King's Bounty level 5 opened.** Four opponents join the archdemon, so band 5 is five, split evenly by the `ASKS` rule. The «level 5 sums are a wall» worry that had kept them off is being run rather than designed around; if it bites, the fix is `ASKS`, not the roster. 48 opponents on the selection screen. |
| 2026-09-02 | **A battle takes on up to five opponents at once (G9).** Four squads in the config, all shuffled. A builder on the selection screen was tried and reversed the same day — a mix of rows is what makes a squad worth fighting, and it is not visible on a card. Hearts deliberately not divided by the squad's size, so the groups run 40–70 tasks against **P7**; that is the part to watch on the child. `Profile` split «Побед» from its per-opponent tally, since a win over four is one victory. |
| 2026-09-02 | **The hearts came off the selection cards**, reversing «how many there are IS the main difference between monsters, so that number must not be abbreviated». That was true of one card and false of forty-eight plus four squads: ten to twenty hearts each, and forty to seventy on a squad, read as red noise between the child and the picture they were choosing by. The cost is real — a card no longer says how long the battle is (**G7**). The hearts are drawn one by one where they are actually counted, which is the battle. |
| 2026-09-02 | **Making a number added (состав числа)** — a new row, not a returning one, and the first with a visual of its own: a whole with two lines fanning down to two boxes joined by «И», one box the blank. Four rungs, not five (place value ends at two digits): bonds within five, within ten, `10 + n`, `tens + n`. Its own splitter rather than the addition ladder — a bond has no operation on the page, and `missing-number` riding addition does not carry over. Answer is a number, so the judge and grammar are addition's. New `composition` prompt kind through the four `switch (prompt.kind)` sites, `making-a-number` live in `kinds.ts` (not parked), a pile in every `ASKS` band carved even, and the two four-member squads gained a bond member so they still mix every row. Missing number and chains stay parked. 356 tests. |
| 2026-09-02 | **A card says how hard the opponent is** — the level as a rank in the top-left corner, the way a playing card carries one, and «Слабый» … «Непобедимый» in the top-right. That is the dial the hearts never showed: they named the *length*, and length runs the other way (**G7**), so the shortest battle on the screen is the one labelled invincible. A squad takes its strongest member's level, not an average, which would promise a mixed group is easier than the worst thing in it. Three knock-on decisions: the five level colours became **one ramp** green→brick, since five unrelated hues would have said «different» while the word beside them said «harder» — the price is that neighbouring levels are closer to each other than they were. The level moved onto `Monster` as a field: it equals the top rung by how `BY_LEVEL` is cut, and a number the child reads off the screen must not depend on two tables agreeing by accident. And the wording went through a coloured circle (🟢…🟤) and a pill around the rank before losing both: printed in the level's colour on a card framed in it, the circle was a third copy of one fact and the widest of the three, and a border around a 1.7rem digit reads as a button. |
| 2026-09-02 | **Missing number un-parked, on a two-rung ladder of its own.** Level 2 is «within five», level 3 «within ten»; level 1 is left off (turning `2+3` round is a level-2 move, not a level-1 one) and levels 4–5 wait on the evidence from these two. `equations.ts` stops riding the addition ladder — «within five/ten» said outright rather than borrowed from a generator re-cut for something else. The `equation` prompt and its `switch (prompt.kind)` arms were already carried from the first time this row was live, so the UI did not move. In `ASKS` the row is a full key in every band, empty in the two (1 and 5) whose pool reaches neither rung; the even-split test learned to skip a pile a band has no rung for rather than demand it be non-empty. Band 4 does reach rung 3, so a few KB-4 opponents ask it there, «до десяти» and never higher. `addition + subtraction` is now the only parked row. 349 tests. |
| 2026-09-02 | **A squad became a fanned hand of the roster's own cards**, at the roster's own size, with no frame and no caption — it had been a wide card holding the members as small portraits, which is a card of cards. The frame's contents went with it: the group's name (kept as the button's accessible name), its own strength, and the word for how it takes turns — so **a gauntlet squad would now be indistinguishable from a shuffled one**, which costs nothing while all four are shuffled and will have to be answered the day one is not. Under the pointer the hand opens until every card can be read; the opening is a transform and not a change of the overlap, because the overlap is a margin and opening with it would re-lay-out the row and shove the neighbouring hands aside every time the pointer crossed one. Three things the measurements caught that nothing else would have: a turned card reaches past the box it occupies in layout, so hands laid out 16px apart were drawing on top of each other; the room for that turn has to grow with the hand, or the beaten diagonal — drawn across the button — overshoots a hand of two; and an opened hand of four reaches a hundred pixels past its button, which is about all a 1280px row has to spare, hence the spread it settled at and a `clip` on the row rather than a sideways scrollbar. |
| 2026-09-02 | **The selection screen gained a top bar and lost its greeting.** «Новая игра» on the left, the child's face and name on the right, sticky rather than fixed — fixed had floated the button over the first row of cards, sticky pushes the roster down and then holds while it scrolls under. Out went «С кем сразимся, {name}?», which spent a heading asking the child their own name back, and «Побед: N». **The victory tally is now shown nowhere**: `Profile.battles` still counts it and the tests still hold what it means, but nothing reads it, and the place it belongs is the PIN-gated parent screen phase 7 already plans. |
| 2026-09-02 | **A menu screen, and the top bar extracted to serve it.** The child now lands on two big buttons — «Арена», which opens the roster that used to be the first screen, and «Квест», disabled and labelled «скоро» rather than hidden, so what is coming is visible and what is playable is unambiguous. The bar came out of the selection screen because a **second** screen wanted it, not in anticipation of one: it was already carrying two things that belong to the profile rather than to picking a fight, and being locked inside one screen was the accident. Leaving a battle still lands on the roster and not the menu — «выйти» from a fight means «pick another opponent» — so the roster's bar gained a «назад» and the menu's has none. Deliberately **not** done at the same time: any general shape for «a selection screen», which is the mistake **A2** already records paying for once. |
| 2026-09-03 | **The quest: a second game, and the first path (G10).** A serpentine of thirteen stops — ten single opponents, two squads, a mini-boss — walked in order, each stop the very card the arena would offer, at the arena's own size and wearing the arena's own strike once beaten. The road is one curve and not thirteen joints — a spline through the stop centres, which passes through every point it is given, so it cannot miss a stop, and the switchback at the end of a row comes out of the smoothing rather than being placed. It is computed in lane-and-row units and stretched over the grid, which is what forces the rows to one fixed height and the grid to no gaps and no padding: those are not part of the lanes and rows, so the road drifted off the stops by 28px near the bottom until they came out. Three lanes, because a squad's open hand is 331px wide and a lane has to be wider than that. The arena is a free pick; a path is a sequence, and the point of that is that the sequence is meant to become the **parent's**, through a list of demands a generator lays out. **Neither the generator nor the shape it reads is built**: inventing the parent's format off one hand-made map is the mistake **A2** records paying for, so what is settled is only what a path is. Losing a stop costs the stop and not the walk (**P10**), progress is a count of stops cleared and survives a restart, and `PROFILE_VERSION` is again not bumped. `Opposition` moved down into `game` — a quest's map names the same thing a battle does, and `game` cannot reach into `ui` — and the card components came out of `BattleGame.tsx` for the second caller, the same rule the top bar moved on. The boss picture is a stand-in until the real ones arrive. |
| 2026-09-03 | **The generator arrived (G10), and the maps stopped naming monsters.** `src/game/quests.ts` no longer holds a table of ids; it reads a JSON file per path from `src/game/quests/` (`<order>_<id>.json`, `quests/README.md` has the shape) and resolves a list of demands — `{ kind, level }`, a row and a band — into the opponent asking it, through a new `monstersAsking` on the very `ASKS` pile the arena already deals from. A stop with several demands becomes a squad, assembled by a new `assembleSquad` (`squads.ts`) shared with the hand-written arena lineups, so a quest square and an arena squad are built by the same arithmetic. The last stop in a file is the boss, marked by nothing but its position. A demand asked twice draws two different opponents where the pile has more than one to give — round-robin, not always the first — so «addition 1, addition 1» drills the row without repeating the picture. **The round-robin runs across every file together, not reset per file**: a first pass gave each quest its own counter starting at zero, on the reasoning that editing one file should never shift another's draws — and it meant two quest files with the same first demand always opened on the same opponent, discovered by copying `first-path.json` verbatim into `second-path.json` to see what varied. A single shared counter, advanced in the order `ENTRIES` lists the files, fixes it; the price is the coupling the first pass was written to avoid, accepted because nothing about a specific draw is ever saved (**P10**'s progress is a count of stops, not a record of who stood on them), so there is nothing a shifted draw could contradict. `first-path` was rewritten into this shape; its ten duels and two squads before the boss are the same count as before, its opponents no longer hand-picked. |
| 2026-09-02 | **This document trimmed to the rule above** — 57 KB to 40. Out went the folder tree (**A9**) and the install line, both of which the [README](../README.md) already carried, the tree in a copy that still had the project at a path it left months ago; the mechanics of how **A1** is enforced, same reason; and a changelog that had grown from a record of decisions into a prose retelling of `git log`, now one line an entry. Nothing was struck through and nothing was dropped: 53 decision IDs before, 53 after, every status and every **Why** with them. |
| 2026-09-16 | **Word problems added (задачи)** — a new row, not a returning one: a name, an item and one of four sentence shapes, drawn independently over the same within-five/within-ten sums addition already asks, so the row is entirely about finding the sum inside the sentence rather than about new arithmetic. Its own two-rung ladder, the same pair `missing-number` stops one short of (`WORD_PROBLEM_LEVELS`). Answer is a number, so `ArithmeticAnswer` and its grammar carry over untouched (**A5**, **T16**). New `word-problem` prompt kind through the four `switch (prompt.kind)` sites; the story is rendered as prose at reading size, not at the digit size the rest of the row uses. The content bank (ten names, sixteen items across four everyday themes, hand-authored plural forms) lives in `src/locale/ru.ts` — hand-authored because a rule can't be trusted with an irregular plural (`котёнок` → `котят`, not `котёнков`), and because Russian case bites twice more where a naive version missed it: a feminine item's «one» changes shape as a verb's object (`съел конфету`, not `съел конфета`), and a living thing takes genitive plural rather than singular there at 2–4 (`купил 2 котят`, not `2 котёнка`) — both caught by sampling generated output before this landed, not by the grammar rule looking obviously wrong on paper. `word-problem` live in `kinds.ts` (not parked); a share carved out of `ASKS` bands 1–3 by moving ids out of their fullest existing piles per **G8** (`skeleton-archer`, `priest`, `swordsman`, `inquisitor`, `ghost-pirate`), none of them a named squad member, so `squads.test.ts`'s per-squad row sets hold unchanged. Bands 4–5 get an empty pile, same as `missing-number`'s in the bands its own rungs miss. 397 tests. |
| 2026-09-24 | **Renamed to Quest.** The repository became `cogni-quest/quest`, so the site moved to `/quest/` (`BASE_PATH` in the deploy workflow). The save prefix went `cogniquest:` → `quest:` with no migration, the same call as the rename before it. |
