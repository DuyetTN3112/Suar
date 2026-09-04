const HOUR_MS = 60 * 60 * 1000

function parseDateParts(value: string): [number, number, number] | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim())
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(year, month - 1, day)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null
  }

  return [year, month, day]
}

export function formatLocalDate(date: Date): string {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')
}

export function calculateDueDateFromEstimate(hours: number, now = new Date()): string | null {
  if (!Number.isFinite(hours) || hours < 0) return null
  return formatLocalDate(new Date(now.getTime() + hours * HOUR_MS))
}

export function calculateEstimateFromDueDate(dueDate: string, now = new Date()): string | null {
  const parts = parseDateParts(dueDate)
  if (!parts) return null

  const [year, month, day] = parts
  const dueDay = Date.UTC(year, month - 1, day)
  const currentDay = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  const hours = Math.max(0, (dueDay - currentDay) / HOUR_MS)
  return Number.isInteger(hours) ? String(hours) : String(Number(hours.toFixed(2)))
}

export function localDateAtCurrentTime(dueDate: string, now = new Date()): Date | null {
  const parts = parseDateParts(dueDate)
  if (!parts) return null
  const [year, month, day] = parts
  return new Date(year, month - 1, day, now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds())
}

export function toIsoDueAt(dueDate: string, now = new Date()): string | null {
  return localDateAtCurrentTime(dueDate, now)?.toISOString() ?? null
}
