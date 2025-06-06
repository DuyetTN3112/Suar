/**
 * MessageEntity — Pure Domain Entity
 *
 * Represents a Message in the business domain.
 * 100% pure TypeScript, NO framework dependencies.
 * All business logic related to message state lives here.
 */

export type MessageSendStatus = 'sending' | 'sent' | 'failed'
export type MessageRecallScope = 'self' | 'all' | null

export interface MessageEntityProps {
  id: string
  conversationId: string
  senderId: string
  message: string
  sendStatus: MessageSendStatus
  isRecalled: boolean
  recalledAt: Date | null
  recallScope: MessageRecallScope
  readAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export class MessageEntity {
  readonly id: string
  readonly conversationId: string
  readonly senderId: string
  readonly message: string
  readonly sendStatus: MessageSendStatus
  readonly isRecalled: boolean
  readonly recalledAt: Date | null
  readonly recallScope: MessageRecallScope
  readonly readAt: Date | null
  readonly createdAt: Date
  readonly updatedAt: Date

  constructor(props: MessageEntityProps) {
    this.id = props.id
    this.conversationId = props.conversationId
    this.senderId = props.senderId
    this.message = props.message
    this.sendStatus = props.sendStatus
    this.isRecalled = props.isRecalled
    this.recalledAt = props.recalledAt
    this.recallScope = props.recallScope
    this.readAt = props.readAt
    this.createdAt = props.createdAt
    this.updatedAt = props.updatedAt
  }

  get isRecalledMessage(): boolean {
    return this.isRecalled && this.recalledAt !== null && this.recallScope !== null
  }

  get isSent(): boolean {
    return this.sendStatus === 'sent'
  }

  get isFailed(): boolean {
    return this.sendStatus === 'failed'
  }
}
