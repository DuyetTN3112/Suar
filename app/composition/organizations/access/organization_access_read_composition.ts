import {
  organizationMembershipRepository,
  organizationReader,
} from '../persistence/organization_persistence_composition.js'

import { OrganizationRouteAccessReaderAdapter } from './adapters/organization_route_access_reader_adapter.js'

export const organizationRouteAccessReader = new OrganizationRouteAccessReaderAdapter(
  organizationReader,
  organizationMembershipRepository
)
