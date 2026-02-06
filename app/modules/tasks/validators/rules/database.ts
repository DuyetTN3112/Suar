import { existsRule } from '#types/validation_rules'

export const taskIdRule = () => existsRule('tasks', 'id', { softDelete: true })
export const userIdRule = () => existsRule('users', 'id', { softDelete: true })
