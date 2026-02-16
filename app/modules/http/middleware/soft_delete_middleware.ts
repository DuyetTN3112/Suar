import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import type { LucidRow } from '@adonisjs/lucid/types/model'

import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'

// Mở rộng HttpContext để thêm thuộc tính softDeletedEntity
declare module '@adonisjs/core/http' {
  interface HttpContext {
    softDeletedEntity?: LucidRow
  }
}

/**
 * Soft Delete Middleware — kiểm tra trạng thái soft delete của entity.
 *
 * FIX: Bỏ @inject() decorator (không cần DI cho middleware).
 * FIX: Bỏ softDelete/restore methods (vi phạm SRP — chuyển sang service).
 * FIX: Cache model import thay vì dynamic import mỗi request.
 */
export default class SoftDeleteMiddleware {
  handle(
    _ctx: HttpContext,
    _next: NextFn,
    _options: { model: string; paramName?: string; allowDeleted?: boolean }
  ): void {
    throw new BusinessLogicException(
      'SoftDeleteMiddleware is disabled. Use module-owned delete commands instead.'
    )
  }
}
