import { createHash } from 'node:crypto'

import type {
  TvaJsonObject,
  TvaJsonValue,
  TvaSha256,
} from '#modules/tasks/public_contracts/task-authoring/primitives'
import type { ProjectContextContentHasher } from '#modules/projects/actions/ports/outbound/project-context/project_context_content_hasher'

function canonicalize(value: TvaJsonValue): TvaJsonValue {
  if (value === null || typeof value !== 'object') return value
  if (Array.isArray(value)) {
    const arrayValue = value as readonly TvaJsonValue[]
    return arrayValue.map(canonicalize)
  }

  const objectValue = value as Readonly<Record<string, TvaJsonValue>>
  const result: Record<string, TvaJsonValue> = {}
  for (const key of Object.keys(objectValue).sort()) {
    result[key] = canonicalize(objectValue[key] ?? null)
  }
  return result
}

export class NodeProjectContextContentHasher implements ProjectContextContentHasher {
  hash(value: TvaJsonObject): TvaSha256 {
    const digest = createHash('sha256')
      .update(JSON.stringify(canonicalize(value)))
      .digest('hex')
    return `sha256:${digest}`
  }
}
