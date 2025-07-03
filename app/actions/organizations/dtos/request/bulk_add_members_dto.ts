import ValidationException from '#exceptions/validation_exception'
import type { DatabaseId } from '#types/database'

/**
 * DTO for bulk adding users to an organization
 */
export class BulkAddMembersDTO {
  constructor(
    public readonly organizationId: DatabaseId,
    public readonly userIds: string[],
    public readonly requesterId: DatabaseId
  ) {
    this.validate()
  }

  private validate(): void {
    if (!this.organizationId) {
      throw new ValidationException('Organization ID is required')
    }
    if (!Array.isArray(this.userIds) || this.userIds.length === 0) {
      throw new ValidationException('Vui lòng chọn ít nhất một người dùng để thêm vào tổ chức')
    }
    if (!this.requesterId) {
      throw new ValidationException('Requester ID is required')
    }
  }
}
