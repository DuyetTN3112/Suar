import { defineConfig } from '@adonisjs/inertia'
import type { InferSharedProps } from '@adonisjs/inertia/types'
import type { HttpContext } from '@adonisjs/core/http'
import env from '#start/env'

// Định nghĩa kiểu dữ liệu cho organization
type SimpleOrganization = {
  id: number
  name: string
  logo: string | null
  plan: string | null
}

// Dùng để giới hạn số lần in log, tránh spam console
let logCounter = 0
const LOG_LIMIT = 10 // Chỉ log tối đa 10 lần mỗi phiên khởi động

// Hàm kiểm tra có nên log hay không, cải tiến để giảm số lượng log
function shouldLog(ctx: HttpContext): boolean {
  if (logCounter >= LOG_LIMIT) return false
  const isDevMode = env.get('NODE_ENV') === 'development'
  if (!isDevMode) return false
  // Lấy URL và method của request
  const url = ctx.request.url()
  const method = ctx.request.method()
  // Không log cho các request static assets và API
  const isStaticAsset =
    url.includes('/assets/') ||
    url.includes('/public/') ||
    url.includes('.js') ||
    url.includes('.css') ||
    url.includes('.ico') ||
    url.includes('.png') ||
    url.includes('.jpg') ||
    url.includes('.svg') ||
    url.includes('.woff') ||
    url.includes('.woff2') ||
    url.includes('.ttf') ||
    url.includes('.eot') ||
    url.includes('.map') ||
    url.includes('/_assets') ||
    url.includes('/__vite_ping') ||
    url.includes('/favicon')
  // Không log cho method khác GET hoặc cho các API endpoint
  const isApiEndpoint = url.startsWith('/api/') || url.includes('/api/') || method !== 'GET'
  // Chỉ log nếu có session, có user đăng nhập và đang truy cập trang chính
  const hasAuth = ctx.auth && ctx.session
  const isMainPage = url === '/' || Boolean(url.match(/^\/[a-zA-Z0-9_-]+\/?$/))
  // Chỉ log cho request đầu tiên khi mới load trang chính
  const shouldLogRequest = isDevMode && !isStaticAsset && !isApiEndpoint && hasAuth && isMainPage
  if (shouldLogRequest) {
    logCounter++
  }
  return shouldLogRequest
}

const inertiaConfig = defineConfig({
  rootView: 'inertia_layout',

  sharedData: {
    // Thêm biến session showOrganizationRequiredModal
    async showOrganizationRequiredModal(ctx: HttpContext) {
      if (ctx.session) {
        // Lấy giá trị từ session
        const showModal = Boolean(ctx.session.get('show_organization_required_modal', false))
        if (showModal) {
          // Nếu đã hiển thị modal, xóa khỏi session để không hiển thị lại
          ctx.session.forget('show_organization_required_modal')
          await ctx.session.commit()
        }
        return { showOrganizationRequiredModal: showModal }
      }
      return { showOrganizationRequiredModal: false }
    },
    async user(ctx: HttpContext) {
      try {
        const shouldLogInfo = shouldLog(ctx)
        if (shouldLogInfo) {
          console.log('===== INERTIA SHARED DATA =====')
          console.log('Session ID:', ctx.session?.sessionId || 'Không có session')
        }
        if (ctx.auth && (await ctx.auth.check())) {
          // Mở rộng thông tin user để đảm bảo các thông tin quan trọng được gửi đến client
          const user = ctx.auth.user!
          if (shouldLogInfo) {
            console.log('Đã tìm thấy người dùng đã xác thực:', user.id)
          }

          // Đảm bảo load các relationship cần thiết
          if (!user.$preloaded.role) {
            await user.load('role')
          }
          // Kiểm tra vai trò admin
          const isAdmin =
            user.role?.name?.toLowerCase() === 'admin' ||
            user.role?.name?.toLowerCase() === 'superadmin' ||
            [1, 2].includes(user.role_id)
          // Lấy current_organization_id từ session hoặc từ model user
          const currentOrganizationId =
            ctx.session.get('current_organization_id') || user.current_organization_id
          // Chuẩn bị dữ liệu cơ bản của người dùng
          const userData = {
            id: user.id,
            email: user.email,
            username: user.username,
            first_name: user.first_name,
            last_name: user.last_name,
            full_name: user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim(),
            avatar: user.avatar,
            role: user.role
              ? {
                  id: user.role.id,
                  name: user.role.name,
                }
              : null,
            role_id: user.role_id,
            isAdmin: isAdmin,
            current_organization_id: currentOrganizationId,
            organizations: [] as SimpleOrganization[],
          }
          if (shouldLogInfo) {
            console.log('Dữ liệu người dùng cơ bản:', userData)
          }

          // Truy vấn thêm thông tin về organizations của người dùng
          try {
            if (shouldLogInfo) {
              console.log('Đang tải thông tin tổ chức...')
            }
            await user.load('organizations')
            if (shouldLogInfo) {
              console.log('Số lượng tổ chức tải được:', user.organizations?.length || 0)
              console.log('Dữ liệu tổ chức thô:', user.organizations)
            }

            if (user.organizations && user.organizations.length > 0) {
              userData.organizations = user.organizations.map((org) => ({
                id: org.id,
                name: org.name,
                logo: org.logo || null,
                plan: org.plan || null,
              }))
              if (shouldLogInfo) {
                console.log('Đã chuyển đổi dữ liệu tổ chức thành công')
              }
            } else if (shouldLogInfo) {
              console.warn('Người dùng không có tổ chức nào')
            }
          } catch (error) {
            if (shouldLogInfo) {
              console.error('LỖI: Không thể tải thông tin tổ chức:', error)
              console.error('Chi tiết lỗi:', error.message)
              console.error('Stack trace:', error.stack)
            }
            // Vẫn giữ mảng rỗng cho organizations nếu có lỗi
          }
          if (shouldLogInfo) {
            console.log('Dữ liệu cuối cùng của người dùng (bao gồm tổ chức):', userData)
            console.log('===== KẾT THÚC INERTIA SHARED DATA =====')
          }
          return {
            auth: {
              user: userData,
            },
          }
        } else {
          if (shouldLogInfo) {
            console.log('Không có người dùng đã xác thực')
            console.log('===== KẾT THÚC INERTIA SHARED DATA =====')
          }
        }
      } catch (error) {
        console.error('LỖI NGHIÊM TRỌNG khi kiểm tra xác thực:', error)
        console.error('Chi tiết lỗi:', error.message)
        console.error('Stack trace:', error.stack)
      }
      // Trả về null nếu người dùng chưa đăng nhập
      return { auth: { user: null } }
    },
  },
  ssr: {
    enabled: false,
    entrypoint: 'inertia/app/app.tsx',
  },
})

export default inertiaConfig

declare module '@adonisjs/inertia/types' {
  export interface SharedProps extends InferSharedProps<typeof inertiaConfig> {}
}
