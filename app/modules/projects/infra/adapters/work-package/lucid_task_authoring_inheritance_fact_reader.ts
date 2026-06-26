import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type {
  ProjectContextVersionV1,
  WorkPackageVersionV1,
} from '#modules/projects/public_contracts/project-context/task_to_accomplishment_project_contracts'
import ProjectContextVersion from '#modules/projects/infra/models/project-context/project_context_version'
import WorkPackage from '#modules/projects/infra/models/work-package/work_package'
import WorkPackageVersion from '#modules/projects/infra/models/work-package/work_package_version'
import type {
  TaskAuthoringInheritanceFactReaderV1,
  TaskAuthoringInheritanceFactsV1,
} from '#modules/projects/public_contracts/task_authoring_inheritance_facts_v1'

function projectContextContract(model: ProjectContextVersion): ProjectContextVersionV1 {
  return {
    schemaVersion: model.schema_version,
    id: model.id,
    organizationId: model.organization_id,
    projectId: model.project_id,
    versionNumber: model.version_number,
    title: model.title,
    summary: model.summary,
    richContent: model.rich_content,
    plainTextProjection: model.plain_text_projection,
    structuredDefaults: model.structured_defaults,
    activeFrom: model.active_from.toUTC().toISO() ?? model.active_from.toString(),
    retiredAt: model.retired_at?.toUTC().toISO() ?? null,
    createdBy: model.created_by,
    confirmedBy: model.confirmed_by,
    changeClass: model.change_class,
    changeReason: model.change_reason,
    privacyClassification: model.privacy_classification,
    contentHash: model.content_hash,
    sourceProvenance: model.source_provenance,
    createdAt: model.created_at.toUTC().toISO() ?? model.created_at.toString(),
  }
}

function workPackageVersionContract(model: WorkPackageVersion): WorkPackageVersionV1 {
  return {
    schemaVersion: model.schema_version,
    id: model.id,
    workPackageId: model.work_package_id,
    projectId: model.project_id,
    projectContextVersionId: model.project_context_version_id,
    versionNumber: model.version_number,
    title: model.title,
    summary: model.summary,
    richContent: model.rich_content,
    plainTextProjection: model.plain_text_projection,
    structuredOverrides: model.structured_overrides,
    authorId: model.author_id,
    confirmedBy: model.confirmed_by,
    changeClass: model.change_class,
    changeReason: model.change_reason,
    privacyClassification: model.privacy_classification,
    contentHash: model.content_hash,
    sourceProvenance: model.source_provenance,
    createdAt: model.created_at.toUTC().toISO() ?? model.created_at.toString(),
  }
}

export class LucidTaskAuthoringInheritanceFactReader
  implements TaskAuthoringInheritanceFactReaderV1
{
  async readExactTaskAuthoringInheritance(
    input: {
      organizationId: string
      projectId: string
      projectContextVersionId: string | null
      workPackageVersionId: string | null
    },
    transaction?: object
  ): Promise<TaskAuthoringInheritanceFactsV1> {
    const trx = transaction as TransactionClientContract | undefined
    let projectContextVersion: ProjectContextVersionV1 | null = null
    let workPackageVersion: WorkPackageVersionV1 | null = null

    if (input.projectContextVersionId) {
      const query = trx
        ? ProjectContextVersion.query({ client: trx })
        : ProjectContextVersion.query()
      const model = await query
        .where('id', input.projectContextVersionId)
        .where('organization_id', input.organizationId)
        .where('project_id', input.projectId)
        .first()
      projectContextVersion = model ? projectContextContract(model) : null
    }

    if (input.workPackageVersionId) {
      const versionQuery = trx
        ? WorkPackageVersion.query({ client: trx })
        : WorkPackageVersion.query()
      const version = await versionQuery
        .where('id', input.workPackageVersionId)
        .where('project_id', input.projectId)
        .first()
      const packageQuery = trx ? WorkPackage.query({ client: trx }) : WorkPackage.query()
      const parent = version
        ? await packageQuery
            .where('id', version.work_package_id)
            .where('organization_id', input.organizationId)
            .where('project_id', input.projectId)
            .first()
        : null
      workPackageVersion = version && parent ? workPackageVersionContract(version) : null
    }

    return { projectContextVersion, workPackageVersion }
  }
}
