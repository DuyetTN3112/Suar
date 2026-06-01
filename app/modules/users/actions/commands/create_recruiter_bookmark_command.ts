import db from '@adonisjs/lucid/services/db'

import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import ConflictException from '#modules/http/exceptions/conflict_exception'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import { BaseCommand } from '#modules/users/actions/base_command'


export interface CreateRecruiterBookmarkDTO {
  talent_user_id: string
  notes?: string
  folder?: string
  rating?: number
}

export interface RecruiterBookmarkRecord {
  id: string
  recruiter_user_id: string
  talent_user_id: string
  notes: string | null
  folder: string
  rating: number | null
  created_at: string | Date
  updated_at: string | Date
}

export default class CreateRecruiterBookmarkCommand extends BaseCommand<
  CreateRecruiterBookmarkDTO,
  RecruiterBookmarkRecord
> {
  async handle(dto: CreateRecruiterBookmarkDTO): Promise<RecruiterBookmarkRecord> {
    const recruiterUserId = this.getCurrentUserId()

    // 1. Verify talent user exists
    const talentUser = (await db
      .from('users')
      .where('id', dto.talent_user_id)
      .first()) as Record<string, unknown> | null

    if (!talentUser) {
      throw new NotFoundException('Talent user not found')
    }

    // 2. Validate rating if provided
    if (dto.rating !== undefined && (dto.rating < 1 || dto.rating > 5)) {
      throw new BusinessLogicException('Rating must be between 1 and 5')
    }

    return this.executeInTransaction(async (trx) => {
      // 3. Check for duplicates
      const existing = (await trx
        .from('recruiter_bookmarks')
        .where('recruiter_user_id', recruiterUserId)
        .where('talent_user_id', dto.talent_user_id)
        .first()) as RecruiterBookmarkRecord | null

      if (existing) {
        throw new ConflictException('Recruiter bookmark already exists')
      }

      // 4. Create bookmark
      const results = (await trx
        .table('recruiter_bookmarks')
        .insert({
          id: db.raw('gen_random_uuid_v7()'),
          recruiter_user_id: recruiterUserId,
          talent_user_id: dto.talent_user_id,
          notes: dto.notes ?? null,
          folder: dto.folder ?? 'General',
          rating: dto.rating ?? null,
        })
        .returning('*')) as RecruiterBookmarkRecord[]

      const newBookmark = results[0]
      if (!newBookmark) {
        throw new BusinessLogicException('Failed to create recruiter bookmark')
      }

      return newBookmark
    })
  }
}
