import {
  TVA_PRIVACY_CLASSIFICATIONS,
  TVA_REFERENCE_ACCESS_STATES,
  TVA_REFERENCE_RELATIONS,
  TVA_REFERENCE_TYPES,
  type TvaJsonValue,
  type TvaPrivacyClassification,
  type TvaReferenceAccessState,
  type TvaReferenceRelation,
  type TvaReferenceType,
  type TvaSha256,
} from '#modules/tasks/public_contracts/task-authoring/primitives'
import type {
  TaskEvidenceContractV1,
  TaskSpecificationSectionV1,
  TaskWorkContractV1,
} from '#modules/tasks/public_contracts/task-authoring/task_contracts'
import { isTvaJsonValue } from '#modules/tasks/public_contracts/task-authoring/validators'
import ValidationException from '#modules/errors/public_contracts/validation_exception'

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const SHA256_REGEX = /^sha256:[0-9a-f]{64}$/
const UNSAFE_RICH_CONTENT_REGEX = /<\s*script\b|javascript\s*:|on[a-z]+\s*=/iu
const MAX_LOCAL_TEXT_LENGTH = 262_144

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function containsUnsafeRichContent(value: unknown): boolean {
  if (typeof value === 'string') return UNSAFE_RICH_CONTENT_REGEX.test(value)
  if (Array.isArray(value)) return value.some((entry) => containsUnsafeRichContent(entry))
  if (value !== null && typeof value === 'object') {
    return Object.values(value).some((entry) => containsUnsafeRichContent(entry))
  }
  return false
}

function requiredString(value: unknown, message: string, maxLength: number): string {
  if (typeof value !== 'string') throw new ValidationException(message)
  const normalized = value.trim()
  if (!normalized || normalized.length > maxLength) throw new ValidationException(message)
  return normalized
}

function optionalBoolean(value: unknown, fieldName: string): boolean {
  if (value === undefined) return false
  if (typeof value !== 'boolean') {
    throw new ValidationException(`${fieldName} phải là boolean`)
  }
  return value
}

export type CreateTaskAuthoringMode =
  | 'legacy_operational'
  | 'operational_only'
  | 'evidence_enabled'
export type CreateTaskAuthoringIntent = 'legacy_create' | 'save_draft' | 'publish'

export interface CreateTaskSpecificationAuthoringInput {
  readonly rich_content?: TvaJsonValue
  readonly plain_text?: string
  readonly sections?: readonly TaskSpecificationSectionV1[]
}

export interface CreateTaskSupportingReferenceInput {
  readonly type: TvaReferenceType
  readonly uri: string
  readonly title: string
  readonly relevant_section: string
  readonly relation: TvaReferenceRelation
  readonly access_state: TvaReferenceAccessState
  readonly privacy_classification: TvaPrivacyClassification
  readonly external_version?: string | null
  readonly external_content_hash?: TvaSha256 | null
}

export interface CreateTaskAuthoringInput {
  readonly mode: CreateTaskAuthoringMode
  readonly intent: CreateTaskAuthoringIntent
  readonly idempotency_key?: string
  readonly expected_head_revision?: number
  readonly project_context_version_id?: string | null
  readonly work_package_version_id?: string | null
  readonly creator_confirmed?: boolean
  readonly constraints_addressed?: boolean
  readonly dependencies_addressed?: boolean
  readonly specification?: CreateTaskSpecificationAuthoringInput
  readonly work_contract?: Partial<TaskWorkContractV1>
  readonly evidence_contract?: Partial<TaskEvidenceContractV1>
  readonly supporting_references?: readonly CreateTaskSupportingReferenceInput[]
}

export interface CreateTaskAuthoringState {
  readonly mode: CreateTaskAuthoringMode
  readonly intent: CreateTaskAuthoringIntent
  readonly explicit: boolean
  readonly idempotency_key: string | null
  readonly expected_head_revision: number
  readonly project_context_version_id: string | null
  readonly work_package_version_id: string | null
  readonly creator_confirmed: boolean
  readonly constraints_addressed: boolean
  readonly dependencies_addressed: boolean
  readonly specification: CreateTaskSpecificationAuthoringInput | null
  readonly work_contract: Partial<TaskWorkContractV1> | null
  readonly evidence_contract: Partial<TaskEvidenceContractV1> | null
  readonly supporting_references: readonly CreateTaskSupportingReferenceInput[]
  readonly profile_eligible: boolean
}

const LEGACY_AUTHORING_STATE: CreateTaskAuthoringState = Object.freeze({
  mode: 'legacy_operational',
  intent: 'legacy_create',
  explicit: false,
  idempotency_key: null,
  expected_head_revision: 0,
  project_context_version_id: null,
  work_package_version_id: null,
  creator_confirmed: false,
  constraints_addressed: false,
  dependencies_addressed: false,
  specification: null,
  work_contract: null,
  evidence_contract: null,
  supporting_references: Object.freeze([]),
  profile_eligible: false,
})

function normalizeOptionalVersionId(value: string | null | undefined, fieldName: string) {
  if (value === undefined || value === null) {
    return null
  }
  const normalized = value.trim()
  if (!UUID_REGEX.test(normalized)) {
    throw new ValidationException(`${fieldName} không hợp lệ`)
  }
  return normalized
}

function normalizeSpecification(specification: unknown): CreateTaskSpecificationAuthoringInput | null {
  if (specification === undefined) {
    return null
  }
  if (!isRecord(specification)) {
    throw new ValidationException('Specification phải là object')
  }
  const richContent = specification['rich_content']
  if (richContent !== undefined && !isTvaJsonValue(richContent)) {
    throw new ValidationException('Nội dung specification không hợp lệ')
  }
  if (richContent !== undefined && containsUnsafeRichContent(richContent)) {
    throw new ValidationException('Nội dung rich specification chứa markup không an toàn')
  }
  const plainText = specification['plain_text']
  if (plainText !== undefined && typeof plainText !== 'string') {
    throw new ValidationException('Plain-text specification không hợp lệ')
  }
  if (typeof plainText === 'string' && plainText.length > MAX_LOCAL_TEXT_LENGTH) {
    throw new ValidationException('Plain-text specification vượt quá giới hạn')
  }

  const rawSections = specification['sections']
  if (rawSections !== undefined && !Array.isArray(rawSections)) {
    throw new ValidationException('Danh sách section của specification không hợp lệ')
  }
  const sectionIds = new Set<string>()
  const sections = (rawSections ?? []).map((entry) => {
    if (!isRecord(entry)) {
      throw new ValidationException('Section của specification không hợp lệ')
    }
    const id = requiredString(entry['id'], 'ID section không hợp lệ', 36)
    if (!UUID_REGEX.test(id) || sectionIds.has(id)) {
      throw new ValidationException('ID section không hợp lệ hoặc bị trùng')
    }
    sectionIds.add(id)
    const sectionPlainText = requiredString(
      entry['plainText'],
      'Plain-text section không hợp lệ',
      MAX_LOCAL_TEXT_LENGTH
    )
    if (typeof entry['critical'] !== 'boolean' || typeof entry['hasTextEquivalent'] !== 'boolean') {
      throw new ValidationException('Metadata accessibility của section không hợp lệ')
    }
    return Object.freeze({
      id,
      key: requiredString(entry['key'], 'Key section không hợp lệ', 120),
      title: requiredString(entry['title'], 'Tiêu đề section không hợp lệ', 500),
      plainText: sectionPlainText,
      critical: entry['critical'],
      hasTextEquivalent: entry['hasTextEquivalent'],
    })
  })

  return Object.freeze({
    ...(richContent === undefined ? {} : { rich_content: richContent }),
    ...(plainText === undefined ? {} : { plain_text: plainText.trim() }),
    ...(rawSections === undefined ? {} : { sections: Object.freeze(sections) }),
  })
}

function normalizeContract<T extends object>(value: unknown, fieldName: string): Partial<T> | null {
  if (value === undefined) return null
  if (!isRecord(value) || !isTvaJsonValue(value)) {
    throw new ValidationException(`${fieldName} không hợp lệ`)
  }
  return value as Partial<T>
}

function normalizeSupportingReferences(value: unknown): readonly CreateTaskSupportingReferenceInput[] {
  if (value === undefined) return Object.freeze([])
  if (!Array.isArray(value)) {
    throw new ValidationException('Danh sách Supporting Reference không hợp lệ')
  }

  const semanticKeys = new Set<string>()
  return Object.freeze(
    value.map((entry) => {
      if (!isRecord(entry)) {
        throw new ValidationException('Supporting Reference không hợp lệ')
      }
      const type = entry['type']
      if (typeof type !== 'string' || !TVA_REFERENCE_TYPES.includes(type as TvaReferenceType)) {
        throw new ValidationException('Loại Supporting Reference không được hỗ trợ')
      }
      const relation = entry['relation']
      if (
        typeof relation !== 'string' ||
        !TVA_REFERENCE_RELATIONS.includes(relation as TvaReferenceRelation)
      ) {
        throw new ValidationException('Quan hệ Supporting Reference không hợp lệ')
      }
      const accessState = entry['access_state']
      if (
        typeof accessState !== 'string' ||
        !TVA_REFERENCE_ACCESS_STATES.includes(accessState as TvaReferenceAccessState)
      ) {
        throw new ValidationException('Trạng thái truy cập Supporting Reference không hợp lệ')
      }
      const privacy = entry['privacy_classification']
      if (
        typeof privacy !== 'string' ||
        !TVA_PRIVACY_CLASSIFICATIONS.includes(privacy as TvaPrivacyClassification)
      ) {
        throw new ValidationException('Privacy của Supporting Reference không hợp lệ')
      }
      const uri = requiredString(entry['uri'], 'URI Supporting Reference không hợp lệ', 16_384)
      if (/^javascript\s*:/iu.test(uri) || [...uri].some((character) => character.charCodeAt(0) <= 31)) {
        throw new ValidationException('URI Supporting Reference không hợp lệ')
      }
      const title = requiredString(entry['title'], 'Tiêu đề Supporting Reference không hợp lệ', 500)
      const relevantSection =
        typeof entry['relevant_section'] === 'string' ? entry['relevant_section'].trim() : ''
      const externalVersion = entry['external_version']
      if (
        externalVersion !== undefined &&
        externalVersion !== null &&
        (typeof externalVersion !== 'string' || externalVersion.length > 255)
      ) {
        throw new ValidationException('External version của Supporting Reference không hợp lệ')
      }
      const externalHash = entry['external_content_hash']
      if (
        externalHash !== undefined &&
        externalHash !== null &&
        (typeof externalHash !== 'string' || !SHA256_REGEX.test(externalHash))
      ) {
        throw new ValidationException('External content hash không hợp lệ')
      }
      const semanticKey = `${type}:${uri}:${relation}:${relevantSection}`
      if (semanticKeys.has(semanticKey)) {
        throw new ValidationException('Supporting Reference bị trùng lặp')
      }
      semanticKeys.add(semanticKey)

      return Object.freeze({
        type: type as TvaReferenceType,
        uri,
        title,
        relevant_section: relevantSection,
        relation: relation as TvaReferenceRelation,
        access_state: accessState as TvaReferenceAccessState,
        privacy_classification: privacy as TvaPrivacyClassification,
        ...(externalVersion === undefined ? {} : { external_version: externalVersion }),
        ...(externalHash === undefined
          ? {}
          : { external_content_hash: externalHash as TvaSha256 | null }),
      })
    })
  )
}

export function buildCreateTaskAuthoringState(
  input: CreateTaskAuthoringInput | undefined
): CreateTaskAuthoringState {
  if (input === undefined) {
    return LEGACY_AUTHORING_STATE
  }

  if (input.mode !== 'operational_only' && input.mode !== 'evidence_enabled') {
    throw new ValidationException('Chế độ authoring task không hợp lệ')
  }
  if (input.intent !== 'save_draft' && input.intent !== 'publish') {
    throw new ValidationException('Ý định authoring task không hợp lệ')
  }

  const idempotencyKey = input.idempotency_key?.trim()
  if (!idempotencyKey || idempotencyKey.length > 255) {
    throw new ValidationException('Idempotency key của task là bắt buộc và không quá 255 ký tự')
  }

  const expectedHeadRevision = input.expected_head_revision ?? 0
  if (!Number.isSafeInteger(expectedHeadRevision) || expectedHeadRevision < 0) {
    throw new ValidationException('Expected head revision không hợp lệ')
  }

  const creatorConfirmed = optionalBoolean(input.creator_confirmed, 'creator_confirmed')
  if (input.intent === 'publish' && !creatorConfirmed) {
    throw new ValidationException('Task phải được người tạo xác nhận trước khi publish')
  }

  const evidenceContract = normalizeContract<TaskEvidenceContractV1>(
    input.evidence_contract,
    'Evidence Contract'
  )
  if (input.mode === 'operational_only' && evidenceContract?.mode === 'evidence_enabled') {
    throw new ValidationException('Operational-only task không thể dùng Evidence Contract enabled')
  }
  if (input.mode === 'evidence_enabled' && evidenceContract?.mode === 'operational_only') {
    throw new ValidationException('Evidence-enabled task không thể dùng Evidence Contract operational')
  }

  return Object.freeze({
    mode: input.mode,
    intent: input.intent,
    explicit: true,
    idempotency_key: idempotencyKey,
    expected_head_revision: expectedHeadRevision,
    project_context_version_id: normalizeOptionalVersionId(
      input.project_context_version_id,
      'Project Context version ID'
    ),
    work_package_version_id: normalizeOptionalVersionId(
      input.work_package_version_id,
      'Work Package version ID'
    ),
    creator_confirmed: creatorConfirmed,
    constraints_addressed: optionalBoolean(input.constraints_addressed, 'constraints_addressed'),
    dependencies_addressed: optionalBoolean(input.dependencies_addressed, 'dependencies_addressed'),
    specification: normalizeSpecification(input.specification),
    work_contract: normalizeContract<TaskWorkContractV1>(input.work_contract, 'Work Contract'),
    evidence_contract: evidenceContract,
    supporting_references: normalizeSupportingReferences(input.supporting_references),
    profile_eligible:
      input.mode === 'evidence_enabled' && evidenceContract?.profileEligibility === true,
  })
}
