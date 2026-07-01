import type {
  ProjectContextFactV1,
  WorkPackageFactV1,
} from '#modules/projects/public_contracts/project-context/project_context_facts_v1'
import {
  PROJECT_TASK_AUTHORING_CONTEXT_SCHEMA_V1,
  type ProjectTaskAuthoringContextV1,
} from '#modules/projects/public_contracts/project-context/task_authoring_context'

/**
 * Explicit allowlist for task-authoring selectors.
 *
 * Deliberately excludes actor IDs, hashes, source provenance, rich content,
 * structured defaults/overrides, version tokens, and taxonomy metadata.
 */
export function mapProjectTaskAuthoringContext(
  projectContext: ProjectContextFactV1,
  workPackages: readonly WorkPackageFactV1[]
): ProjectTaskAuthoringContextV1 {
  const context = projectContext.context

  return {
    schemaVersion: PROJECT_TASK_AUTHORING_CONTEXT_SCHEMA_V1,
    projectId: projectContext.projectId,
    activeProjectContext: context
      ? {
          id: context.id,
          versionNumber: context.versionNumber,
          title: context.title,
          summary: context.summary,
          privacyClassification: context.privacyClassification,
        }
      : null,
    workPackages: [...workPackages]
      .filter((fact) => fact.workPackage.state === 'active')
      .sort((left, right) =>
        `${left.workPackage.key}:${left.workPackage.id}`.localeCompare(
          `${right.workPackage.key}:${right.workPackage.id}`
        )
      )
      .map((fact) => ({
        id: fact.workPackage.id,
        key: fact.workPackage.key,
        title: fact.workPackage.title,
        summary: fact.workPackage.summary,
        status: fact.activeVersion ? 'ready' : 'no_active_version',
        activeVersion: fact.activeVersion
          ? {
              id: fact.activeVersion.id,
              versionNumber: fact.activeVersion.versionNumber,
              title: fact.activeVersion.title,
              summary: fact.activeVersion.summary,
              projectContextVersionId: fact.activeVersion.projectContextVersionId,
              privacyClassification: fact.activeVersion.privacyClassification,
            }
          : null,
      })),
  }
}
