import { existsRule } from '#types/validation_rules'

export const userIdRule = () => existsRule('users', 'id', { softDelete: true })
