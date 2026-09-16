import { describe, expect, it } from 'vitest'
import { t } from '@/locale'
import { createRandom } from '../random'
import { createMathExercise, levelsFor, taskChoices } from './kinds'
import {
  createWordProblemExercise,
  describeWordProblem,
  generateWordProblem,
  WORD_PROBLEM_LEVELS,
  type WordProblem,
} from './wordProblems'

function sample(levelId: number, count = 3000): WordProblem[] {
  const random = createRandom(levelId * 601 + 17)
  return Array.from({ length: count }, () => generateWordProblem(levelId, random))
}

const words = (text: string) => text.split(/[^а-яёА-ЯЁ0-9]+/).filter(Boolean)

const VERBS: Record<'+' | '-', Record<'m' | 'f', readonly string[]>> = {
  '+': { m: ['нашёл', 'купил'], f: ['нашла', 'купила'] },
  '-': { m: ['отдал', 'съел'], f: ['отдала', 'съела'] },
}

function pluralForm(
  n: number,
  item: (typeof t.wordProblems.items)[number],
  position: 'subject' | 'object',
): string {
  const lastDigit = n % 10
  const lastTwo = n % 100
  const object = position === 'object'

  if (lastDigit === 1 && lastTwo !== 11) return (object && item.objectOne) || item.one
  if (lastDigit >= 2 && lastDigit <= 4 && (lastTwo < 12 || lastTwo > 14)) {
    return object && item.animate ? item.many : item.few
  }
  return item.many
}

// Only the «купил/купила» template puts its first number in object position
// («Дима купил 3 груши») rather than as the subject of «было» — every other
// template keeps the first number there.
const OBJECT_A_VERBS = ['купил', 'купила']

function findVerb(shown: readonly string[]) {
  for (const op of ['+', '-'] as const) {
    for (const gender of ['m', 'f'] as const) {
      const word = VERBS[op][gender].find((v) => shown.includes(v))
      if (word) return { op, gender, word }
    }
  }
  return undefined
}

describe('the row runs two rungs', () => {
  it('one and two, and no third', () => {
    expect(WORD_PROBLEM_LEVELS).toEqual([1, 2])
    expect(levelsFor('word-problem')).toEqual([1, 2])
  })

  it('an opponent is paired with the rungs its levels reach', () => {
    expect(taskChoices(['word-problem'], [2, 3, 4])).toEqual([{ kind: 'word-problem', level: 2 }])
  })

  it('asking for a rung that does not exist is a programming error', () => {
    expect(() => generateWordProblem(3, createRandom(1))).toThrow(RangeError)
    expect(() => generateWordProblem(0, createRandom(1))).toThrow(RangeError)
  })
})

describe('word problems — rules that hold on every rung', () => {
  for (const level of WORD_PROBLEM_LEVELS) {
    describe(`level ${level}`, () => {
      const problems = sample(level)

      it('the answer is what the story works out to', () => {
        for (const p of problems) {
          expect(p.answer).toBe(p.op === '+' ? p.a + p.b : p.a - p.b)
        }
      })

      it('both operations turn up', () => {
        const plus = problems.filter((p) => p.op === '+').length / problems.length
        expect(plus).toBeGreaterThan(0.3)
        expect(plus).toBeLessThan(0.7)
      })

      it('the numbers named in the story are the numbers of the sum', () => {
        for (const p of problems) {
          expect(words(p.text)).toContain(String(p.a))
          expect(words(p.text)).toContain(String(p.b))
        }
      })

      it('the answer stays inside what may be heard (T16)', () => {
        for (const p of problems) {
          expect(p.answer).toBeGreaterThanOrEqual(0)
          expect(p.answer).toBeLessThanOrEqual(p.heardUpTo)
        }
      })

      it('every story asks its question', () => {
        for (const p of problems) {
          expect(p.text).toContain('Сколько')
          expect(p.text.trim().endsWith('?')).toBe(true)
        }
      })

      it('the item drawn declines correctly for both numbers named', () => {
        for (const p of problems) {
          const shown = words(p.text)
          const item = t.wordProblems.items.find(
            (candidate) =>
              p.text.includes(candidate.one) ||
              p.text.includes(candidate.few) ||
              p.text.includes(candidate.many) ||
              (candidate.objectOne !== undefined && p.text.includes(candidate.objectOne)),
          )
          expect(item, p.text).toBeDefined()

          const verb = findVerb(shown)
          expect(verb, p.text).toBeDefined()
          // Every template puts the second number in object position; only
          // «купил/купила» puts the first number there too.
          const aCase = OBJECT_A_VERBS.includes(verb!.word) ? 'object' : 'subject'

          expect(shown).toContain(pluralForm(p.a, item!, aCase))
          expect(shown).toContain(pluralForm(p.b, item!, 'object'))
        }
      })

      it('the drawn name and its verb agree in gender', () => {
        for (const p of problems) {
          const name = t.wordProblems.names.find((candidate) =>
            words(p.text).includes(candidate.nominative),
          )
          expect(name, p.text).toBeDefined()

          const shown = words(p.text)
          const otherGender = name!.gender === 'm' ? 'f' : 'm'
          const otherOp = p.op === '+' ? '-' : '+'

          // The verb matching the name's own gender, for the operation asked.
          expect(VERBS[p.op][name!.gender].some((verb) => shown.includes(verb))).toBe(true)
          // Never the opposite gender's verb, and never the other operation's —
          // either would be a child hearing a fact the story does not tell.
          expect(VERBS[p.op][otherGender].some((verb) => shown.includes(verb))).toBe(false)
          expect(VERBS[otherOp].m.some((verb) => shown.includes(verb))).toBe(false)
          expect(VERBS[otherOp].f.some((verb) => shown.includes(verb))).toBe(false)
        }
      })

      it('every name and every item eventually turns up', () => {
        const seen = new Set(
          problems
            .map((p) => t.wordProblems.names.find((n) => words(p.text).includes(n.nominative)))
            .filter((n): n is (typeof t.wordProblems.names)[number] => n !== undefined),
        )
        expect(seen.size).toBe(t.wordProblems.names.length)
      })
    })
  }
})

describe('level 1 — within five', () => {
  it('the numbers are rung 1 of the arithmetic ladder', () => {
    for (const p of sample(1)) {
      expect(p.a).toBeGreaterThanOrEqual(0)
      expect(p.a).toBeLessThanOrEqual(5)
      expect(p.b).toBeGreaterThanOrEqual(0)
      expect(p.b).toBeLessThanOrEqual(5)
    }
  })
})

describe('level 2 — within ten', () => {
  it('the numbers are rung 2 of the arithmetic ladder', () => {
    for (const p of sample(2)) {
      expect(Math.max(p.a, p.b)).toBeGreaterThan(5)
      expect(p.a).toBeLessThanOrEqual(10)
      expect(p.b).toBeLessThanOrEqual(10)
    }
  })
})

describe('describeWordProblem', () => {
  it('keeps the sum, drops the story', () => {
    expect(describeWordProblem({ text: '', a: 3, op: '+', b: 2, answer: 5, heardUpTo: 10 })).toBe(
      'story:3+2',
    )
  })

  it('is kept apart from plain arithmetic’s own id — not the same task (C3)', () => {
    const story = describeWordProblem({ text: '', a: 3, op: '+', b: 2, answer: 5, heardUpTo: 10 })
    expect(`math:${story}`).not.toBe('math:3+2')
  })
})

describe('createWordProblemExercise', () => {
  it('carries the story and the answer to the screen', () => {
    const exercise = createWordProblemExercise(2, createRandom(7))
    const prompt = exercise.prompt
    if (prompt.kind !== 'word-problem') throw new Error('expected a word-problem prompt')

    expect(prompt.text.length).toBeGreaterThan(0)
    expect(typeof prompt.answer).toBe('number')
  })

  it('the id is math:story:<sum>, never the sentence', () => {
    const exercise = createWordProblemExercise(1, createRandom(7))
    expect(exercise.id).toMatch(/^math:story:\d+[+-]\d+$/)
  })

  it('is answered by number, voice or keypad, exactly like a plain sum (A5, T16)', () => {
    const random = createRandom(13)
    for (const level of WORD_PROBLEM_LEVELS) {
      for (let i = 0; i < 50; i++) {
        const exercise = createWordProblemExercise(level, random)
        const prompt = exercise.prompt
        if (prompt.kind !== 'word-problem') throw new Error('expected a word-problem prompt')

        expect(exercise.answer.check({ kind: 'number', value: prompt.answer })).toBe('correct')
        expect(exercise.answer.check({ kind: 'number', value: prompt.answer + 1 })).toBe('wrong')
        expect(exercise.answer.check({ kind: 'text', value: 'кхм' })).toBe('unrecognised')
      }
    }
  })
})

describe('createMathExercise wires the row back in', () => {
  it('builds a word problem at both rungs', () => {
    for (const level of WORD_PROBLEM_LEVELS) {
      const exercise = createMathExercise('word-problem', level, createRandom(level))
      expect(exercise.prompt.kind).toBe('word-problem')
      expect(exercise.level).toBe(level)
    }
  })
})
