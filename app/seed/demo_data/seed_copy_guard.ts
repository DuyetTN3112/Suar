import type { OrgSpec } from './organization_seeds_specs.js'
import type { TaskSpec } from './types.js'
import type { UserSpec } from './user_seeds_specs.js'

export interface SeedCopyCandidate {
  source: string
  key: string
  text: string | null | undefined
}

export interface VisibleSeedCopyInput {
  organizations: Record<string, OrgSpec>
  users: Record<string, UserSpec>
  tasks: TaskSpec[]
}

const BANNED_COPY_PATTERNS: RegExp[] = [
  /\bseed(?:ed|ing)?\b/i,
  /\bdemo(?:-only)?\b/i,
  /\bfiller\b/i,
  /\bqa local\b/i,
  /\blocal (?:verification|e2e|qa|end-to-end)\b/i,
  /\bfor local end-to-end verification\b/i,
  /\baccount test\b/i,
  /\btest account\b/i,
  /\bdùng để test\b/i,
  /\bscenario task\b/i,
  /\bseed scenario\b/i,
  /\bgenerated filler\b/i,
]

function pushText(
  candidates: SeedCopyCandidate[],
  source: string,
  key: string,
  text: string | null | undefined
): void {
  if (typeof text === 'string' && text.trim().length > 0) {
    candidates.push({ source, key, text })
  }
}

export function collectVisibleSeedCopy(input: VisibleSeedCopyInput): SeedCopyCandidate[] {
  const candidates: SeedCopyCandidate[] = []

  for (const [key, user] of Object.entries(input.users)) {
    pushText(candidates, 'users.bio', key, user.bio)
    pushText(candidates, 'users.headline', key, user.headline)
  }

  for (const [key, organization] of Object.entries(input.organizations)) {
    pushText(candidates, 'organizations.description', key, organization.description)
  }

  for (const task of input.tasks) {
    pushText(candidates, 'tasks.title', task.key, task.title)
    pushText(candidates, 'tasks.description', task.key, task.description)
    pushText(candidates, 'tasks.contextBackground', task.key, task.contextBackground)
    pushText(candidates, 'tasks.complexityNotes', task.key, task.complexityNotes)
    for (const [index, criterion] of task.acceptanceCriteria.entries()) {
      pushText(candidates, `tasks.acceptanceCriteria[${index}]`, task.key, criterion)
    }
    for (const [index, deliverable] of task.expectedDeliverables.entries()) {
      pushText(candidates, `tasks.expectedDeliverables[${index}]`, task.key, deliverable)
    }
  }

  return candidates
}

export function assertNoBannedSeedCopy(candidates: SeedCopyCandidate[]): void {
  const violations = candidates.flatMap((candidate) => {
    const pattern = BANNED_COPY_PATTERNS.find((entry) => entry.test(candidate.text ?? ''))
    if (!pattern) return []

    return [
      `${candidate.source}:${candidate.key} matched ${pattern.source}: ${candidate.text ?? ''}`,
    ]
  })

  if (violations.length > 0) {
    throw new Error(`Seed copy guard failed:\n${violations.join('\n')}`)
  }
}
