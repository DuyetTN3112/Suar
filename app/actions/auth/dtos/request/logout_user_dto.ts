import type { Command } from '../../../shared/interfaces.js'

import ValidationException from '#exceptions/validation_exception'
import type { DatabaseId } from '#types/database'
export class LogoutUserDTO implements Command {
  public readonly userId: DatabaseId
  public readonly sessionId?: string
  public readonly ipAddress: string

  constructor(data: { userId: DatabaseId; sessionId?: string; ipAddress: string }) {
    this.userId = data.userId
    this.sessionId = data.sessionId
    this.ipAddress = data.ipAddress
    this.validate()
  }

  private validate(): void {
    if (!this.userId || Number(this.userId) <= 0) {
      throw ValidationException.field('userId', 'User ID is required')
    }
    if (!this.ipAddress) {
      throw ValidationException.field('ipAddress', 'IP address is required')
    }
  }

  public toObject() {
    return {
      userId: this.userId,
      sessionId: this.sessionId,
      ipAddress: this.ipAddress,
    }
  }
}
