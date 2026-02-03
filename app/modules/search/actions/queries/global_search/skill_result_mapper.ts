import { compactSearchBreadcrumbs, readSearchRecordString } from './entity_record_reader.js'
import type { UnknownSearchRecord } from './entity_record_reader.js'
import { buildEntityFieldResults } from './field_result_builder.js'

import type { GlobalSearchCenterResult } from '#modules/search/public_contracts/global_search_contract'

export function buildSkillSearchResults(
  skill: UnknownSearchRecord,
  query: string
): GlobalSearchCenterResult[] {
  const id = readSearchRecordString(skill, ['id'])
  const title = readSearchRecordString(skill, ['skillName', 'skill_name'])
  if (!id || !title) return []

  return buildEntityFieldResults({
    entityType: 'skill',
    entityId: id,
    title,
    url: `/org/talents?q=${encodeURIComponent(title)}`,
    breadcrumbs: compactSearchBreadcrumbs([
      readSearchRecordString(skill, ['categoryCode', 'category_code']),
    ]),
    fields: [
      { key: 'skillName', label: 'Skill name', value: title },
      {
        key: 'skillCode',
        label: 'Skill code',
        value: readSearchRecordString(skill, ['skillCode', 'skill_code']),
      },
      {
        key: 'description',
        label: 'Skill description',
        value: readSearchRecordString(skill, ['description']),
      },
    ],
    fallbackLabel: 'Skill',
    primaryActionLabel: 'Find talent',
    query,
  })
}
