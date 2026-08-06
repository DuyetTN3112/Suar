import type { TaskAssignmentTaxonomyMetadataV1 } from '#modules/tasks/public_contracts/task-authoring/task_contracts'
import type { MetadataAssignmentResult } from '#modules/taxonomy/public_contracts/taxonomy-governance/metadata_assignment_provider'

export function pinTaskAssignmentTaxonomyMetadata(
  taskId: string,
  result: MetadataAssignmentResult
): TaskAssignmentTaxonomyMetadataV1 | null {
  if (!taskId.trim()) return null
  if (
    result.assignments.some(
      (assignment) => assignment.resource !== 'task' || assignment.entityId !== taskId
    ) ||
    result.freeFormTags.some(
      (tag) => tag.resource !== 'task' || tag.entityId !== taskId
    )
  ) {
    return null
  }

  const sourceRevision = result.providerVersions?.sourceRevisions[taskId] ?? null
  const projectedAt =
    result.completeness?.find(
      (report) => report.resource === 'task' && report.entityId === taskId
    )?.projectedAt ?? null
  if (sourceRevision === null && projectedAt === null && result.assignments.length === 0) {
    return null
  }

  return {
    schemaVersion: 'suar.task_assignment_taxonomy_metadata.v1',
    entityId: taskId,
    sourceRevision,
    projectedAt,
    assignments: result.assignments,
    freeFormTags: result.freeFormTags,
    taxonomyVersions: result.taxonomyVersions,
    diagnostics: result.diagnostics,
    completeness: result.completeness ?? [],
    providerVersions: result.providerVersions ?? null,
  }
}
