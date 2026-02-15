import type { LucidModel, LucidRow } from '@adonisjs/lucid/types/model'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'
import loggerService from '#services/logger_service'

/**
 * Interface cho models hỗ trợ soft delete
 */
interface SoftDeleteRow extends LucidRow {
  deletedAt?: DateTime | null
  id: number | string
}

/**
 * SoftDeleteService — centralized soft delete operations.
 *
 * Tách từ SoftDeleteMiddleware (vi phạm SRP khi có instance methods).
 * Dùng cho controllers/commands cần thực hiện soft delete/restore.
 *
 * Export module-level functions (không dùng class với only-static methods).
 */

/**
 * Soft delete entity — set deleted_at thay vì xóa thật
 */
export async function softDelete(
  model: LucidModel,
  id: string | number,
  trx?: TransactionClientContract
): Promise<SoftDeleteRow> {
  const query = trx ? model.query({ client: trx }) : model.query()
  const entity = (await query.where('id', id).firstOrFail()) as SoftDeleteRow
  entity.deletedAt = DateTime.now()

  if (trx) {
    entity.useTransaction(trx)
  }
  await entity.save()

  loggerService.info('Entity soft deleted', {
    model: model.name,
    id: String(id),
  })

  return entity
}

/**
 * Khôi phục entity đã bị soft delete
 */
export async function restore(
  model: LucidModel,
  id: string | number,
  trx?: TransactionClientContract
): Promise<SoftDeleteRow> {
  const query = trx ? model.query({ client: trx }) : model.query()
  const entity = (await query.where('id', id).firstOrFail()) as SoftDeleteRow
  entity.deletedAt = null

  if (trx) {
    entity.useTransaction(trx)
  }
  await entity.save()

  loggerService.info('Entity restored from soft delete', {
    model: model.name,
    id: String(id),
  })

  return entity
}

/**
 * Kiểm tra entity đã bị soft delete chưa
 */
export async function isSoftDeleted(
  model: LucidModel,
  id: string | number,
  trx?: TransactionClientContract
): Promise<boolean> {
  const query = trx ? model.query({ client: trx }) : model.query()
  const entity = (await query.where('id', id).first()) as SoftDeleteRow | null

  if (!entity) return false
  return entity.deletedAt !== null && entity.deletedAt !== undefined
}

/**
 * Xóa vĩnh viễn entity (hard delete)
 * CHÚ Ý: Chỉ dùng khi thực sự cần xóa data (ví dụ: GDPR compliance)
 */
export async function hardDelete(
  model: LucidModel,
  id: string | number,
  trx?: TransactionClientContract
): Promise<void> {
  const query = trx ? model.query({ client: trx }) : model.query()
  await query.where('id', id).delete()

  loggerService.warn('Entity permanently deleted (hard delete)', {
    model: model.name,
    id: String(id),
  })
}
