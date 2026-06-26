export const PROJECT_TASK_AUTHORING_CONTEXT_SCHEMA_V1 =
  'suar.project_task_authoring_context.v1' as const

export interface ProjectTaskAuthoringContextV1 {
  readonly schemaVersion: typeof PROJECT_TASK_AUTHORING_CONTEXT_SCHEMA_V1
  readonly projectId: string
  readonly activeProjectContext: {
    readonly id: string
    readonly versionNumber: number
    readonly title: string
    readonly summary: string
    readonly privacyClassification: string
  } | null
  readonly workPackages: readonly {
    readonly id: string
    readonly key: string
    readonly title: string
    readonly summary: string
    readonly status: 'ready' | 'no_active_version'
    readonly activeVersion: {
      readonly id: string
      readonly versionNumber: number
      readonly title: string
      readonly summary: string
      readonly projectContextVersionId: string | null
      readonly privacyClassification: string
    } | null
  }[]
}
