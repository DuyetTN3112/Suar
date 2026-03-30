import { buildCommentResult } from './comment_result_mapper.js'
import { buildEntityFieldResults } from './field_result_builder.js'
import type { GlobalSearchCenterResult, GlobalSearchResult } from './types.js'

type UnknownRecord = Record<string, unknown>

export function buildSearchCandidates(
  grouped: Omit<GlobalSearchResult, 'results'>,
  query: string
): GlobalSearchCenterResult[] {
  return [
    ...grouped.tasks.flatMap((task) => buildTaskResults(asRecord(task), query)),
    ...grouped.projects.flatMap((project) => buildProjectResults(asRecord(project), query)),
    ...grouped.comments.map((comment) => buildCommentResult(comment, query)),
    ...grouped.talents.flatMap((talent) => buildTalentResults(asRecord(talent), query)),
    ...grouped.skills.flatMap((skill) => buildSkillResults(asRecord(skill), query)),
    ...grouped.organizations.flatMap((organization) =>
      buildOrganizationResults(asRecord(organization), query)
    ),
  ]
}

function buildTaskResults(task: UnknownRecord, query: string): GlobalSearchCenterResult[] {
  const id = readString(task, ['id'])
  const title = readString(task, ['title', 'name'])
  if (!id || !title) return []

  return buildEntityFieldResults({
    entityType: 'task',
    entityId: id,
    title,
    url: `/tasks/${id}`,
    breadcrumbs: compactParts([
      readString(task, ['organization_name']),
      readString(task, ['project_name']),
    ]),
    fields: [
      { key: 'title', label: 'Task title', value: title },
      { key: 'description', label: 'Task description', value: readString(task, ['description']) },
      {
        key: 'acceptance_criteria',
        label: 'Task acceptance criteria',
        value: readString(task, ['acceptance_criteria', 'acceptanceCriteria']),
      },
      {
        key: 'context_background',
        label: 'Task context',
        value: readString(task, ['context_background', 'contextBackground']),
      },
    ],
    fallbackLabel: 'Task',
    primaryActionLabel: 'Open task',
    query,
  })
}

function buildProjectResults(project: UnknownRecord, query: string): GlobalSearchCenterResult[] {
  const id = readString(project, ['id'])
  const title = readString(project, ['name'])
  if (!id || !title) return []

  return buildEntityFieldResults({
    entityType: 'project',
    entityId: id,
    title,
    url: `/projects/${id}`,
    breadcrumbs: compactParts([readString(project, ['organization_name'])]),
    fields: [
      { key: 'name', label: 'Project name', value: title },
      {
        key: 'description',
        label: 'Project description',
        value: readString(project, ['description']),
      },
    ],
    fallbackLabel: 'Project',
    primaryActionLabel: 'Open project',
    query,
  })
}

function buildTalentResults(talent: UnknownRecord, query: string): GlobalSearchCenterResult[] {
  const id = readString(talent, ['id'])
  const title = readString(talent, ['username'])
  if (!id || !title) return []

  return buildEntityFieldResults({
    entityType: 'talent',
    entityId: id,
    title,
    url: `/org/talents/${id}`,
    breadcrumbs: [],
    fields: [
      { key: 'username', label: 'Talent name', value: title },
      {
        key: 'custom_headline',
        label: 'Talent headline',
        value: readString(talent, ['custom_headline', 'customHeadline']),
      },
      { key: 'bio', label: 'Talent bio', value: readString(talent, ['bio']) },
    ],
    fallbackLabel: 'Talent',
    primaryActionLabel: 'Open talent',
    query,
  })
}

function buildSkillResults(skill: UnknownRecord, query: string): GlobalSearchCenterResult[] {
  const id = readString(skill, ['id'])
  const title = readString(skill, ['skillName', 'skill_name'])
  if (!id || !title) return []

  return buildEntityFieldResults({
    entityType: 'skill',
    entityId: id,
    title,
    url: `/org/talents?q=${encodeURIComponent(title)}`,
    breadcrumbs: compactParts([readString(skill, ['categoryCode', 'category_code'])]),
    fields: [
      { key: 'skillName', label: 'Skill name', value: title },
      {
        key: 'skillCode',
        label: 'Skill code',
        value: readString(skill, ['skillCode', 'skill_code']),
      },
      { key: 'description', label: 'Skill description', value: readString(skill, ['description']) },
    ],
    fallbackLabel: 'Skill',
    primaryActionLabel: 'Find talent',
    query,
  })
}

function buildOrganizationResults(
  organization: UnknownRecord,
  query: string
): GlobalSearchCenterResult[] {
  const id = readString(organization, ['id'])
  const title = readString(organization, ['name'])
  if (!id || !title) return []

  return buildEntityFieldResults({
    entityType: 'organization',
    entityId: id,
    title,
    url: `/organizations/${id}`,
    breadcrumbs: compactParts([readString(organization, ['website'])]),
    fields: [
      { key: 'name', label: 'Organization name', value: title },
      {
        key: 'description',
        label: 'Organization description',
        value: readString(organization, ['description']),
      },
      {
        key: 'website',
        label: 'Organization website',
        value: readString(organization, ['website']),
      },
    ],
    fallbackLabel: 'Organization',
    primaryActionLabel: 'Open organization',
    query,
  })
}

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === 'object' ? (value as UnknownRecord) : {}
}

function readString(record: UnknownRecord, candidates: string[]): string | null {
  for (const candidate of candidates) {
    const value = record[candidate]
    if (typeof value === 'string' && value.trim()) {
      return value
    }
  }

  return null
}

function compactParts(parts: Array<string | null>): string[] {
  return parts.filter((part): part is string => Boolean(part))
}
