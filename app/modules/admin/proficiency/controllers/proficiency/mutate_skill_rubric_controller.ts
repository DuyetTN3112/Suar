import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'

import { AdminProficiencyActionFactory } from '#modules/admin/proficiency/actions/ports/inbound/admin_proficiency_action_factory'
import { readAliasedInput } from '#modules/http/boundary/aliased_input'
import { camelizeResponseValue } from '#modules/http/boundary/camelize_response'
import {
  throwHttpBoundaryError,
  throwHttpValidationError,
} from '#modules/http/boundary/http_boundary_errors'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'

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

function mapLevelPayload(payload: LevelPayload): Record<string, unknown> {
  return {
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
  }
}

function stripUndefined(payload: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined))
}

@inject()
export default class MutateSkillRubricController {
  constructor(private readonly actions: AdminProficiencyActionFactory) {}

  async createDraft(ctx: HttpContext) {
    const { auth, params, request, response } = ctx
    let payload: DraftPayload
    try {
      payload = await draftSchema.validate({
        changeSummary: readAliasedInput(request, 'changeSummary', 'change_summary'),
      })
    } catch (err) {
      throwHttpValidationError(err)
    }

    try {
      const draft = await this.actions
        .makeCreateSkillRubricDraftCommand(actionContextFromHttp(ctx))
        .handle({
          skillId: String(params['skillId']),
          ...(auth.user?.id ? { actorId: auth.user.id } : {}),
          ...(payload.changeSummary ? { changeSummary: payload.changeSummary } : {}),
        })

      return response.status(201).json({ data: camelizeResponseValue(draft) })
    } catch (err) {
      throwHttpBoundaryError(err)
    }
  }

  async upsertLevel(ctx: HttpContext) {
    const { params, request, response } = ctx
    let payload: LevelPayload
    try {
      payload = await levelSchema.validate({
        summary: readAliasedInput(request, 'summary', 'summary'),
        knowledgeExpectations: readAliasedInput(
          request,
          'knowledgeExpectations',
          'knowledge_expectations'
        ),
        observableBehaviors: readAliasedInput(
          request,
          'observableBehaviors',
          'observable_behaviors'
        ),
        independenceExpectations: readAliasedInput(
          request,
          'independenceExpectations',
          'independence_expectations'
        ),
        complexityExpectations: readAliasedInput(
          request,
          'complexityExpectations',
          'complexity_expectations'
        ),
        impactScopeExpectations: readAliasedInput(
          request,
          'impactScopeExpectations',
          'impact_scope_expectations'
        ),
        positiveExamples: readAliasedInput(request, 'positiveExamples', 'positive_examples'),
        negativeExamples: readAliasedInput(request, 'negativeExamples', 'negative_examples'),
        evidenceGuidance: readAliasedInput(request, 'evidenceGuidance', 'evidence_guidance'),
        expectedExecution: readAliasedInput(request, 'expectedExecution', 'expected_execution'),
        autonomyDescriptor: readAliasedInput(request, 'autonomyDescriptor', 'autonomy_descriptor'),
        complexityDescriptor: readAliasedInput(
          request,
          'complexityDescriptor',
          'complexity_descriptor'
        ),
        qualityDescriptor: readAliasedInput(request, 'qualityDescriptor', 'quality_descriptor'),
        collaborationDescriptor: readAliasedInput(
          request,
          'collaborationDescriptor',
          'collaboration_descriptor'
        ),
        ceilingGuidance: readAliasedInput(request, 'ceilingGuidance', 'ceiling_guidance'),
      })
    } catch (err) {
      throwHttpValidationError(err)
    }

    try {
      const level = await this.actions
        .makeUpsertSkillRubricLevelCommand(actionContextFromHttp(ctx))
        .handle({
          versionId: String(params['versionId']),
          levelId: String(params['levelId']),
          payload: stripUndefined(mapLevelPayload(payload)),
        })

      return response.status(200).json({ data: camelizeResponseValue(level) })
    } catch (err) {
      throwHttpBoundaryError(err)
    }
  }

  async publish(ctx: HttpContext) {
    const { params, response } = ctx
    try {
      const version = await this.actions
        .makePublishSkillRubricVersionCommand(actionContextFromHttp(ctx))
        .handle({ versionId: String(params['versionId']) })

      return response.status(200).json({ data: camelizeResponseValue(version) })
    } catch (err) {
      throwHttpBoundaryError(err)
    }
  }
}
