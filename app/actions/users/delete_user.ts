import { auditPublicApi } from '#actions/audit/public_api'
import * as userModelQueries from '#infra/users/repositories/read/model_queries'
import * as userMutations from '#infra/users/repositories/write/user_mutations'
import { AuditAction, EntityType } from '#modules/audit/constants/audit_constants'
import type { ExecutionContext } from '#types/execution_context'

export default class DeleteUser {
  constructor(protected execCtx: ExecutionContext) {}

  async handle({ id }: { id: string }) {
    const currentUserId = this.execCtx.userId
    if (!currentUserId) {
      return {
        success: false,
        message: 'Unauthorized',
      }
    }
    // Kiểm tra không thể xóa chính mình
    if (currentUserId === id) {
      return {
        success: false,
        message: 'Bạn không thể xóa tài khoản của chính mình',
      }
    }

    try {
      // Verify current user is superadmin
      const isSuperadmin = await userModelQueries.isSuperadmin(currentUserId)
      if (!isSuperadmin) {
        return {
          success: false,
          message: 'Không có quyền xóa người dùng này',
        }
      }

      // Verify target user exists and is not deleted
      let targetUser
      try {
        targetUser = await userModelQueries.findNotDeletedOrFail(id)
      } catch {
        return {
          success: false,
          message: 'Người dùng không tồn tại hoặc đã bị xóa',
        }
      }

      await userMutations.softDelete(targetUser)

      // Ghi log hành động
      await auditPublicApi.log(
        {
          user_id: currentUserId,
          action: AuditAction.DELETE,
          entity_type: EntityType.USER,
          entity_id: id,
        },
        this.execCtx
      )

      return {
        success: true,
        message: 'Người dùng đã được xóa thành công',
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Không có quyền xóa người dùng này'
      return {
        success: false,
        message: errorMessage,
      }
    }
  }
}
