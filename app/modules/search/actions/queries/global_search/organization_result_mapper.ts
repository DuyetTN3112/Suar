import { compactSearchBreadcrumbs, readSearchRecordString } from './entity_record_reader.js'
import type { UnknownSearchRecord } from './entity_record_reader.js'
import { buildEntityFieldResults } from './field_result_builder.js'

import type { GlobalSearchCenterResult } from '#modules/search/public_contracts/global_search_contract'

export function buildOrganizationSearchResults(
  organization: UnknownSearchRecord,
  query: string
): GlobalSearchCenterResult[] {
  const id = readSearchRecordString(organization, ['id'])
  const title = readSearchRecordString(organization, ['name'])
  if (!id || !title) return []

  return buildEntityFieldResults({
    entityType: 'organization',
    entityId: id,
    title,
    url: `/organizations/${id}`,
    breadcrumbs: compactSearchBreadcrumbs([readSearchRecordString(organization, ['website'])]),
    fields: [
      { key: 'name', label: 'Organization name', value: title },
      {
        key: 'description',
        label: 'Organization description',
        value: readSearchRecordString(organization, ['description']),
      },
      {
        key: 'website',
        label: 'Organization website',
        value: readSearchRecordString(organization, ['website']),
      },
    ],
    fallbackLabel: 'Organization',
    primaryActionLabel: 'Open organization',
    query,
  })
}
