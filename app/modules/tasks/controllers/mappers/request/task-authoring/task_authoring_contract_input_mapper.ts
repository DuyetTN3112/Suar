import ValidationException from '#modules/errors/public_contracts/validation_exception'
import type {
  CreateTaskAuthoringInput,
  CreateTaskSpecificationAuthoringInput,
  CreateTaskSupportingReferenceInput,
} from '#modules/tasks/actions/dtos/request/task-authoring/create_task_authoring'

export function readAliasedBodyValue(
  payload: Record<string, unknown>,
  camelKey: string,
  snakeKey: string
): unknown {
  return payload[camelKey] ?? payload[snakeKey]
}

type OptionalPayloadKeys<T extends object> = {
  [Key in keyof T]-?: undefined extends T[Key] ? Key : never
}[keyof T]

type OmittedUndefined<T extends object> = {
  [Key in keyof T as Key extends OptionalPayloadKeys<T> ? never : Key]: T[Key]
} & {
  [Key in OptionalPayloadKeys<T>]?: Exclude<T[Key], undefined>
}

export function omitUndefined<T extends object>(value: T): OmittedUndefined<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)
  ) as OmittedUndefined<T>
}

export function normalizeCreateTaskAuthoringInput(
  value: unknown
): CreateTaskAuthoringInput | undefined {
  if (value === undefined) {
    return undefined
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw ValidationException.field('authoring', 'authoring must be an object')
  }

  const authoring = value as Record<string, unknown>
  const rawSpecification = authoring['specification']
  const specification =
    typeof rawSpecification === 'object' && rawSpecification !== null && !Array.isArray(rawSpecification)
      ? (rawSpecification as Record<string, unknown>)
      : rawSpecification === undefined
        ? undefined
        : (() => {
            throw ValidationException.field('authoring.specification', 'specification must be an object')
          })()
  const references = readAliasedBodyValue(
    authoring,
    'supportingReferences',
    'supporting_references'
  )
  const supportingReferences = Array.isArray(references)
    ? references.map((entry) => {
        const reference =
          typeof entry === 'object' && entry !== null && !Array.isArray(entry)
            ? (entry as Record<string, unknown>)
            : (() => {
                throw ValidationException.field(
                  'authoring.supportingReferences',
                  'supportingReferences items must be objects'
                )
              })()
        return omitUndefined({
          type: reference['type'],
          uri: reference['uri'],
          title: reference['title'],
          relevant_section: readAliasedBodyValue(
            reference,
            'relevantSection',
            'relevant_section'
          ),
          relation: reference['relation'],
          access_state: readAliasedBodyValue(reference, 'accessState', 'access_state'),
          privacy_classification: readAliasedBodyValue(
            reference,
            'privacyClassification',
            'privacy_classification'
          ),
          external_version: readAliasedBodyValue(
            reference,
            'externalVersion',
            'external_version'
          ),
          external_content_hash: readAliasedBodyValue(
            reference,
            'externalContentHash',
            'external_content_hash'
          ),
        })
      })
    : references === undefined
      ? undefined
      : (() => {
          throw ValidationException.field(
            'authoring.supportingReferences',
            'supportingReferences must be an array'
          )
        })()

  return omitUndefined({
    mode: authoring['mode'],
    intent: authoring['intent'],
    idempotency_key: readAliasedBodyValue(authoring, 'idempotencyKey', 'idempotency_key'),
    expected_head_revision: readAliasedBodyValue(
      authoring,
      'expectedHeadRevision',
      'expected_head_revision'
    ),
    project_context_version_id: readAliasedBodyValue(
      authoring,
      'projectContextVersionId',
      'project_context_version_id'
    ),
    work_package_version_id: readAliasedBodyValue(
      authoring,
      'workPackageVersionId',
      'work_package_version_id'
    ),
    creator_confirmed: readAliasedBodyValue(
      authoring,
      'creatorConfirmed',
      'creator_confirmed'
    ),
    constraints_addressed: readAliasedBodyValue(
      authoring,
      'constraintsAddressed',
      'constraints_addressed'
    ),
    dependencies_addressed: readAliasedBodyValue(
      authoring,
      'dependenciesAddressed',
      'dependencies_addressed'
    ),
    specification: specification
      ? (omitUndefined({
          rich_content: readAliasedBodyValue(specification, 'richContent', 'rich_content'),
          plain_text: readAliasedBodyValue(specification, 'plainText', 'plain_text'),
          sections: specification['sections'],
        }) as CreateTaskSpecificationAuthoringInput)
      : undefined,
    work_contract: readAliasedBodyValue(authoring, 'workContract', 'work_contract'),
    evidence_contract: readAliasedBodyValue(authoring, 'evidenceContract', 'evidence_contract'),
    supporting_references: supportingReferences as
      | readonly CreateTaskSupportingReferenceInput[]
      | undefined,
  }) as CreateTaskAuthoringInput
}
