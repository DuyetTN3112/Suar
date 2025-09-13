import type { RecruiterBookmarkRecord } from './create_recruiter_bookmark_command.js'

import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import { BaseCommand } from '#modules/users/actions/base_command'

export interface UpdateRecruiterBookmarkDTO {
  id: string
  notes?: string
  folder?: string
  rating?: number
}

export default class UpdateRecruiterBookmarkCommand extends BaseCommand<
  UpdateRecruiterBookmarkDTO,
  RecruiterBookmarkRecord
> {
  async handle(dto: UpdateRecruiterBookmarkDTO): Promise<RecruiterBookmarkRecord> {
    const recruiterUserId = this.getCurrentUserId()

    if (dto.rating !== undefined && (dto.rating < 1 || dto.rating > 5)) {
      throw new BusinessLogicException('Rating must be between 1 and 5')
    }

    return this.executeInTransaction(async (trx) => {
      const bookmark = (await trx
        .from('recruiter_bookmarks')
        .where('id', dto.id)
        .where('recruiter_user_id', recruiterUserId)
        .first()) as Record<string, unknown> | null

      if (!bookmark) {
        throw new NotFoundException('Recruiter bookmark not found')
      }

      const payload: Partial<RecruiterBookmarkRecord> = {}
      if (dto.notes !== undefined) payload.notes = dto.notes
      if (dto.folder !== undefined) payload.folder = dto.folder
      if (dto.rating !== undefined) payload.rating = dto.rating

      const results = (await trx
        .from('recruiter_bookmarks')
        .where('id', dto.id)
        .update(payload)
        .returning('*')) as RecruiterBookmarkRecord[]

      const updated = results[0]
      if (!updated) {
        throw new BusinessLogicException('Failed to update recruiter bookmark')
      }

      return updated
    })
  }
}
