/**
 * ConversationEntity — Pure Domain Entity
 *
 * Represents a Conversation in the business domain.
 * 100% pure TypeScript, NO framework dependencies.
 * All business logic related to conversation state lives here.
 */

export interface ConversationEntityProps {
  id: string
  title: string | null
  organizationId: string | null
  taskId: string | null
  lastMessageId: string | null
  lastMessageAt: Date | null
  deletedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export class ConversationEntity {
  readonly id: string
  readonly title: string | null
  readonly organizationId: string | null
  readonly taskId: string | null
  readonly lastMessageId: string | null
  readonly lastMessageAt: Date | null
  readonly deletedAt: Date | null
  readonly createdAt: Date
  readonly updatedAt: Date

  constructor(props: ConversationEntityProps) {
    this.id = props.id
    this.title = props.title
    this.organizationId = props.organizationId
    this.taskId = props.taskId
    this.lastMessageId = props.lastMessageId
    this.lastMessageAt = props.lastMessageAt
    this.deletedAt = props.deletedAt
    this.createdAt = props.createdAt
    this.updatedAt = props.updatedAt
  }

  get isDeleted(): boolean {
    return this.deletedAt !== null
  }

  get isGroupConversation(): boolean {
    return this.title !== null
  }

  get hasOrganization(): boolean {
    return this.organizationId !== null
  }
}
