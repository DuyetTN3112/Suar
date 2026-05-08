import type { ApplicationService } from '@adonisjs/core/types'

import { RequiredOrganizationDirectoryReaderAdapter } from '#composition/organizations/directory/adapters/required_organization_directory_reader_adapter'

import { organizationDirectoryCapability } from '#composition/organizations/search/organization_search_composition'
import GetRequiredOrganizationPageQuery from '#modules/errors/actions/queries/error-event-retention/get_required_organization_page_query'

export default class ErrorRequiredOrganizationProvider {
  constructor(private readonly app: ApplicationService) {}

  register(): void {
    this.app.container.singleton(
      GetRequiredOrganizationPageQuery,
      () =>
        new GetRequiredOrganizationPageQuery(
          new RequiredOrganizationDirectoryReaderAdapter(organizationDirectoryCapability)
        )
    )
  }
}
