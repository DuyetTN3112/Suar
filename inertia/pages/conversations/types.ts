/**
 * Types for conversations
 */

export interface Participant {
  id: string
  full_name: string
  avatar?: string
  email: string
  description?: string
}

export interface ConversationParticipant {
  user: Participant
}

export interface Conversation {
  id: string
  title: string
  updated_at: string
  participants: Participant[]
  conversation_participants: ConversationParticipant[]
  $extras?: {
    unreadCount: number
    lastMessageAt: string | null
  }
}

export interface Message {
  id: string
  message: string
  sender_id: string
  timestamp: string
  sender: Participant
  read_at: string | null
  is_current_user?: boolean
}

export interface ConversationProps {
  conversation: Conversation
  messages: {
    data: Message[]
    meta: {
      total: number
      per_page: number
      current_page: number
      last_page: number
    }
  }
  pagination: {
    page: number
    limit: number
    hasMore: boolean
  }
  currentUser?: Participant
}

export interface MessageGroup {
  date: string
  messages: Message[]
}
