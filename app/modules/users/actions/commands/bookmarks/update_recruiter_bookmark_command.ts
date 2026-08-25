import type { RecruiterBookmarkRecord } from './create_recruiter_bookmark_command.js'

import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { BaseCommand } from '#modules/users/actions/base_command'
import type { RecruiterBookmarkRepository } from '#modules/users/actions/ports/outbound/recruiter_bookmark_repository'
import type { UserRecruitingAccessReader } from '#modules/users/actions/ports/outbound/user_recruiting_access_reader'
import type { UserTransactionRunner } from '#modules/users/actions/ports/outbound/user_transaction'
import { assertRecruitingDirectoryAccess } from '#modules/users/actions/policies/recruiting_directory_access_policy'
import type { UserActionContext } from '#modules/users/actions/user_action_context'

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
  constructor(
    context: UserActionContext,
    transactions: UserTransactionRunner,
    private readonly bookmarks: RecruiterBookmarkRepository,
    private readonly access: UserRecruitingAccessReader
  ) {
    super(context, transactions)
  }

  async handle(dto: UpdateRecruiterBookmarkDTO): Promise<RecruiterBookmarkRecord> {
    if (dto.rating !== undefined && (dto.rating < 1 || dto.rating > 5)) {
      throw ValidationException.field('rating', 'Rating must be between 1 and 5')
    }

    const { userId: recruiterUserId } = await assertRecruitingDirectoryAccess(
      this.execCtx,
      this.access
    )

    return this.executeInTransaction(async (trx) => {
      const bookmark = await this.bookmarks.findOwned(dto.id, recruiterUserId, trx)

      if (!bookmark) {
        throw new NotFoundException('Talent bookmark not found')
      }

      const payload: Partial<RecruiterBookmarkRecord> = {}
      if (dto.notes !== undefined) payload.notes = dto.notes
      if (dto.folder !== undefined) payload.folder = dto.folder
      if (dto.rating !== undefined) payload.rating = dto.rating

      const updated = await this.bookmarks.update(dto.id, recruiterUserId, payload, trx)
      if (!updated) {
        throw new InvariantViolationException(
          'Locked recruiter bookmark update returned no persisted row',
          {
            details: {
              bookmarkId: dto.id,
              recruiterUserId,
            },
          }
        )
      }

      return updated
    })
  }
}
