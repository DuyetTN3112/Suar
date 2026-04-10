import type { PaginationMeta, ResponseRecord, SerializableResponseRecord } from './shared.js'
import { serializeForResponse } from './shared.js'

interface TaskApplicationControllerResult {
  data: Array<SerializableResponseRecord | ResponseRecord>
  meta: PaginationMeta
}

function isRecord(value: unknown): value is ResponseRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readString(
  record: ResponseRecord,
  key: string,
  fallback: string | null = null
): string | null {
  const value = record[key]
  return typeof value === 'string' ? value : fallback
}

function readNumber(record: ResponseRecord, key: string): number | null {
  const value = record[key]

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

function readNestedRecord(record: ResponseRecord, key: string): ResponseRecord | undefined {
  const value = record[key]
  return isRecord(value) ? value : undefined
}

function stripUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)
  ) as T
}

function mapTaskApplicationsListItem(
  application: SerializableResponseRecord | ResponseRecord
): ResponseRecord {
  const serialized = serializeForResponse(application)
  const applicant = readNestedRecord(serialized, 'applicant')

  return stripUndefined({
    id: readString(serialized, 'id', '') ?? '',
    user: applicant
      ? stripUndefined({
          id: readString(applicant, 'id', '') ?? '',
          username: readString(applicant, 'username'),
          email: readString(applicant, 'email'),
        })
      : undefined,
    status: readString(serialized, 'application_status', 'pending') ?? 'pending',
    cover_letter: readString(serialized, 'message'),
    proposed_budget: readNumber(serialized, 'expected_rate'),
    estimated_duration: null,
    created_at: readString(serialized, 'applied_at', '') ?? '',
  })
}

function mapMyApplicationListItem(
  application: SerializableResponseRecord | ResponseRecord
): ResponseRecord {
  const serialized = serializeForResponse(application)
  const task = readNestedRecord(serialized, 'task')
  const createdAt = readString(serialized, 'applied_at', '') ?? ''

  return stripUndefined({
    id: readString(serialized, 'id', '') ?? '',
    task_id: readString(serialized, 'task_id', '') ?? '',
    task: task
      ? {
          id: readString(task, 'id', '') ?? '',
          title: readString(task, 'title', '') ?? '',
          status: readString(task, 'status', '') ?? '',
        }
      : undefined,
    status: readString(serialized, 'application_status', 'pending') ?? 'pending',
    cover_letter: readString(serialized, 'message'),
    proposed_budget: readNumber(serialized, 'expected_rate'),
    estimated_duration: null,
    created_at: createdAt,
    updated_at: readString(serialized, 'reviewed_at', createdAt) ?? createdAt,
  })
}

export function mapApplyForTaskApiBody(application: SerializableResponseRecord | ResponseRecord) {
  return {
    success: true,
    data: serializeForResponse(application),
  }
}

export function mapTaskApplicationsPageProps(
  result: TaskApplicationControllerResult,
  taskId: string,
  statusFilter: string | undefined
) {
  return {
    taskId,
    applications: result.data.map((application) => mapTaskApplicationsListItem(application)),
    meta: result.meta,
    statusFilter: statusFilter ?? 'all',
  }
}

export function mapMyApplicationsPageProps(
  result: TaskApplicationControllerResult,
  statusFilter: string | undefined
) {
  return {
    applications: result.data.map((application) => mapMyApplicationListItem(application)),
    meta: result.meta,
    statusFilter: statusFilter ?? 'all',
  }
}
