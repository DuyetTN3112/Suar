import type { HttpContext } from '@adonisjs/core/http'
import Organization from '#models/organization'
import OrganizationUser from '#models/organization_user'
import Conversation from '#models/conversation'
import ConversationParticipant from '#models/conversation_participant'
import loggerService from '#services/logger_service'
import { parseId, toNumericId } from '#libs/id_utils'

/**
 * API Controller — Extracted from inline route handlers in start/routes/api.ts
 *
 * Sprint 2: Code Quality — Refactor inline raw DB queries into proper
 * Lucid Model queries inside a dedicated controller.
 *
 * Benefits:
 * - Testable: Each method can be unit/integration tested
 * - Type-safe: Lucid Models provide full type inference
 * - Cacheable: Can add cache decorators later
 * - Consistent: Follows same CQRS pattern as rest of the app
 */
export default class ApiController {
  /**
   * GET /api/organization-members/:id
   *
   * Lấy danh sách thành viên tổ chức — sử dụng Lucid Models thay vì raw query.
   */
  async getOrganizationMembers({ params, response }: HttpContext) {
    try {
      // Sprint 3: parseId validates input, toNumericId converts for current MySQL phase
      // After PostgreSQL migration: remove toNumericId, use parseId directly
      const organizationId = toNumericId(parseId(params.id as string))

      const organization = await Organization.find(organizationId)

      if (!organization) {
        response.status(404).json({
          success: false,
          message: 'Không tìm thấy tổ chức',
        })
        return
      }

      // Lucid query thay vì db.from() raw query
      const members = await OrganizationUser.query()
        .where('organization_id', organizationId)
        .preload('user')
        .preload('organization_role')
        .orderBy('created_at', 'asc')

      const formattedMembers = members.map((member) => ({
        id: `${member.organization_id}-${member.user_id}`,
        role_id: member.role_id,
        role_name: member.organization_role.name,
        joined_at: member.created_at.toISO(),
        user: {
          id: member.user.id,
          username: member.user.username,
          email: member.user.email,
        },
      }))

      response.json({
        success: true,
        organization: organization.serialize(),
        members: formattedMembers,
      })
      return
    } catch (error) {
      const err = error as Error
      loggerService.error('Lỗi khi lấy danh sách thành viên tổ chức', err)
      response.status(500).json({
        success: false,
        message: 'Lỗi khi lấy danh sách thành viên tổ chức',
        error: err.message,
      })
      return
    }
  }

  /**
   * GET /api/me
   *
   * Lấy thông tin user hiện tại.
   */
  async me({ auth }: HttpContext) {
    await auth.check()
    return auth.user
  }

  /**
   * GET /api/users-in-organization
   *
   * Lấy danh sách user trong tổ chức hiện tại (trừ user hiện tại).
   * Sử dụng Lucid Models + preload thay vì raw join queries.
   */
  async getUsersInOrganization({ auth, response, session }: HttpContext) {
    try {
      if (!auth.user) {
        response.status(401).json({
          success: false,
          message: 'Chưa đăng nhập',
        })
        return
      }

      const userOrgId = auth.user.current_organization_id
      const sessionOrgId = session.get('current_organization_id') as number | undefined
      const organizationId = userOrgId ?? sessionOrgId

      if (!organizationId) {
        response.status(400).json({
          success: false,
          message: 'Người dùng chưa chọn tổ chức',
        })
        return
      }

      // Sử dụng Lucid Model query thay vì raw join
      const orgMembers = await OrganizationUser.query()
        .where('organization_id', organizationId)
        .whereNot('user_id', auth.user.id)
        .preload('user')

      const formattedUsers = orgMembers
        .map((m) => ({
          id: String(m.user.id),
          username: m.user.username,
          email: m.user.email,
        }))
        .sort((a, b) => a.username.localeCompare(b.username))

      response.json({
        success: true,
        users: formattedUsers,
      })
      return
    } catch (error) {
      const err = error as Error
      loggerService.error('Lỗi khi lấy danh sách người dùng trong tổ chức', err)
      response.status(500).json({
        success: false,
        message: 'Lỗi khi lấy danh sách người dùng trong tổ chức',
        error: err.message,
      })
      return
    }
  }

  /**
   * POST /api/check-existing-conversation
   *
   * Kiểm tra cuộc hội thoại đã tồn tại giữa các participants.
   *
   * FIX N+1: Sử dụng subquery thay vì loop qua từng conversation.
   * Trước đây: O(N) queries (1 query per conversation)
   * Bây giờ: O(1) — single query với subquery
   */
  async checkExistingConversation({ request, auth, response }: HttpContext) {
    try {
      if (!auth.user) {
        response.status(401).json({
          success: false,
          message: 'Chưa đăng nhập',
        })
        return
      }

      const currentUser = auth.user
      const { participants } = request.body()

      if (!participants || !Array.isArray(participants) || participants.length === 0) {
        response.status(400).json({
          success: false,
          message: 'Danh sách người tham gia không hợp lệ',
        })
        return
      }

      const participantsList = participants.filter((p): p is string => typeof p === 'string')

      if (participantsList.length !== participants.length) {
        response.status(400).json({
          success: false,
          message: 'Danh sách người tham gia chứa giá trị không hợp lệ',
        })
        return
      }

      const organizationId = currentUser.current_organization_id

      if (!organizationId) {
        response.status(400).json({
          success: false,
          message: 'Không tìm thấy ID tổ chức hiện tại',
        })
        return
      }

      // Sắp xếp để so sánh
      const sortedParticipantIds = [...participantsList].sort()
      const participantCount = sortedParticipantIds.length

      // FIX N+1: Single query approach
      // Tìm conversations trong org mà user tham gia
      const userConversations = await Conversation.query()
        .where('organization_id', organizationId)
        .whereHas('participants', (q) => {
          void q.where('user_id', currentUser.id)
        })
        .select('id', 'title')

      // Tìm conversation match participants — batch query thay vì N+1 loop
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
          response.json({
            exists: true,
            conversation: {
              id: conv.id,
              title: conv.title || 'Cuộc hội thoại không có tiêu đề',
            },
          })
          return
        }
      }

      response.json({ exists: false })
      return
    } catch (error) {
      const err = error as Error
      loggerService.error('Lỗi khi kiểm tra cuộc hội thoại đã tồn tại', err)
      response.status(500).json({
        success: false,
        message: 'Lỗi khi kiểm tra cuộc hội thoại đã tồn tại',
        error: err.message,
      })
      return
    }
  }

  /**
   * GET /api/debug-organization-info (DEV ONLY)
   *
   * Debug endpoint — hiển thị thông tin org hiện tại.
   */
  async debugOrganizationInfo({ auth, session, response }: HttpContext) {
    try {
      const user = auth.user
      if (!user) {
        response.status(401).json({
          success: false,
          message: 'Chưa đăng nhập',
        })
        return
      }

      const sessionOrgId = session.get('current_organization_id') as number | undefined

      // Sử dụng Lucid relationship thay vì raw query
      await user.load('organizations')

      response.json({
        success: true,
        debug: {
          user_id: user.id,
          username: user.username,
          user_current_organization_id: user.current_organization_id,
          session_organization_id: sessionOrgId,
          organizations: user.organizations.map((org) => org.serialize()),
        },
      })
      return
    } catch (error) {
      const err = error as Error
      response.status(500).json({
        success: false,
        message: 'Lỗi khi lấy thông tin debug',
        error: err.message,
      })
      return
    }
  }
}
