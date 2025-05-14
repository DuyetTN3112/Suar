export interface Participant {
  id: string
  username: string
  email: string
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

export interface ConversationsProps {
  conversations?: {
    data: Conversation[]
    meta: {
      total: number
      per_page: number
      current_page: number
      last_page: number
    }
  }
}

export interface MessageGroup {
  date: string
  messages: Message[]
}
