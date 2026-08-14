import { createHash } from 'node:crypto'

import { DateTime } from 'luxon'

import { parsePersistedStringArray } from '#modules/errors/public_contracts/persisted_json_array'
import type {
  TaskMetadataAssignmentAccessContext,
  TaskMetadataAssignmentSourceQuery,
  TaskMetadataAssignmentSourceReader,
  TaskMetadataCanonicalAssignmentSource,
  TaskMetadataCanonicalNamespace,
  TaskMetadataEntitySource,
  TaskMetadataNamespaceSource,
  TaskMetadataTaxonomyVersionReader,
  TaskMetadataTaxonomyVersionSnapshot,
} from '#modules/tasks/actions/ports/outbound/task_metadata_assignment_source_reader'
import { TASK_METADATA_CANONICAL_NAMESPACES } from '#modules/tasks/actions/ports/outbound/task_metadata_assignment_source_reader'
import { isCanonicalTaskType } from '#modules/tasks/domain/task-authoring/task_taxonomy'
import Task from '#modules/tasks/infra/models/task-authoring/task'
import type TaskRequiredSkill from '#modules/tasks/infra/models/task-requirements/task_required_skill'

const PUBLIC_VISIBILITIES = ['external', 'all']

function stringArrayAttribute(
  context: TaskMetadataAssignmentAccessContext | undefined,
  key: string
) {
  const value = context?.attributes?.[key]
  if (!Array.isArray(value)) return []
  return value.filter(
    (candidate): candidate is string => typeof candidate === 'string' && candidate.trim().length > 0
  )
}

function requestedNamespaces(
  query: TaskMetadataAssignmentSourceQuery
): readonly TaskMetadataCanonicalNamespace[] {
  return query.namespaces ?? TASK_METADATA_CANONICAL_NAMESPACES
}

function positiveVersion(snapshot: TaskMetadataTaxonomyVersionSnapshot, namespace: string): number {
  const version = snapshot.taxonomyVersions[namespace]
  if (!Number.isSafeInteger(version) || version === undefined || version < 1) {
    throw new RangeError('Task metadata taxonomy version must be a positive integer')
  }
  return version
}

function optionalEnrichmentVersion(
  snapshot: TaskMetadataTaxonomyVersionSnapshot,
  namespace: string
): number | undefined {
  const version = snapshot.enrichmentVersions?.[namespace]
  if (version === undefined) return undefined
  if (!Number.isSafeInteger(version) || version < 1) {
    throw new RangeError('Task metadata enrichment version must be a positive integer')
  }
  return version
}

function scalarNamespace(
  namespace: TaskMetadataCanonicalNamespace,
  rawValue: string | null | undefined,
  snapshot: TaskMetadataTaxonomyVersionSnapshot,
  sourceType: string,
  validate?: (value: string) => boolean
): TaskMetadataNamespaceSource {
  const value = rawValue?.trim()
  const taxonomyVersion = positiveVersion(snapshot, namespace)
  const enrichmentVersion = optionalEnrichmentVersion(snapshot, namespace)
  if (!value) {
    return {
      namespace,
      state: 'missing',
      taxonomyVersion,
      ...(enrichmentVersion === undefined ? {} : { enrichmentVersion }),
      assignments: [],
    }
  }
  if (validate && !validate(value)) {
    return {
      namespace,
      state: 'unresolved',
      taxonomyVersion,
      ...(enrichmentVersion === undefined ? {} : { enrichmentVersion }),
      unresolvedCount: 1,
      assignments: [],
    }
  }
  return {
    namespace,
    state: 'known_present',
    taxonomyVersion,
    ...(enrichmentVersion === undefined ? {} : { enrichmentVersion }),
    assignments: [
      {
        termId: value,
        provenance: 'explicit',
        reviewState: 'reviewed',
        sourceType,
      },
    ],
  }
}

function persistedValues(
  value: unknown,
  taskId: string,
  field: string
): { state: 'known_present' | 'known_absent' | 'missing'; values: string[] } {
  if (value === null || value === undefined) return { state: 'missing', values: [] }
  const values = parsePersistedStringArray(value, {
    table: Task.table,
    field,
    recordId: taskId,
  })
  return { state: values.length === 0 ? 'known_absent' : 'known_present', values }
}

function arrayNamespace(
  namespace: TaskMetadataCanonicalNamespace,
  value: unknown,
  taskId: string,
  field: string,
  snapshot: TaskMetadataTaxonomyVersionSnapshot,
  sourceType: string
): TaskMetadataNamespaceSource {
  const source = persistedValues(value, taskId, field)
  const taxonomyVersion = positiveVersion(snapshot, namespace)
  const enrichmentVersion = optionalEnrichmentVersion(snapshot, namespace)
  return {
    namespace,
    state: source.state,
    taxonomyVersion,
    ...(enrichmentVersion === undefined ? {} : { enrichmentVersion }),
    assignments: source.values.map((termId) => ({
      termId,
      provenance: 'explicit',
      reviewState: 'reviewed',
      sourceType,
    })),
  }
}

function requiredSkillProvenance(
  source: TaskRequiredSkill['requirement_source']
): TaskMetadataCanonicalAssignmentSource['provenance'] {
  if (source === 'manual') return 'explicit'
  if (source === 'imported_legacy') return 'imported'
  return 'derived'
}

function skillNamespace(
  requiredSkills: readonly TaskRequiredSkill[],
  snapshot: TaskMetadataTaxonomyVersionSnapshot
): TaskMetadataNamespaceSource {
  const namespace = 'skills'
  const taxonomyVersion = positiveVersion(snapshot, namespace)
  const enrichmentVersion = optionalEnrichmentVersion(snapshot, namespace)
  return {
    namespace,
    state: requiredSkills.length === 0 ? 'missing' : 'known_present',
    taxonomyVersion,
    ...(enrichmentVersion === undefined ? {} : { enrichmentVersion }),
    assignments: requiredSkills.map((requiredSkill) => {
      const validFrom = requiredSkill.created_at.toISO()
      return {
        termId: requiredSkill.skill_id,
        provenance: requiredSkillProvenance(requiredSkill.requirement_source),
        reviewState: 'reviewed',
        sourceType: 'task_required_skill',
        sourceId: requiredSkill.id,
        ...(validFrom === null ? {} : { validFrom }),
      }
    }),
  }
}

function buildNamespaces(
  task: Task,
  namespaces: readonly TaskMetadataCanonicalNamespace[],
  snapshot: TaskMetadataTaxonomyVersionSnapshot
): TaskMetadataNamespaceSource[] {
  return namespaces.map((namespace) => {
    switch (namespace) {
      case 'skills':
        return skillNamespace(task.required_skills_rel, snapshot)
      case 'business-domains':
        return scalarNamespace(namespace, task.business_domain, snapshot, 'task.business_domain')
      case 'problem-categories':
        return scalarNamespace(namespace, task.problem_category, snapshot, 'task.problem_category')
      case 'task-types':
        return scalarNamespace(
          namespace,
          task.task_type,
          snapshot,
          'task.task_type',
          isCanonicalTaskType
        )
      case 'technologies':
        return arrayNamespace(
          namespace,
          task.tech_stack,
          task.id,
          'tech_stack',
          snapshot,
          'task.tech_stack'
        )
    }
  })
}

function requiredTimestamp(value: DateTime, field: string): string {
  const iso = value.toISO()
  if (!iso) throw new RangeError(`Task metadata ${field} must be a valid timestamp`)
  return iso
}

function projectedSourceRevision(
  task: Task,
  namespaces: readonly TaskMetadataNamespaceSource[],
  freeFormTags: readonly { value: string; tagSpace: string; sourceType: string; sourceId: string }[]
): string {
  const payload = JSON.stringify({
    taskUpdatedAt: requiredTimestamp(task.updated_at, 'sourceRevision'),
    namespaces,
    freeFormTags,
  })
  return `sha256:${createHash('sha256').update(payload).digest('hex')}`
}

export class LucidTaskMetadataAssignmentSourceReader implements TaskMetadataAssignmentSourceReader {
  constructor(private readonly versionReader: TaskMetadataTaxonomyVersionReader) {}

  async loadVisibleTaskMetadata(
    input: TaskMetadataAssignmentSourceQuery,
    accessContext?: TaskMetadataAssignmentAccessContext
  ): Promise<readonly TaskMetadataEntitySource[]> {
    const entityIds = [...new Set(input.entityIds.filter((entityId) => entityId.trim().length > 0))]
    if (entityIds.length === 0) return []
    const namespaces = requestedNamespaces(input)
    const versions = await this.versionReader.getVersions(namespaces)
    const authorizedTaskIds = stringArrayAttribute(accessContext, 'authorizedTaskIds')
    const authorizedOrganizationIds = stringArrayAttribute(
      accessContext,
      'authorizedOrganizationIds'
    )
    const tasks = await Task.query()
      .whereIn('id', entityIds)
      .whereNull('deleted_at')
      .where((visibilityQuery) => {
        void visibilityQuery.whereIn('task_visibility', PUBLIC_VISIBILITIES)
        if (authorizedTaskIds.length > 0) {
          void visibilityQuery.orWhereIn('id', authorizedTaskIds)
        }
        if (authorizedOrganizationIds.length > 0) {
          void visibilityQuery.orWhereIn('organization_id', authorizedOrganizationIds)
        }
      })
      .preload('required_skills_rel', (query) => {
        void query.orderBy('created_at', 'asc').orderBy('id', 'asc')
      })
      .orderBy('id', 'asc')
    const projectedAt = requiredTimestamp(DateTime.utc(), 'projectedAt')

    return tasks.map((task) => {
      const freeTagValues = persistedValues(task.domain_tags, task.id, 'domain_tags').values
      const projectedNamespaces = buildNamespaces(task, namespaces, versions)
      const freeFormTags = freeTagValues.map((value) => ({
        value,
        tagSpace: 'task.domain-tags',
        sourceType: 'task.domain_tags',
        sourceId: task.id,
      }))
      return {
        entityId: task.id,
        organizationId: task.organization_id,
        visibility: task.task_visibility,
        deleted: task.deleted_at !== null,
        sourceRevision: projectedSourceRevision(task, projectedNamespaces, freeFormTags),
        projectedAt,
        namespaces: projectedNamespaces,
        freeFormTags,
      }
    })
  }
}
