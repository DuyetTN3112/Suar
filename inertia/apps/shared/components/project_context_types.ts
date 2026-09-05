import type { TvaJsonValue } from '#modules/tasks/public_contracts/task-authoring/primitives'

export interface ProjectContextReadModel {
  active_version_id: string | null
  active_version_number: number
  context: {
    id: string
    version_number: number
    title: string
    summary: string
    rich_content: TvaJsonValue
    plain_text_projection: string
    active_from: string
    retired_at: string | null
    privacy_classification: string
    created_at: string
  } | null
}
