import { existsRule } from '#types/validation_rules'

export const projectIdRule = () => existsRule('projects', 'id', { softDelete: true })
export const organizationIdRule = () => existsRule('organizations', 'id', { softDelete: true })
export const userIdRule = () => existsRule('users', 'id', { softDelete: true })
