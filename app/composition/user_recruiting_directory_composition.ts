import { UserRecruitingAccessReaderAdapter } from '#composition/adapters/user_recruiting_access_reader_adapter'
import { UserTalentDirectoryOptionsReaderAdapter } from '#composition/adapters/user_talent_directory_options_reader_adapter'
import GetTalentDirectoryOptionsQuery from '#modules/users/actions/queries/get_talent_directory_options_query'
import RecruitingDirectoryAccessQuery from '#modules/users/actions/queries/recruiting_directory_access_query'

const access = new UserRecruitingAccessReaderAdapter()
const options = new UserTalentDirectoryOptionsReaderAdapter()
export const recruitingDirectoryAccessQuery = new RecruitingDirectoryAccessQuery(access)
export const talentDirectoryOptionsQuery = new GetTalentDirectoryOptionsQuery(options)

export function makeRecruitingDirectoryAccessQuery(): RecruitingDirectoryAccessQuery {
  return recruitingDirectoryAccessQuery
}

export function makeGetTalentDirectoryOptionsQuery(): GetTalentDirectoryOptionsQuery {
  return talentDirectoryOptionsQuery
}
