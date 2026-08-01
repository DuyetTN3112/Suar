import { compactSearchBreadcrumbs, readSearchRecordString } from './entity_record_reader.js'
import type { UnknownSearchRecord } from './entity_record_reader.js'
import { buildEntityFieldResults } from './field_result_builder.js'

import type { GlobalSearchCenterResult } from '#modules/search/public_contracts/global_search_contract'

export function buildProjectSearchResults(
  project: UnknownSearchRecord,
  query: string
): GlobalSearchCenterResult[] {
  const id = readSearchRecordString(project, ['id'])
  const title = readSearchRecordString(project, ['name'])
  if (!id || !title) return []

  return buildEntityFieldResults({
    entityType: 'project',
    entityId: id,
    title,
    url: `/projects/${id}`,
    breadcrumbs: compactSearchBreadcrumbs([readSearchRecordString(project, ['organization_name'])]),
    fields: [
      { key: 'name', label: 'Project name', value: title },
      {
        key: 'description',
        label: 'Project description',
        value: readSearchRecordString(project, ['description']),
      },
    ],
    fallbackLabel: 'Project',
    primaryActionLabel: 'Open project',
    query,
  })
}
