import { InProcessOrganizationEventPublisher } from '#modules/organizations/directory/infra/adapters/in_process_organization_event_publisher'
import {
  LucidOrganizationAdministrationRepository,
  LucidOrganizationMembershipRepository,
  LucidOrganizationReader,
  LucidOrganizationWorkHistoryReader,
  LucidOrganizationWriter,
} from '#modules/organizations/directory/infra/adapters/lucid_organization_persistence'
import { LucidOrganizationTransactionRunner } from '#modules/organizations/directory/infra/adapters/lucid_organization_transaction_runner'

export const organizationReader = new LucidOrganizationReader()
export const organizationWriter = new LucidOrganizationWriter()
export const organizationMembershipRepository =
  new LucidOrganizationMembershipRepository()
export const organizationWorkHistoryReader = new LucidOrganizationWorkHistoryReader()
export const organizationAdministrationRepository =
  new LucidOrganizationAdministrationRepository()
export const organizationTransactionRunner = new LucidOrganizationTransactionRunner()
export const organizationEventPublisher = new InProcessOrganizationEventPublisher()
