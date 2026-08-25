import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import type { UserRecruitingAccessReader } from '#modules/users/actions/ports/outbound/user_recruiting_access_reader'
import type { UserActionContext } from '#modules/users/actions/user_action_context'

const RECRUITING_DIRECTORY_FORBIDDEN_MESSAGE = 'Bạn không có quyền truy cập danh bạ talent'

export interface RecruitingDirectoryActor {
  organizationId: string
  userId: string
}

export async function assertRecruitingDirectoryAccess(
  context: UserActionContext,
  access: UserRecruitingAccessReader
): Promise<RecruitingDirectoryActor> {
  if (!context.organizationId || !context.userId) {
    throw new ForbiddenException(RECRUITING_DIRECTORY_FORBIDDEN_MESSAGE)
  }

  if (!(await access.canAccessDirectory(context.organizationId, context.userId))) {
    throw new ForbiddenException(RECRUITING_DIRECTORY_FORBIDDEN_MESSAGE)
  }

  return {
    organizationId: context.organizationId,
    userId: context.userId,
  }
}

export async function assertRecruitingTalentAccess(
  context: UserActionContext,
  talentUserId: string,
  access: UserRecruitingAccessReader
): Promise<RecruitingDirectoryActor> {
  const actor = await assertRecruitingDirectoryAccess(context, access)

  if (!(await access.talentBelongsToOrganization(talentUserId, actor.organizationId))) {
    throw new ForbiddenException(RECRUITING_DIRECTORY_FORBIDDEN_MESSAGE)
  }

  return actor
}
