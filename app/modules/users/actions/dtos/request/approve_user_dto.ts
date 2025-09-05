import type { Command } from '../../interfaces.js'

import ValidationException from '#modules/http/exceptions/validation_exception'

/**
 * ApproveUserDTO
 *
 * Data Transfer Object for approving a user in an organization.
 * Used by ApproveUserCommand.
 */
export class ApproveUserDTO implements Command {
  constructor(
    public readonly userId: string,
    public readonly organizationId: string,
    public readonly approverId: string
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
