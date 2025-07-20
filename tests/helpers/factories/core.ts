import { DateTime } from 'luxon'

export type FactoryDateValue = DateTime | Date | string | null

export const toFactoryDateTime = (
  value: FactoryDateValue | undefined
): DateTime | null | undefined => {
  if (value === undefined) {
    return undefined
  }
  if (value === null) {
    return null
  }
  if (value instanceof DateTime) {
    return value
  }
  if (value instanceof Date) {
    return DateTime.fromJSDate(value)
  }

  return DateTime.fromISO(value)
}
