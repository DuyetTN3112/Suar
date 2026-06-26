import db from '@adonisjs/lucid/services/db'

import type { ProjectContextFactReader } from '#modules/projects/actions/ports/outbound/project-context/project_context_fact_reader'
import ProjectContextVersion from '#modules/projects/infra/models/project-context/project_context_version'
import {
  PROJECT_CONTEXT_FACT_SCHEMA_V1,
  type ProjectContextFactV1,
} from '#modules/projects/public_contracts/project-context/project_context_facts_v1'
import type { ProjectContextVersionV1 } from '#modules/projects/public_contracts/project-context/task_to_accomplishment_project_contracts'

function toContract(model: ProjectContextVersion): ProjectContextVersionV1 {
  return {
    schemaVersion: 'suar.project_context_version.v1',
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

export class LucidProjectContextFactReader implements ProjectContextFactReader {
  async readProjectContextFact(input: {
    projectId: string
    organizationId: string
  }): Promise<ProjectContextFactV1 | null> {
    const project = (await db
      .from('projects')
      .select('id', 'organization_id', 'active_project_context_version_id')
      .where('id', input.projectId)
      .where('organization_id', input.organizationId)
      .whereNull('deleted_at')
      .first()) as
      | {
          id: string
          organization_id: string
          active_project_context_version_id: string | null
        }
      | undefined
    if (!project) return null

    const active = project.active_project_context_version_id
      ? await ProjectContextVersion.query()
          .where('id', project.active_project_context_version_id)
          .where('project_id', project.id)
          .where('organization_id', project.organization_id)
          .first()
      : null
    const activeVersionNumber = active?.version_number ?? 0

    return {
      schemaVersion: PROJECT_CONTEXT_FACT_SCHEMA_V1,
      projectId: project.id,
      organizationId: project.organization_id,
      activeVersionId: active?.id ?? null,
      activeVersionNumber,
      versionToken: `${project.id}:context:${activeVersionNumber}`,
      context: active ? toContract(active) : null,
    }
  }
}
