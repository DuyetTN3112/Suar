import NotFoundException from '#modules/http/exceptions/not_found_exception'
import { BaseCommand } from '#modules/users/actions/base_command'

export interface DeleteRecruiterBookmarkDTO {
  id: string
}

export default class DeleteRecruiterBookmarkCommand extends BaseCommand<
  DeleteRecruiterBookmarkDTO
> {
  async handle(dto: DeleteRecruiterBookmarkDTO): Promise<void> {
    const recruiterUserId = this.getCurrentUserId()

    await this.executeInTransaction(async (trx) => {
      // 1. Check if the bookmark exists and belongs to the recruiter
      const bookmark = (await trx
        .from('recruiter_bookmarks')
        .where('id', dto.id)
        .where('recruiter_user_id', recruiterUserId)
        .first()) as Record<string, unknown> | null

      if (!bookmark) {
        throw new NotFoundException('Recruiter bookmark not found')
      }

      // 2. Delete bookmark
      await trx
        .from('recruiter_bookmarks')
        .where('id', dto.id)
        .delete()
    })
  }
}
