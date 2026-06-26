import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'

import type {
  ProjectContextScopeRecord,
  ProjectContextVersionCreateRecord,
  ProjectContextVersionRecord,
  ProjectContextVersionRepository,
} from '#modules/projects/actions/ports/outbound/project-context/project_context_version_repository'
import type { ProjectTransaction } from '#modules/projects/actions/ports/outbound/project_transaction'
import ProjectContextVersion from '#modules/projects/infra/models/project-context/project_context_version'

function lucidTransaction(transaction: ProjectTransaction): TransactionClientContract {
  return transaction as TransactionClientContract
}

function iso(value: DateTime | null): string | null {
  return value?.toUTC().toISO() ?? null
}

function toRecord(model: ProjectContextVersion): ProjectContextVersionRecord {
  return {
    id: model.id,
    projectId: model.project_id,
    organizationId: model.organization_id,
    versionNumber: model.version_number,
    title: model.title,
    summary: model.summary,
    richContent: model.rich_content,
    plainTextProjection: model.plain_text_projection,
    structuredDefaults: model.structured_defaults,
    activeFrom: iso(model.active_from) ?? model.active_from.toString(),
    retiredAt: iso(model.retired_at),
    createdBy: model.created_by,
    confirmedBy: model.confirmed_by,
    changeClass: model.change_class,
    changeReason: model.change_reason,
    privacyClassification: model.privacy_classification,
    contentHash: model.content_hash,
    sourceProvenance: model.source_provenance,
    createdAt: iso(model.created_at) ?? model.created_at.toString(),
  }
}

export class LucidProjectContextVersionRepository implements ProjectContextVersionRepository {
  async findScopeForUpdate(
    projectId: string,
    transaction: ProjectTransaction
  ): Promise<ProjectContextScopeRecord> {
    const trx = lucidTransaction(transaction)
    const project = (await trx
      .from('projects')
      .select(
        'projects.id',
        'projects.organization_id',
        'projects.status',
        'projects.deleted_at',
        'projects.active_project_context_version_id'
      )
      .where('projects.id', projectId)
      .forUpdate()
      .firstOrFail()) as {
      id: string
      organization_id: string
      status: string
      deleted_at: Date | string | null
      active_project_context_version_id: string | null
    }

    let activeVersionNumber = 0
    if (project.active_project_context_version_id) {
      const active = (await trx
        .from('project_context_versions')
        .select('version_number')
        .where('id', project.active_project_context_version_id)
        .where('project_id', project.id)
        .firstOrFail()) as { version_number: number }
      activeVersionNumber = active.version_number
    }

    return {
      projectId: project.id,
      organizationId: project.organization_id,
      activeVersionId: project.active_project_context_version_id,
      activeVersionNumber,
      projectArchived: project.deleted_at !== null || project.status === 'cancelled',
    }
  }

  async createVersion(
    input: ProjectContextVersionCreateRecord,
    transaction: ProjectTransaction
  ): Promise<ProjectContextVersionRecord> {
    const model = await ProjectContextVersion.create(
      {
        schema_version: 'suar.project_context_version.v1',
        organization_id: input.organizationId,
        project_id: input.projectId,
        version_number: input.versionNumber,
        title: input.title,
        summary: input.summary,
        rich_content: input.richContent,
        plain_text_projection: input.plainTextProjection,
        structured_defaults: input.structuredDefaults,
        active_from: DateTime.fromISO(input.activeFrom),
        retired_at: null,
        created_by: input.createdBy,
        confirmed_by: input.confirmedBy,
        change_class: input.changeClass,
        change_reason: input.changeReason,
        privacy_classification: input.privacyClassification,
        content_hash: input.contentHash,
        source_provenance: input.sourceProvenance,
      },
      { client: lucidTransaction(transaction) }
    )
    return toRecord(model)
  }

  async activateVersion(
    input: {
      projectId: string
      expectedActiveVersionId: string | null
      nextVersionId: string
    },
    transaction: ProjectTransaction
  ): Promise<boolean> {
    const query = lucidTransaction(transaction).from('projects').where('id', input.projectId)
    const scopedQuery =
      input.expectedActiveVersionId === null
        ? query.whereNull('active_project_context_version_id')
        : query.where('active_project_context_version_id', input.expectedActiveVersionId)
    const updated = await scopedQuery.update({
      active_project_context_version_id: input.nextVersionId,
    })
    return Number(updated) === 1
  }

  async findActiveFact(projectId: string): Promise<ProjectContextVersionRecord | null> {
    const project = (await db
      .from('projects')
      .select('active_project_context_version_id')
      .where('id', projectId)
      .first()) as { active_project_context_version_id?: string | null } | undefined
    const activeVersionId = project?.active_project_context_version_id ?? null
    if (!activeVersionId) return null

    const model = await ProjectContextVersion.query()
      .where('project_id', projectId)
      .where('id', activeVersionId)
      .first()
    return model ? toRecord(model) : null
  }
}
