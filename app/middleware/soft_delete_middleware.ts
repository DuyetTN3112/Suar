import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import type { LucidModel, LucidRow } from '@adonisjs/lucid/types/model'
import type { DateTime } from 'luxon'
import loggerService from '#services/logger_service'
import NotFoundException from '#exceptions/not_found_exception'

// Mở rộng HttpContext để thêm thuộc tính softDeletedEntity
declare module '@adonisjs/core/http' {
  interface HttpContext {
    softDeletedEntity?: LucidRow
  }
}

// Interface cho model hỗ trợ soft delete
interface SoftDeleteRow extends LucidRow {
  deletedAt?: DateTime | null
}

/**
 * Soft Delete Middleware — kiểm tra trạng thái soft delete của entity.
 *
 * FIX: Bỏ @inject() decorator (không cần DI cho middleware).
 * FIX: Bỏ softDelete/restore methods (vi phạm SRP — chuyển sang service).
 * FIX: Cache model import thay vì dynamic import mỗi request.
 */
export default class SoftDeleteMiddleware {
  /**
   * Cache model imports để tránh dynamic import mỗi request
   */
  private static modelCache = new Map<string, LucidModel>()

  /**
   * Import model với cache
   */
  private async resolveModel(modelName: string): Promise<LucidModel> {
    const cached = SoftDeleteMiddleware.modelCache.get(modelName)
    if (cached) {
      return cached
    }

    const modelModule = (await import(`#models/${modelName}`)) as { default: LucidModel }
    SoftDeleteMiddleware.modelCache.set(modelName, modelModule.default)
    return modelModule.default
  }

  async handle(
    ctx: HttpContext,
    next: NextFn,
    options: { model: string; paramName?: string; allowDeleted?: boolean }
  ): Promise<void> {
    const paramName = options.paramName ?? 'id'
    const allowDeleted = options.allowDeleted ?? false
    const id = ctx.params[paramName] as string | undefined

    // Nếu không có ID → tiếp tục
    if (!id) {
      await next()
      return
    }

    try {
      const model = await this.resolveModel(options.model)

      // Query entity với điều kiện soft delete
      let query = model.query().where('id', id)
      if (!allowDeleted) {
        query = query.whereNull('deleted_at')
      }

      const entity = (await query.first()) as SoftDeleteRow | null

      if (!entity) {
        throw new NotFoundException('Không tìm thấy dữ liệu yêu cầu')
      }

      // Lưu entity vào context
      ctx.softDeletedEntity = entity
    } catch (error) {
      loggerService.error('SoftDeleteMiddleware error', {
        model: options.model,
        id,
        error: error instanceof Error ? error.message : String(error),
      })
    }

    await next()
  }
}
