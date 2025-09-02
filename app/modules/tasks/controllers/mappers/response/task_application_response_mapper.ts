import type { PaginationMeta, ResponseRecord, SerializableResponseRecord } from './shared.js'
import { serializeForResponse } from './shared.js'

interface TaskApplicationControllerResult {
  data: (SerializableResponseRecord | ResponseRecord)[]
  meta: PaginationMeta
}

function isRecord(value: unknown): value is ResponseRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readValue(record: ResponseRecord, key: string): unknown {
  return (record as Record<string, unknown>)[key]
}

function readString(
  record: ResponseRecord,
  key: string,
  fallback: string | null = null
): string | null {
  const value = readValue(record, key)
  return typeof value === 'string' ? value : fallback
}

function readNumber(record: ResponseRecord, key: string): number | null {
  const value = readValue(record, key)

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
  const value = readValue(record, key)
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
    candidate_source: readString(serialized, 'candidate_source', 'external') ?? 'external',
  })
}

function mapMyApplicationListItem(
  application: SerializableResponseRecord | ResponseRecord
): ResponseRecord {
  const serialized = serializeForResponse(application)
  const task = readNestedRecord(serialized, 'task')
  const createdAt = readString(serialized, 'applied_at', '') ?? ''
  const status = readString(serialized, 'application_status', 'pending') ?? 'pending'
  const withdrawnAt = readString(serialized, 'reviewed_at')
  const organization = task ? readNestedRecord(task, 'organization') : undefined
  const project = task ? readNestedRecord(task, 'project') : undefined

  const lifecycleEvents: { label: string }[] = []
  lifecycleEvents.push({ label: `Applied at ${createdAt}` })
  if (status === 'approved') {
    lifecycleEvents.push({ label: `Approved at ${withdrawnAt ?? 'unknown'}` })
  }
  if (status === 'rejected') {
    lifecycleEvents.push({ label: `Rejected at ${withdrawnAt ?? 'unknown'}` })
  }
  if (status === 'withdrawn') {
    lifecycleEvents.push({ label: `Withdrawn at ${withdrawnAt ?? 'unknown'}` })
  }

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
    status,
    cover_letter: readString(serialized, 'message'),
    proposed_budget: readNumber(serialized, 'expected_rate'),
    estimated_duration: null,
    created_at: createdAt,
    updated_at: withdrawnAt ?? createdAt,
    organization_name: organization ? readString(organization, 'name') : undefined,
    project_name: project ? readString(project, 'name') : undefined,
    withdrawn_at: status === 'withdrawn' ? withdrawnAt : null,
    lifecycle_events: lifecycleEvents,
    can_withdraw: status === 'pending',
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
