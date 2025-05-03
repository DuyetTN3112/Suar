import type { Command } from '../../shared/interfaces.js'
export class LogoutUserDTO implements Command {
  public readonly userId: number
  public readonly sessionId?: string
  public readonly ipAddress: string

  constructor(data: { userId: number; sessionId?: string; ipAddress: string }) {
    this.userId = data.userId
    this.sessionId = data.sessionId
    this.ipAddress = data.ipAddress
    this.validate()
  }

  private validate(): void {
    if (!this.userId || this.userId <= 0) {
      throw new Error('User ID is required')
    }
    if (!this.ipAddress) {
      throw new Error('IP address is required')
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
