import { createHash } from 'node:crypto'

import type { TvaSha256 } from '#modules/tasks/public_contracts/task-authoring/primitives'
import type { TaskSupportingReferenceV1 } from '#modules/tasks/public_contracts/task-authoring/task_contracts'

function sha256(value: string): TvaSha256 {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`
}

export function normalizeTaskSupportingReferenceUri(uri: string): string {
  const trimmed = uri.trim()

  try {
    return new URL(trimmed).toString()
  } catch {
    return trimmed
  }
}

export function taskSupportingReferenceUriHash(uri: string): TvaSha256 {
  return sha256(normalizeTaskSupportingReferenceUri(uri))
}

/**
 * The URI alone is deliberately not a uniqueness key. One document may be a
 * requirement source for one section and a design asset for another. We only
 * reject an exact semantic duplicate inside the same Specification version.
 */
export function taskSupportingReferenceFingerprint(
  reference: Pick<TaskSupportingReferenceV1, 'uri' | 'relation' | 'relevantSection'>
): TvaSha256 {
  return sha256(
    JSON.stringify([
      normalizeTaskSupportingReferenceUri(reference.uri),
      reference.relation,
      reference.relevantSection.trim(),
    ])
  )
}
