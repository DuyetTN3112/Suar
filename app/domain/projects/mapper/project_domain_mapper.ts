/**
 * ProjectDomainMapper — Domain Layer Mapper
 *
 * Mapper thuần trong domain layer — KHÔNG import bất kỳ thứ gì từ
 * database, ORM hay framework.
 *
 * Chức năng:
 * - Tạo entity từ plain object (ProjectEntityProps)
 * - Export entity ra plain object
 *
 * Lưu ý: Việc map từ ORM Model → Domain Entity nằm ở INFRA layer,
 * KHÔNG phải ở đây.
 */

import { ProjectEntity } from '../entities/project_entity.js'
import type { ProjectEntityProps } from '../entities/project_entity.js'

export class ProjectDomainMapper {
  /**
   * Plain object (props) → Domain Entity
   */
  static toEntity(props: ProjectEntityProps): ProjectEntity {
    return new ProjectEntity(props)
  }

  /**
   * Domain Entity → Plain object (props)
   */
  static toProps(entity: ProjectEntity): ProjectEntityProps {
    return {
      id: entity.id,
      creatorId: entity.creatorId,
      name: entity.name,
      description: entity.description,
      organizationId: entity.organizationId,
      startDate: entity.startDate,
      endDate: entity.endDate,
      status: entity.status,
      budget: entity.budget,
      managerId: entity.managerId,
      ownerId: entity.ownerId,
      visibility: entity.visibility,
      allowFreelancer: entity.allowFreelancer,
      approvalRequiredForMembers: entity.approvalRequiredForMembers,
      tags: entity.tags,
      customRoles: entity.customRoles,
      deletedAt: entity.deletedAt,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    }
  }
}
