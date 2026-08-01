import type {
  RequiredOrganizationDirectoryInput,
  RequiredOrganizationDirectoryReader,
} from '#modules/errors/actions/ports/outbound/required_organization_directory_reader'
import type { OrganizationDirectoryCapability } from '#modules/organizations/directory/public_contracts/organization_directory'

export class RequiredOrganizationDirectoryReaderAdapter
  implements RequiredOrganizationDirectoryReader
{
  constructor(private readonly organizations: OrganizationDirectoryCapability) {}

  async getMembershipDirectoryPage(input: RequiredOrganizationDirectoryInput) {
    const result = await this.organizations.getMembershipDirectoryPage(input)

    return {
      data: result.data.map((organization) => ({ ...organization })),
      meta: { ...result.meta },
    }
  }
}
