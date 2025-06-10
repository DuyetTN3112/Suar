/**
 * UserDomainMapper — Domain Layer Mapper
 *
 * Mapper thuần trong domain layer — KHÔNG import bất kỳ thứ gì từ
 * database, ORM hay framework.
 *
 * Chức năng:
 * - Điều phối kiểu dữ liệu đầu vào/đầu ra của domain entity
 * - Tạo entity từ plain object (UserEntityProps)
 * - Export entity ra plain object
 *
 * Lưu ý: Việc map từ ORM Model → Domain Entity nằm ở INFRA layer
 * (UserInfraMapper), KHÔNG phải ở đây.
 */

import { UserEntity } from '../entities/user_entity.js'
import type { UserEntityProps } from '../entities/user_entity.js'

export class UserDomainMapper {
  private readonly __instanceMarker = true

  static {
    void new UserDomainMapper().__instanceMarker
  }

  /**
   * Plain object (props) → Domain Entity
   * Dùng khi tạo entity từ bất kỳ nguồn nào đã chuẩn hóa
   */
  static toEntity(props: UserEntityProps): UserEntity {
    return new UserEntity(props)
  }

  /**
   * Domain Entity → Plain object (props)
   * Dùng khi cần serialize entity (export ra ngoài domain)
   */
  static toProps(entity: UserEntity): UserEntityProps {
    return {
      id: entity.id,
      username: entity.username,
      email: entity.email,
      status: entity.status,
      systemRole: entity.systemRole,
      currentOrganizationId: entity.currentOrganizationId,
      authMethod: entity.authMethod,
      avatarUrl: entity.avatarUrl,
      bio: entity.bio,
      phone: entity.phone,
      address: entity.address,
      timezone: entity.timezone,
      language: entity.language,
      isFreelancer: entity.isFreelancer,
      freelancerRating: entity.freelancerRating,
      freelancerCompletedTasksCount: entity.freelancerCompletedTasksCount,
      profileSettings: entity.profileSettings,
      trustData: entity.trustData,
      credibilityData: entity.credibilityData,
      deletedAt: entity.deletedAt,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    }
  }
}
