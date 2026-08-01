export interface SkillProjectAccessInput {
  projectId: string
  userId: string
  organizationId: string
  writeMode: boolean
}

export abstract class SkillProjectAccessAuthorizer {
  abstract enforce(input: SkillProjectAccessInput): Promise<void>
}
