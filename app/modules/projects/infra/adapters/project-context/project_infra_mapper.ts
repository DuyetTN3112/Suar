/**
 * ProjectInfraMapper — Infrastructure Layer Mapper
 *
 * Maps between ORM Entity (Lucid Model) ↔ Domain Entity ↔ Plain Record.
 *
 * Flow:
 *   Read:  ORM Entity → Domain Entity (toDomain) or Plain Record (toRecord, toDetailRecord)
 *   Write: Domain Entity → ORM Entity fields (toOrm)
 */

import { ProjectEntity } from '#modules/projects/domain/project-context/project_entity'
import type { ProjectEntityProps } from '#modules/projects/domain/project-context/project_entity'
import type Project from '#modules/projects/infra/models/project-context/project'
import type { ProjectRecord } from '#modules/projects/types/project_records'

function serializeDateTime(value: { toISO(): string | null } | null | undefined): string | null {
  return value?.toISO() ?? null
}

export class ProjectInfraMapper {
  private readonly __instanceMarker = true

  static {
    void new ProjectInfraMapper().__instanceMarker
  }

  /**
   * ORM Entity (Lucid Model) → Domain Entity
   */
  static toDomain(model: Project): ProjectEntity {
    const props: ProjectEntityProps = {
      id: model.id,
      creatorId: model.creator_id,
      name: model.name,
      description: model.description,
      organizationId: model.organization_id,
      startDate: model.start_date?.toJSDate() ?? null,
      endDate: model.end_date?.toJSDate() ?? null,
      status: model.status as ProjectEntityProps['status'],
      managerId: model.manager_id,
      ownerId: model.owner_id,
      visibility: model.visibility,
      allowExternalContributors: model.allow_external_contributors,
      approvalRequiredForMembers: model.approval_required_for_members,
      tags: model.tags,
      businessDomains: model.business_domains,
      customRoles: model.custom_roles,
      deletedAt: model.deleted_at?.toJSDate() ?? null,
      createdAt: model.created_at.toJSDate(),
      updatedAt: model.updated_at.toJSDate(),
    }
    return new ProjectEntity(props)
  }

  /**
   * ORM Entity (Lucid Model) → Plain Record (for barrel seal)
   */
  static toRecord(model: Project): ProjectRecord {
    return {
      id: model.id,
      creator_id: model.creator_id,
      name: model.name,
      description: model.description,
      organization_id: model.organization_id,
      start_date: serializeDateTime(model.start_date),
      end_date: serializeDateTime(model.end_date),
      status: model.status,
      manager_id: model.manager_id,
      owner_id: model.owner_id,
      visibility: model.visibility,
      allow_external_contributors: model.allow_external_contributors,
      approval_required_for_members: model.approval_required_for_members,
      tags: model.tags as string[] | null,
      business_domains: model.business_domains,
      custom_roles: model.custom_roles as Record<string, unknown>[] | null,
      deleted_at: serializeDateTime(model.deleted_at),
      created_at: serializeDateTime(model.created_at),
      updated_at: serializeDateTime(model.updated_at),
    }
  }

  /**
   * Domain Entity → ORM Entity fields (partial, for create/update)
   * Returns a plain object that can be used with Model.create() or model.merge()
   */
  static toOrm(entity: Partial<ProjectEntityProps>): Record<string, unknown> {
    const result: Record<string, unknown> = {}

    if (entity.creatorId !== undefined) result['creator_id'] = entity.creatorId
    if (entity.name !== undefined) result['name'] = entity.name
    if (entity.description !== undefined) result['description'] = entity.description
    if (entity.organizationId !== undefined) result['organization_id'] = entity.organizationId
    if (entity.startDate !== undefined) result['start_date'] = entity.startDate
    if (entity.endDate !== undefined) result['end_date'] = entity.endDate
    if (entity.status !== undefined) result['status'] = entity.status
    if (entity.managerId !== undefined) result['manager_id'] = entity.managerId
    if (entity.ownerId !== undefined) result['owner_id'] = entity.ownerId
    if (entity.visibility !== undefined) result['visibility'] = entity.visibility
    if (entity.allowExternalContributors !== undefined) result['allow_external_contributors'] = entity.allowExternalContributors
    if (entity.approvalRequiredForMembers !== undefined)
      result['approval_required_for_members'] = entity.approvalRequiredForMembers
    if (entity.tags !== undefined) result['tags'] = entity.tags
    if (entity.businessDomains !== undefined) result['business_domains'] = entity.businessDomains
    if (entity.customRoles !== undefined) result['custom_roles'] = entity.customRoles

    return result
  }
}
