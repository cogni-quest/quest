# Quest

A learning game for a 6–7 year old: **math** (addition and subtraction up to
100) and **reading by syllables**. Answers are given **out loud** — the
microphone is live from the first moment, with a pad on screen for what it
mishears. Runs on a PC entirely offline.

The interface is in Russian; the code, the comments and the docs are in English.

## State

Phases 0–3 are done: the learning core, voice input, and a playable battle the
child has fought through by voice and asked to play again. Reading (phase 4) is
next.

**The teacher is mute at the moment**, and on purpose: the synthesised voice was
unplugged while it is replaced, so no line is read aloud. See **T12** and **O2**
in [docs/DECISIONS.md](docs/DECISIONS.md).

What comes next — [docs/ROADMAP.md](docs/ROADMAP.md). Why it was done this way —
[docs/DECISIONS.md](docs/DECISIONS.md). What the child is asked in math, level by
level — [docs/MATH.md](docs/MATH.md), methodology only, no code and no game.

## Running it

Needs **Node.js LTS**:

```powershell
winget install OpenJS.NodeJS.LTS
```

Then:

```powershell
npm install
npm run dev        # development, opens localhost
npm test           # all tests, the architecture one included
npm run typecheck  # types, plus the core checked with no DOM available
npm run build      # typecheck, then build
```

## Deployment

Every push to `main` builds and publishes to GitHub Pages —
**https://cogni-quest.github.io/quest/** — through
`.github/workflows/deploy.yml`.

The workflow fetches the Vosk model itself, so the published site carries all
44 MB of it: a first visit downloads some 50 MB and the browser caches it from
then on. The site is served from `/quest/`, not from a domain root, so
anything resolved by path at runtime has to go through `publicUrl()` in
`src/assets.ts` — an absolute `/models/…` would escape to the domain root.

## Layout

```
docs\           decisions, the plan, and the math ladder
src\core\       pure TypeScript: the rules of the game and of the learning.
                Zero dependencies on React, the DOM or the browser.
src\adapters\   implementations of the core ports: voice, speech, saves, sounds
src\game\       the battle, the roster of opponents, and the squads
src\locale\     the text pack: every word the child sees or hears
src\ui\         React components
scripts\        fetching the speech model
public\models\  the speech recognition model — not kept in git, see below
public\monsters\ opponent pictures
```

Planned and not created yet: `src\theme\`, `src\core\reading\`, `electron\` —
which phase each belongs to is under **A9** in
[docs/DECISIONS.md](docs/DECISIONS.md).

The main rule: **`src/core` knows nothing of the outside world.** It declares
ports (`src/core/ports`) and the outer layer supplies adapters. That is what
makes the logic testable without a browser, and lets speech recognition or
storage be swapped without touching the rules of the game.

The rule is enforced, not merely stated. `src/architecture.test.ts` reads the
import graph off the files on every run — which layer may reach for which, which
packages a layer is allowed at all, and no cycles — and `tsconfig.core.json`
typechecks the core against a `lib` with no DOM in it, so a browser global is a
compile error rather than something a reviewer has to spot. Both run in
`npm test` / `npm run typecheck`, and CI runs both before it deploys.

## Language

All text addressed to the child lives in `src/locale/ru.ts` — screens, the
teacher's lines, monster names, number words. **Nothing outside it is written in
Russian:** code, comments, tests, developer-facing error messages and
documentation are English. The single exception is where Russian is the subject
under discussion — a language example in a comment, or a test asserting what the
text pack itself produces. Adding a second language means adding one file beside
`ru.ts`; nothing else has to move, because everything already goes through `t`.

Number words are part of the text pack on purpose: the recognition grammar is
built out of them, and the teacher reads them aloud.

## The speech recognition model

The Vosk model weighs tens of megabytes and is not committed (see
`.gitignore`). `npm run fetch-model` downloads it into `public/models`.

## Stack

TypeScript · Vite · React · Vitest · vosk-browser (recognition) · Electron
(packaging)

Synthesis is written against the Web Speech API and is not running: the teacher
goes through a silent implementation of the same port (**T12**).
