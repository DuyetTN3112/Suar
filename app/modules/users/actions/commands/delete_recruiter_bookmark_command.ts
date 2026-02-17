import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import { BaseCommand } from '#modules/users/actions/base_command'
import type { RecruiterBookmarkRepository } from '#modules/users/actions/ports/outbound/recruiter_bookmark_repository'
import type { UserTransactionRunner } from '#modules/users/actions/ports/outbound/user_transaction'
import type { UserActionContext } from '#modules/users/actions/user_action_context'

export interface DeleteRecruiterBookmarkDTO {
  id: string
}

export default class DeleteRecruiterBookmarkCommand extends BaseCommand<
  DeleteRecruiterBookmarkDTO
> {
  constructor(
    context: UserActionContext,
    transactions: UserTransactionRunner,
    private readonly bookmarks: RecruiterBookmarkRepository
  ) {
    super(context, transactions)
  }

  async handle(dto: DeleteRecruiterBookmarkDTO): Promise<void> {
    const recruiterUserId = this.getCurrentUserId()

    await this.executeInTransaction(async (trx) => {
      // 1. Check if the bookmark exists and belongs to the recruiter
      const bookmark = await this.bookmarks.findOwned(dto.id, recruiterUserId, trx)

      if (!bookmark) {
        throw new NotFoundException('Talent bookmark not found')
      }

      // 2. Delete bookmark
      await this.bookmarks.delete(dto.id, recruiterUserId, trx)
    })
  }
}
