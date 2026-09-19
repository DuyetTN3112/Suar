import { COLLABORATOR_WORK_HISTORY_ROWS } from './work_history/collaborator_work_history_specs.js'
import { MEMBER_WORK_HISTORY_ROWS } from './work_history/member_work_history_specs.js'
import { OWNER_WORK_HISTORY_ROWS } from './work_history/owner_work_history_specs.js'

export const SEED_USER_WORK_HISTORY_ROWS = [
  ...MEMBER_WORK_HISTORY_ROWS,
  ...OWNER_WORK_HISTORY_ROWS,
  ...COLLABORATOR_WORK_HISTORY_ROWS,
] as const

export {
  COLLABORATOR_WORK_HISTORY_ROWS,
  MEMBER_WORK_HISTORY_ROWS,
  OWNER_WORK_HISTORY_ROWS,
}
