import type { ApplicationService } from '@adonisjs/core/types'

import { HttpOrganizationReaderAdapter } from '#composition/adapters/http/http_organization_reader_adapter'
import { HttpOrganizationReader } from '#modules/http/actions/ports/outbound/http_organization_reader'
import GetMeQuery from '#modules/http/actions/queries/identity/get_me_query'
import GetUsersInOrganizationQuery from '#modules/http/actions/queries/organization/get_users_in_organization_query'

export default class HttpIdentityQueriesProvider {
  constructor(private readonly app: ApplicationService) {}

  register(): void {
    const organizations = new HttpOrganizationReaderAdapter()

    this.app.container.singleton(HttpOrganizationReader, () => organizations)
    this.app.container.singleton(GetMeQuery, () => new GetMeQuery(organizations))
    this.app.container.singleton(
      GetUsersInOrganizationQuery,
      () => new GetUsersInOrganizationQuery(organizations)
    )
  }
}
