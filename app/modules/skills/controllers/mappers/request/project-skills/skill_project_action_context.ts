import type { HttpContext } from '@adonisjs/core/http'

import type { SkillProjectActionContext } from '#modules/skills/actions/skill_project_action_context'

export function skillProjectActionContextFromHttp(ctx: HttpContext): SkillProjectActionContext {
  return {
    userId: ctx.auth.user?.id ?? null,
    organizationId: (ctx.session.get('current_organization_id') as string | undefined) ?? null,
  }
}
