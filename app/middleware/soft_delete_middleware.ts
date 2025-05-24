import { HttpContext } from '@adonisjs/core/http'
import { NextFn } from '@adonisjs/core/types/http'
import { inject } from '@adonisjs/core'
import { LucidModel, LucidRow } from '@adonisjs/lucid/types/model'
import { DateTime } from 'luxon'

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
 * Middleware xử lý soft delete
 * Sử dụng middleware này để kiểm tra trạng thái soft delete của entity
 */
@inject()
export default class SoftDeleteMiddleware {
  /**
   * Xử lý request
   * @param model Model cần kiểm tra
   * @param paramName Tên param chứa ID của entity (mặc định là 'id')
   * @param allowDeleted Cho phép truy cập entity đã bị xóa hay không
   */
  async handle(
    ctx: HttpContext,
    next: NextFn,
    options: { model: string; paramName?: string; allowDeleted?: boolean }
  ) {
    const paramName = options.paramName || 'id'
    const allowDeleted = options.allowDeleted || false
    const id = ctx.params[paramName]

    // Nếu không có ID, tiếp tục xử lý
    if (!id) {
      return next()
    }

    try {
      // Import model động
      const model: LucidModel = await import(`#models/${options.model}`).then((m) => m.default)

      // Tìm entity theo ID
      const query = model.query().where('id', id)
      // Nếu không cho phép truy cập entity đã bị xóa, thêm điều kiện
      if (!allowDeleted) {
        void query.whereNull('deleted_at')
      }
      const entity = (await query.first()) as SoftDeleteRow | null

      // Nếu không tìm thấy entity hoặc entity đã bị xóa và không được phép truy cập
      if (!entity || (!allowDeleted && entity.deletedAt)) {
        // Đối với AJAX request, trả về lỗi 404
        if (ctx.request.ajax()) {
          return ctx.response.status(404).json({
            error: 'Not Found',
            message: 'Không tìm thấy dữ liệu yêu cầu',
          })
        }

        // Đối với Inertia request, hiển thị trang lỗi 404
        if (ctx.request.header('X-Inertia')) {
          return ctx.response.status(404).json({
            component: 'errors/NotFound',
            props: {
              status: 404,
              message: 'Không tìm thấy dữ liệu yêu cầu',
            },
          })
        }

        // Chuyển hướng về trang lỗi 404
        return ctx.response.status(404).send('Không tìm thấy dữ liệu yêu cầu')
      }

      // Lưu entity vào context để sử dụng trong controller
      ctx.softDeletedEntity = entity
    } catch (error) {
      console.error('Error in SoftDeleteMiddleware:', error)
    }

    return next()
  }

  /**
   * Thực hiện soft delete cho entity
   * @param model Model cần xóa
   * @param id ID của entity
   */
  async softDelete(model: LucidModel, id: string | number) {
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
  async restore(model: LucidModel, id: string | number) {
    const entity = (await model.findOrFail(id)) as SoftDeleteRow
    entity.deletedAt = null
    await entity.save()
    return entity
  }
}
