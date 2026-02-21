import ValidationException from '#modules/http/exceptions/validation_exception'

/**
 * DTO for bulk adding users to an organization
 */
export class BulkAddMembersDTO {
  constructor(
    public readonly organizationId: string,
    public readonly userIds: string[],
    public readonly requesterId: string
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
