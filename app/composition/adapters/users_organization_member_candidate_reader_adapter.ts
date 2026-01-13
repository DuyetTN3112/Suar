import type { OrganizationActionContext } from '#modules/organizations/directory/actions/organization_action_context'
import type { OrganizationMemberCandidateQuery } from '#modules/organizations/members/actions/dtos/request/organization_member_candidate_query'
import type { OrganizationMemberCandidatePage } from '#modules/organizations/members/actions/dtos/response/organization_member_candidate_page'
import { OrganizationMemberCandidateReader } from '#modules/organizations/members/actions/ports/outbound/organization_member_candidate_reader'
import { UserPaginationDTO } from '#modules/users/actions/dtos/common/user_action_dtos'
import {
  GetUsersListDTO,
  UserFiltersDTO,
} from '#modules/users/actions/dtos/request/get_users_list_dto'
import type { UserAdministrationQueryFactory } from '#modules/users/actions/ports/inbound/user_administration_query_factory'

export class UsersOrganizationMemberCandidateReaderAdapter extends OrganizationMemberCandidateReader {
  constructor(private readonly administrationQueries: UserAdministrationQueryFactory) {
    super()
  }

  async listCandidates(
    context: OrganizationActionContext,
    query: OrganizationMemberCandidateQuery
  ): Promise<OrganizationMemberCandidatePage> {
    const users = await this.administrationQueries.makeUsersList(context).handle(
      new GetUsersListDTO(
        new UserPaginationDTO(query.page, query.perPage),
        query.organizationId,
        new UserFiltersDTO(query.search, undefined, undefined, undefined, undefined, true)
      )
    )

    return {
      data: users.data.map((candidate) => ({
        id: candidate.id,
        username: candidate.username,
        email: candidate.email ?? '',
        status: candidate.status,
      })),
      pagination: {
        page: users.meta.currentPage,
        perPage: users.meta.perPage,
        total: users.meta.total,
        lastPage: users.meta.lastPage,
      },
    }
  }
}
