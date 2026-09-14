type JsonRecord = Record<string, unknown>

export function hasIdentifier(value: string | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

export function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

export function normalizeActionItemAliases(record: JsonRecord): JsonRecord {
  const normalized = { ...record }
  if (normalized['action_items'] === undefined && normalized['actionItems'] !== undefined) {
    normalized['action_items'] = normalized['actionItems']
  }
  if (normalized['actionItems'] === undefined && normalized['action_items'] !== undefined) {
    normalized['actionItems'] = normalized['action_items']
  }
  return normalized
}

export function normalizeResponsePayload(value: JsonRecord | undefined): JsonRecord {
  if (!value) return {}
  const normalized = normalizeActionItemAliases(value)
  for (const key of ['verdict', 'result', 'ai_target']) {
    if (isRecord(normalized[key])) {
      normalized[key] = normalizeActionItemAliases(normalized[key])
    }
  }
  return normalized
}

export function verdictRecordFromPayload(payload: JsonRecord): JsonRecord {
  if (isRecord(payload['verdict'])) return payload['verdict']
  if (isRecord(payload['result'])) return payload['result']
  if (isRecord(payload['ai_target'])) return payload['ai_target']
  return payload
}

export function stringField(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

export function numberField(value: unknown): number | null {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}
