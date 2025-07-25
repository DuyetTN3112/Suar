import type { DatabaseId } from '#types/database'

const VERSION_TRACKED_FIELDS = [
  'title',
  'description',
  'status',
  'label',
  'priority',
  'assigned_to',
  'due_date',
  'parent_task_id',
  'estimated_time',
  'actual_time',
  'organization_id',
] as const

export interface TaskVersionSnapshotPayload {
  task_id: DatabaseId
  title: string
  description: string | null
  status: string
  label: string
  priority: string
  difficulty: string | null
  assigned_to: DatabaseId | null
}

function readRequiredSnapshotString(snapshot: Record<string, unknown>, field: string): string {
  const value = snapshot[field]
  if (typeof value !== 'string') {
    throw new Error(`Task version snapshot is missing required string field: ${field}`)
  }

  return value
}

function readRequiredSnapshotId(snapshot: Record<string, unknown>, field: string): DatabaseId {
  const value = snapshot[field]
  if (typeof value !== 'string') {
    throw new Error(`Task version snapshot is missing required id field: ${field}`)
  }

  return value
}

function readOptionalSnapshotString(
  snapshot: Record<string, unknown>,
  field: string
): string | null {
  const value = snapshot[field]
  if (value === null || value === undefined) {
    return null
  }

  if (typeof value !== 'string') {
    throw new Error(`Task version snapshot has invalid optional string field: ${field}`)
  }

  return value
}

function readOptionalSnapshotId(snapshot: Record<string, unknown>, field: string): DatabaseId | null {
  const value = snapshot[field]
  if (value === null || value === undefined) {
    return null
  }

  if (typeof value !== 'string') {
    throw new Error(`Task version snapshot has invalid optional id field: ${field}`)
  }

  return value
}

export function hasTaskVersionRelevantChanges(
  oldValues: Record<string, unknown>,
  newValues: Record<string, unknown>
): boolean {
  return VERSION_TRACKED_FIELDS.some((field) => oldValues[field] !== newValues[field])
}

export function buildTaskVersionSnapshot(
  oldValues: Record<string, unknown>
): TaskVersionSnapshotPayload {
  return {
    task_id: readRequiredSnapshotId(oldValues, 'id'),
    title: readRequiredSnapshotString(oldValues, 'title'),
    description: readOptionalSnapshotString(oldValues, 'description'),
    status: readRequiredSnapshotString(oldValues, 'status'),
    label: readRequiredSnapshotString(oldValues, 'label'),
    priority: readRequiredSnapshotString(oldValues, 'priority'),
    difficulty: readOptionalSnapshotString(oldValues, 'difficulty'),
    assigned_to: readOptionalSnapshotId(oldValues, 'assigned_to'),
  }
}
