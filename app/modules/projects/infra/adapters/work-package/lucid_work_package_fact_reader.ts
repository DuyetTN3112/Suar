import db from '@adonisjs/lucid/services/db'

import type { WorkPackageFactReader } from '#modules/projects/actions/ports/outbound/work_package_fact_reader'
import WorkPackageVersion from '#modules/projects/infra/models/work-package/work_package_version'
import {
  WORK_PACKAGE_FACT_SCHEMA_V1,
  type WorkPackageFactV1,
} from '#modules/projects/public_contracts/project-context/project_context_facts_v1'
import type {
  WorkPackageVersionV1,
  WorkPackageV1,
} from '#modules/projects/public_contracts/project-context/task_to_accomplishment_project_contracts'

function iso(value: Date | string | null): string | null {
  if (value === null) return null
  return value instanceof Date ? value.toISOString() : value
}

function toVersionContract(model: WorkPackageVersion): WorkPackageVersionV1 {
  return {
    schemaVersion: 'suar.work_package_version.v1',
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

export class LucidWorkPackageFactReader implements WorkPackageFactReader {
  async listActiveWorkPackageFacts(input: {
    projectId: string
    organizationId: string
  }): Promise<WorkPackageFactV1[]> {
    const records = (await db
      .from('work_packages')
      .select(
        'id',
        'schema_version',
        'organization_id',
        'project_id',
        'key',
        'title',
        'summary',
        'state',
        'active_version_id',
        'created_by',
        'created_at',
        'archived_at'
      )
      .where('project_id', input.projectId)
      .where('organization_id', input.organizationId)
      .where('state', 'active')
      .orderBy('key', 'asc')
      .orderBy('id', 'asc')) as {
      id: string
      schema_version: WorkPackageV1['schemaVersion']
      organization_id: string
      project_id: string
      key: string
      title: string
      summary: string
      state: WorkPackageV1['state']
      active_version_id: string | null
      created_by: string
      created_at: Date | string
      archived_at: Date | string | null
    }[]

    const versionIds = records.flatMap((record) =>
      record.active_version_id ? [record.active_version_id] : []
    )
    const versions = versionIds.length
      ? await WorkPackageVersion.query()
          .whereIn('id', versionIds)
          .where('project_id', input.projectId)
          .whereIn('work_package_id', records.map((record) => record.id))
      : []
    const versionById = new Map(versions.map((version) => [version.id, version]))

    return records.map((record) => {
      const activeVersion = record.active_version_id
        ? versionById.get(record.active_version_id) ?? null
        : null
      const activeVersionNumber = activeVersion?.version_number ?? 0
      const workPackage: WorkPackageV1 = {
        schemaVersion: 'suar.work_package.v1',
        id: record.id,
        organizationId: record.organization_id,
        projectId: record.project_id,
        key: record.key,
        title: record.title,
        summary: record.summary,
        state: record.state,
        activeVersionId: activeVersion?.id ?? null,
        createdBy: record.created_by,
        createdAt: iso(record.created_at) ?? String(record.created_at),
        archivedAt: iso(record.archived_at),
      }
      return {
        schemaVersion: WORK_PACKAGE_FACT_SCHEMA_V1,
        projectId: record.project_id,
        organizationId: record.organization_id,
        workPackage,
        activeVersion: activeVersion ? toVersionContract(activeVersion) : null,
        versionToken: `${record.project_id}:work-package:${record.id}:${activeVersionNumber}`,
      }
    })
  }

  async readWorkPackageFact(input: {
    workPackageId: string
    projectId: string
    organizationId: string
  }): Promise<WorkPackageFactV1 | null> {
    const record = (await db
      .from('work_packages')
      .select(
        'id',
        'schema_version',
        'organization_id',
        'project_id',
        'key',
        'title',
        'summary',
        'state',
        'active_version_id',
        'created_by',
        'created_at',
        'archived_at'
      )
      .where('id', input.workPackageId)
      .where('project_id', input.projectId)
      .where('organization_id', input.organizationId)
      .first()) as
      | {
          id: string
          schema_version: WorkPackageV1['schemaVersion']
          organization_id: string
          project_id: string
          key: string
          title: string
          summary: string
          state: WorkPackageV1['state']
          active_version_id: string | null
          created_by: string
          created_at: Date | string
          archived_at: Date | string | null
        }
      | undefined
    if (!record) return null

    const activeVersion = record.active_version_id
      ? await WorkPackageVersion.query()
          .where('id', record.active_version_id)
          .where('work_package_id', record.id)
          .where('project_id', record.project_id)
          .first()
      : null
    const workPackage: WorkPackageV1 = {
      schemaVersion: 'suar.work_package.v1',
      id: record.id,
      organizationId: record.organization_id,
      projectId: record.project_id,
      key: record.key,
      title: record.title,
      summary: record.summary,
      state: record.state,
      activeVersionId: activeVersion?.id ?? null,
      createdBy: record.created_by,
      createdAt: iso(record.created_at) ?? String(record.created_at),
      archivedAt: iso(record.archived_at),
    }
    const activeVersionNumber = activeVersion?.version_number ?? 0
    const stateSuffix = record.state === 'archived' ? ':archived' : ''

    return {
      schemaVersion: WORK_PACKAGE_FACT_SCHEMA_V1,
      projectId: record.project_id,
      organizationId: record.organization_id,
      workPackage,
      activeVersion: activeVersion ? toVersionContract(activeVersion) : null,
      versionToken: `${record.project_id}:work-package:${record.id}:${activeVersionNumber}${stateSuffix}`,
    }
  }
}
