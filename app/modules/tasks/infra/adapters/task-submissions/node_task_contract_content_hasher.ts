import { createHash } from 'node:crypto'

import type { TvaSha256 } from '#modules/tasks/public_contracts/task-authoring/primitives'
import type { TaskContractContentHasher } from '#modules/tasks/actions/ports/outbound/task_contract_content_hasher'

function canonicalize(value: unknown): unknown {
  if (value === null || typeof value !== 'object') return value
  if (Array.isArray(value)) {
    return value.map((entry) => canonicalize(entry))
  }

  const source = value as Readonly<Record<string, unknown>>
  const canonical: Record<string, unknown> = {}
  for (const key of Object.keys(source).sort()) {
    canonical[key] = canonicalize(source[key] ?? null)
  }
  return canonical
}

export class NodeTaskContractContentHasher implements TaskContractContentHasher {
  hash(value: unknown): TvaSha256 {
    const digest = createHash('sha256')
      .update(JSON.stringify(canonicalize(value)))
      .digest('hex')
    return `sha256:${digest}`
  }
}
