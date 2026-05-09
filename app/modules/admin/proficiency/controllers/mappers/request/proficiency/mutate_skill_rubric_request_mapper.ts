import vine from '@vinejs/vine'

import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { throwHttpValidationError } from '#modules/http/boundary/http_boundary_errors'

const draftSchema = vine.create({
  changeSummary: vine.string().trim().maxLength(1000).optional().nullable(),
})

const levelSchema = vine.create({
  summary: vine.string().trim().maxLength(2000).optional().nullable(),
  knowledgeExpectations: vine.array(vine.string()).optional().nullable(),
  observableBehaviors: vine.array(vine.string()).optional().nullable(),
  independenceExpectations: vine.string().trim().maxLength(2000).optional().nullable(),
  complexityExpectations: vine.string().trim().maxLength(2000).optional().nullable(),
  impactScopeExpectations: vine.string().trim().maxLength(2000).optional().nullable(),
  positiveExamples: vine.array(vine.string()).optional().nullable(),
  negativeExamples: vine.array(vine.string()).optional().nullable(),
  evidenceGuidance: vine.string().trim().maxLength(2000).optional().nullable(),
  expectedExecution: vine.string().trim().maxLength(2000).optional().nullable(),
  autonomyDescriptor: vine.string().trim().maxLength(2000).optional().nullable(),
  complexityDescriptor: vine.string().trim().maxLength(2000).optional().nullable(),
  qualityDescriptor: vine.string().trim().maxLength(2000).optional().nullable(),
  collaborationDescriptor: vine.string().trim().maxLength(2000).optional().nullable(),
  ceilingGuidance: vine.string().trim().maxLength(2000).optional().nullable(),
})

type DraftPayload = Awaited<ReturnType<typeof draftSchema.validate>>
type LevelPayload = Awaited<ReturnType<typeof levelSchema.validate>>

function asRecord(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw ValidationException.field(field, `${field} must be an object`)
  }
  return value as Record<string, unknown>
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw ValidationException.field(field, `${field} is required`)
  }
  return value.trim()
}

function readAlias(body: Record<string, unknown>, camelCase: string, snakeCase: string) {
  return body[camelCase] ?? body[snakeCase]
}

function toDraftPayload(body: Record<string, unknown>) {
  return { changeSummary: readAlias(body, 'changeSummary', 'change_summary') }
}

function toLevelPayload(body: Record<string, unknown>) {
  return {
    summary: readAlias(body, 'summary', 'summary'),
    knowledgeExpectations: readAlias(body, 'knowledgeExpectations', 'knowledge_expectations'),
    observableBehaviors: readAlias(body, 'observableBehaviors', 'observable_behaviors'),
    independenceExpectations: readAlias(
      body,
      'independenceExpectations',
      'independence_expectations'
    ),
    complexityExpectations: readAlias(body, 'complexityExpectations', 'complexity_expectations'),
    impactScopeExpectations: readAlias(body, 'impactScopeExpectations', 'impact_scope_expectations'),
    positiveExamples: readAlias(body, 'positiveExamples', 'positive_examples'),
    negativeExamples: readAlias(body, 'negativeExamples', 'negative_examples'),
    evidenceGuidance: readAlias(body, 'evidenceGuidance', 'evidence_guidance'),
    expectedExecution: readAlias(body, 'expectedExecution', 'expected_execution'),
    autonomyDescriptor: readAlias(body, 'autonomyDescriptor', 'autonomy_descriptor'),
    complexityDescriptor: readAlias(body, 'complexityDescriptor', 'complexity_descriptor'),
    qualityDescriptor: readAlias(body, 'qualityDescriptor', 'quality_descriptor'),
    collaborationDescriptor: readAlias(body, 'collaborationDescriptor', 'collaboration_descriptor'),
    ceilingGuidance: readAlias(body, 'ceilingGuidance', 'ceiling_guidance'),
  }
}

function validate<T>(promise: Promise<T>): Promise<T> {
  return promise.catch((error: unknown) => throwHttpValidationError(error))
}

function stripUndefined(payload: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined))
}

function mapLevelPayload(payload: LevelPayload): Record<string, unknown> {
  return stripUndefined({
    summary: payload.summary,
    knowledge_expectations: payload.knowledgeExpectations,
    observable_behaviors: payload.observableBehaviors,
    independence_expectations: payload.independenceExpectations,
    complexity_expectations: payload.complexityExpectations,
    impact_scope_expectations: payload.impactScopeExpectations,
    positive_examples: payload.positiveExamples,
    negative_examples: payload.negativeExamples,
    evidence_guidance: payload.evidenceGuidance,
    expected_execution: payload.expectedExecution,
    autonomy_descriptor: payload.autonomyDescriptor,
    complexity_descriptor: payload.complexityDescriptor,
    quality_descriptor: payload.qualityDescriptor,
    collaboration_descriptor: payload.collaborationDescriptor,
    ceiling_guidance: payload.ceilingGuidance,
  })
}

export async function buildCreateSkillRubricDraftRequest(params: unknown, body: unknown) {
  const routeParams = asRecord(params, 'params')
  const payload = asRecord(body, 'body')
  const draft = await validate(draftSchema.validate(toDraftPayload(payload)))
  const result: { skillId: string; changeSummary?: string } = {
    skillId: requiredString(routeParams['skillId'], 'skillId'),
  }
  if (draft.changeSummary) result.changeSummary = draft.changeSummary
  return result
}

export async function buildUpsertSkillRubricLevelRequest(params: unknown, body: unknown) {
  const routeParams = asRecord(params, 'params')
  const payload = await validate(levelSchema.validate(toLevelPayload(asRecord(body, 'body'))))
  return {
    versionId: requiredString(routeParams['versionId'], 'versionId'),
    levelId: requiredString(routeParams['levelId'], 'levelId'),
    payload: mapLevelPayload(payload),
  }
}

export function buildPublishSkillRubricRequest(params: unknown) {
  const routeParams = asRecord(params, 'params')
  return { versionId: requiredString(routeParams['versionId'], 'versionId') }
}

export type { DraftPayload, LevelPayload }
