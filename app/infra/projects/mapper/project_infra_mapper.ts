/**
 * ProjectInfraMapper — Infrastructure Layer Mapper
 *
 * Maps between ORM Entity (Lucid Model) ↔ Domain Entity.
 *
 * Flow:
 *   Read:  ORM Entity → Domain Entity
 *   Write: Domain Entity → ORM Entity (partial, for create/update)
 */

import { ProjectEntity } from '#domain/projects/entities/project_entity'
import type { ProjectEntityProps } from '#domain/projects/entities/project_entity'
import type Project from '#models/project'

export class ProjectInfraMapper {
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
      budget: String(model.budget),
      managerId: model.manager_id,
      ownerId: model.owner_id,
      visibility: model.visibility as ProjectEntityProps['visibility'],
      allowFreelancer: model.allow_freelancer,
      approvalRequiredForMembers: model.approval_required_for_members,
      tags: model.tags,
      customRoles: model.custom_roles,
      deletedAt: model.deleted_at?.toJSDate() ?? null,
      createdAt: model.created_at.toJSDate(),
      updatedAt: model.updated_at.toJSDate(),
    }
    return new ProjectEntity(props)
  }

  /**
   * Domain Entity → ORM Entity fields (partial, for create/update)
   * Returns a plain object that can be used with Model.create() or model.merge()
   */
  static toOrm(entity: Partial<ProjectEntityProps>): Record<string, unknown> {
    const result: Record<string, unknown> = {}

    if (entity.creatorId !== undefined) result.creator_id = entity.creatorId
    if (entity.name !== undefined) result.name = entity.name
    if (entity.description !== undefined) result.description = entity.description
    if (entity.organizationId !== undefined) result.organization_id = entity.organizationId
    if (entity.startDate !== undefined) result.start_date = entity.startDate
    if (entity.endDate !== undefined) result.end_date = entity.endDate
    if (entity.status !== undefined) result.status = entity.status
    if (entity.budget !== undefined) result.budget = entity.budget
    if (entity.managerId !== undefined) result.manager_id = entity.managerId
    if (entity.ownerId !== undefined) result.owner_id = entity.ownerId
    if (entity.visibility !== undefined) result.visibility = entity.visibility
    if (entity.allowFreelancer !== undefined) result.allow_freelancer = entity.allowFreelancer
    if (entity.approvalRequiredForMembers !== undefined)
      result.approval_required_for_members = entity.approvalRequiredForMembers
    if (entity.tags !== undefined) result.tags = entity.tags
    if (entity.customRoles !== undefined) result.custom_roles = entity.customRoles

    return result
  }
}
