import { useCallback, useEffect, useRef, useState } from 'react'
import type { AnswerAttempt, Exercise, MathOp } from '@/core/exercises'
import { assertNever } from '@/core/exhaustive'
import {
  compare,
  comparisonWord,
  createMathExercise,
  evaluate,
  MAX_NUMBER,
  numberToWords,
  parseComparison,
  parseNumber,
  taskChoices,
  type Comparison,
} from '@/core/math'
import type { TextToSpeech } from '@/core/ports'
import { DifficultyAdapter, Profile, type ProfileData } from '@/core/progression'
import { pick, systemRandom } from '@/core/random'
import { ExerciseSession } from '@/core/session'
import {
  Battle,
  opponentsOf,
  questById,
  type BattleState,
  type Opposition,
} from '@/game'
import { t } from '@/locale'
import { playCorrect, playFinish, playUnheard, playWrong } from '@/adapters/audio/sfx'
import { VoiceAnswerInput } from '@/adapters/input'
import { RUSSIAN_MODEL_URL, SilentTeacher, VoskRecognizer } from '@/adapters/speech'
import { BrowserProfileStorage, PROFILE_KEY } from '@/adapters/storage'

/** How wide the pad's field gets. The ladder tops out at a hundred (C1). */
const MAX_DIGITS = String(MAX_NUMBER).length

/**
 * A breath between one listen and the next, after a miss.
 *
 * Normally it is not felt at all: recognition has already sat through 1.2 s of
 * silence before deciding nothing came. It is here as a floor under the loop —
 * should recognition ever start failing the instant it is asked, this is what
 * stops the game spinning on it and puffing «did not catch that» as fast as the
 * event loop allows.
 */
const RELISTEN_PAUSE_MS = 400

type Mic = 'idle' | 'speaking' | 'listening'
type Flash = 'correct' | 'wrong' | 'unheard' | null
/**
 * `home` is the menu the child lands on once they have a name. Each of the two
 * games it offers has a screen to choose on and a screen to play: the arena's
 * are `select` and `fight`, the quest's are `quest` and `path`.
 *
 * A battle always leaves back to the screen it was started from rather than to
 * the menu — «выйти» means «pick another opponent» on the arena and «back to
 * the path» on a quest — which is what `returnTo` below is for.
 */
type Screen = 'loading' | 'error' | 'name' | 'home' | 'select' | 'quest' | 'path' | 'fight'

/**
 * The answer being built, before anything is sent (T18).
 *
 * It lives up here rather than inside the pad because two things write into it
 * — the child's fingers and the child's voice — and one of those is the battle
 * loop. Its shape is the shape of the answer the task wants, settled once when
 * the task appears; everything downstream follows the draft rather than asking
 * the prompt a second time.
 */
export type Draft =
  | { readonly kind: 'number'; readonly digits: string }
  | { readonly kind: 'choice'; readonly value: Comparison | null }

/**
 * Re-exported so the screens can keep importing it from here, where it lived
 * until a quest's map wanted to name the same thing and `game` — which cannot
 * reach into `ui` — had to own it.
 */
export type { Opposition } from '@/game'

export interface GameState {
  screen: Screen
  error: string | null
  name: string
  /**
   * What is being fought. Null when there is no battle — and kept here rather
   * than read off `battle.foes`, because a rematch needs it after the battle
   * object is done with, and needs the squad's id along with it.
   */
  opposition: Opposition | null
  /**
   * Where leaving the battle on screen goes. A battle looks the same however
   * it was started, so the way out has to be remembered rather than worked
   * out: `run` cannot answer it, since a child halfway down a path may walk
   * off to the arena and fight there.
   */
  returnTo: 'select' | 'path'
  /** The path being walked, and how far along. Null outside a quest. */
  run: { readonly questId: string; readonly at: number } | null
  battle: BattleState | null
  exercise: Exercise | null
  mic: Mic
  flash: Flash
  /** What recognition made of the last thing said, in its own words. */
  heard: string | null
  /** Null exactly when no answer is being taken — between tasks, and after. */
  draft: Draft | null
  /** monster id → times beaten. Beaten ones are struck through in the list. */
  defeated: Record<string, number>
  /** squad id → times beaten. Struck through the same way (**G9**). */
  squadsBeaten: Record<string, number>
  /** quest id → stops cleared. What the path screen draws itself from. */
  questProgress: Record<string, number>
  /** Gold banked from battles won, arena or quest alike. What the top bar shows. */
  gold: number
}

interface Deps {
  readonly recognizer: VoskRecognizer
  /** The port, not an adapter: the teacher is mute today and will not be. */
  readonly tts: TextToSpeech
  readonly voiceInput: VoiceAnswerInput
  readonly storage: BrowserProfileStorage
  /** Replaced wholesale on «start over». */
  profile: Profile
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

/**
 * Resolves when the signal fires.
 *
 * The loop now waits on a button press and nothing else (T18), and the child
 * may simply walk away from the task — press «выйти», or close the window.
 * Without something to race that wait against, the loop would sit on a promise
 * nobody is ever going to resolve, holding the battle alive behind it.
 */
function aborted(signal: AbortSignal): Promise<null> {
  return new Promise((resolve) => {
    if (signal.aborted) resolve(null)
    else signal.addEventListener('abort', () => resolve(null), { once: true })
  })
}

/**
 * The sign as the teacher says it. Worth an exhaustive switch of its own: a
 * new operation falling through to «минус» would have the child hear one thing
 * while the game counts another.
 */
function spoken(op: MathOp): string {
  switch (op) {
    case '+':
      return t.teacher.plus
    case '-':
      return t.teacher.minus
    default:
      return assertNever(op, 'math operation')
  }
}

/** The problem as the teacher says it out loud (T12). */
function questionText(exercise: Exercise): string {
  const prompt = exercise.prompt

  switch (prompt.kind) {
    case 'arithmetic':
      return prompt.terms
        .reduce<string[]>((said, term, i) => {
          if (i > 0) said.push(spoken(prompt.ops[i - 1]!))
          // The bracket is only visible on screen, so it has to be audible too
          // — otherwise the child hears a chain and is marked wrong for
          // working it out the way they heard it.
          if (prompt.bracket?.from === i) said.push(t.teacher.bracketOpen)
          said.push(numberToWords(term))
          if (prompt.bracket?.to === i) said.push(t.teacher.bracketClose)

          return said
        }, [])
        .join(' ')

    // «какое число плюс два равно пять». The blank is spoken, not skipped —
    // a silence where the unknown is would leave the child guessing at the
    // shape of the question.
    case 'equation': {
      const words = prompt.terms.reduce<string[]>((said, term, i) => {
        if (i > 0) said.push(spoken(prompt.ops[i - 1]!))
        said.push(i === prompt.blank ? t.teacher.whatNumber : numberToWords(term))
        return said
      }, [])
      words.push(t.teacher.equals, numberToWords(prompt.result))

      return words.join(' ')
    }

    // «Сравни. три плюс два и пять. Больше, меньше или равно?» — each side read
    // as its own little sum, or just a number when that is all it is.
    case 'comparison': {
      const say = (side: { terms: readonly number[]; ops: readonly MathOp[] }) =>
        side.terms
          .reduce<string[]>((said, term, i) => {
            if (i > 0) said.push(spoken(side.ops[i - 1]!))
            said.push(numberToWords(term))
            return said
          }, [])
          .join(' ')

      return t.teacher.compare(say(prompt.left), say(prompt.right))
    }

    // «сорок семь — это сорок и сколько?» — the whole, then the part that is
    // shown. Composition is commutative, so the shown part is named first
    // whichever box it is in.
    case 'composition': {
      const known = prompt.parts.find((part): part is number => part !== null)
      return t.teacher.compose(numberToWords(prompt.whole), numberToWords(known ?? 0))
    }

    // Already a sentence — the locale pack assembled it, there is nothing
    // left for this function to say differently.
    case 'word-problem':
      return prompt.text

    default:
      return assertNever(prompt, 'exercise prompt')
  }
}

/**
 * The right answer in the words the teacher says it — already a phrase, not a
 * number, because a comparison is answered with a word.
 */
function spokenAnswer(exercise: Exercise): string | null {
  const prompt = exercise.prompt

  switch (prompt.kind) {
    case 'arithmetic':
      // The bracket comes along, or the teacher reads out a different answer
      // from the one the child was marked against: «97 − (63 − 34)» is 68, and
      // taken left to right it is 0.
      return numberToWords(evaluate(prompt.terms, prompt.ops, prompt.bracket))

    // The missing operand is the answer — nothing to compute.
    case 'equation': {
      const missing = prompt.terms[prompt.blank]
      return missing === undefined ? null : numberToWords(missing)
    }

    case 'comparison':
      return comparisonWord(
        compare(
          evaluate(prompt.left.terms, prompt.left.ops),
          evaluate(prompt.right.terms, prompt.right.ops),
        ),
      )

    // The missing part is the whole less the part that is shown.
    case 'composition': {
      const known = prompt.parts.find((part): part is number => part !== null)
      return known === undefined ? null : numberToWords(prompt.whole - known)
    }

    // The prompt already carries what the story works out to.
    case 'word-problem':
      return numberToWords(prompt.answer)

    default:
      return assertNever(prompt, 'exercise prompt')
  }
}

/**
 * The empty draft a task is answered into.
 *
 * An exhaustive switch for the same reason the drawing and the reading out are:
 * a new kind of prompt must not quietly inherit a field that cannot hold its
 * answer. The keypad cannot answer «5 □ 7», and a build that says so beats a
 * screen that silently offers the wrong pad.
 */
function draftFor(exercise: Exercise): Draft {
  const prompt = exercise.prompt

  switch (prompt.kind) {
    // Answered with a number — the sum of a chain, the operand hidden in an
    // equation, the missing part of a bond, or what a story works out to.
    case 'arithmetic':
    case 'equation':
    case 'composition':
    case 'word-problem':
      return { kind: 'number', digits: '' }

    case 'comparison':
      return { kind: 'choice', value: null }

    default:
      return assertNever(prompt, 'exercise prompt')
  }
}

/**
 * What the child said, read into the draft instead of answered with (T18).
 *
 * Null when it cannot be read as an answer at all: recognition missed, which
 * costs nothing and is not the child's fault (C5). Nothing is sent either way —
 * this only fills the field the child is looking at.
 */
function heardAs(kind: Draft['kind'], text: string): Draft | null {
  switch (kind) {
    case 'number': {
      const value = parseNumber(text)
      return value === null ? null : { kind: 'number', digits: String(value) }
    }

    case 'choice': {
      const value = parseComparison(text)
      return value === null ? null : { kind: 'choice', value }
    }

    default:
      return assertNever(kind, 'answer draft')
  }
}

/** The draft as an attempt the session can judge. Null while it is still empty. */
function attemptFrom(draft: Draft): AnswerAttempt | null {
  switch (draft.kind) {
    case 'number':
      return draft.digits === '' ? null : { kind: 'number', value: Number(draft.digits) }

    case 'choice':
      return draft.value === null ? null : { kind: 'choice', value: draft.value }

    default:
      return assertNever(draft, 'answer draft')
  }
}

const initial: GameState = {
  screen: 'loading',
  error: null,
  name: '',
  opposition: null,
  returnTo: 'select',
  run: null,
  battle: null,
  exercise: null,
  mic: 'idle',
  flash: null,
  heard: null,
  draft: null,
  defeated: {},
  squadsBeaten: {},
  questProgress: {},
  gold: 0,
}

export function useBattle() {
  const [state, setState] = useState<GameState>(initial)
  const deps = useRef<Deps | null>(null)
  const runAbort = useRef<AbortController | null>(null)
  /**
   * Set exactly while an answer is being taken, and the only way one gets sent
   * (T18). Also the flag for «is the pad live»: no resolver, no editing.
   */
  const answer = useRef<((attempt: AnswerAttempt) => void) | null>(null)
  /**
   * The walk in progress, mirrored out of state.
   *
   * `fight()` runs for the whole length of a battle and closes over what it
   * saw when it started; by the time it records a win, the state it captured
   * is minutes stale. A ref is read at the moment it is needed.
   */
  const runRef = useRef<{ questId: string; at: number } | null>(null)

  const patch = useCallback((changes: Partial<GameState>) => {
    setState((previous) => ({ ...previous, ...changes }))
  }, [])

  useEffect(() => {
    let cancelled = false

    void (async () => {
      try {
        const recognizer = new VoskRecognizer(RUSSIAN_MODEL_URL)
        // Silent while the voice is being chosen (O2). Swap the class and
        // the teacher speaks again — see SilentTeacher.
        const tts = new SilentTeacher()
        const storage = new BrowserProfileStorage()

        // WebSpeechTts had a prepare() to wait for its voices; a silent one
        // has nothing to wait for. The next voice brings its own back here.
        const [saved] = await Promise.all([
          storage.load<ProfileData>(PROFILE_KEY),
          recognizer.load(),
        ])
        if (cancelled) return

        const profile = Profile.fromJSON(saved)
        deps.current = { recognizer, tts, voiceInput: new VoiceAnswerInput(recognizer), storage, profile }

        patch({
          screen: profile.name ? 'home' : 'name',
          name: profile.name,
          defeated: profile.defeated,
          squadsBeaten: profile.squadsBeaten,
          questProgress: profile.questProgress,
          gold: profile.gold,
        })
      } catch (cause) {
        if (cancelled) return
        patch({ screen: 'error', error: cause instanceof Error ? cause.message : String(cause) })
      }
    })()

    return () => {
      cancelled = true
      runAbort.current?.abort()
      deps.current?.tts.stop()
      deps.current?.recognizer.releaseMicrophone()
    }
  }, [patch])

  const setName = useCallback(
    async (name: string) => {
      const d = deps.current
      if (!d) return
      d.profile.name = name.trim()
      await d.storage.save(PROFILE_KEY, d.profile.toJSON())
      patch({ name: d.profile.name, screen: 'home' })
    },
    [patch],
  )

  const fight = useCallback(
    async (opposition: Opposition, returnTo: 'select' | 'path' = 'select') => {
      const d = deps.current
      if (!d) return

      runAbort.current?.abort()
      const run = new AbortController()
      runAbort.current = run

      const squad = opponentsOf(opposition)
      // A duel has nobody to take turns with, so the mode is the squad's alone.
      const shuffle = opposition.kind === 'squad' && opposition.squad.shuffle

      const battle = new Battle(squad, { shuffle })

      // Difficulty adjusts within the squad's own pool of levels (C4): going
      // badly, we draw from the easy end; going well, we come back. One adapter
      // for the battle and not one per opponent — three mistakes in a row is a
      // fact about the child, not about whoever happened to be asking.
      const rungs = squad.flatMap((monster) => monster.levels)
      const difficulty = new DifficultyAdapter(Math.max(...rungs), Math.min(...rungs))

      const session = new ExerciseSession({
        subject: 'math',
        level: Math.max(...rungs),
        // No length given: the battle runs until somebody wins.
        nextExercise: () => {
          // Who asks comes first, and everything else follows from it: the row
          // of the grid and the rungs are the asker's own, so a squad plays as
          // its members do rather than as some average of them.
          const asker = battle.nextAsker()

          // Kind and level are drawn together, afresh each time, so an
          // opponent listing more than one kind keeps the child moving between
          // them rather than settling into a rhythm.
          //
          // Together rather than one after the other, because not every kind
          // reaches every level: drawing them separately can land on a pair
          // that has no rung, and there is nothing sensible to do about it
          // that late.
          //
          // A squad's floor can sit below this opponent's own easiest rung —
          // a peasant beside a dragon — and then there is nothing affordable
          // to draw. Its whole pool stands in for it: the easing is for the
          // squad, and no opponent can be eased past what it knows how to ask.
          const affordable = asker.levels.filter((level) => level <= difficulty.current)
          const choice = pick(
            systemRandom,
            taskChoices(asker.tasks, affordable.length > 0 ? affordable : asker.levels),
          )

          return createMathExercise(choice.kind, choice.level, systemRandom)
        },
        observers: [d.profile, battle],
      })

      patch({
        screen: 'fight',
        opposition,
        returnTo,
        battle: battle.state,
        flash: null,
        heard: null,
        draft: null,
      })
      session.start()

      /**
       * Listening on a loop, writing into the draft rather than answering (T18).
       *
       * It runs beside the wait for the button instead of racing it, and that is
       * the whole change: the child can say a number, see it come out wrong, and
       * say it again, because recognition simply starts over. A miss never
       * becomes an attempt now — C5 has nothing left to forgive.
       */
      const listen = async (exercise: Exercise, kind: Draft['kind'], signal: AbortSignal) => {
        try {
          while (!signal.aborted) {
            const attempt = await d.voiceInput.read(exercise.answer, signal)
            if (signal.aborted) return

            const text = attempt.kind === 'text' ? attempt.value : null
            const said = text === null ? null : heardAs(kind, text)

            if (said === null) {
              // Not caught. The line stays up while we listen again, because
              // «say it once more» is exactly what we are waiting for.
              playUnheard()
              patch({ flash: 'unheard', heard: null })
              await wait(RELISTEN_PAUSE_MS)
              continue
            }

            // Wholesale, never added to: what was said is a whole answer, so
            // the last thing the child expressed is what stands in the field.
            patch({ draft: said, heard: text, flash: null })
          }
        } catch (cause) {
          if (signal.aborted) return
          // The microphone gave up. The pad is on screen, so the battle carries
          // on without it — which it could not do while voice was the only way in.
          console.warn('Voice input stopped:', cause)
          patch({ mic: 'idle' })
        }
      }

      let lastPosition = -1

      while (!battle.finished && !session.finished && !run.signal.aborted) {
        const exercise = session.current
        if (!exercise) break

        const isNewTask = session.position !== lastPosition
        lastPosition = session.position

        const draft = draftFor(exercise)
        // The battle goes along with the task because the task came from an
        // opponent: `nextExercise` has just picked who asks, and the HUD has to
        // point at them by the time their question is on the screen.
        patch({ exercise, draft, battle: battle.state, flash: null, heard: null })

        // Coming back to a task sounds different from being asked it: «try once
        // more», not the problem read out again. A miss no longer brings us back
        // here at all — the listening loop above deals with it, and the task is
        // never answered (C5), so there is only one reason left to repeat.
        const line = isNewTask ? questionText(exercise) : t.teacher.tryAgain

        patch({ mic: 'speaking' })
        await d.tts.speak(line, run.signal)
        if (run.signal.aborted) return

        const task = new AbortController()
        const stopTask = () => task.abort()
        run.signal.addEventListener('abort', stopTask, { once: true })

        // An answer nobody can say out loud would leave the mic listening for a
        // word that is not coming. The pad still takes it.
        const byVoice = d.voiceInput.canHandle(exercise.answer)
        patch({ mic: byVoice ? 'listening' : 'idle' })
        if (byVoice) void listen(exercise, draft.kind, task.signal)

        const sent = deferred<AnswerAttempt>()
        answer.current = sent.resolve
        const attempt = await Promise.race([sent.promise, aborted(run.signal)])

        task.abort()
        answer.current = null
        run.signal.removeEventListener('abort', stopTask)
        if (attempt === null || run.signal.aborted) return

        patch({ mic: 'idle' })
        const positionBefore = session.position
        const result = session.submit(attempt)
        difficulty.onVerdict(result.verdict)

        if (result.verdict === 'correct') {
          playCorrect()
          patch({ flash: 'correct', battle: battle.state })
          await wait(battle.finished ? 400 : 700)
          continue
        }

        if (result.verdict === 'wrong') {
          playWrong()
          patch({ flash: 'wrong', battle: battle.state })

          if (session.position !== positionBefore && !battle.finished) {
            const words = spokenAnswer(exercise)
            if (words !== null) await d.tts.speak(t.teacher.theAnswerIs(words), run.signal)
          }
          await wait(battle.finished ? 400 : 700)
          continue
        }

        // Unreachable: the pad sends a number or a choice, and the spec that
        // asked for the pad judges both. Left standing rather than thrown away,
        // because a mismatch between pad and spec would otherwise be scored as
        // an ordinary wrong answer, and this is the one place that can say so.
        playUnheard()
        patch({ flash: 'unheard', heard: null })
        await wait(400)
      }

      if (run.signal.aborted) return

      session.abandon()
      playFinish()

      // A win accumulates in the profile. A loss takes nothing away: the battle
      // can be lost, the progress cannot (P10).
      //
      // Everything beaten goes in at once: one victory, a tick against each
      // opponent who stood in it, and one against the squad itself so its card
      // is struck through the way a monster's is. `Profile` keeps them in step.
      const won = battle.state.winner === 'player'

      if (won) {
        // A monster's level is its worth in gold — one opponent's, or the sum
        // of a squad's, however many stood in the fight.
        const goldEarned = squad.reduce((sum, monster) => sum + monster.level, 0)
        d.profile.recordVictory(
          squad.map((monster) => monster.id),
          opposition.kind === 'squad' ? opposition.squad.id : undefined,
          goldEarned,
        )
      }

      // A stop on a path is cleared by winning it, and by nothing else. A loss
      // leaves the walk exactly where it was: the child stays on this node,
      // everything behind them is still behind them, and «Реванш» in the result
      // window starts the same fight again (**P10**).
      const walk = runRef.current
      if (won && returnTo === 'path' && walk) {
        d.profile.recordQuestStep(walk.questId, walk.at + 1)
      }

      await d.storage.save(PROFILE_KEY, d.profile.toJSON())

      patch({
        battle: battle.state,
        exercise: null,
        draft: null,
        mic: 'idle',
        flash: null,
        defeated: d.profile.defeated,
        squadsBeaten: d.profile.squadsBeaten,
        questProgress: d.profile.questProgress,
        gold: d.profile.gold,
      })
    },
    [patch],
  )

  /**
   * A digit from the pad or from the keyboard.
   *
   * A field the microphone filled is a proposal, not something to add to: the
   * first key the child presses starts the number over. Otherwise «семь» heard
   * as «семнадцать» plus a corrected 7 makes 177. `heard` is precisely the flag
   * for «what is in the field came from the microphone» — it is dropped the
   * moment a finger touches it.
   */
  const typeDigit = useCallback((digit: string) => {
    if (!answer.current) return
    setState((previous) => {
      const draft = previous.draft
      if (draft?.kind !== 'number') return previous

      const digits = previous.heard === null ? draft.digits : ''
      if (digits.length >= MAX_DIGITS) return previous

      return { ...previous, draft: { kind: 'number', digits: digits + digit }, heard: null }
    })
  }, [])

  /**
   * Erase — one digit by hand, but the whole thing when the voice put it there.
   *
   * Same reason as above: a mishearing is wrong as a number, not in its last
   * digit. Taking the tail off «семнадцать» leaves 1, which is not what anybody
   * meant, so the proposal goes as a whole and the field is clear to answer into.
   */
  const eraseDigit = useCallback(() => {
    if (!answer.current) return
    setState((previous) => {
      const draft = previous.draft
      if (draft?.kind !== 'number' || draft.digits === '') return previous

      const digits = previous.heard === null ? draft.digits.slice(0, -1) : ''
      return { ...previous, draft: { kind: 'number', digits }, heard: null }
    })
  }, [])

  /** Picking one of the three signs. Picking is not sending any more (T18). */
  const chooseComparison = useCallback((value: Comparison) => {
    if (!answer.current) return
    setState((previous) =>
      previous.draft?.kind === 'choice'
        ? { ...previous, draft: { kind: 'choice', value }, heard: null }
        : previous,
    )
  }, [])

  /**
   * Send what is on the screen — the one and only way an answer reaches the
   * session now (T18).
   *
   * The draft comes in from the caller rather than out of state: the pad is
   * rendered from it, so what arrives here is exactly what the child was
   * looking at when they pressed the button.
   */
  const sendAnswer = useCallback((draft: Draft) => {
    const attempt = attemptFrom(draft)
    if (attempt !== null) answer.current?.(attempt)
  }, [])

  /** Start over: wipe the profile and ask for a name again. */
  const resetAll = useCallback(async () => {
    const d = deps.current
    if (!d) return

    runAbort.current?.abort()
    d.tts.stop()

    await d.storage.remove(PROFILE_KEY)
    d.profile = new Profile()

    patch({
      screen: 'name',
      name: '',
      defeated: {},
      squadsBeaten: {},
      questProgress: {},
      gold: 0,
      run: null,
      opposition: null,
      battle: null,
      exercise: null,
      draft: null,
      mic: 'idle',
      flash: null,
    })
  }, [patch])

  /**
   * Leave whatever is happening for a screen that is not a battle.
   *
   * Both ways out do the same work — stop the loop, stop the teacher, drop the
   * battle — and differ only in where they land, so they are one function. A
   * battle that is not stopped here goes on asking questions at a screen that
   * has no pad to answer them with.
   */
  const leaveFor = useCallback(
    (screen: 'home' | 'select' | 'quest' | 'path') => {
      runAbort.current?.abort()
      deps.current?.tts.stop()
      patch({
        screen,
        opposition: null,
        battle: null,
        exercise: null,
        draft: null,
        mic: 'idle',
        flash: null,
      })
    },
    [patch],
  )

  const toHome = useCallback(() => {
    runRef.current = null
    leaveFor('home')
    patch({ run: null })
  }, [leaveFor, patch])

  const toSelect = useCallback(() => leaveFor('select'), [leaveFor])

  /** Out of a path and back to the list of them. The walk is put down. */
  const toQuests = useCallback(() => {
    runRef.current = null
    leaveFor('quest')
    patch({ run: null })
  }, [leaveFor, patch])

  /**
   * Open a path: the one being walked, at wherever the profile says the child
   * had got to. A finished quest opens at its start, so it can be walked again.
   */
  const openQuest = useCallback(
    (questId: string) => {
      const d = deps.current
      if (!d) return

      const quest = questById(questId)
      const cleared = d.profile.questProgress[questId] ?? 0
      const at = cleared >= quest.nodes.length ? 0 : cleared

      runRef.current = { questId, at }
      leaveFor('path')
      patch({ run: { questId, at } })
    },
    [leaveFor, patch],
  )

  /** Fight the stop the child is standing on. */
  const fightNode = useCallback(() => {
    const walk = runRef.current
    if (!walk) return

    const node = questById(walk.questId).nodes[walk.at]
    if (!node) return

    void fight(node.opposition, 'path')
  }, [fight])

  /**
   * Back to the path after a battle, standing wherever the profile now says.
   * Read back rather than incremented here: the win was recorded against the
   * profile, and reading it is what keeps the screen and the save from
   * disagreeing after a rematch or a replay of an earlier node.
   */
  const toPath = useCallback(() => {
    const d = deps.current
    const walk = runRef.current
    if (!d || !walk) return

    const quest = questById(walk.questId)
    const cleared = d.profile.questProgress[walk.questId] ?? 0
    const at = Math.min(cleared, quest.nodes.length - 1)

    runRef.current = { questId: walk.questId, at }
    leaveFor('path')
    patch({ run: { questId: walk.questId, at } })
  }, [leaveFor, patch])

  return {
    state,
    setName,
    fight,
    typeDigit,
    eraseDigit,
    chooseComparison,
    sendAnswer,
    toHome,
    toSelect,
    toQuests,
    openQuest,
    fightNode,
    toPath,
    resetAll,
  }
}
