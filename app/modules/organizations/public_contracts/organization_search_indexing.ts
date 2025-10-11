import { LucidOrganizationSearchDocumentReader } from '#modules/organizations/infra/adapters/lucid_organization_search_document_reader'
import { LucidOrganizationSearchSyncReader } from '#modules/organizations/infra/adapters/lucid_organization_search_sync_reader'

export const organizationSearchDocumentReader = new LucidOrganizationSearchDocumentReader()
export const organizationSearchSyncReader = new LucidOrganizationSearchSyncReader()
