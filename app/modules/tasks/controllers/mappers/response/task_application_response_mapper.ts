import type { PaginationMeta, SerializedModelRecord, SerializableModelRecord } from './model_response_serialization.js'
import { serializeModelForHttpResponse } from './model_response_serialization.js'

import {
  fromLegacySnakePagination,
  toCanonicalPagePagination,
} from '#modules/pagination/public_contracts/pagination_public_api'
import { ApplicationStatus } from '#modules/tasks/public_contracts/task_constants'

interface TaskApplicationControllerResult {
  data: (SerializableModelRecord | SerializedModelRecord)[]
  meta: PaginationMeta
}

function isRecord(value: unknown): value is SerializedModelRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readValue(record: SerializedModelRecord, key: string): unknown {
  return (record as Record<string, unknown>)[key]
}

function readString(
  record: SerializedModelRecord,
  key: string,
  fallback: string | null = null
): string | null {
  const value = readValue(record, key)
  return typeof value === 'string' ? value : fallback
}

function readNestedRecord(record: SerializedModelRecord, key: string): SerializedModelRecord | undefined {
  const value = readValue(record, key)
  return isRecord(value) ? value : undefined
}

function stripUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)
  ) as T
}

function toCamelCaseKey(key: string): string {
  return key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase())
}

function camelizeResponseValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => camelizeResponseValue(item))
  }

  if (isRecord(value)) {
    const output: Record<string, unknown> = {}

    for (const [key, nestedValue] of Object.entries(value)) {
      output[toCamelCaseKey(key)] = camelizeResponseValue(nestedValue)
    }

    return output
  }

  return value
}

function mapTaskApplicationsListItem(
  application: SerializableModelRecord | SerializedModelRecord
): SerializedModelRecord {
  const serialized = serializeModelForHttpResponse(application)
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
    status:
      readString(serialized, 'application_status', ApplicationStatus.PENDING) ??
      ApplicationStatus.PENDING,
    cover_letter: readString(serialized, 'message'),
    estimated_duration: null,
    created_at: readString(serialized, 'applied_at', '') ?? '',
    candidate_source: readString(serialized, 'candidate_source', 'external') ?? 'external',
  })
}

function mapMyApplicationListItem(
  application: SerializableModelRecord | SerializedModelRecord
): SerializedModelRecord {
  const serialized = serializeModelForHttpResponse(application)
  const task = readNestedRecord(serialized, 'task')
  const createdAt = readString(serialized, 'applied_at', '') ?? ''
  const status =
    readString(serialized, 'application_status', ApplicationStatus.PENDING) ??
    ApplicationStatus.PENDING
  const applicationStatus = status as ApplicationStatus
  const withdrawnAt = readString(serialized, 'reviewed_at')
  const organization = task ? readNestedRecord(task, 'organization') : undefined
  const project = task ? readNestedRecord(task, 'project') : undefined

  const lifecycleEvents: { label: string }[] = []
  lifecycleEvents.push({ label: `Đã gửi đề xuất: ${createdAt}` })
  if (applicationStatus === ApplicationStatus.APPROVED) {
    lifecycleEvents.push({
      label: withdrawnAt ? `Đã được chọn: ${withdrawnAt}` : 'Đã được chọn',
    })
  }
  if (applicationStatus === ApplicationStatus.REJECTED) {
    lifecycleEvents.push({
      label: withdrawnAt ? `Đã bị từ chối: ${withdrawnAt}` : 'Đã bị từ chối',
    })
  }
  if (applicationStatus === ApplicationStatus.WITHDRAWN) {
    lifecycleEvents.push({
      label: withdrawnAt ? `Đã rút đề xuất: ${withdrawnAt}` : 'Đã rút đề xuất',
    })
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
    rejection_reason: readString(serialized, 'rejection_reason'),
    estimated_duration: null,
    created_at: createdAt,
    updated_at: withdrawnAt ?? createdAt,
    organization_name: organization ? readString(organization, 'name') : undefined,
    project_name: project ? readString(project, 'name') : undefined,
    withdrawn_at: applicationStatus === ApplicationStatus.WITHDRAWN ? withdrawnAt : null,
    lifecycle_events: lifecycleEvents,
    can_withdraw: applicationStatus === ApplicationStatus.PENDING,
  })
}

export function mapApplyForTaskApiBody(application: SerializableModelRecord | SerializedModelRecord) {
  return {
    data: camelizeResponseValue(serializeModelForHttpResponse(application)),
  }
}

export function mapApplicationMatchScoreApiBody(result: SerializedModelRecord) {
  return {
    data: camelizeResponseValue(result),
  }
}

export function mapTaskApplicationsRankingApiBody(
  results: (SerializableModelRecord | SerializedModelRecord)[]
) {
  return {
    data: camelizeResponseValue(results),
  }
}

export function mapTaskApplicationsPageProps(
  result: TaskApplicationControllerResult,
  taskId: string,
  statusFilter: string | undefined,
  shellMode: 'app' | 'organization' = 'app'
) {
  return {
    shellMode,
    taskId,
    applications: result.data.map((application) => mapTaskApplicationsListItem(application)),
    pagination: toCanonicalPagePagination(fromLegacySnakePagination(result.meta)),
    statusFilter: statusFilter ?? 'all',
  }
}

export function mapMyApplicationsPageProps(
  result: TaskApplicationControllerResult,
  statusFilter: string | undefined
) {
  return {
    applications: result.data.map((application) => mapMyApplicationListItem(application)),
    pagination: toCanonicalPagePagination(fromLegacySnakePagination(result.meta)),
    statusFilter: statusFilter ?? 'all',
  }
}
