import { OrganizationRouteAccessReaderAdapter } from './adapters/organization_route_access_reader_adapter.js'
import {
  organizationMembershipRepository,
  organizationReader,
} from './organization_persistence_composition.js'

export const organizationRouteAccessReader = new OrganizationRouteAccessReaderAdapter(
  organizationReader,
  organizationMembershipRepository
)
