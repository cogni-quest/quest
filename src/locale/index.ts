import { ru } from './ru'
export type { WordProblemParts, WordProblemTemplate } from './ru'

/**
 * The active text pack.
 *
 * Content language is Russian (P3) and there is exactly one pack, so this is
 * a plain constant rather than a runtime switch. A second language would make
 * it a lookup here; nothing else in the codebase would have to change, because
 * everything already goes through `t`.
 */
export const t = ru

export { ru }
