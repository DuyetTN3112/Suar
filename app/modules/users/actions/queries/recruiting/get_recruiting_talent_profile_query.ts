import { BaseQuery } from '#modules/users/actions/base_query'
import { assertRecruitingTalentAccess } from '#modules/users/actions/policies/recruiting_directory_access_policy'
import type { UserRecruitingAccessReader } from '#modules/users/actions/ports/outbound/user_recruiting_access_reader'
import type { GetProfileViewPageResult } from '#modules/users/actions/queries/profile/get_profile_view_page_query'
import type { UserActionContext } from '#modules/users/actions/user_action_context'

export default class GetRecruitingTalentProfileQuery extends BaseQuery<
  { userId: string },
  GetProfileViewPageResult
> {
  constructor(
    context: UserActionContext,
    private readonly access: UserRecruitingAccessReader,
    private readonly profile: {
      execute(input: {
        userId: string
        currentUserId: string | null
      }): Promise<GetProfileViewPageResult>
    }
  ) {
    super(context)
  }

  async handle(input: { userId: string }): Promise<GetProfileViewPageResult> {
    const actor = await assertRecruitingTalentAccess(this.execCtx, input.userId, this.access)
    return this.profile.execute({
      userId: input.userId,
      currentUserId: actor.userId,
    })
  }
}
