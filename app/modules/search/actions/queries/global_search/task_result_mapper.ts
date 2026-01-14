import { compactSearchBreadcrumbs, readSearchRecordString } from './entity_record_reader.js'
import type { UnknownSearchRecord } from './entity_record_reader.js'
import { buildEntityFieldResults } from './field_result_builder.js'

import type { GlobalSearchCenterResult } from '#modules/search/public_contracts/global_search_contract'

export function buildTaskSearchResults(
  task: UnknownSearchRecord,
  query: string
): GlobalSearchCenterResult[] {
  const id = readSearchRecordString(task, ['id'])
  const title = readSearchRecordString(task, ['title', 'name'])
  if (!id || !title) return []

  return buildEntityFieldResults({
    entityType: 'task',
    entityId: id,
    title,
    url: `/tasks/${id}`,
    breadcrumbs: compactSearchBreadcrumbs([
      readSearchRecordString(task, ['organization_name']),
      readSearchRecordString(task, ['project_name']),
    ]),
    fields: [
      { key: 'title', label: 'Task title', value: title },
      {
        key: 'description',
        label: 'Task description',
        value: readSearchRecordString(task, ['description']),
      },
      {
        key: 'acceptance_criteria',
        label: 'Task acceptance criteria',
        value: readSearchRecordString(task, ['acceptance_criteria', 'acceptanceCriteria']),
      },
      {
        key: 'context_background',
        label: 'Task context',
        value: readSearchRecordString(task, ['context_background', 'contextBackground']),
      },
    ],
    fallbackLabel: 'Task',
    primaryActionLabel: 'Open task',
    query,
  })
}
