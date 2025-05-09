import type { Command } from '../../shared/interfaces.js'

/**
 * ApproveUserDTO
 *
 * Data Transfer Object for approving a user in an organization.
 * Used by ApproveUserCommand.
 */
export class ApproveUserDTO implements Command {
  constructor(
    public readonly userId: number,
    public readonly organizationId: number,
    public readonly approverId: number
  ) {
    this.validate()
  }

  private validate(): void {
    if (this.userId < 1) {
      throw new Error('Invalid user ID')
    }

    if (this.organizationId < 1) {
      throw new Error('Invalid organization ID')
    }

    if (this.approverId < 1) {
      throw new Error('Invalid approver ID')
    }
  }
}
