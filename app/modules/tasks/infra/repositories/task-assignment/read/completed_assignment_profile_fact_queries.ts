import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import PersistedDataIntegrityException from '#modules/errors/public_contracts/persisted_data_integrity_exception'
import {
  parsePersistedObjectArray,
  parsePersistedStringArray,
} from '#modules/errors/public_contracts/persisted_json_array'
import { isTaskAssignmentSnapshotV1 } from '#modules/tasks/public_contracts/task-authoring/validators'
import { AssignmentStatus } from '#modules/tasks/public_contracts/task_constants'

export interface CompletedAssignmentProfileSourceRow {
  task_assignment_id: string
  task_id: string
  organization_id: string
  project_id: string | null
  task_title: string
  task_type: string | null
  business_domain: string | null
  problem_category: string | null
  role_in_task: string | null
  autonomy_level: string | null
  collaboration_type: string | null
  tech_stack: unknown
  domain_tags: unknown
  difficulty: string | null
  estimated_time: number | string | null
  actual_time: number | string | null
  assignment_estimated_hours: number | string | null
  assignment_actual_hours: number | string | null
  due_date: Date | string | null
  completed_at: Date | string | null
  measurable_outcomes: unknown
  impact_scope: string | null
}

type JsonRecord = Record<string, unknown>

function asRecord(value: unknown): JsonRecord | null {
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value)
    } catch {
      return null
    }
  }
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as JsonRecord)
    : null
}

function requireRecord(value: unknown, snapshotId: string, field: string): JsonRecord {
  const record = asRecord(value)
  if (!record) {
    throw new PersistedDataIntegrityException('Assignment snapshot JSON object is invalid', {
      table: 'task_assignment_snapshots',
      record_id: snapshotId,
      field,
      expected_shape: 'object',
      reason: 'invalid_json',
    })
  }
  return record
}

function snapshotIntegrityError(snapshotId: string, field: string, reason: string): never {
  throw new PersistedDataIntegrityException('Assignment snapshot violates its storage contract', {
    table: 'task_assignment_snapshots',
    record_id: snapshotId,
    field,
    expected_shape: 'task_assignment_snapshot',
    reason,
  })
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null
}

function numberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function jsonStringOrNull(value: unknown): string | null {
  if (typeof value === 'string') return value
  if (value === null || value === undefined) return null
  try {
    return JSON.stringify(value)
  } catch {
    return null
  }
}

function snapshotToSourceRow(row: Record<string, unknown>): CompletedAssignmentProfileSourceRow {
  const snapshotId = String(row['snapshot_id'])
  const canonicalEnvelope = asRecord(row['canonical_snapshot'])
  const legacy = canonicalEnvelope
    ? null
    : requireRecord(row['task_snapshot'], snapshotId, 'task_snapshot')

  if (canonicalEnvelope) {
    const snapshot = asRecord(canonicalEnvelope['snapshot'])
    if (!snapshot || !isTaskAssignmentSnapshotV1(snapshot)) {
      snapshotIntegrityError(snapshotId, 'canonical_snapshot.snapshot', 'invalid_native_snapshot')
    }
    if (snapshot.taskId !== String(row['task_id'])) {
      snapshotIntegrityError(snapshotId, 'canonical_snapshot.snapshot.taskId', 'task_mismatch')
    }
    const resolved = snapshot.resolvedContract
    const projectBusinessDomains = snapshot.projectBusinessDomains ?? []
    return {
      task_assignment_id: String(row['task_assignment_id']),
      task_id: snapshot.taskId,
      organization_id: snapshot.organizationId,
      project_id: snapshot.projectId,
      task_title: resolved.title,
      task_type: null,
      // The profile projection reads only this immutable assignment snapshot.
      // The first controlled Project domain remains the legacy scalar for old
      // consumers; the full context is preserved in domain_tags below.
      business_domain: projectBusinessDomains[0] ?? null,
      problem_category: null,
      role_in_task: resolved.work.roleInTask,
      autonomy_level: resolved.work.autonomyLevel,
      collaboration_type: resolved.work.collaborationType,
      tech_stack: [],
      domain_tags: projectBusinessDomains,
      difficulty: null,
      estimated_time: null,
      actual_time: null,
      assignment_estimated_hours: row['assignment_estimated_hours'] as number | string | null,
      assignment_actual_hours: row['assignment_actual_hours'] as number | string | null,
      due_date: resolved.work.dueAt,
      completed_at: row['completed_at'] as Date | string | null,
      measurable_outcomes: [],
      impact_scope: jsonStringOrNull(resolved.work.impactScope),
    }
  }

  if (!legacy) {
    snapshotIntegrityError(snapshotId, 'task_snapshot', 'missing_legacy_snapshot')
  }

  const taskId = stringOrNull(legacy['id']) ?? stringOrNull(row['task_id'])
  const organizationId = stringOrNull(legacy['organization_id'])
  const title = stringOrNull(legacy['title'])
  if (!taskId || !organizationId || !title) {
    snapshotIntegrityError(snapshotId, 'task_snapshot', 'missing_required_metadata')
  }
  if (taskId !== String(row['task_id'])) {
    snapshotIntegrityError(snapshotId, 'task_snapshot.id', 'task_mismatch')
  }

  const arrayContext = (field: string) => ({
    table: 'task_assignment_snapshots',
    field: `task_snapshot.${field}`,
    recordId: snapshotId,
  })

  return {
    task_assignment_id: String(row['task_assignment_id']),
    task_id: taskId,
    organization_id: organizationId,
    project_id: stringOrNull(legacy['project_id']),
    task_title: title,
    task_type: stringOrNull(legacy['task_type']),
    business_domain: stringOrNull(legacy['business_domain']),
    problem_category: stringOrNull(legacy['problem_category']),
    role_in_task: stringOrNull(legacy['role_in_task']),
    autonomy_level: stringOrNull(legacy['autonomy_level']),
    collaboration_type: stringOrNull(legacy['collaboration_type']),
    tech_stack: parsePersistedStringArray(legacy['tech_stack'], arrayContext('tech_stack')),
    domain_tags: parsePersistedStringArray(legacy['domain_tags'], arrayContext('domain_tags')),
    difficulty: stringOrNull(legacy['difficulty']),
    estimated_time: numberOrNull(legacy['estimated_time']),
    actual_time: numberOrNull(legacy['actual_time']),
    assignment_estimated_hours: row['assignment_estimated_hours'] as number | string | null,
    assignment_actual_hours: row['assignment_actual_hours'] as number | string | null,
    due_date: (legacy['due_date'] as Date | string | null) ?? null,
    completed_at: row['completed_at'] as Date | string | null,
    measurable_outcomes: parsePersistedObjectArray(
      legacy['measurable_outcomes'],
      arrayContext('measurable_outcomes')
    ),
    impact_scope: stringOrNull(legacy['impact_scope']),
  }
}

/**
 * One Tasks-owned batch read for completed assignments that are eligible to
 * affect a user profile. The source is the immutable assignment snapshot, but
 * a snapshot alone is not profile evidence: its Task Review Board workflow
 * must also be terminally `done`. Current task rows are not consulted, so
 * edits/deletion after completion cannot rewrite history.
 */
export async function listCompletedAssignmentProfileSourceRows(
  userId: string,
  trx?: TransactionClientContract
): Promise<CompletedAssignmentProfileSourceRow[]> {
  const client = trx ?? db
  const rows = (await client
    .from('task_assignments as ta')
    .join('task_assignment_snapshots as tas', 'tas.task_assignment_id', 'ta.id')
    .where('ta.assignee_id', userId)
    .where('ta.assignment_status', AssignmentStatus.COMPLETED)
    .whereExists((reviewWorkflow) => {
      void reviewWorkflow
        .from('task_review_workflows as trw')
        .whereRaw('trw.task_assignment_id = ta.id')
        .where('trw.status', 'done')
    })
    .select(
      'ta.id as task_assignment_id',
      'ta.task_id',
      'ta.estimated_hours as assignment_estimated_hours',
      'ta.actual_hours as assignment_actual_hours',
      'ta.completed_at',
      'tas.id as snapshot_id',
      'tas.snapshot_sequence',
      'tas.created_at as snapshot_created_at',
      'tas.canonical_snapshot',
      'tas.task_snapshot'
    )
    .orderBy('ta.id', 'asc')
    .orderByRaw('tas.snapshot_sequence DESC NULLS LAST')
    .orderBy('tas.created_at', 'desc')) as Array<Record<string, unknown>>

  const latestByAssignment = new Map<string, Record<string, unknown>>()
  for (const row of rows) {
    const assignmentId = String(row['task_assignment_id'])
    if (!latestByAssignment.has(assignmentId)) latestByAssignment.set(assignmentId, row)
  }

  return [...latestByAssignment.values()].map(snapshotToSourceRow).sort((left, right) => {
    const leftTime = left.completed_at
      ? new Date(left.completed_at).getTime()
      : Number.POSITIVE_INFINITY
    const rightTime = right.completed_at
      ? new Date(right.completed_at).getTime()
      : Number.POSITIVE_INFINITY
    return leftTime - rightTime || left.task_assignment_id.localeCompare(right.task_assignment_id)
  })
}
