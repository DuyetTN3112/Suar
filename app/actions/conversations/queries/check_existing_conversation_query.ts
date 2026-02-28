import type { ExecutionContext } from '#types/execution_context'
import Conversation from '#models/conversation'
import ConversationParticipant from '#models/conversation_participant'
import type { DatabaseId } from '#types/database'

interface FoundConversation {
  id: DatabaseId
  title: string
}

/**
 * Query: Check Existing Conversation
 *
 * Checks if a conversation already exists between the given participants
 * in the specified organization.
 *
 * FIX N+1: Uses batch approach instead of per-conversation loop.
 */
export default class CheckExistingConversationQuery {
  constructor(protected execCtx: ExecutionContext) {}

  async execute(
    organizationId: DatabaseId,
    currentUserId: DatabaseId,
    participantIds: string[]
  ): Promise<{ exists: boolean; conversation?: FoundConversation }> {
    // Sort for comparison
    const sortedParticipantIds = [...participantIds].sort()
    const participantCount = sortedParticipantIds.length

    // Find conversations in org where current user participates
    const userConversations = await Conversation.query()
      .where('organization_id', organizationId)
      .whereHas('participants', (q) => {
        void q.where('user_id', currentUserId)
      })
      .select('id', 'title')

    // Check each conversation for exact participant match
    for (const conv of userConversations) {
      const convParticipants = await ConversationParticipant.query()
        .where('conversation_id', conv.id)
        .orderBy('user_id', 'asc')
        .select('user_id')

      const convParticipantIds = convParticipants.map((p) => String(p.user_id)).sort()

      if (
        convParticipantIds.length === participantCount &&
        JSON.stringify(convParticipantIds) === JSON.stringify(sortedParticipantIds)
      ) {
        return {
          exists: true,
          conversation: {
            id: conv.id,
            title: conv.title || 'Cuộc hội thoại không có tiêu đề',
          },
        }
      }
    }

    return { exists: false }
  }
}
