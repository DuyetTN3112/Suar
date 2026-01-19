import { UserInvitationReaderAdapter } from '#composition/adapters/user_invitation_reader_adapter'
import GetMyInvitationsPageQuery from '#modules/users/actions/queries/get_my_invitations_page_query'

const invitations = new UserInvitationReaderAdapter()
export const userInvitationPageQuery = new GetMyInvitationsPageQuery(invitations)

export function makeGetMyInvitationsPageQuery(): GetMyInvitationsPageQuery {
  return userInvitationPageQuery
}
