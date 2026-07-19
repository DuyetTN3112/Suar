import { readSearchRecordString } from './entity_record_reader.js'
import type { UnknownSearchRecord } from './entity_record_reader.js'
import { buildEntityFieldResults } from './field_result_builder.js'

import type { GlobalSearchCenterResult } from '#modules/search/public_contracts/global_search_contract'

export function buildTalentSearchResults(
  talent: UnknownSearchRecord,
  query: string
): GlobalSearchCenterResult[] {
  const id = readSearchRecordString(talent, ['id'])
  const title = readSearchRecordString(talent, ['username'])
  if (!id || !title) return []

  return buildEntityFieldResults({
    entityType: 'talent',
    entityId: id,
    title,
    url: `/org/talents/open/${id}`,
    breadcrumbs: [],
    fields: [
      { key: 'username', label: 'Talent name', value: title },
      {
        key: 'custom_headline',
        label: 'Talent headline',
        value: readSearchRecordString(talent, ['custom_headline', 'customHeadline']),
      },
      {
        key: 'bio',
        label: 'Talent bio',
        value: readSearchRecordString(talent, ['bio']),
      },
    ],
    fallbackLabel: 'Talent',
    primaryActionLabel: 'Open talent',
    query,
  })
}
