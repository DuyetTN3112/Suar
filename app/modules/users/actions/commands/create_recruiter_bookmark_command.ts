import ConflictException from '#modules/errors/public_contracts/conflict_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { BaseCommand } from '#modules/users/actions/base_command'
import type {
  RecruiterBookmarkRecord,
  RecruiterBookmarkRepository,
} from '#modules/users/actions/ports/outbound/recruiter_bookmark_repository'
import type { UserAccountRepository } from '#modules/users/actions/ports/outbound/user_account_repository'
import type { UserTransactionRunner } from '#modules/users/actions/ports/outbound/user_transaction'
import type { UserActionContext } from '#modules/users/actions/user_action_context'

export interface CreateRecruiterBookmarkDTO {
  talent_user_id: string
  notes?: string
  folder?: string
  rating?: number
}

export type { RecruiterBookmarkRecord }

export default class CreateRecruiterBookmarkCommand extends BaseCommand<
  CreateRecruiterBookmarkDTO,
  RecruiterBookmarkRecord
> {
  constructor(
    context: UserActionContext,
    transactions: UserTransactionRunner,
    private readonly users: UserAccountRepository,
    private readonly bookmarks: RecruiterBookmarkRepository
  ) {
    super(context, transactions)
  }

  async handle(dto: CreateRecruiterBookmarkDTO): Promise<RecruiterBookmarkRecord> {
    const recruiterUserId = this.getCurrentUserId()

    // 1. Reject invalid input before performing dependency work.
    if (dto.rating !== undefined && (dto.rating < 1 || dto.rating > 5)) {
      throw ValidationException.field('rating', 'Rating must be between 1 and 5')
    }

    // 2. Verify talent user exists
    const talentUser = await this.users.findById(dto.talent_user_id)

    if (!talentUser) {
      throw new NotFoundException('Talent user not found')
    }

    return this.executeInTransaction(async (trx) => {
      // 3. Check for duplicates
      const existing = await this.bookmarks.findByRecruiterAndTalent(
        recruiterUserId,
        dto.talent_user_id,
        trx
      )

      if (existing) {
        throw new ConflictException('Talent bookmark already exists')
      }

      // 4. Create bookmark
      const newBookmark = await this.bookmarks.create(
        {
          recruiter_user_id: recruiterUserId,
          talent_user_id: dto.talent_user_id,
          notes: dto.notes ?? null,
          folder: dto.folder ?? 'General',
          rating: dto.rating ?? null,
        },
        trx
      )
      return newBookmark
    })
  }
}
