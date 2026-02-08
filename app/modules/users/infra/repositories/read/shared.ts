import type { DatabaseId } from '#types/database'

export const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null
}

export const toNullableString = (value: unknown): string | null => {
  return typeof value === 'string' ? value : null
}

export const toNullableNumber = (value: unknown): number | null => {
  return typeof value === 'number' ? value : null
}

export const toNullableDatabaseId = (value: unknown): DatabaseId | null => {
  return typeof value === 'string' ? value : null
}
