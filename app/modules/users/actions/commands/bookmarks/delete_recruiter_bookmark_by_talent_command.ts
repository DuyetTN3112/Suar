import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import { BaseCommand } from '#modules/users/actions/base_command'
import type { RecruiterBookmarkRepository } from '#modules/users/actions/ports/outbound/recruiter_bookmark_repository'
import type { UserRecruitingAccessReader } from '#modules/users/actions/ports/outbound/user_recruiting_access_reader'
import type { UserTransactionRunner } from '#modules/users/actions/ports/outbound/user_transaction'
import { assertRecruitingDirectoryAccess } from '#modules/users/actions/policies/recruiting_directory_access_policy'
import type { UserActionContext } from '#modules/users/actions/user_action_context'

export interface DeleteRecruiterBookmarkByTalentDTO {
  talentUserId: string
}

export default class DeleteRecruiterBookmarkByTalentCommand extends BaseCommand<DeleteRecruiterBookmarkByTalentDTO> {
  constructor(
    context: UserActionContext,
    transactions: UserTransactionRunner,
    private readonly bookmarks: RecruiterBookmarkRepository,
    private readonly access: UserRecruitingAccessReader
  ) {
    super(context, transactions)
  }

  async handle(dto: DeleteRecruiterBookmarkByTalentDTO): Promise<void> {
    const { userId: recruiterUserId } = await assertRecruitingDirectoryAccess(
      this.execCtx,
      this.access
    )

    await this.executeInTransaction(async (trx) => {
      const bookmark = await this.bookmarks.findByRecruiterAndTalent(
        recruiterUserId,
        dto.talentUserId,
        trx
      )
      if (!bookmark) {
        throw new NotFoundException('Talent bookmark not found')
      }

      await this.bookmarks.delete(bookmark.id, recruiterUserId, trx)
    })
  }
}
