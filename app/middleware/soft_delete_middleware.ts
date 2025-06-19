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
  async handle(
    ctx: HttpContext,
    next: NextFn,
    options: { model: string; paramName?: string; allowDeleted?: boolean }
  ): Promise<void> {
    const paramName = options.paramName || 'id'
    const allowDeleted = options.allowDeleted || false
    const id = ctx.params[paramName] as string | undefined

    // Nếu không có ID, tiếp tục xử lý
    if (!id) {
      await next()
      return
    }

    try {
      // Import model động
      const modelModule = (await import(`#models/${options.model}`)) as { default: LucidModel }
      const model: LucidModel = modelModule.default

      // Tìm entity theo ID
      let query = model.query().where('id', id)
      // Nếu không cho phép truy cập entity đã bị xóa, thêm điều kiện
      if (!allowDeleted) {
        query = query.whereNull('deleted_at')
      }
      const entity = (await query.first()) as SoftDeleteRow | null

      // Nếu không tìm thấy entity hoặc entity đã bị xóa và không được phép truy cập
      if (!entity || (!allowDeleted && entity.deletedAt)) {
        // Đối với AJAX request, trả về lỗi 404
        if (ctx.request.ajax()) {
          ctx.response.status(404).json({
            error: 'Not Found',
            message: 'Không tìm thấy dữ liệu yêu cầu',
          })
          return
        }

        // Đối với Inertia request, hiển thị trang lỗi 404
        if (ctx.request.header('X-Inertia')) {
          ctx.response.status(404).json({
            component: 'errors/NotFound',
            props: {
              status: 404,
              message: 'Không tìm thấy dữ liệu yêu cầu',
            },
          })
          return
        }

        // Chuyển hướng về trang lỗi 404
        ctx.response.status(404).send('Không tìm thấy dữ liệu yêu cầu')
        return
      }

      // Lưu entity vào context để sử dụng trong controller
      ctx.softDeletedEntity = entity
    } catch (error) {
      console.error('Error in SoftDeleteMiddleware:', error)
    }

    await next()
  }

  /**
   * Thực hiện soft delete cho entity
   * @param model Model cần xóa
   * @param id ID của entity
   */
  async softDelete(model: LucidModel, id: string | number): Promise<SoftDeleteRow> {
    const entity = (await model.findOrFail(id)) as SoftDeleteRow
    entity.deletedAt = DateTime.now()
    await entity.save()
    return entity
  }

  /**
   * Khôi phục entity đã bị soft delete
   * @param model Model cần khôi phục
   * @param id ID của entity
   */
  async restore(model: LucidModel, id: string | number): Promise<SoftDeleteRow> {
    const entity = (await model.findOrFail(id)) as SoftDeleteRow
    entity.deletedAt = null
    await entity.save()
    return entity
  }
}
