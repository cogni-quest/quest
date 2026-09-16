import { t, type WordProblemTemplate } from '@/locale'
import type { Exercise, MathOp } from '../exercises'
import { pick, type Random } from '../random'
import { ArithmeticAnswer } from './ArithmeticAnswer'
import { generateProblem } from './generator'

/**
 * Word problems (задачи) — the newest row of the grid (see docs/MATH.md).
 *
 * No arithmetic of its own: the numbers are rungs 1 and 2 of the ordinary
 * ladder — within five, within ten — read out as a name, an item and a small
 * story instead of a bare sum. The new difficulty is the row itself: finding
 * the sum inside a sentence rather than being handed one on a plate. A second
 * unknown, three actors, a story with a twist — all of that is a rung above
 * this one, not this one wearing a costume.
 *
 * The answer is one number, so `ArithmeticAnswer` and its recognition grammar
 * carry over untouched (A5, T16), exactly as they do for composition.
 */
export const WORD_PROBLEM_LEVELS: readonly number[] = [1, 2]

const { names: NAMES, items: ITEMS, addition: ADDITION, subtraction: SUBTRACTION } = t.wordProblems

type WordProblemName = (typeof NAMES)[number]
type WordProblemItem = (typeof ITEMS)[number]

export interface WordProblem {
  readonly text: string
  readonly a: number
  readonly op: MathOp
  readonly b: number
  readonly answer: number
  /** Grammar ceiling: the range the answer is heard against (T16). */
  readonly heardUpTo: number
}

/**
 * 1 → `item.one`, 2–4 → `item.few`, 0 and 5+ → `item.many` — the ordinary
 * Russian counting-plural rule, with the 11–14 exception a straight «last
 * digit» check would get wrong. Numbers here never reach that far (the ladder
 * stops at ten), but the rule is cheap to get right regardless of who else
 * ever calls it.
 *
 * Case matters once the count sits as a verb's object rather than after
 * «было»: a feminine item's «one» changes shape («конфета» → «конфету»), and
 * an animate one takes «many» at 2–4 rather than «few» («поймал 2 котят», not
 * «2 котёнка») — the one place count and case interact for a living thing.
 * Both exceptions are opt-in on the item (`objectOne`, `animate`), so an item
 * that is neither just falls through to its ordinary forms.
 */
function pluralForm(n: number, item: WordProblemItem, position: 'subject' | 'object'): string {
  const lastDigit = n % 10
  const lastTwo = n % 100
  const object = position === 'object'

  if (lastDigit === 1 && lastTwo !== 11) return (object && item.objectOne) || item.one
  if (lastDigit >= 2 && lastDigit <= 4 && (lastTwo < 12 || lastTwo > 14)) {
    return object && item.animate ? item.many : item.few
  }
  return item.many
}

/** Fills in a template with a name, an item and the two numbers. */
function tell(
  name: WordProblemName,
  item: WordProblemItem,
  a: number,
  b: number,
  template: WordProblemTemplate,
): string {
  return template.text({
    nominative: name.nominative,
    genitive: name.genitive,
    verb: template.verb[name.gender],
    a,
    b,
    formA: pluralForm(a, item, template.aCase),
    formB: pluralForm(b, item, template.bCase),
    formMany: item.many,
  })
}

export function generateWordProblem(levelId: number, random: Random): WordProblem {
  if (!WORD_PROBLEM_LEVELS.includes(levelId)) {
    throw new RangeError(`No word problem generator for level ${levelId}`)
  }

  const op: MathOp = random() < 0.5 ? '+' : '-'
  const problem = generateProblem(levelId, random, op)
  const [a, b] = problem.terms as readonly [number, number]

  const name = pick(random, NAMES)
  const item = pick(random, ITEMS)
  const templates = op === '+' ? ADDITION : SUBTRACTION

  return {
    text: tell(name, item, a, b, pick(random, templates)),
    a,
    op,
    b,
    answer: problem.answer,
    heardUpTo: problem.heardUpTo,
  }
}

/**
 * «story:3+2» — for the id. Kept apart from plain arithmetic's «3+2»: the same
 * sum read out of a sentence is not the same task to a child as the same sum
 * on its own (C3), so the two must not collide in the review queue.
 */
export function describeWordProblem(problem: WordProblem): string {
  return `story:${problem.a}${problem.op}${problem.b}`
}

export function createWordProblemExercise(levelId: number, random: Random): Exercise {
  const problem = generateWordProblem(levelId, random)

  return {
    id: `math:${describeWordProblem(problem)}`,
    subject: 'math',
    level: levelId,
    prompt: { kind: 'word-problem', text: problem.text, answer: problem.answer },
    answer: new ArithmeticAnswer(problem.answer, problem.heardUpTo),
  }
}
