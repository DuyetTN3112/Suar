import { createHash } from 'node:crypto'

import type {
  AccomplishmentContentHasher,
} from '#modules/accomplishments/domain/verified-work/accomplishment_projection_identity'
import type {
  TvaJsonValue,
  TvaSha256,
} from '#modules/tasks/public_contracts/task-authoring/primitives'

function canonicalize(value: TvaJsonValue): TvaJsonValue {
  if (value === null || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map(canonicalize)
  const result: Record<string, TvaJsonValue> = {}
  const objectValue = value as { readonly [key: string]: TvaJsonValue }
  for (const key of Object.keys(objectValue).sort()) {
    result[key] = canonicalize(objectValue[key] ?? null)
  }
  return result
}

export class NodeAccomplishmentContentHasher implements AccomplishmentContentHasher {
  hash(value: unknown): TvaSha256 {
    const digest = createHash('sha256')
      .update(JSON.stringify(canonicalize(value as TvaJsonValue)))
      .digest('hex')
    return `sha256:${digest}`
  }
}

export default NodeAccomplishmentContentHasher
