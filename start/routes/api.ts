import router from '@adonisjs/core/services/router'
import { middleware } from '../kernel.js'

// Redis controllers
const RedisController = () => import('#controllers/http/redis_controller')
// Task controller
const TasksController = () => import('#controllers/tasks/tasks_controller')
// Organization controllers
// const MembersController = () => import('#controllers/organizations/members_controller')

router
  .group(() => {
    // API routes cho search và module
    router.get('/search', async ({ response }) => {
      // Tìm kiếm
      return response.json({ results: [] })
    })

    router.get('/modules/:id/posts', async ({ response }) => {
      // Lấy bài viết của module
      return response.json({ posts: [] })
    })

    // API route cho audit logs
    router.get('/tasks/:id/audit-logs', [TasksController, 'getAuditLogs'])

    // API routes cho Redis và cache
    router
      .group(() => {
        // Redis management routes
        router.get('/keys', [RedisController, 'listKeys'])
        router.post('/cache', [RedisController, 'setCache'])
        router.get('/cache/:key', [RedisController, 'getCache'])
        router.delete('/cache/:key', [RedisController, 'clearCache'])
        router.delete('/cache', [RedisController, 'flushCache'])
      })
      .prefix('/redis')

    // API cho tổ chức
    router.get('/organization-members/:id', async ({ params, response }) => {
      try {
        const { id } = params
        const db = await import('@adonisjs/lucid/services/db')
        // Lấy thông tin tổ chức
        const organization = await db.default.from('organizations').where('id', id).first()
        if (!organization) {
          return response.status(404).json({
            success: false,
            message: 'Không tìm thấy tổ chức',
          })
        }
        // Lấy danh sách thành viên của tổ chức
        const members = await db.default
          .query()
          .from('organization_users as ou')
          .join('users as u', 'ou.user_id', 'u.id')
          .join('organization_roles as r', 'ou.role_id', 'r.id')
          .where('ou.organization_id', id)
          .select(
            'ou.id',
            'ou.user_id',
            'ou.role_id',
            'ou.joined_at',
            'r.name as role_name',
            'u.id as user_id',
            'u.first_name',
            'u.last_name',
            'u.full_name',
            'u.email',
            'u.avatar'
          )
          .orderBy('u.full_name', 'asc')
        const formattedMembers = members.map((member) => ({
          id: member.id,
          role_id: member.role_id,
          role_name: member.role_name,
          joined_at: member.joined_at,
          user: {
            id: member.user_id,
            first_name: member.first_name,
            last_name: member.last_name,
            full_name:
              member.full_name || `${member.first_name || ''} ${member.last_name || ''}`.trim(),
            email: member.email,
            avatar: member.avatar,
          },
        }))
        return response.json({
          success: true,
          organization,
          members: formattedMembers,
        })
      } catch (error) {
        console.error('Lỗi khi lấy danh sách thành viên tổ chức:', error)
        return response.status(500).json({
          success: false,
          message: 'Lỗi khi lấy danh sách thành viên tổ chức',
          error: error.message,
        })
      }
    })

    // Thông tin người dùng
    router.get('/me', async ({ auth }) => {
      await auth.check()
      return auth.user
    })

    // API đơn giản để lấy danh sách người dùng trong tổ chức
    router.get('/users-in-organization', async ({ auth, response, session }) => {
      try {
        if (!auth.user) {
          return response.status(401).json({
            success: false,
            message: 'Chưa đăng nhập',
          })
        }

        // Sử dụng ID tổ chức từ session nếu ID từ user không có
        const organizationId =
          auth.user.current_organization_id || session.get('current_organization_id')
        if (!organizationId) {
          return response.status(400).json({
            success: false,
            message: 'Người dùng chưa chọn tổ chức',
          })
        }

        const db = await import('@adonisjs/lucid/services/db')
        // Lấy danh sách người dùng trong tổ chức hiện tại (ngoại trừ người dùng hiện tại)
        const users = await db.default
          .query()
          .from('users as u')
          .join('organization_users as ou', 'u.id', 'ou.user_id')
          .where('ou.organization_id', organizationId)
          .whereNot('u.id', auth.user.id) // Loại trừ người dùng hiện tại
          .select('u.id', 'u.first_name', 'u.last_name', 'u.full_name', 'u.email')
          .orderBy('u.full_name', 'asc')
        // Format lại dữ liệu trả về
        const formattedUsers = users.map((user) => ({
          id: user.id.toString(),
          full_name: user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim(),
          email: user.email,
        }))
        return response.json({
          success: true,
          users: formattedUsers,
        })
      } catch (error) {
        console.error('API: Lỗi khi lấy danh sách người dùng trong tổ chức:', error)
        return response.status(500).json({
          success: false,
          message: 'Lỗi khi lấy danh sách người dùng trong tổ chức',
          error: error.message,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        })
      }
    })

    // API để kiểm tra cuộc hội thoại đã tồn tại
    router.post(
      '/check-existing-conversation',
      async ({
        request,
        auth,
        response,
        // session
      }) => {
        try {
          if (!auth.user) {
            return response.status(401).json({
              success: false,
              message: 'Chưa đăng nhập',
            })
          }

          const { participants } = request.body()

          if (!participants || !Array.isArray(participants) || participants.length === 0) {
            return response.status(400).json({
              success: false,
              message: 'Danh sách người tham gia không hợp lệ',
            })
          }

          // Sắp xếp ID người tham gia để đảm bảo so sánh chính xác
          const sortedParticipantIds = [...participants].sort()

          const db = await import('@adonisjs/lucid/services/db')

          // Lấy tất cả cuộc hội thoại trong tổ chức hiện tại
          const organizationId = auth.user.current_organization_id

          if (!organizationId) {
            return response.status(400).json({
              success: false,
              message: 'Không tìm thấy ID tổ chức hiện tại',
            })
          }

          // Lấy tất cả cuộc hội thoại mà người dùng hiện tại tham gia
          const conversations = await db.default
            .query()
            .from('conversations as c')
            .join('conversation_participants as cp', 'c.id', 'cp.conversation_id')
            .where('c.organization_id', organizationId)
            .where('cp.user_id', auth.user.id)
            .select('c.id', 'c.title')
            .distinct()

          // Với mỗi cuộc hội thoại, kiểm tra xem nó có cùng danh sách người tham gia không
          for (const conversation of conversations) {
            // Lấy danh sách người tham gia của cuộc hội thoại
            const conversationParticipants = await db.default
              .query()
              .from('conversation_participants')
              .where('conversation_id', conversation.id)
              .select('user_id')

            // Chuyển đổi thành mảng ID
            const participantIds = conversationParticipants.map((p) => p.user_id.toString())

            // Sắp xếp để so sánh
            const sortedIds = [...participantIds].sort()

            // So sánh hai mảng đã sắp xếp
            if (
              sortedIds.length === sortedParticipantIds.length &&
              JSON.stringify(sortedIds) === JSON.stringify(sortedParticipantIds)
            ) {
              return response.json({
                exists: true,
                conversation: {
                  id: conversation.id,
                  title: conversation.title || 'Cuộc hội thoại không có tiêu đề',
                },
              })
            } else {
            }
          }

          // Không tìm thấy cuộc hội thoại trùng khớp
          return response.json({
            exists: false,
          })
        } catch (error) {
          console.error('=== API ERROR: KIỂM TRA HỘI THOẠI TỒN TẠI ===')
          console.error('API: Lỗi khi kiểm tra cuộc hội thoại đã tồn tại:', error)
          console.error('API: Stack trace:', error.stack)

          return response.status(500).json({
            success: false,
            message: 'Lỗi khi kiểm tra cuộc hội thoại đã tồn tại',
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
          })
        }
      }
    )

    // API để kiểm tra thông tin tổ chức hiện tại
    router.get('/debug-organization-info', async ({ auth, session, response }) => {
      try {
        const user = auth.user
        if (!user) {
          return response.status(401).json({
            success: false,
            message: 'Chưa đăng nhập',
          })
        }
        // Lấy thông tin từ session
        const sessionOrgId = session.get('current_organization_id')
        // Lấy thông tin về user và các tổ chức
        const db = await import('@adonisjs/lucid/services/db')
        const userOrganizations = await db.default
          .query()
          .from('organization_users as ou')
          .join('organizations as o', 'ou.organization_id', 'o.id')
          .where('ou.user_id', user.id)
          .select('o.*', 'ou.role_id')
        return response.json({
          success: true,
          debug: {
            user_id: user.id,
            user_name: user.full_name,
            user_current_organization_id: user.current_organization_id,
            session_organization_id: sessionOrgId,
            organizations: userOrganizations,
          },
        })
      } catch (error) {
        return response.status(500).json({
          success: false,
          message: 'Lỗi khi lấy thông tin debug',
          error: error.message,
        })
      }
    })
  })
  .prefix('/api')
  .use(middleware.auth())
