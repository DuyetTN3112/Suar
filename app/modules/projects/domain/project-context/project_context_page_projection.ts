import type { ProjectContextFactV1 } from '#modules/projects/public_contracts/project-context/project_context_facts_v1'
import type { ProjectContextPageProjection } from '#modules/projects/public_contracts/project_detail'

export interface ProjectContextPageProjectionOptions {
  includeConcurrencyFence?: boolean
}

export function mapProjectContextPageProjection(
  fact: ProjectContextFactV1 | null,
  options: ProjectContextPageProjectionOptions = {}
): ProjectContextPageProjection | null {
  if (!fact?.context) return null

  const context = fact.context
  return {
    active_version_id:
      options.includeConcurrencyFence === false ? null : fact.activeVersionId,
    active_version_number: fact.activeVersionNumber,
    context: {
      id: context.id,
      version_number: context.versionNumber,
      title: context.title,
      summary: context.summary,
      rich_content: context.richContent,
      plain_text_projection: context.plainTextProjection,
      active_from: context.activeFrom,
      retired_at: context.retiredAt,
      privacy_classification: context.privacyClassification,
      created_at: context.createdAt,
    },
  }
}
