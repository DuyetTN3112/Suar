import type { Command } from '../../shared/interfaces.js'
import type { DatabaseId } from '#types/database'
import ValidationException from '#exceptions/validation_exception'

/**
 * ApproveUserDTO
 *
 * Data Transfer Object for approving a user in an organization.
 * Used by ApproveUserCommand.
 */
export class ApproveUserDTO implements Command {
  constructor(
    public readonly userId: DatabaseId,
    public readonly organizationId: DatabaseId,
    public readonly approverId: DatabaseId
  ) {
    this.validate()
  }

  private validate(): void {
    if (Number(this.userId) < 1) {
      throw new ValidationException('Invalid user ID')
    }

    if (Number(this.organizationId) < 1) {
      throw new ValidationException('Invalid organization ID')
    }

    if (Number(this.approverId) < 1) {
      throw new ValidationException('Invalid approver ID')
    }
  }
}
