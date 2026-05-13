import env from '#start/env'

export const taxonomyConfig = {
  skillCursorSecret: env.get('SKILL_TAXONOMY_CURSOR_SECRET', env.get('APP_KEY')),
}
