import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { DateTime } from 'luxon'

import type { ProjectTransaction } from '#modules/projects/actions/ports/outbound/project_transaction'
import type {
  WorkPackageCreateRecord,
  WorkPackageProjectScopeRecord,
  WorkPackageRecord,
  WorkPackageRepository,
  WorkPackageScopeRecord,
  WorkPackageVersionCreateRecord,
  WorkPackageVersionRecord,
} from '#modules/projects/actions/ports/outbound/work_package_repository'
import WorkPackage from '#modules/projects/infra/models/work-package/work_package'
import WorkPackageVersion from '#modules/projects/infra/models/work-package/work_package_version'

function lucidTransaction(transaction: ProjectTransaction): TransactionClientContract {
  return transaction as TransactionClientContract
}

function iso(value: DateTime | null): string | null {
  return value?.toUTC().toISO() ?? null
}

function packageRecord(model: WorkPackage): WorkPackageRecord {
  return {
    id: model.id,
    projectId: model.project_id,
    organizationId: model.organization_id,
    key: model.key,
    title: model.title,
    summary: model.summary,
    state: model.state,
    activeVersionId: model.active_version_id,
    createdBy: model.created_by,
    createdAt: iso(model.created_at) ?? model.created_at.toString(),
    archivedAt: iso(model.archived_at),
  }
}

function versionRecord(model: WorkPackageVersion): WorkPackageVersionRecord {
  return {
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
    createdAt: iso(model.created_at) ?? model.created_at.toString(),
  }
}

export class LucidWorkPackageRepository implements WorkPackageRepository {
  async findProjectScopeForUpdate(
    projectId: string,
    transaction: ProjectTransaction
  ): Promise<WorkPackageProjectScopeRecord> {
    const project = (await lucidTransaction(transaction)
      .from('projects')
      .select('id', 'organization_id', 'status', 'deleted_at')
      .where('id', projectId)
      .forUpdate()
      .firstOrFail()) as {
      id: string
      organization_id: string
      status: string
      deleted_at: Date | string | null
    }
    return {
      projectId: project.id,
      organizationId: project.organization_id,
      projectArchived: project.deleted_at !== null || project.status === 'cancelled',
    }
  }

  async findPackageScopeForUpdate(
    workPackageId: string,
    transaction: ProjectTransaction
  ): Promise<WorkPackageScopeRecord> {
    const trx = lucidTransaction(transaction)
    const record = (await trx
      .from('work_packages')
      .select(
        'id',
        'project_id',
        'organization_id',
        'key',
        'title',
        'summary',
        'state',
        'active_version_id',
        'archived_at'
      )
      .where('id', workPackageId)
      .forUpdate()
      .firstOrFail()) as {
      id: string
      project_id: string
      organization_id: string
      key: string
      title: string
      summary: string
      state: 'active' | 'archived'
      active_version_id: string | null
      archived_at: Date | string | null
    }
    const activeVersion = record.active_version_id
      ? ((await trx
          .from('work_package_versions')
          .select('version_number')
          .where('id', record.active_version_id)
          .where('work_package_id', record.id)
          .firstOrFail()) as { version_number: number })
      : null
    return {
      id: record.id,
      projectId: record.project_id,
      organizationId: record.organization_id,
      key: record.key,
      title: record.title,
      summary: record.summary,
      state: record.state,
      activeVersionId: record.active_version_id,
      activeVersionNumber: activeVersion?.version_number ?? 0,
      archivedAt:
        record.archived_at instanceof Date ? record.archived_at.toISOString() : record.archived_at,
    }
  }

  async isProjectContextVersionVisible(
    input: { versionId: string; projectId: string; organizationId: string },
    transaction: ProjectTransaction
  ): Promise<boolean> {
    const record = (await lucidTransaction(transaction)
      .from('project_context_versions')
      .select('id')
      .where('id', input.versionId)
      .where('project_id', input.projectId)
      .where('organization_id', input.organizationId)
      .first()) as { id: string } | undefined
    return Boolean(record)
  }

  async createPackage(
    input: WorkPackageCreateRecord,
    transaction: ProjectTransaction
  ): Promise<WorkPackageRecord> {
    const model = await WorkPackage.create(
      {
        schema_version: 'suar.work_package.v1',
        project_id: input.projectId,
        organization_id: input.organizationId,
        key: input.key,
        title: input.title,
        summary: input.summary,
        state: 'active',
        active_version_id: null,
        created_by: input.createdBy,
        archived_at: null,
      },
      { client: lucidTransaction(transaction) }
    )
    return packageRecord(model)
  }

  async createVersion(
    input: WorkPackageVersionCreateRecord,
    transaction: ProjectTransaction
  ): Promise<WorkPackageVersionRecord> {
    const model = await WorkPackageVersion.create(
      {
        schema_version: 'suar.work_package_version.v1',
        work_package_id: input.workPackageId,
        project_id: input.projectId,
        project_context_version_id: input.projectContextVersionId,
        version_number: input.versionNumber,
        title: input.title,
        summary: input.summary,
        rich_content: input.richContent,
        plain_text_projection: input.plainTextProjection,
        structured_overrides: input.structuredOverrides,
        author_id: input.authorId,
        confirmed_by: input.confirmedBy,
        change_class: input.changeClass,
        change_reason: input.changeReason,
        privacy_classification: input.privacyClassification,
        content_hash: input.contentHash,
        source_provenance: input.sourceProvenance,
      },
      { client: lucidTransaction(transaction) }
    )
    return versionRecord(model)
  }

  async activateVersion(
    input: {
      workPackageId: string
      expectedActiveVersionId: string | null
      nextVersionId: string
      title: string
      summary: string
    },
    transaction: ProjectTransaction
  ): Promise<boolean> {
    const query = lucidTransaction(transaction)
      .from('work_packages')
      .where('id', input.workPackageId)
      .where('state', 'active')
    const scoped =
      input.expectedActiveVersionId === null
        ? query.whereNull('active_version_id')
        : query.where('active_version_id', input.expectedActiveVersionId)
    const updated = await scoped.update({
      active_version_id: input.nextVersionId,
      title: input.title,
      summary: input.summary,
      updated_at: new Date(),
    })
    return Number(updated) === 1
  }

  async archive(
    input: { workPackageId: string; expectedActiveVersionId: string | null; archivedAt: string },
    transaction: ProjectTransaction
  ): Promise<boolean> {
    const query = lucidTransaction(transaction)
      .from('work_packages')
      .where('id', input.workPackageId)
      .where('state', 'active')
    const scoped =
      input.expectedActiveVersionId === null
        ? query.whereNull('active_version_id')
        : query.where('active_version_id', input.expectedActiveVersionId)
    const updated = await scoped.update({
      state: 'archived',
      archived_at: input.archivedAt,
      updated_at: new Date(),
    })
    return Number(updated) === 1
  }
}
